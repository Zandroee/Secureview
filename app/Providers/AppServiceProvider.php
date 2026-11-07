<?php

namespace App\Providers;

use App\Models\Order;
use App\Observers\OrderObserver;
use Illuminate\Support\ServiceProvider;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        RateLimiter::for('login', function (Request $request): Limit {
            $email = Str::lower(trim((string) $request->input('email', '')));

            return Limit::perMinute(5)->by(
                hash('sha256', $request->ip() . '|' . $email)
            );
        });

        RateLimiter::for('register', function (Request $request): array {
            $sessionId = $request->hasSession()
                ? $request->session()->getId()
                : 'no-session';
            $ip = (string) ($request->ip() ?? 'unknown');

            return [
                // Allow a visitor to correct and resubmit a form without a very
                // tight IP-only limit blocking everyone on a shared network.
                Limit::perMinute(10)->by('register:session:' . hash('sha256', $sessionId)),
                Limit::perMinutes(10, 60)->by('register:ip:' . $ip),
            ];
        });

        RateLimiter::for('password-reset', function (Request $request): array {
            $email = Str::lower(trim((string) $request->input('email', '')));
            $ip = (string) ($request->ip() ?? 'unknown');

            $limits = [
                // Permit normal bursts from schools, offices, and mobile networks.
                Limit::perMinute(20)->by('password-reset:ip:' . $ip),
            ];

            if ($email !== '') {
                // Prevent repeated reset-email requests for one account.
                Limit::perHour(10)->by(
                    'password-reset:email:' . hash('sha256', $email)
                );
            }

            return $limits;
        });

        // Autocomplete can make one request for each settled search phrase.
        // Bound each browser session separately, with a higher IP-wide ceiling
        // to retain abuse protection without penalizing visitors behind shared networks.
        RateLimiter::for('catalog-search', function (Request $request): array {
            $sessionId = $request->hasSession()
                ? $request->session()->getId()
                : 'no-session';
            $ip = (string) ($request->ip() ?? 'unknown');

            return [
                Limit::perMinute(180)->by('catalog-search:session:' . $sessionId),
                Limit::perMinute(1200)->by('catalog-search:ip:' . $ip),
            ];
        });

        Order::observe(OrderObserver::class);
    }
}
