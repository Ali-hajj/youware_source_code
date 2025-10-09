<?php

require_once 'bootstrap/app.php';

use App\Config\Database;

try {
    // First, create the database if it doesn't exist
    $host = $_ENV['DB_HOST'] ?? 'localhost';
    $username = $_ENV['DB_USER'] ?? 'root';
    $password = $_ENV['DB_PASS'] ?? '';
    $dbname = $_ENV['DB_NAME'] ?? 'eventdb';
    
    $pdo = new PDO("mysql:host={$host};charset=utf8mb4", $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    
    // Drop and recreate database to ensure clean state
    $pdo->exec("DROP DATABASE IF EXISTS `{$dbname}`");
    $pdo->exec("CREATE DATABASE `{$dbname}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    echo "Database '{$dbname}' recreated!\n";
    
    // Now connect to the specific database
    $pdo = Database::connection();
    
    // Read and execute schema
    $schema = file_get_contents(__DIR__ . '/database/schema.sql');
    $pdo->exec($schema);
    echo "Schema created successfully!\n";
    
    // Read and execute seed data
    $seed = file_get_contents(__DIR__ . '/database/seed.sql');
    $pdo->exec($seed);
    echo "Seed data inserted successfully!\n";
    
    echo "Database setup completed successfully!\n";
    echo "Admin credentials:\n";
    echo "Email: admin@example.com\n";
    echo "Password: Admin123!\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}