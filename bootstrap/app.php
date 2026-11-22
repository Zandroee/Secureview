<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Http\Request;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\EnforceSingleLoginSession;
use App\Http\Middleware\EnsureUserIsAdmin;
use App\Http\Middleware\EnsureUserIsTechnician;
use App\Http\Middleware\SecurityHeaders;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withCommands([
        \App\Console\Commands\ClearProductPackageReferences::class,
    ])
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->append(SecurityHeaders::class);

        $middleware->web(append: [
            HandleInertiaRequests::class,
            EnforceSingleLoginSession::class,
        ]);

        $middleware->alias([
            'admin' => EnsureUserIsAdmin::class,
            'technician' => EnsureUserIsTechnician::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(function (ThrottleRequestsException $exception, Request $request) {
            $headers = $exception->getHeaders();
            $retryAfter = max(1, (int) ($headers['Retry-After'] ?? 60));
            $message = 'We received several requests in a short time. Please wait about '
                . $retryAfter
                . ' seconds before trying again. Your account was not changed by this request.';

            // Inertia expects a redirect back to a valid page response. Returning
            // Laravel's raw HTML 429 page here makes Inertia show its error modal.
            if ($request->header('X-Inertia')) {
                return redirect()->back(303)->with('rateLimitMessage', $message);
            }

            if ($request->expectsJson()) {
                return response()->json([
                    'message' => $message,
                    'retry_after' => $retryAfter,
                ], 429, $headers);
            }

            return response()->view('errors.429', [
                'retryAfter' => $retryAfter,
            ], 429, $headers);
        });
    })->create();
    
