<?php

declare(strict_types=1);

namespace App\Services;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

final class TokenService
{
    public static function issue(array $user): string
    {
        $now = time();
        $payload = [
            'iss' => $_ENV['APP_URL'] ?? 'event-manager',
            'sub' => $user['id'],
            'iat' => $now,
            'exp' => $now + (int)($_ENV['JWT_TTL'] ?? 3600),
            'user' => [
                'id' => $user['id'],
                'email' => $user['email'],
                'first_name' => $user['first_name'] ?? null,
                'last_name' => $user['last_name'] ?? null,
                'role' => $user['role'] ?? 'admin',
            ],
        ];

        return JWT::encode($payload, $_ENV['JWT_SECRET'], 'HS256');
    }

    public static function verify(string $token): ?array
    {
        try {
            $decoded = JWT::decode($token, new Key($_ENV['JWT_SECRET'], 'HS256'));
            return (array) $decoded->user;
        } catch (\Throwable $e) {
            logger()->warning('Token verification failed', ['error' => $e->getMessage()]);
            return null;
        }
    }
}
