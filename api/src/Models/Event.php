<?php

declare(strict_types=1);

namespace App\Models;

use Ramsey\Uuid\Uuid;

final class Event extends BaseModel
{
    private string $table = 'events';

    public function all(string $userId): array
    {
        $stmt = $this->db->prepare("SELECT * FROM {$this->table} WHERE user_id = :user_id ORDER BY date DESC, start_time ASC");
        $stmt->execute(['user_id' => $userId]);
        $events = $stmt->fetchAll();
        
        // Debug logging to check timestamp fields
        error_log("Event::all() - Found " . count($events) . " events for user " . $userId);
        if (!empty($events)) {
            $firstEvent = $events[0];
            error_log("Event::all() - First event data: " . json_encode($firstEvent));
            error_log("Event::all() - created_at: " . ($firstEvent['created_at'] ?? 'NULL'));
            error_log("Event::all() - updated_at: " . ($firstEvent['updated_at'] ?? 'NULL'));
        }
        
        return $events;
    }

    public function allEvents(): array
    {
        $stmt = $this->db->prepare("SELECT * FROM {$this->table} ORDER BY date DESC, start_time ASC");
        $stmt->execute();
        $events = $stmt->fetchAll();

        // Optional: Debugging logs
        error_log("Event::allEvents() - Found " . count($events) . " events.");
        if (!empty($events)) {
            $firstEvent = $events[0];
            error_log("Event::allEvents() - First event data: " . json_encode($firstEvent));
        }

        return $events;
    }

    public function find(string $id, string $userId): ?array
    {
        $stmt = $this->db->prepare("SELECT * FROM {$this->table} WHERE id = :id AND user_id = :user_id LIMIT 1");
        $stmt->execute(['id' => $id, 'user_id' => $userId]);
        $event = $stmt->fetch();

        return $event ?: null;
    }

    

  public function create(array $data, string $userId): ?array
{
    // Generate UUID
    $id = $this->generateUuid();

    // Extract contact info
    $contact = $data['contact'] ?? [];
    $contactName = $contact['name'] ?? '';
    $contactPhone = $contact['phone'] ?? '';
    $contactEmail = $contact['email'] ?? '';

    // Extract pricing info
    $pricing = $data['pricing'] ?? [];
    $personCount = $pricing['personCount'] ?? 0;
    $pricePerPerson = $pricing['pricePerPerson'] ?? 0.0;

    // Validate required fields
    $startTime = $data['startTime'] ?? '00:00:00';
    $endTime = $data['endTime'] ?? '23:59:00';
    $date = $data['date'] ?? date('Y-m-d');
    $title = $data['title'] ?? 'Untitled Event';
    $venue = $data['venue'] ?? 'Unknown';

    // Prepare SQL columns and values
    $columns = [
        'id', 'user_id', 'title', 'venue', 'venue_id', 'color', 'date',
        'start_time', 'end_time', 'status', 'payment_status', 'payment_method',
        'contact_name', 'contact_phone', 'contact_email', 'pricing_data',
        'notes', 'person_count', 'price_per_person'
    ];

    $values = [
        ':id' => $id,
        ':user_id' => $userId,
        ':title' => $title,
        ':venue' => $venue,
        ':venue_id' => $data['venueId'] ?? '',
        ':color' => $data['color'] ?? null,
        ':date' => $date,
        ':start_time' => $startTime,
        ':end_time' => $endTime,
        ':status' => $data['status'] ?? 'pending',
        ':payment_status' => $data['paymentStatus'] ?? 'unpaid',
        ':payment_method' => $data['paymentMethod'] ?? null,
        ':contact_name' => $contactName,
        ':contact_phone' => $contactPhone,
        ':contact_email' => $contactEmail,
        ':pricing_data' => json_encode($pricing),
        ':notes' => $data['notes'] ?? null,
        ':person_count' => $personCount,
        ':price_per_person' => $pricePerPerson
    ];

    // Build SQL
    $sql = "INSERT INTO {$this->table} (" . implode(',', $columns) . ") VALUES (" . implode(',', array_keys($values)) . ")";

    // Debug logs
    error_log("DEBUG SQL: {$sql}");
    error_log("DEBUG VALUES: " . print_r($values, true));

    // Execute
    $stmt = $this->db->prepare($sql);
    $stmt->execute($values);

    // Return the newly created event
    return $this->find($id, $userId);
}

