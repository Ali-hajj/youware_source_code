<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Venue;

final class VenueController
{
    private Venue $venueModel;

    public function __construct()
    {
        $this->venueModel = new Venue();
    }

    /**
     * Handle GET /api/venues - Fetch all venues
     */
    public function getAll(): array
    {
        return $this->venueModel->getAll();
    }

    /**
     * Handle POST /api/venues - Add a new venue
     */
    public function add(array $params): array
    {
        $data = $params['input'] ?? [];

        if (!isset($data['name'], $data['type'], $data['color'], $data['icon'])) {
            return ['error' => 'Invalid input'];
        }

        $newId = $this->venueModel->add($data);

        return ['id' => $newId];
    }


    /**
     * Handle PUT /api/venues/{id} - Update a venue
     */
   public function update(array $params): array
    {
        // Extract id from route parameters
        $id = (int)($params['routeParams']['id'] ?? 0);

        // Get input data
        $data = $params['input'] ?? [];

        if (!$id || !isset($data['name'], $data['type'], $data['color'], $data['icon'])) {
            // Return error response with 400 status
            return ['error' => 'Invalid input', 'status' => 400];
        }

        $success = $this->venueModel->update($id, $data);

        return ['success' => $success];
    }


    /**
     * Handle DELETE /api/venues/{id} - Delete a venue
     */
    public function delete(array $params): array
    {
        $id = (int)($params['routeParams']['id'] ?? 0);

        if (!$id) {
            return ['error' => 'Invalid ID', 'status' => 400];
        }

        $success = $this->venueModel->delete($id);

        return ['success' => $success];
    }

}
