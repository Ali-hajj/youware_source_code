<?php

declare(strict_types=1);

namespace App\Config;

use PDO;
use PDOException;

final class Database
{
    private static ?PDO $connection = null;

    public static function connection(): PDO
    {
        if (self::$connection === null) {
            $dsn = sprintf(
                'mysql:host=%s;dbname=%s;port=%s;charset=utf8mb4',
                $_ENV['DB_HOST'],
                $_ENV['DB_NAME'],
                $_ENV['DB_PORT'] ?? '3306'
            );

            try {
                self::$connection = new PDO(
                    $dsn,
                    $_ENV['DB_USER'],
                    $_ENV['DB_PASS'],
                    [
                        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    ]
                );
            } catch (PDOException $e) {
                logger()->error('Database connection failed', ['error' => $e->getMessage()]);
                throw $e;
            }
        }

        return self::$connection;
    }
}
