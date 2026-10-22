<?php

namespace App\Http\Middleware;

use App\Models\User;
use App\Services\SingleLoginSessionService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnforceSingleLoginSession
{
    public function __construct(
        private readonly SingleLoginSessionService $singleLoginSession
    ) {
    }

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user instanceof User) {
            return $next($request);
        }

        if ($this->singleLoginSession->isCurrent($request, $user)) {
            return $next($request);
        }

        $sessionHasToken = $request->session()->has(
            SingleLoginSessionService::SESSION_TOKEN_KEY
        );
        $sessionUserId = $request->session()->get(
            SingleLoginSessionService::SESSION_USER_ID_KEY
        );
        $sessionBelongsToUser = (string) $sessionUserId ===
            (string) $user->getAuthIdentifier();
        $activeSessionExists = $this->singleLoginSession->hasActiveSession($user);

        // Existing sessions from before this feature, and test/browser auth switches
        // that did not go through AuthController, can claim a token only if the account
        // has no active session. This does not allow a stale token to replace an active one.
        if (
            !$activeSessionExists
            && (!$sessionHasToken || !$sessionBelongsToUser)
        ) {
            $this->singleLoginSession->login(
                $request,
                $user,
                Auth::guard()->viaRemember()
            );

            return $next($request);
        }

        // A valid remember-me cookie belongs to the latest successful login because
        // SingleLoginSessionService rotates the database remember token at each login.
        // Let that same browser recreate its session after the regular session expires.
        if (
            !$sessionHasToken
            && Auth::guard()->viaRemember()
        ) {
            $this->singleLoginSession->restoreRememberedSession($request, $user);

            return $next($request);
        }

        $message = $this->singleLoginSession->invalidateStaleSession($request, $user);

        return redirect()->route('login')->with('status', $message);
    }
}
