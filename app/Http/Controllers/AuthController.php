<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\AdminActivityLogger;
use App\Services\SingleLoginSessionService;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rules\Password;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;
use Illuminate\Support\Facades\Cache;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $validated = $request->validate([
            'firstName' => ['required', 'string', 'max:50'],
            'lastName' => ['required', 'string', 'max:50'],
            'phone' => [
                'required',
                'string',
                'regex:/^09\d{9}$/',
                'unique:users,phone',
            ],
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                'unique:users,email',
            ],
            'password' => [
                'required',
                'confirmed',
                Password::min(8)
                    ->mixedCase()
                    ->numbers()
                    ->symbols(),
            ],
            'terms' => ['accepted'],
        ], [
            'phone.unique' => 'This phone number is already registered.',
            'email.unique' => 'This email address is already registered.',
            'terms.accepted' => 'You must accept the Terms and Conditions.',
        ]);

        $user = User::create([
            'name' => trim($validated['firstName'] . ' ' . $validated['lastName']),
            'email' => $validated['email'],
            'phone' => $validated['phone'],
            'password' => $validated['password'],
            'role' => 'user',
            'terms_accepted_at' => now(),
            'terms_version' => '1.0',
        ]);

        event(new Registered($user));

        return redirect()->route('signup')->with([
            'verificationSent' => true,
            'verificationEmail' => $user->email,
        ]);
    }

    public function authenticate(Request $request, AdminActivityLogger $activityLogger, SingleLoginSessionService $singleLoginSession)
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required'],
            'remember' => ['sometimes', 'boolean'],
        ]);

        // Keep the remember flag out of credential validation; it is not a user-table column.
        $loginCredentials = [
            'email' => $credentials['email'],
            'password' => $credentials['password'],
        ];
        $user = User::where('email', $loginCredentials['email'])->first();

        if (!$user) {
            return back()->withErrors([
                'email' => 'The provided credentials are incorrect.',
            ])->onlyInput('email');
        }

        // Check the password without logging the user in.
        if (!Auth::validate($loginCredentials)) {
            return back()->withErrors([
                'email' => 'The provided credentials are incorrect.',
            ])->onlyInput('email');
        }

        // Correct password, but email is still unverified.
        if (!$user->hasVerifiedEmail()) {
            $cooldownKey = 'verification-email-cooldown:' . $user->id;

            if (Cache::add($cooldownKey, true, now()->addSeconds(60))) {
                $user->sendEmailVerificationNotification();
            }

            return redirect()->route('verification.notice')->with([
                'verificationSent' => true,
                'verificationEmail' => $user->email,
            ]);
        }

        // Only verified users are actually logged in. Starting a new login
        // replaces the previous active browser/device session.
        $singleLoginSession->login($request, $user, $request->boolean('remember'));

        $activityLogger->record(
            $request,
            $user->isAdmin() ? 'admin_logged_in' : ($user->isTechnician() ? 'technician_logged_in' : 'user_logged_in'),
            $user->isAdmin()
                ? 'Administrator signed in successfully.'
                : ($user->isTechnician() ? 'Technician signed in successfully.' : 'User signed in successfully.'),
            $user
        );

        if ($user->isAdmin()) {
            return redirect()->route('dashboard');
        }

        if ($user->isTechnician()) {
            return redirect()->route('technician.dashboard');
        }

        return redirect()->intended('/');
    }

    public function logout(Request $request, AdminActivityLogger $activityLogger, SingleLoginSessionService $singleLoginSession)
    {
        $actor = $request->user();

        $activityLogger->record(
            $request,
            $actor?->isAdmin() ? 'admin_logged_out' : ($actor?->isTechnician() ? 'technician_logged_out' : 'user_logged_out'),
            $actor?->isAdmin()
                ? 'Administrator signed out.'
                : ($actor?->isTechnician() ? 'Technician signed out.' : 'User signed out.'),
            $actor
        );

        $singleLoginSession->forgetIfCurrent($request, $actor);

        Auth::logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }

    public function redirectGoogle()
    {
        return Socialite::driver('google')->redirect();
    }

    public function googleCallback(Request $request, AdminActivityLogger $activityLogger, SingleLoginSessionService $singleLoginSession)
    {
        $googleUser = Socialite::driver('google')->user();

        $user = User::where('google_id', $googleUser->id)
            ->orWhere('email', $googleUser->email)
            ->first();

        if (!$user) {
            $user = User::create([
                'name' => $googleUser->name ?? 'Google User',
                'email' => $googleUser->email,
                'google_id' => $googleUser->id,
                'password' => Str::random(40),
                'role' => 'user',
            ]);

            // email_verified_at is intentionally not mass assignable, so set it
            // explicitly for an account authenticated through the OAuth provider.
            $user->forceFill(['email_verified_at' => now()])->save();
        } else {
            if (!$user->google_id) {
                $user->google_id = $googleUser->id;
            }

            if (!$user->email_verified_at) {
                $user->email_verified_at = now();
            }

            $user->save();
        }

        $singleLoginSession->login($request, $user);

        $activityLogger->record(
            $request,
            $user->isAdmin() ? 'admin_logged_in' : ($user->isTechnician() ? 'technician_logged_in' : 'user_logged_in'),
            $user->isAdmin()
                ? 'Administrator signed in successfully with Google.'
                : ($user->isTechnician() ? 'Technician signed in successfully with Google.' : 'User signed in successfully with Google.'),
            $user
        );

        if ($user->isAdmin()) {
            return redirect()->route('dashboard');
        }

        if ($user->isTechnician()) {
            return redirect()->route('technician.dashboard');
        }

        return redirect('/');
    }

    public function redirectFacebook()
    {
        return Socialite::driver('facebook')
            ->scopes(['public_profile', 'email'])
            ->redirect();
    }

    public function facebookCallback(Request $request, AdminActivityLogger $activityLogger, SingleLoginSessionService $singleLoginSession)
    {
        $facebookUser = Socialite::driver('facebook')->user();

        $user = User::where('facebook_id', $facebookUser->id)
            ->orWhere('email', $facebookUser->email)
            ->first();

        if (!$user) {
            $user = User::create([
                'name' => $facebookUser->name ?? 'Facebook User',
                'email' => $facebookUser->email,
                'facebook_id' => $facebookUser->id,
                'password' => Str::random(40),
                'role' => 'user',
            ]);

            // email_verified_at is intentionally not mass assignable, so set it
            // explicitly for an account authenticated through the OAuth provider.
            $user->forceFill(['email_verified_at' => now()])->save();
        } else {
            if (!$user->facebook_id) {
                $user->facebook_id = $facebookUser->id;
            }

            if (!$user->email_verified_at) {
                $user->email_verified_at = now();
            }

            $user->save();
        }

        Auth::login($user);

        $request->session()->regenerate();

        $activityLogger->record(
            $request,
            $user->isAdmin() ? 'admin_logged_in' : ($user->isTechnician() ? 'technician_logged_in' : 'user_logged_in'),
            $user->isAdmin()
                ? 'Administrator signed in successfully with Facebook.'
                : ($user->isTechnician() ? 'Technician signed in successfully with Facebook.' : 'User signed in successfully with Facebook.'),
            $user
        );

        if ($user->isAdmin()) {
            return redirect()->route('dashboard');
        }

        if ($user->isTechnician()) {
            return redirect()->route('technician.dashboard');
        }

        return redirect('/');
    }
}