<?php

declare(strict_types=1);

namespace App\Models;

final class Venue extends BaseModel
{
    private string $table = 'venues';

    /**
     * Get all venues.
     *
     * @return array
     */
    public function getAll(): array
    {
        $stmt = $this->db->prepare("SELECT * FROM {$this->table} ORDER BY id ASC");
        $stmt->execute();
        return $stmt->fetchAll();
    }

    /**
     * Add a new venue.
     *
     * @param array $data
     * @return int The inserted venue ID
     */
    public function add(array $data): int
    {
        $sql = "INSERT INTO {$this->table} (name, type, color, icon) VALUES (:name, :type, :color, :icon)";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':name' => $data['name'],
            ':type' => $data['type'],
            ':color' => $data['color'],
            ':icon' => $data['icon'],
        ]);

        return (int) $this->db->lastInsertId();
    }

    /**
     * Update an existing venue.
     *
     * @param int $id
     * @param array $data
     * @return bool
     */
    public function update(int $id, array $data): bool
    {
        $sql = "UPDATE {$this->table} SET name = :name, type = :type, color = :color, icon = :icon WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            ':name' => $data['name'],
            ':type' => $data['type'],
            ':color' => $data['color'],
            ':icon' => $data['icon'],
            ':id' => $id,
        ]);
    }

    /**
     * Delete a venue by ID.
     *
     * @param int $id
     * @return bool
     */
    public function delete(int $id): bool
    {
        $stmt = $this->db->prepare("DELETE FROM {$this->table} WHERE id = :id");
        return $stmt->execute([':id' => $id]);
    }
}
