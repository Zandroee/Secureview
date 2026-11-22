<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class SingleLoginSessionService
{
    public const SESSION_TOKEN_KEY = 'secureview_active_login_token';
    public const SESSION_USER_ID_KEY = 'secureview_active_login_user_id';

    public static function cacheKey(int|string $userId): string
    {
        return 'secureview:active-login-session:' . $userId;
    }

    /**
     * Sign the user in and make this the only active browser/device session.
     */
    public function login(Request $request, User $user, bool $remember = false): void
    {
        // Rotating this token invalidates remember-me cookies from previous logins.
        $user->forceFill([
            'remember_token' => Str::random(60),
        ])->save();

        Auth::login($user, $remember);
        $request->session()->regenerate();

        $this->setActiveSession($request, $user);
    }

    /**
     * Restore a session from the current remember-me cookie after normal expiry.
     * Login rotates remember_token, so old devices' remember-me cookies no longer work.
     */
    public function restoreRememberedSession(Request $request, User $user): void
    {
        // Reissue a remember-me cookie with a rotated token, so a second browser
        // holding an old remember-me cookie cannot take over the active session.
        $this->login($request, $user, true);
    }

    public function hasActiveSession(User $user): bool
    {
        return is_string(Cache::get(self::cacheKey($user->getAuthIdentifier())));
    }

    public function isCurrent(Request $request, User $user): bool
    {
        $sessionToken = $request->session()->get(self::SESSION_TOKEN_KEY);
        $sessionUserId = $request->session()->get(self::SESSION_USER_ID_KEY);
        $activeToken = Cache::get(self::cacheKey($user->getAuthIdentifier()));

        return is_string($sessionToken)
            && $sessionToken !== ''
            && (string) $sessionUserId === (string) $user->getAuthIdentifier()
            && is_string($activeToken)
            && hash_equals($activeToken, $sessionToken);
    }

    /**
     * Invalidate a stale browser without rotating the current login's remember token.
     */
    public function invalidateStaleSession(Request $request, User $user): string
    {
        $sessionToken = $request->session()->get(self::SESSION_TOKEN_KEY);
        $activeToken = Cache::get(self::cacheKey($user->getAuthIdentifier()));

        if (!is_string($activeToken)) {
            // If the shared active-session record disappeared, invalidate any old
            // remember-me cookie before clearing this session to avoid auto-login loops.
            $user->forceFill([
                'remember_token' => Str::random(60),
            ])->save();
        }

        $message = is_string($sessionToken) && is_string($activeToken)
            ? 'You were signed out because your account was logged in on another device or browser.'
            : 'Please sign in again to activate SecureView’s updated login-session protection.';

        $request->session()->invalidate();
        $request->session()->regenerateToken();
        Auth::forgetGuards();

        return $message;
    }

    public function forgetIfCurrent(Request $request, ?User $user): void
    {
        if (!$user) {
            return;
        }

        $sessionToken = $request->session()->get(self::SESSION_TOKEN_KEY);
        $cacheKey = self::cacheKey($user->getAuthIdentifier());
        $activeToken = Cache::get($cacheKey);

        $sessionUserId = $request->session()->get(self::SESSION_USER_ID_KEY);

        if (
            is_string($sessionToken)
            && (string) $sessionUserId === (string) $user->getAuthIdentifier()
            && is_string($activeToken)
            && hash_equals($activeToken, $sessionToken)
        ) {
            Cache::forget($cacheKey);
        }
    }

    private function setActiveSession(Request $request, User $user): void
    {
        $token = Str::random(64);

        Cache::forever(self::cacheKey($user->getAuthIdentifier()), $token);
        $request->session()->put(self::SESSION_TOKEN_KEY, $token);
        $request->session()->put(self::SESSION_USER_ID_KEY, $user->getAuthIdentifier());
    }
}
