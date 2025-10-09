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
            // Use MySQL from environment variables
            $host = $_ENV['DB_HOST'] ?? 'localhost';
            $dbname = $_ENV['DB_NAME'] ?? 'eventdb';
            $username = $_ENV['DB_USER'] ?? 'eventUser';
            $password = $_ENV['DB_PASS'] ?? 'password123';
            
            $dsn = "mysql:host={$host};dbname={$dbname};charset=utf8mb4";

            try {
                self::$connection = new PDO(
                    $dsn,
                    $username,
                    $password,
                    [
                        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
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
