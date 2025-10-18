<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\User;
use App\Support\JsonResponse;
use App\Support\Validator;
use Respect\Validation\Validator as v;

final class UserController
{
    protected $users;

    public function __construct()
    {
        $this->users = new User();
    }
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
                'phone' => $user['phone'],
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
            'phone' => $user['phone'],
            'role' => $user['role'],
            'createdAt' => $user['created_at'],
            'updatedAt' => $user['updated_at'],
            'isDefaultAdmin' => false,
        ];

        return JsonResponse::success($transformedUser);
    }



    public function update(array $params): array
    {
        $userId = $params['routeParams']['id'] ?? null;
        if (!$userId) {
            return JsonResponse::error('Missing user id', 400);
        }

        // Read raw input from request body
        $payload = json_decode(file_get_contents('php://input'), true) ?? [];

        // Assuming you have a Validator class and rules() method for user validation
        $validation = Validator::validate($payload, $this->rules(true));
        if ($validation->fails()) {
            return JsonResponse::error('Validation failed', 422, $validation->messages());
        }

        $userModel = new User();
        $updated = $userModel->update($userId, $payload);

        if (!$updated) {
            return JsonResponse::error('User not found or no changes detected', 404);
        }

        return JsonResponse::success(['message' => 'User updated successfully']);
    }

    public function store(array $params): array
    {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $payload = [
            'username'   => $input['username'] ?? null,
            'password'   => $input['password'] ?? null,
            'role'       => $input['role'] ?? null,
            'first_name' => $input['firstName'] ?? null,
            'last_name'  => $input['lastName'] ?? null,
            'phone'      => $input['phone'] ?? null,
            'email'      => $input['email'] ?? null,
        ];

        $validation = Validator::validate($payload, $this->rules());
        if ($validation->fails()) {
            return JsonResponse::error('Validation failed', 422, $validation->messages());
        }

        $user = $this->users->create($payload, $params['user']['id']);

        return JsonResponse::success(['user' => $user], 201);
    }

    private function rules(bool $isUpdate = false): array
    {
        return [
            'email' => v::email()->notEmpty(),
            'first_name' => v::stringType()->notEmpty(),
            'last_name' => v::stringType()->notEmpty(),
            'phone' => v::optional(v::phone()),
            'role' => v::in(['user', 'admin'])->notEmpty(),
        ];
    }
    public function destroy(array $params): array
    {
        $id = $params['routeParams']['id'] ?? null;

        if (!$id) {
            return JsonResponse::error('Missing user id', 400);
        }

        $userModel = new User();

        $deleted = $userModel->delete($id);  // only id

        if (!$deleted) {
            return JsonResponse::error('User not found', 404);
        }

        return JsonResponse::success(['message' => 'User deleted']);
    }


}