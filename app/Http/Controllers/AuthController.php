<?php

namespace App\Http\Controllers;

use App\Models\User;
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

    public function authenticate(Request $request)
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required'],
        ]);

        $user = User::where('email', $credentials['email'])->first();

        if (!$user) {
            return back()->withErrors([
                'email' => 'Account does not exist.',
            ])->onlyInput('email');
        }

        // Check the password without logging the user in.
        if (!Auth::validate($credentials)) {
            return back()->withErrors([
                'password' => 'Incorrect password.',
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

        // Only verified users are actually logged in.
        Auth::login($user);

        $request->session()->regenerate();

        return $user->isAdmin()
            ? redirect()->route('dashboard')
            : redirect()->intended('/');
    }

    public function logout(Request $request)
    {
        Auth::logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }

    public function redirectGoogle()
    {
        return Socialite::driver('google')->redirect();
    }

    public function googleCallback()
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
                'email_verified_at' => now(),
            ]);
        } else {
            if (!$user->google_id) {
                $user->google_id = $googleUser->id;
            }

            if (!$user->email_verified_at) {
                $user->email_verified_at = now();
            }

            $user->save();
        }

        Auth::login($user);

        request()->session()->regenerate();

        return $user->isAdmin()
            ? redirect()->route('dashboard')
            : redirect('/');
    }

    public function redirectFacebook()
    {
        return Socialite::driver('facebook')
            ->scopes(['public_profile', 'email'])
            ->redirect();
    }

    public function facebookCallback()
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
                'email_verified_at' => now(),
            ]);
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

        request()->session()->regenerate();

        return $user->isAdmin()
            ? redirect()->route('dashboard')
            : redirect('/');
    }
}