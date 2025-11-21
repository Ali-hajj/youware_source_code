<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Event;
use App\Support\JsonResponse;
use App\Support\Validator;
use Respect\Validation\Validator as v;

final class EventController
{
    private Event $events;

    public function __construct()
    {
        $this->events = new Event();
    }

    public function index(array $params): array
    {
        $records = $this->events->all($params['user']['id']);
        return JsonResponse::success(['events' => $records]);
    }

    public function show(array $params): array
    {
        $id = $params['routeParams']['id'] ?? null;
        if (!$id) {
            return JsonResponse::error('Missing event id', 400);
        }

        $event = $this->events->find($id, $params['user']['id']);
        if (!$event) {
            return JsonResponse::error('Event not found', 404);
        }

        return JsonResponse::success(['event' => $event]);
    }
    public function allEvents(): array
    {
        $records = $this->events->allEvents(); // Calls model method that fetches all events
        return JsonResponse::success(['events' => $records]);
    }
    public function store(array $params): array
    {
        $payload = json_decode(file_get_contents('php://input'), true) ?? [];

        $validation = Validator::validate($payload, $this->rules());
        if ($validation->fails()) {
            return JsonResponse::error('Validation failed', 422, $validation->messages());
        }

        $event = $this->events->create($payload, $params['user']['id']);

        return JsonResponse::success(['event' => $event], 201);
    }
    public function export(array $params): void
    {
        // Fetch all events
        $records = $this->events->allEvents();

        if (empty($records)) {
            // No events found
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false,
                'message' => 'No events found',
            ]);
            exit;
        }

        // Convert any array fields to JSON strings
        foreach ($records as &$record) {
            foreach ($record as $key => $value) {
                if (is_array($value)) {
                    $record[$key] = json_encode($value);
                }
            }
            // Remove venue_name column
            unset($record['venue_name']);
        }

        // Set headers for CSV download
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="events_export_' . date('Y-m-d') . '.csv"');

        // Open output stream
        $output = fopen('php://output', 'w');

        // Write CSV header (column names)
        fputcsv($output, array_keys($records[0]));

        // Write each event row
        foreach ($records as $row) {
            fputcsv($output, $row);
        }

        // Close output stream
        fclose($output);
        exit;
    }

    private function toCsv(array $records): string
    {
        if (empty($records)) {
            return "No events found\n";
        }

        ob_start();
        $output = fopen('php://output', 'w');

        // CSV header
        fputcsv($output, array_keys($records[0]));

        // CSV rows
        foreach ($records as $row) {
            fputcsv($output, $row);
        }

        fclose($output);

        return ob_get_clean();
    }

    public function update(array $params): array
    {
        $id = $params['routeParams']['id'] ?? null;
        if (!$id) {
            return JsonResponse::error('Missing event id', 400);
        }

        $payload = json_decode(file_get_contents('php://input'), true) ?? [];

        $validation = Validator::validate($payload, $this->rules(true));
        if ($validation->fails()) {
            return JsonResponse::error('Validation failed', 422, $validation->messages());
        }

        $event = $this->events->update($id, $params['user']['id'], $payload);

        if (!$event) {
            return JsonResponse::error('Event not found', 404);
        }

        return JsonResponse::success(['event' => $event]);
    }
public function destroy(array $params): array
{
    $id = $params['routeParams']['id'] ?? null;
    if (!$id) {
        return JsonResponse::error('Missing event id', 400);
    }

    // Get the user's role
    $userRole = $params['user']['role'] ?? null;
    if (!$userRole) {
        return JsonResponse::error('User role not found', 403);
    }

    // Only admins can delete events
    $deleted = $this->events->delete($id, $userRole);

    if (!$deleted) {
        return JsonResponse::error('You are not allowed to delete this event or it does not exist', 403);
    }

    return JsonResponse::success(['message' => 'Event deleted']);
}

    // public function destroy(array $params): array
    // {
    //     $id = $params['routeParams']['id'] ?? null;
    //     if (!$id) {
    //         return JsonResponse::error('Missing event id', 400);
    //     }

    //     $deleted = $this->events->delete($id, $params['user']['id']);

    //     if (!$deleted) {
    //         return JsonResponse::error('Event not found', 404);
    //     }

    //     return JsonResponse::success(['message' => 'Event deleted']);
    // }

    private function rules(bool $isUpdate = false): array
    {
        $required = !$isUpdate;

        return [
            'title'          => $required ? v::stringType()->notEmpty() : v::optional(v::stringType()),
            'venue'          => $required ? v::stringType()->notEmpty() : v::optional(v::stringType()),
            'venue_id'       => v::optional(v::stringType()),
            'color'          => v::optional(v::stringType()->length(null, 20)),
            'date'           => $required ? v::date('Y-m-d') : v::optional(v::date('Y-m-d')),
            'start_time'     => $required ? v::date('H:i') : v::optional(v::date('H:i')),
            'end_time'       => $required ? v::date('H:i') : v::optional(v::date('H:i')),
            'status'         => v::optional(v::in(['pending', 'confirmed', 'cancelled'])),
            'payment_status' => v::optional(v::in(['unpaid', 'partial', 'paid'])),
            'payment_method' => v::optional(v::stringType()->length(null, 100)),
            'contact_name'   => $required ? v::stringType()->notEmpty() : v::optional(v::stringType()),
            'contact_phone'  => $required ? v::stringType()->notEmpty() : v::optional(v::stringType()),
            'contact_email'  => $required ? v::email()->notEmpty() : v::optional(v::email()),
            'pricing_data'   => v::optional(v::arrayType()),
            'notes'          => v::optional(v::stringType()),
        ];
    }
}
