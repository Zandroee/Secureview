<?php

namespace Tests\Feature;

use App\Mail\EmailVerificationCodeMail;
use App\Models\User;
use App\Services\EmailVerificationCodeService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class EmailVerificationCodeTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_sends_a_six_digit_code_and_shows_the_verification_form(): void
    {
        Mail::fake();

        $this->post(route('register'), [
            'firstName' => 'Test',
            'lastName' => 'Customer',
            'phone' => '09171234567',
            'email' => 'test.customer@example.com',
            'password' => 'SecurePassword1!',
            'password_confirmation' => 'SecurePassword1!',
            'terms' => '1',
        ])
            ->assertRedirect(route('verification.notice'))
            ->assertSessionHas('verificationEmail', 'test.customer@example.com')
            ->assertSessionHas('status');

        $user = User::where('email', 'test.customer@example.com')->firstOrFail();

        $this->get(route('verification.notice'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('verify-email')
                ->where('email', 'test.customer@example.com')
            );

        Mail::assertSent(EmailVerificationCodeMail::class, fn (EmailVerificationCodeMail $mail) =>
            $mail->user->is($user) && preg_match('/^\d{6}$/', $mail->code) === 1
        );
    }

    public function test_correct_code_verifies_email_and_redirects_to_login(): void
    {
        Mail::fake();

        $user = User::factory()->unverified()->create();
        $codes = app(EmailVerificationCodeService::class);

        $this->assertTrue($codes->send($user));

        $code = null;
        Mail::assertSent(EmailVerificationCodeMail::class, function (EmailVerificationCodeMail $mail) use ($user, &$code) {
            if (!$mail->user->is($user)) {
                return false;
            }

            $code = $mail->code;

            return true;
        });

        $this->assertNotNull($code);

        $this->post(route('verification.code.verify'), [
            'email' => $user->email,
            'code' => $code,
        ])
            ->assertRedirect(route('login'))
            ->assertSessionHas('status', 'Your email has been verified successfully. You can now log in.');

        $this->assertNotNull($user->fresh()->email_verified_at);
    }

    public function test_incorrect_code_is_limited_to_five_attempts(): void
    {
        Mail::fake();

        $user = User::factory()->unverified()->create();
        $codes = app(EmailVerificationCodeService::class);
        $this->assertTrue($codes->send($user));

        $actualCode = null;
        Mail::assertSent(EmailVerificationCodeMail::class, function (EmailVerificationCodeMail $mail) use ($user, &$actualCode) {
            if (!$mail->user->is($user)) {
                return false;
            }

            $actualCode = $mail->code;

            return true;
        });

        $wrongCode = str_pad((string) (((((int) $actualCode) + 1) % 1000000)), 6, '0', STR_PAD_LEFT);

        for ($attempt = 1; $attempt <= EmailVerificationCodeService::MAX_ATTEMPTS; $attempt++) {
            $result = $codes->verify($user, $wrongCode);
            $this->assertFalse($result['verified']);
        }

        $this->assertStringContainsString('disabled', $result['message']);
        $this->assertNull($user->fresh()->email_verified_at);
        $this->assertFalse($codes->verify($user, $actualCode)['verified']);
    }

    public function test_verification_code_cannot_be_reissued_during_resend_cooldown(): void
    {
        Mail::fake();

        $user = User::factory()->unverified()->create();
        $codes = app(EmailVerificationCodeService::class);

        $this->assertTrue($codes->send($user));
        $this->assertFalse($codes->send($user));

        Mail::assertSent(EmailVerificationCodeMail::class, 1);
        $this->assertGreaterThan(0, $codes->resendCooldownRemaining($user));
    }

    public function test_unverified_email_form_loads_without_email_and_resend_message_does_not_disclose_account_existence(): void
    {
        $this->get(route('verification.notice'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('verify-email')
                ->where('email', '')
            );

        Mail::fake();

        $this->post(route('verification.code.resend'), [
            'email' => 'unknown@example.com',
        ])
            ->assertRedirect(route('verification.notice'))
            ->assertSessionHas('message');

        Mail::assertNothingSent();
    }
    public function test_old_signed_verification_link_redirects_to_code_instead_of_verifying_directly(): void
    {
        Mail::fake();

        $user = User::factory()->unverified()->create();
        $url = URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes(10),
            [
                'id' => $user->id,
                'hash' => sha1($user->getEmailForVerification()),
            ]
        );

        $this->get($url)
            ->assertRedirect(route('verification.notice'))
            ->assertSessionHas('verificationEmail', $user->email)
            ->assertSessionHas('status');

        $this->assertNull($user->fresh()->email_verified_at);
        Mail::assertSent(EmailVerificationCodeMail::class, fn (EmailVerificationCodeMail $mail) => $mail->user->is($user));
    }

}
