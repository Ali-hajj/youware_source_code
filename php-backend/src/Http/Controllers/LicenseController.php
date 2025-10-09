<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\License;
use App\Support\JsonResponse;
use App\Support\Validator;
use Ramsey\Uuid\Uuid;
use Respect\Validation\Validator as v;

final class LicenseController
{
    private License $licenses;

    public function __construct()
    {
        $this->licenses = new License();
    }

    public function index(): array
    {
        $records = $this->licenses->all();

        return JsonResponse::success(['licenses' => $records]);
    }

    public function store(): array
    {
        $payload = json_decode(file_get_contents('php://input'), true) ?? [];

        $rules = [
            'key_value'    => v::stringType()->length(10, 191),
            'company_name' => v::optional(v::stringType()->length(null, 255)),
            'expires_at'   => v::optional(v::date('Y-m-d')),
            'seats'        => v::optional(v::intType()->min(1)),
            'status'       => v::optional(v::in(['active', 'expired', 'revoked'])),
        ];

        $validation = Validator::validate($payload, $rules);
        if ($validation->fails()) {
            return JsonResponse::error('Validation failed', 422, $validation->messages());
        }

        $payload['id'] = Uuid::uuid4()->toString();

        $license = $this->licenses->create($payload);

        return JsonResponse::success(['license' => $license], 201);
    }

    public function verify(): array
    {
        $payload = json_decode(file_get_contents('php://input'), true) ?? [];

        $rules = [
            'key_value' => v::stringType()->notEmpty(),
        ];

        $validation = Validator::validate($payload, $rules);
        if ($validation->fails()) {
            return JsonResponse::error('Validation failed', 422, $validation->messages());
        }

        $license = $this->licenses->findByKey($payload['key_value']);

        if (!$license) {
            return JsonResponse::error('License not found', 404);
        }

        $isExpired = $license['expires_at'] && strtotime($license['expires_at']) < time();

        return JsonResponse::success([
            'license'    => $license,
            'is_valid'   => $license['status'] === 'active' && !$isExpired,
            'is_expired' => $isExpired,
        ]);
    }
}
