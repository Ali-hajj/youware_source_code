<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Services\TokenService;
use App\Support\JsonResponse;

final class AuthMiddleware
{
    public function handle(callable $next, array $params = []): array
    {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';

        if (!str_starts_with($authHeader, 'Bearer ')) {
            return JsonResponse::error('Missing Bearer token', 401);
        }

        $token = substr($authHeader, 7);

        $user = TokenService::verify($token);

        if (!$user) {
            return JsonResponse::error('Invalid or expired token', 401);
        }

        $params['user'] = $user;

        return $next($params);
    }
}
