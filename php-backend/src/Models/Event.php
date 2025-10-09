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
        return $stmt->fetchAll();
    }

    public function find(string $id, string $userId): ?array
    {
        $stmt = $this->db->prepare("SELECT * FROM {$this->table} WHERE id = :id AND user_id = :user_id LIMIT 1");
        $stmt->execute(['id' => $id, 'user_id' => $userId]);
        $event = $stmt->fetch();

        return $event ?: null;
    }

    public function create(array $data, string $userId): array
    {
        $id = Uuid::uuid4()->toString();
        $columns = [
            'id', 'user_id', 'title', 'venue', 'venue_id', 'color', 'date', 'start_time', 'end_time',
            'status', 'payment_status', 'payment_method', 'contact_name', 'contact_phone', 'contact_email',
            'pricing_data', 'notes'
        ];

        $placeholders = implode(', ', array_fill(0, count($columns), '?'));
        $columnList = implode(', ', $columns);

        $stmt = $this->db->prepare("INSERT INTO {$this->table} ({$columnList}) VALUES ({$placeholders})");

        $payload = [
            $id,
            $userId,
            $data['title'],
            $data['venue'],
            $data['venue_id'] ?? null,
            $data['color'] ?? null,
            $data['date'],
            $data['start_time'],
            $data['end_time'],
            $data['status'] ?? 'pending',
            $data['payment_status'] ?? 'unpaid',
            $data['payment_method'] ?? null,
            $data['contact_name'],
            $data['contact_phone'],
            $data['contact_email'],
            isset($data['pricing_data']) ? json_encode($data['pricing_data']) : null,
            $data['notes'] ?? null,
        ];

        $stmt->execute($payload);

        return $this->find($id, $userId);
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
            'pricing_data', 'notes'
        ];

        $sets = [];
        $params = ['id' => $id, 'user_id' => $userId];
        foreach ($columns as $column) {
            if (array_key_exists($column, $data)) {
                $sets[] = "{$column} = :{$column}";
                $params[$column] = $column === 'pricing_data' ? json_encode($data[$column]) : $data[$column];
            }
        }

        if ($sets) {
            $sql = "UPDATE {$this->table} SET " . implode(', ', $sets) . " WHERE id = :id AND user_id = :user_id";
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
        }

        return $this->find($id, $userId);
    }

    public function delete(string $id, string $userId): bool
    {
        $stmt = $this->db->prepare("DELETE FROM {$this->table} WHERE id = :id AND user_id = :user_id");
        $stmt->execute(['id' => $id, 'user_id' => $userId]);

        return $stmt->rowCount() > 0;
    }
}
