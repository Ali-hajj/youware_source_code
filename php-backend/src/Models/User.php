<?php

declare(strict_types=1);

namespace App\Models;

use Ramsey\Uuid\Uuid;

final class User extends BaseModel
{
    private string $table = 'users';

    public function findByEmail(string $email): ?array
    {
        $stmt = $this->db->prepare("SELECT * FROM {$this->table} WHERE email = :email LIMIT 1");
        $stmt->execute(['email' => $email]);
        $user = $stmt->fetch();

        return $user ?: null;
    }

    public function findById(string $id): ?array
    {
        $stmt = $this->db->prepare("SELECT id, email, first_name, last_name, role, created_at, updated_at FROM {$this->table} WHERE id = :id LIMIT 1");
        $stmt->execute(['id' => $id]);
        $user = $stmt->fetch();

        return $user ?: null;
    }

    public function create(array $data): array
    {
        $id = Uuid::uuid4()->toString();

        $stmt = $this->db->prepare("
            INSERT INTO {$this->table} (id, email, password_hash, first_name, last_name, role)
            VALUES (:id, :email, :password_hash, :first_name, :last_name, :role)
        ");

        $stmt->execute([
            'id'            => $id,
            'email'         => $data['email'],
            'password_hash' => password_hash($data['password'], PASSWORD_BCRYPT),
            'first_name'    => $data['first_name'] ?? null,
            'last_name'     => $data['last_name'] ?? null,
            'role'          => $data['role'] ?? 'admin',
        ]);

        return $this->findByIdWithHash($id);
    }

    private function findByIdWithHash(string $id): array
    {
        $stmt = $this->db->prepare("SELECT * FROM {$this->table} WHERE id = :id LIMIT 1");
        $stmt->execute(['id' => $id]);
        return $stmt->fetch();
    }

    public function updatePassword(string $email, string $password): bool
    {
        $stmt = $this->db->prepare("UPDATE {$this->table} SET password_hash = :password_hash WHERE email = :email");
        return $stmt->execute([
            'password_hash' => password_hash($password, PASSWORD_BCRYPT),
            'email'         => $email,
        ]);
    }
}
