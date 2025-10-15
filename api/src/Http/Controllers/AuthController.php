<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\AuthService;
use App\Services\TokenService;
use App\Support\JsonResponse;
use App\Support\Validator;
use Respect\Validation\Validator as v;

final class AuthController
{
    public function health(): array
    {
        return JsonResponse::success([
            'status' => 'ok',
            'timestamp' => time(),
            'env' => $_ENV['APP_ENV'] ?? 'production',
        ]);
    }

    public function signup(): array
    {
        $payload = json_decode(file_get_contents('php://input'), true) ?? [];

        $rules = [
            'email'      => v::email()->notEmpty(),
            'password'   => v::stringType()->length(8, 255),
            'first_name' => v::optional(v::stringType()->length(null, 100)),
            'last_name'  => v::optional(v::stringType()->length(null, 100)),
        ];

        $validation = Validator::validate($payload, $rules);
        if ($validation->fails()) {
            return JsonResponse::error('Validation failed', 422, $validation->messages());
        }

        $userModel = new User();
        if ($userModel->findByEmail($payload['email'])) {
            return JsonResponse::error('Email already in use', 409);
        }

        $user = AuthService::createUser($payload);

        $token = TokenService::issue($user);

        return JsonResponse::success([
            'token' => $token,
            'user'  => $user,
        ], 201);
    }

    public function login(): array
    {
        $payload = json_decode(file_get_contents('php://input'), true) ?? [];

        $rules = [
            'email'    => v::email()->notEmpty(),
            'password' => v::stringType()->notEmpty(),
        ];

        $validation = Validator::validate($payload, $rules);
        if ($validation->fails()) {
            return JsonResponse::error('Validation failed', 422, $validation->messages());
        }

        $user = AuthService::attemptLogin($payload['email'], $payload['password']);

        if (!$user) {
            return JsonResponse::error('Invalid credentials', 401);
        }

        $token = TokenService::issue($user);

        return JsonResponse::success([
            'token' => $token,
            'user'  => $user,
        ]);
    }

    public function resetPassword(): array
    {
        $payload = json_decode(file_get_contents('php://input'), true) ?? [];

        $rules = [
            'email'        => v::email()->notEmpty(),
            'new_password' => v::stringType()->length(8, 255),
        ];

        $validation = Validator::validate($payload, $rules);
        if ($validation->fails()) {
            return JsonResponse::error('Validation failed', 422, $validation->messages());
        }

        $result = AuthService::resetPassword($payload['email'], $payload['new_password']);

        if (!$result) {
            return JsonResponse::error('Account not found', 404);
        }

        return JsonResponse::success(['message' => 'Password updated']);
    }

    public function me(array $params): array
    {
        return JsonResponse::success([
            'user' => $params['user'],
        ]);
    }
}
