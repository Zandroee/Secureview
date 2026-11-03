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

        RateLimiter::for('register', function (Request $request): Limit {
            return Limit::perMinute(5)->by($request->ip());
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
