<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\User;
use App\Support\JsonResponse;

final class UserController
{
    public function index(): array
    {
        $userModel = new User();
        $users = $userModel->all();

        // Transform users to match frontend expectations
        $transformedUsers = array_map(function ($user) {
            return [
                'id' => $user['id'],
                'email' => $user['email'],
                'firstName' => $user['first_name'],
                'lastName' => $user['last_name'],
                'role' => $user['role'],
                'createdAt' => $user['created_at'],
                'updatedAt' => $user['updated_at'],
                'isDefaultAdmin' => false, // PHP backend doesn't have this field
            ];
        }, $users);

        return JsonResponse::success([
            'users' => $transformedUsers,
        ]);
    }

    public function show(array $params): array
    {
        $userId = $params['routeParams']['id'] ?? null;
        
        if (!$userId) {
            return JsonResponse::error('User ID is required', 400);
        }

        $userModel = new User();
        $user = $userModel->findById($userId);

        if (!$user) {
            return JsonResponse::error('User not found', 404);
        }

        // Transform user to match frontend expectations
        $transformedUser = [
            'id' => $user['id'],
            'email' => $user['email'],
            'firstName' => $user['first_name'],
            'lastName' => $user['last_name'],
            'role' => $user['role'],
            'createdAt' => $user['created_at'],
            'updatedAt' => $user['updated_at'],
            'isDefaultAdmin' => false,
        ];

        return JsonResponse::success($transformedUser);
    }
}