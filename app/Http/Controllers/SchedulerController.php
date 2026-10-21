<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Throwable;

class SchedulerController extends Controller
{
    /**
     * Evaluate the Laravel scheduler for trusted external cron invocations.
     *
     * Vercel and other serverless environments do not keep a Laravel scheduler
     * process running between HTTP requests, so access must be authenticated
     * with a dedicated bearer secret.
     */
    public function run(Request $request): JsonResponse
    {
        $expectedSecret = (string) config('services.cron.secret', '');
        $providedSecret = (string) $request->bearerToken();

        if (
            $expectedSecret === ''
            || $providedSecret === ''
            || !hash_equals($expectedSecret, $providedSecret)
        ) {
            return response()
                ->json(['message' => 'Unauthenticated.'], 401)
                ->header('Cache-Control', 'no-store');
        }

        try {
            $exitCode = Artisan::call('schedule:run');

            if ($exitCode !== 0) {
                report(new \RuntimeException(
                    'The scheduled task runner exited with code ' . $exitCode . '.'
                ));

                return response()
                    ->json(['message' => 'Scheduler execution failed.'], 500)
                    ->header('Cache-Control', 'no-store');
            }
        } catch (Throwable $exception) {
            report($exception);

            return response()
                ->json(['message' => 'Scheduler execution failed.'], 500)
                ->header('Cache-Control', 'no-store');
        }

        return response()
            ->json(['message' => 'Scheduler evaluated.'])
            ->header('Cache-Control', 'no-store');
    }
}
