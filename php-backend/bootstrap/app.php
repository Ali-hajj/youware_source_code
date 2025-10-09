<?php

declare(strict_types=1);

use App\Http\Router;
use Dotenv\Dotenv;

require __DIR__ . '/../vendor/autoload.php';

$dotenv = Dotenv::createImmutable(dirname(__DIR__));
$dotenv->safeLoad();

date_default_timezone_set($_ENV['APP_TIMEZONE'] ?? 'UTC');

$router = new Router();
$router->registerRoutes();

return $router;
