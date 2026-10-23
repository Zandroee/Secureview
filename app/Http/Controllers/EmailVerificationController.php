<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\EmailVerificationCodeService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class EmailVerificationController extends Controller
{
    public function show(Request $request, EmailVerificationCodeService $codes): Response
    {
        $sessionEmail = (string) $request->session()->get('verificationEmail', '');
        $email = (string) $request->query('email', $sessionEmail);
        $user = $email !== '' ? User::where('email', $email)->first() : null;
        $emailMatchesFlashSession = $sessionEmail !== ''
            && strcasecmp($sessionEmail, $email) === 0;

        return Inertia::render('verify-email', [
            'email' => $email,
            // Do not reveal another address's verification state through a public query parameter.
            'resendCooldownSeconds' => $emailMatchesFlashSession && $user && !$user->hasVerifiedEmail()
                ? $codes->resendCooldownRemaining($user)
                : 0,
        ]);
    }

    public function verify(Request $request, EmailVerificationCodeService $codes): RedirectResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'code' => ['required', 'regex:/^\d{6}$/'],
        ], [
            'code.required' => 'Enter the six-digit verification code from your email.',
            'code.regex' => 'The verification code must contain exactly six digits.',
        ]);

        $user = User::where('email', trim($validated['email']))->first();

        if (!$user) {
            return back()->withErrors([
                'code' => 'The verification code is invalid or has expired.',
            ])->withInput(['email' => $validated['email']]);
        }

        if ($user->hasVerifiedEmail()) {
            return redirect()->route('login')->with(
                'status',
                'This email address is already verified. You can now log in.'
            );
        }

        $result = $codes->verify($user, $validated['code']);

        if (!$result['verified']) {
            return back()->withErrors([
                'code' => $result['message'],
            ])->withInput(['email' => $user->email]);
        }

        return redirect()->route('login')->with(
            'status',
            'Your email has been verified successfully. You can now log in.'
        );
    }

    public function resend(Request $request, EmailVerificationCodeService $codes): RedirectResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email', 'max:255'],
        ]);

        $user = User::where('email', trim($validated['email']))->first();

        if ($user && !$user->hasVerifiedEmail()) {
            try {
                $codes->send($user);
            } catch (\Throwable $exception) {
                Log::warning('SecureView email verification code could not be sent.', [
                    'user_id' => $user->id,
                    'exception' => get_class($exception),
                ]);
            }
        }

        // Keep the message generic so this endpoint cannot be used to discover registered accounts.
        return redirect()->route('verification.notice')->with([
            'verificationEmail' => trim($validated['email']),
            'message' => 'If this address belongs to an unverified SecureView account, a code will be sent when resend is available. Check your inbox and spam folder. You may request a new code once every 60 seconds.',
        ]);
    }
}
