<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\EmailVerificationCodeService;
use App\Services\AdminActivityLogger;
use App\Services\SingleLoginSessionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rules\Password;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;
use Illuminate\Support\Facades\Log;

class AuthController extends Controller
{
    public function register(Request $request, EmailVerificationCodeService $verificationCodes)
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

        try {
            $codeSent = $verificationCodes->send($user);
        } catch (\Throwable $exception) {
            $codeSent = false;
            Log::warning('SecureView account was created but its verification code could not be sent.', [
                'user_id' => $user->id,
                'exception' => get_class($exception),
            ]);
        }

        return redirect()->route('verification.notice')->with([
            'verificationEmail' => $user->email,
            'status' => $codeSent
                ? 'We sent a six-digit verification code to your email address. It expires in 10 minutes.'
                : 'Your account was created, but we could not send a code right now. Use Resend verification code below to try again.',
        ]);
    }

    public function authenticate(Request $request, AdminActivityLogger $activityLogger, SingleLoginSessionService $singleLoginSession, EmailVerificationCodeService $verificationCodes)
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

        // Correct password, but email is still unverified. Send a code without logging the user in.
        if (!$user->hasVerifiedEmail()) {
            try {
                $codeSent = $verificationCodes->send($user);
            } catch (\Throwable $exception) {
                $codeSent = false;
                Log::warning('SecureView login could not send an email verification code.', [
                    'user_id' => $user->id,
                    'exception' => get_class($exception),
                ]);
            }

            return redirect()->route('verification.notice')->with([
                'verificationEmail' => $user->email,
                'status' => $codeSent
                    ? 'Your password is correct. We sent a six-digit code to verify your email before you log in.'
                    : 'Your email is not verified yet. Check your inbox for the current code, or request a new one below.',
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

        $singleLoginSession->login($request, $user);

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