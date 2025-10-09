<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\User;

final class AuthService
{
    public static function createUser(array $payload): array
    {
        $userModel = new User();
        $user = $userModel->create($payload);
        unset($user['password_hash']);
        return $user;
    }

    public static function attemptLogin(string $email, string $password): ?array
    {
        $userModel = new User();
        $user = $userModel->findByEmail($email);

        if (!$user) {
            return null;
        }

        if (!password_verify($password, $user['password_hash'])) {
            return null;
        }

        unset($user['password_hash']);

        return $user;
    }

    public static function resetPassword(string $email, string $password): bool
    {
        $userModel = new User();
        return $userModel->updatePassword($email, $password);
    }
}