    // UUID generator helper
    private function generateUuid(): string
    {
        return sprintf(
            '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
        );
    }

    public function update(string $id, string $userId, array $data): ?array
    {
        $event = $this->find($id, $userId);
        if (!$event) {
            return null;
        }

        $columns = [
            'title', 'venue', 'venue_id', 'color',
            'date', 'start_time', 'end_time', 'status',
            'payment_status', 'payment_method',
            'contact_name', 'contact_phone', 'contact_email',
            'pricing_data', 'notes', 'person_count', 'price_per_person'
        ];

        $sets = [];
        $params = ['id' => $id, 'user_id' => $userId];

        // Prepare pricing
        if (isset($data['pricing'])) {
            $pricingData = $data['pricing'];
            $mode = $pricingData['mode'] ?? 'person';
            $subtotal = 0;

            if ($mode === 'person') {
                $personCount = $pricingData['personCount'] ?? 1;
                $pricePerPerson = $pricingData['pricePerPerson'] ?? 0;
                $subtotal = $personCount * $pricePerPerson;
            } elseif ($mode === 'menu') {
                $menuItems = $pricingData['menuItems'] ?? [];
                foreach ($menuItems as $item) {
                    $subtotal += ($item['price'] ?? 0) * ($item['quantity'] ?? 1);
                }
            }

            // Discount
            $discount = $pricingData['discount'] ?? ['type'=>'percentage','value'=>0,'amount'=>0];
            if ($discount['type'] === 'percentage') {
                $discountAmount = $subtotal * ($discount['value'] / 100);
            } else {
                $discountAmount = $discount['amount'] ?? 0;
            }

            $subtotalAfterDiscount = $subtotal - $discountAmount;

            // Tax
            $taxRate = $pricingData['taxRate'] ?? 0;
            $taxAmount = $subtotalAfterDiscount * $taxRate;
            $total = $subtotalAfterDiscount + $taxAmount;

            $pricingData['subtotal'] = $subtotal;
            $pricingData['discountAmount'] = $discountAmount;
            $pricingData['taxAmount'] = $taxAmount;
            $pricingData['total'] = $total;

            $data['person_count'] = $pricingData['personCount'] ?? 0;
            $data['price_per_person'] = $pricingData['pricePerPerson'] ?? 0;
            $data['pricing_data'] = $pricingData;
        }

        foreach ($columns as $column) {
            if (array_key_exists($column, $data)) {
                $sets[] = "{$column} = :{$column}";
                $params[$column] = ($column === 'pricing_data') ? json_encode($data[$column]) : $data[$column];
            }
        }

        if ($sets) {
            $sql = "UPDATE {$this->table} SET " . implode(', ', $sets) . " WHERE id = :id AND user_id = :user_id";

            // Debug
            error_log("DEBUG SQL: {$sql}");
            error_log("DEBUG PARAMS: " . print_r($params, true));

            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
        }

        return $this->find($id, $userId);
    }

public function delete(string $id, string $userRole): bool
{
    // Only admins can delete events
    if ($userRole !== 'admin') {
        error_log("Non-admin tried to delete event {$id}");
        return false;
    }

    // Admin can delete any event
    $stmt = $this->db->prepare("DELETE FROM {$this->table} WHERE id = :id");
    $stmt->execute(['id' => $id]);

    return $stmt->rowCount() > 0;
}


    // public function delete(string $id, string $userId): bool
    // {
    //     // Step 1: Check if user is admin
    //     $userStmt = $this->db->prepare("SELECT role FROM users WHERE id = :user_id LIMIT 1");
    //     $userStmt->execute(['user_id' => $userId]);
    //     $user = $userStmt->fetch(PDO::FETCH_ASSOC);

    //     if (!$user || $user['role'] !== 'admin') {
    //         // User not found or not admin => deny delete
    //         return false;
    //     }

    //     // Step 2: Delete event if user is admin
    //     $stmt = $this->db->prepare("DELETE FROM {$this->table} WHERE id = :id AND user_id = :user_id");
    //     $stmt->execute(['id' => $id, 'user_id' => $userId]);

    //     return $stmt->rowCount() > 0;
    // }


}




