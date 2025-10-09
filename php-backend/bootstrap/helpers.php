<?php

declare(strict_types=1);

use Monolog\Handler\StreamHandler;
use Monolog\Logger;

if (!function_exists('logger')) {
    function logger(): Logger
    {
        static $logger = null;

        if ($logger === null) {
            $logger = new Logger('app');
            $logPath = dirname(__DIR__) . '/storage/logs/app.log';
            $handler = new StreamHandler($logPath, Logger::DEBUG);
            $logger->pushHandler($handler);
        }

        return $logger;
    }
}
