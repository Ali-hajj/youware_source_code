<?php

declare(strict_types=1);

namespace App\Models;

final class License extends BaseModel
{
    private string $table = 'licenses';

    public function all(): array
    {
        $stmt = $this->db->query("SELECT * FROM {$this->table} ORDER BY created_at DESC");
        return $stmt->fetchAll();
    }

    public function create(array $data): array
    {
        $stmt = $this->db->prepare("
            INSERT INTO {$this->table} (id, key_value, company_name, expires_at, seats, status)
            VALUES (:id, :key_value, :company_name, :expires_at, :seats, :status)
        ");

        $stmt->execute([
            'id'           => $data['id'],
            'key_value'    => $data['key_value'],
            'company_name' => $data['company_name'] ?? null,
            'expires_at'   => $data['expires_at'] ?? null,
            'seats'        => $data['seats'] ?? 1,
            'status'       => $data['status'] ?? 'active',
        ]);

        return $this->findById($data['id']);
    }

    public function findById(string $id): ?array
    {
        $stmt = $this->db->prepare("SELECT * FROM {$this->table} WHERE id = :id LIMIT 1");
        $stmt->execute(['id' => $id]);
        $license = $stmt->fetch();

        return $license ?: null;
    }

    public function findByKey(string $key): ?array
    {
        $stmt = $this->db->prepare("SELECT * FROM {$this->table} WHERE key_value = :key LIMIT 1");
        $stmt->execute(['key' => $key]);
        $license = $stmt->fetch();

        return $license ?: null;
    }
}
