<?php

declare(strict_types=1);

namespace App\Http\Middleware;

final class CorsMiddleware
{
    public static function handle(): void
    {
        $allowedOrigins = array_map('trim', explode(',', $_ENV['CORS_ALLOWED_ORIGINS'] ?? '*'));
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

        if ($origin && (in_array('*', $allowedOrigins, true) || in_array($origin, $allowedOrigins, true))) {
            header("Access-Control-Allow-Origin: {$origin}");
            header('Access-Control-Allow-Credentials: true');
        } else {
            header('Access-Control-Allow-Origin: *');
        }

        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization');
        header('Access-Control-Max-Age: 86400');

        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(204);
            exit;
        }
    }
}
