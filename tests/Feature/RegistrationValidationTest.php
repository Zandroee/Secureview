<?php

namespace Tests\Feature;

use App\Mail\EmailVerificationCodeMail;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Support\Facades\Mail;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class RegistrationValidationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Tests exercise the validation itself, not the existing signup rate limiter.
        $this->withoutMiddleware(ThrottleRequests::class);
        Mail::fake();
    }

    private function registrationData(array $changes = []): array
    {
        return array_merge([
            'firstName' => 'Maria',
            'lastName' => 'De La Cruz',
            'phone' => '09171234567',
            'email' => 'maria.signup@gmail.com',
            'password' => 'SecurePassword1!',
            'password_confirmation' => 'SecurePassword1!',
            'terms' => true,
        ], $changes);
    }

    public function test_signup_page_receives_the_exact_supported_provider_list(): void
    {
        $this->get(route('signup'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('signup')
                ->where('allowedEmailDomains.0', 'gmail.com')
                ->etc());
    }

    public function test_established_providers_are_accepted_but_still_require_code_verification(): void
    {
        $emails = [
            'example.signup@gmail.com',
            'example.signup@yahoo.com.ph',
            'example.signup@outlook.com',
            'example.signup@icloud.com',
            'example.signup@proton.me',
        ];

        foreach ($emails as $index => $email) {
            $phone = '0917123456' . $index;

            $this->post(route('register'), $this->registrationData([
                'email' => $email,
                'phone' => $phone,
            ]))
                ->assertRedirect(route('verification.notice'))
                ->assertSessionHasNoErrors();

            $user = User::where('email', $email)->firstOrFail();
            $this->assertFalse($user->hasVerifiedEmail());
            $this->assertSame('Maria De La Cruz', $user->name);
        }

        Mail::assertSent(EmailVerificationCodeMail::class, count($emails));
    }

    public function test_temporary_and_lookalike_email_domains_are_rejected_before_account_creation(): void
    {
        foreach ([
            'someone@mailinator.com',
            'someone@guerrillamail.com',
            'someone@tempmail.com',
            'someone@gmail.co',
            'someone@gmail.com.temporary-mail.org',
            'someone@company.example',
            'someone@fakegmail.com',
            'someone@yahoo.com.fake.org',
        ] as $email) {
            $this->post(route('register'), $this->registrationData(['email' => $email]))
                ->assertRedirect()
                ->assertSessionHasErrors('email');
        }

        $this->assertDatabaseCount('users', 0);
        Mail::assertNothingSent();
    }

    public function test_provider_domain_is_compared_case_insensitively(): void
    {
        $this->post(route('register'), $this->registrationData([
            'email' => 'alias+checkout@GMAIL.COM',
        ]))
            ->assertRedirect(route('verification.notice'))
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('users', ['email' => 'alias+checkout@GMAIL.COM']);
    }

    public function test_registration_rejects_numbers_and_special_characters_in_both_name_fields(): void
    {
        foreach ([
            ['firstName' => 'Maria2'],
            ['firstName' => 'Maria@'],
            ['firstName' => 'Ana-Marie'],
            ['lastName' => 'Cruz123'],
            ['lastName' => "O'Neil"],
            ['lastName' => 'De_La_Cruz'],
        ] as $badName) {
            $field = array_key_first($badName);
            $this->post(route('register'), $this->registrationData($badName))
                ->assertRedirect()
                ->assertSessionHasErrors($field);
        }

        $this->assertDatabaseCount('users', 0);
        Mail::assertNothingSent();
    }

    public function test_letters_with_accents_and_multiword_names_are_accepted(): void
    {
        $this->post(route('register'), $this->registrationData([
            'firstName' => 'María',
            'lastName' => 'De La Cruz',
            'email' => 'maria.name@yahoo.com',
        ]))
            ->assertRedirect(route('verification.notice'))
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('users', [
            'email' => 'maria.name@yahoo.com',
            'name' => 'María De La Cruz',
        ]);
    }
}
