<?php

declare(strict_types=1);

namespace App\Http;

use App\Http\Controllers\AuthController;
use App\Http\Controllers\EventController;
use App\Http\Controllers\LicenseController;
use App\Http\Middleware\AuthMiddleware;
use App\Http\Middleware\CorsMiddleware;
use App\Support\JsonResponse;

final class Router
{
    private array $routes = [];

    private array $middlewareStack = [];

    private string $currentPrefix = '';

    public function registerRoutes(): void
    {
        $this->group('/api', function (): void {
            $this->get('/health', [AuthController::class, 'health']);
            $this->post('/auth/signup', [AuthController::class, 'signup']);
            $this->post('/auth/login', [AuthController::class, 'login']);
            $this->post('/auth/reset-password', [AuthController::class, 'resetPassword']);

            $this->middleware([AuthMiddleware::class], function (): void {
                $this->get('/auth/me', [AuthController::class, 'me']);
                $this->get('/events', [EventController::class, 'index']);
                $this->get('/events/{id}', [EventController::class, 'show']);
                $this->post('/events', [EventController::class, 'store']);
                $this->put('/events/{id}', [EventController::class, 'update']);
                $this->delete('/events/{id}', [EventController::class, 'destroy']);

                $this->get('/licenses', [LicenseController::class, 'index']);
                $this->post('/licenses', [LicenseController::class, 'store']);
                $this->post('/licenses/check', [LicenseController::class, 'verify']);
            });
        });
    }

    public function get(string $path, callable|array $handler): void
    {
        $this->addRoute('GET', $path, $handler);
    }

    public function post(string $path, callable|array $handler): void
    {
        $this->addRoute('POST', $path, $handler);
    }

    public function put(string $path, callable|array $handler): void
    {
        $this->addRoute('PUT', $path, $handler);
    }

    public function delete(string $path, callable|array $handler): void
    {
        $this->addRoute('DELETE', $path, $handler);
    }

    private function addRoute(string $method, string $path, callable|array $handler): void
    {
        $normalized = $this->normalizePath($this->currentPrefix . '/' . ltrim($path, '/'));
        $this->routes[$method][$normalized] = [
            'handler'     => $handler,
            'middleware'  => $this->middlewareStack,
        ];
    }

    public function group(string $prefix, callable $callback): void
    {
        $previousPrefix = $this->currentPrefix;
        $this->currentPrefix = $this->normalizePath($previousPrefix . '/' . ltrim($prefix, '/'));

        $callback();

        $this->currentPrefix = $previousPrefix;
    }

    public function middleware(array $middleware, callable $callback): void
    {
        $this->middlewareStack[] = $middleware;
        $callback();
        array_pop($this->middlewareStack);
    }

    private function normalizePath(string $path): string
    {
        $path = '/' . trim($path, '/');
        return $path === '/' ? $path : rtrim($path, '/');
    }

    public function handle(string $method, string $uri): void
    {
        CorsMiddleware::handle();

        $path = parse_url($uri, PHP_URL_PATH) ?: '/';

        $route = $this->match($method, $path);

        if (!$route) {
            JsonResponse::send(['success' => false, 'message' => 'Route not found'], 404);
            return;
        }

        $response = $this->runRoute($route);

        JsonResponse::send($response['body'], $response['status']);
    }

    private function match(string $method, string $uri): ?array
    {
        if (!isset($this->routes[$method])) {
            return null;
        }

        foreach ($this->routes[$method] as $route => $data) {
            $pattern = preg_replace('#\{[^/]+\}#', '([^/]+)', $route);
            $pattern = '#^' . $pattern . '$#';

            if (preg_match($pattern, $uri, $matches)) {
                array_shift($matches);
                $data['params'] = $this->extractParams($route, $matches);
                return $data;
            }
        }

        return null;
    }

    private function extractParams(string $route, array $matches): array
    {
        $params = [];
        preg_match_all('#\{([^/]+)\}#', $route, $keys);

        foreach ($keys[1] as $index => $key) {
            $params[$key] = $matches[$index] ?? null;
        }

        return $params;
    }

    private function runRoute(array $route): array
    {
        $handler = $route['handler'];
        $params = [
            'routeParams' => $route['params'] ?? [],
        ];

        $middlewareQueue = array_merge(...$route['middleware']);

        $next = function (array $params) use ($handler): array {
            if (is_array($handler)) {
                [$class, $method] = $handler;
                $instance = new $class();
                return $instance->$method($params);
            }

            return $handler($params);
        };

        while ($middleware = array_pop($middlewareQueue)) {
            $middlewareInstance = new $middleware();
            $next = fn($params) => $middlewareInstance->handle($next, $params);
        }

        return $next($params);
    }
}
