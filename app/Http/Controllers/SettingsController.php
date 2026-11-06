<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class SettingsController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('Settings', [
            'settings' => [
                'name' => $request->user()->name,
                'email' => $request->user()->email,
                'phone' => $request->user()->phone,
                'preferred_theme' => $request->user()->preferred_theme ?? 'system',
                'notification_popups_enabled' => (bool) ($request->user()->notification_popups_enabled ?? true),
                'newsletter_opt_in' => (bool) ($request->user()->newsletter_opt_in ?? false),
            ],
        ]);
    }

    public function updateProfile(Request $request): RedirectResponse
    {
        $user = $request->user();
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'phone' => [
                'nullable',
                'string',
                'regex:/^09\d{9}$/',
                Rule::unique('users', 'phone')->ignore($user->id),
            ],
        ], [
            'phone.regex' => 'Enter a valid Philippine mobile number in 09XXXXXXXXX format.',
            'phone.unique' => 'This phone number is already registered to another account.',
        ]);

        $user->update($validated);

        return back()->with('success', 'Profile settings saved.');
    }

    public function updatePreferences(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'preferred_theme' => ['required', Rule::in(['system', 'light', 'dark'])],
            'notification_popups_enabled' => ['required', 'boolean'],
            'newsletter_opt_in' => ['sometimes', 'boolean'],
        ]);

        $user = $request->user();
        $changes = [
            'preferred_theme' => $validated['preferred_theme'],
            'notification_popups_enabled' => (bool) $validated['notification_popups_enabled'],
        ];

        if (array_key_exists('newsletter_opt_in', $validated)) {
            $wantsNewsletter = (bool) $validated['newsletter_opt_in'];
            $wasSubscribed = (bool) $user->newsletter_opt_in;

            $changes['newsletter_opt_in'] = $wantsNewsletter;
            if ($wantsNewsletter && !$wasSubscribed) {
                $changes['newsletter_opted_in_at'] = now();
                $changes['newsletter_opted_out_at'] = null;
            } elseif (!$wantsNewsletter && $wasSubscribed) {
                $changes['newsletter_opted_out_at'] = now();
            }
        }

        $user->update($changes);

        return back()->with('success', 'Appearance and notification preferences saved.');
    }

    public function updatePassword(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'current_password' => ['required', 'current_password'],
            'password' => [
                'required',
                'confirmed',
                Password::min(8)->mixedCase()->numbers()->symbols(),
            ],
        ], [
            'current_password.current_password' => 'The current password you entered is incorrect.',
            'password.confirmed' => 'The new password confirmation does not match.',
        ]);

        $request->user()->update([
            'password' => Hash::make($validated['password']),
        ]);

        return back()->with('success', 'Password updated successfully.');
    }
}
