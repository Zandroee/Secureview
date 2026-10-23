<?php

namespace App\Services;

use App\Mail\EmailVerificationCodeMail;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Mail;

class EmailVerificationCodeService
{
    public const CODE_TTL_MINUTES = 10;

    public const RESEND_COOLDOWN_SECONDS = 60;

    public const MAX_ATTEMPTS = 5;

    private function codeKey(User $user): string
    {
        return 'email-verification-code:' . $user->getKey();
    }

    private function attemptsKey(User $user): string
    {
        return 'email-verification-attempts:' . $user->getKey();
    }

    private function cooldownKey(User $user): string
    {
        return 'email-verification-cooldown:' . $user->getKey();
    }

    /**
     * Send a new code if the account is unverified and the resend cooldown allows it.
     * The code itself is never stored in plain text.
     */
    public function send(User $user): bool
    {
        if ($user->hasVerifiedEmail()) {
            return false;
        }

        if (!Cache::add(
            $this->cooldownKey($user),
            true,
            now()->addSeconds(self::RESEND_COOLDOWN_SECONDS)
        )) {
            return false;
        }

        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $codeHash = hash_hmac('sha256', $code, (string) config('app.key'));

        Cache::put(
            $this->codeKey($user),
            $codeHash,
            now()->addMinutes(self::CODE_TTL_MINUTES)
        );
        Cache::put(
            $this->attemptsKey($user),
            0,
            now()->addMinutes(self::CODE_TTL_MINUTES)
        );

        try {
            Mail::to($user->email)->send(new EmailVerificationCodeMail(
                $user,
                $code,
                self::CODE_TTL_MINUTES
            ));
        } catch (\Throwable $exception) {
            Cache::forget($this->codeKey($user));
            Cache::forget($this->attemptsKey($user));
            Cache::forget($this->cooldownKey($user));

            throw $exception;
        }

        return true;
    }

    /**
     * Check an unexpired code, limiting each code to five guesses.
     *
     * @return array{verified: bool, message: string}
     */
    public function verify(User $user, string $code): array
    {
        $storedHash = Cache::get($this->codeKey($user));

        if (!is_string($storedHash) || $storedHash === '') {
            Cache::forget($this->attemptsKey($user));

            return [
                'verified' => false,
                'message' => 'This code has expired or is no longer valid. Request a new code and try again.',
            ];
        }

        $attempts = (int) Cache::get($this->attemptsKey($user), 0);

        if ($attempts >= self::MAX_ATTEMPTS) {
            Cache::forget($this->codeKey($user));
            Cache::forget($this->attemptsKey($user));

            return [
                'verified' => false,
                'message' => 'Too many incorrect attempts. Request a new verification code before trying again.',
            ];
        }

        $expectedHash = hash_hmac('sha256', $code, (string) config('app.key'));

        if (!hash_equals($storedHash, $expectedHash)) {
            $attempts++;

            if ($attempts >= self::MAX_ATTEMPTS) {
                Cache::forget($this->codeKey($user));
                Cache::forget($this->attemptsKey($user));

                return [
                    'verified' => false,
                    'message' => 'Too many incorrect attempts. This code has been disabled. Request a new code to continue.',
                ];
            }

            Cache::put(
                $this->attemptsKey($user),
                $attempts,
                now()->addMinutes(self::CODE_TTL_MINUTES)
            );

            return [
                'verified' => false,
                'message' => 'That code is incorrect. You have ' . (self::MAX_ATTEMPTS - $attempts) . ' attempts remaining.',
            ];
        }

        $user->markEmailAsVerified();

        Cache::forget($this->codeKey($user));
        Cache::forget($this->attemptsKey($user));
        Cache::forget($this->cooldownKey($user));

        return [
            'verified' => true,
            'message' => 'Email verified successfully.',
        ];
    }
}
