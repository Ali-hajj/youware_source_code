<?php

declare(strict_types=1);

$router = require __DIR__ . '/../bootstrap/app.php';

$router->handle($_SERVER['REQUEST_METHOD'], $_SERVER['REQUEST_URI']);
