<?php

declare(strict_types=1);

namespace App\Models;

use Ramsey\Uuid\Uuid;
use PDO;

final class User extends BaseModel
{
    // private string $table = 'users';
    protected string $table = 'users';


    public function findByEmail(string $email): ?array
    {
        $stmt = $this->db->prepare("SELECT * FROM {$this->table} WHERE email = :email LIMIT 1");
        $stmt->execute(['email' => $email]);
        $user = $stmt->fetch();

        return $user ?: null;
    }

    public function findById(string $id): ?array
    {
        $stmt = $this->db->prepare("SELECT id, email, first_name, last_name, phone , role, created_at, updated_at FROM {$this->table} WHERE id = :id LIMIT 1");
        $stmt->execute(['id' => $id]);
        $user = $stmt->fetch();

        return $user ?: null;
    }

    public function all(): array
    {
        $stmt = $this->db->prepare("SELECT id, email, first_name, last_name, phone , role, created_at, updated_at FROM {$this->table} ORDER BY created_at DESC");
        $stmt->execute();
        return $stmt->fetchAll();
    }

    public function create(array $data): array
    {
        $id = Uuid::uuid4()->toString();

        $stmt = $this->db->prepare("
            INSERT INTO {$this->table} (id, email, password_hash, first_name, last_name, phone, role)
            VALUES (:id, :email, :password_hash, :first_name, :last_name, :phone , :role)
        ");

        $stmt->execute([
            'id'            => $id,
            'email'         => $data['email'],
            'password_hash' => password_hash($data['password'], PASSWORD_BCRYPT),
            'first_name'    => $data['first_name'] ?? null,
            'last_name'     => $data['last_name'] ?? null,
            'phone'         => $data['phone'] ?? null,
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

   public function update(string $id, array $mappedData): bool
    {
        // 1. Fetch current user data (optional, can remove if not needed)
        $stmt = $this->db->prepare("SELECT email, first_name, last_name, phone, role FROM users WHERE id = ?");
        $stmt->execute([$id]);
        $currentUser = $stmt->fetch(PDO::FETCH_ASSOC);

        error_log("Current DB user data: " . print_r($currentUser, true));

        if (!$currentUser) {
            error_log("User not found with id $id");
            return false;
        }

        // 2. Build SET clause and values dynamically
        $setParts = [];
        $values = [];
        foreach ($mappedData as $column => $value) {
            $setParts[] = "`$column` = ?";
            $values[] = $value;
        }
        $setClause = implode(', ', $setParts);

        $values[] = $id; // for WHERE clause

        $sql = "UPDATE users SET $setClause WHERE id = ?";
        error_log("🧱 Final SQL: $sql");
        error_log("📦 Values to bind: " . print_r($values, true));

        $stmt = $this->db->prepare($sql);
        $stmt->execute($values);

        error_log("Execute result, rowCount: " . $stmt->rowCount());

        if ($stmt->errorCode() !== '00000') {
            error_log("Error during update: " . implode(", ", $stmt->errorInfo()));
            return false;
        }

        // Success even if no rows affected (data might be unchanged)
        return true;
    }
    public function delete(string $id): bool
    {
        $stmt = $this->db->prepare("DELETE FROM {$this->table} WHERE id = :id");
        $stmt->execute(['id' => $id]);

        return $stmt->rowCount() > 0;
    }


}
