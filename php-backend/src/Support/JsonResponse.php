<?php

declare(strict_types=1);

namespace App\Support;

final class JsonResponse
{
    public static function success(array $data = [], int $status = 200): array
    {
        return [
            'status' => $status,
            'body'   => array_merge(['success' => true], $data),
        ];
    }

    public static function error(string $message, int $status = 400, array $errors = []): array
    {
        return [
            'status' => $status,
            'body'   => [
                'success' => false,
                'message' => $message,
                'errors'  => $errors,
            ],
        ];
    }

    public static function send(array $body, int $status): void
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($body);
        exit;
    }
}
