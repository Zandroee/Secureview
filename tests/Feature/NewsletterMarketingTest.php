<?php

namespace Tests\Feature;

use App\Mail\NewsletterPromotionMail;
use App\Models\NewsletterPromotionSend;
use App\Models\Package;
use App\Models\Product;
use App\Models\User;
use App\Services\EmailVerificationCodeService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;
use Inertia\Testing\AssertableInertia as Assert;
use Mockery;
use Tests\TestCase;

class NewsletterMarketingTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_records_newsletter_consent_separately_from_terms_acceptance(): void
    {
        $this->mock(EmailVerificationCodeService::class, function ($mock) {
            $mock->shouldReceive('send')->once()->andReturn(true);
        });

        $this->post('/register', [
            'firstName' => 'Newsletter',
            'lastName' => 'Customer',
            'phone' => '09171234567',
            'email' => 'newsletter-customer@example.test',
            'password' => 'StrongPass123!',
            'password_confirmation' => 'StrongPass123!',
            'terms' => true,
            'newsletter_opt_in' => true,
        ])->assertRedirect(route('verification.notice'));

        $this->assertDatabaseHas('users', [
            'email' => 'newsletter-customer@example.test',
            'terms_version' => '2.0',
            'newsletter_opt_in' => 1,
        ]);

        $subscriber = User::where('email', 'newsletter-customer@example.test')->firstOrFail();
        $this->assertNotNull($subscriber->newsletter_opted_in_at);
        $this->assertNull($subscriber->newsletter_opted_out_at);
    }

    public function test_registration_without_newsletter_consent_defaults_to_unsubscribed(): void
    {
        $this->mock(EmailVerificationCodeService::class, function ($mock) {
            $mock->shouldReceive('send')->once()->andReturn(true);
        });

        $this->post('/register', [
            'firstName' => 'Standard',
            'lastName' => 'Customer',
            'phone' => '09181234567',
            'email' => 'standard-customer@example.test',
            'password' => 'StrongPass123!',
            'password_confirmation' => 'StrongPass123!',
            'terms' => true,
        ])->assertRedirect(route('verification.notice'));

        $this->assertDatabaseHas('users', [
            'email' => 'standard-customer@example.test',
            'newsletter_opt_in' => 0,
        ]);
    }

    public function test_verified_user_can_opt_in_and_opt_out_from_account_preferences(): void
    {
        $user = User::factory()->create([
            'role' => 'user',
            'email_verified_at' => now(),
            'newsletter_opt_in' => false,
        ]);

        $this->actingAs($user)
            ->patch(route('settings.preferences.update'), [
                'preferred_theme' => 'system',
                'notification_popups_enabled' => true,
                'newsletter_opt_in' => true,
            ])
            ->assertRedirect();

        $user->refresh();
        $this->assertTrue($user->newsletter_opt_in);
        $this->assertNotNull($user->newsletter_opted_in_at);
        $this->assertNull($user->newsletter_opted_out_at);

        $this->actingAs($user)
            ->patch(route('settings.preferences.update'), [
                'preferred_theme' => 'system',
                'notification_popups_enabled' => true,
                'newsletter_opt_in' => false,
            ])
            ->assertRedirect();

        $user->refresh();
        $this->assertFalse($user->newsletter_opt_in);
        $this->assertNotNull($user->newsletter_opted_out_at);
    }

    public function test_signed_unsubscribe_link_turns_off_promotional_email_consent(): void
    {
        $user = User::factory()->create([
            'newsletter_opt_in' => true,
            'email_verified_at' => now(),
        ]);

        $url = URL::signedRoute('newsletter.unsubscribe', ['user' => $user->id]);

        $this->get($url)
            ->assertRedirect('/')
            ->assertSessionHas('status', 'You have been unsubscribed from Netmax Trading promotional emails.');

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'newsletter_opt_in' => 0,
        ]);
        $this->assertNotNull($user->fresh()->newsletter_opted_out_at);
    }

    public function test_unsigned_unsubscribe_request_is_rejected(): void
    {
        $user = User::factory()->create(['newsletter_opt_in' => true]);

        $this->get(route('newsletter.unsubscribe', ['user' => $user->id]))
            ->assertForbidden();

        $this->assertTrue($user->fresh()->newsletter_opt_in);
    }

    public function test_active_sale_newsletter_is_sent_once_only_to_verified_opted_in_customers(): void
    {
        Mail::fake();
        config(['app.timezone' => 'Asia/Manila']);
        Carbon::setTestNow(Carbon::parse('2026-11-06 12:00:00', 'Asia/Manila'));

        try {
            $subscriber = User::factory()->create([
                'email' => 'subscriber@example.test',
                'email_verified_at' => now(),
                'newsletter_opt_in' => true,
            ]);
            User::factory()->create([
                'email' => 'not-subscribed@example.test',
                'email_verified_at' => now(),
                'newsletter_opt_in' => false,
            ]);
            User::factory()->create([
                'email' => 'unverified-subscriber@example.test',
                'email_verified_at' => null,
                'newsletter_opt_in' => true,
            ]);

            Product::create([
                'name' => 'Newsletter Sale Camera',
                'category' => 'CCTV',
                'warranty' => '1 year',
                'price' => 3000,
                'sale_price' => 2400,
                'sale_starts_at' => '2026-11-06 11:00:00',
                'sale_ends_at' => '2026-11-06 18:00:00',
                'stock_quantity' => 10,
                'specifications' => [],
                'rating' => 0,
                'is_featured' => false,
            ]);

            $this->artisan('netmax:send-promotion-newsletters')->assertExitCode(0);
            $this->artisan('netmax:send-promotion-newsletters')->assertExitCode(0);

            Mail::assertSent(NewsletterPromotionMail::class, 1);
            Mail::assertSent(NewsletterPromotionMail::class, function (NewsletterPromotionMail $mail) use ($subscriber) {
                return $mail->hasTo($subscriber->email)
                    && $mail->promotion['type'] === 'product_sale';
            });

            $this->assertSame(1, NewsletterPromotionSend::count());
            $this->assertNotNull(NewsletterPromotionSend::first()->sent_at);
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_active_sale_items_are_prioritized_and_expired_nonfeatured_sales_are_removed_from_homepage(): void
    {
        config(['app.timezone' => 'Asia/Manila']);
        Carbon::setTestNow(Carbon::parse('2026-11-06 12:00:00', 'Asia/Manila'));

        try {
            $regularFeatured = Product::create([
                'name' => 'Regular Featured Camera',
                'category' => 'CCTV',
                'warranty' => '1 year',
                'price' => 3000,
                'stock_quantity' => 10,
                'specifications' => [],
                'rating' => 0,
                'is_featured' => true,
            ]);
            $activeSale = Product::create([
                'name' => 'Active Sale Camera',
                'category' => 'CCTV',
                'warranty' => '1 year',
                'price' => 5000,
                'sale_price' => 3500,
                'sale_starts_at' => '2026-11-06 11:00:00',
                'sale_ends_at' => '2026-11-06 13:00:00',
                'stock_quantity' => 10,
                'specifications' => [],
                'rating' => 0,
                'is_featured' => false,
            ]);
            Product::create([
                'name' => 'Expired Sale Camera',
                'category' => 'CCTV',
                'warranty' => '1 year',
                'price' => 4000,
                'sale_price' => 3000,
                'sale_starts_at' => '2026-11-06 09:00:00',
                'sale_ends_at' => '2026-11-06 11:00:00',
                'stock_quantity' => 10,
                'specifications' => [],
                'rating' => 0,
                'is_featured' => false,
            ]);

            $this->get('/')
                ->assertOk()
                ->assertInertia(fn (Assert $page) => $page
                    ->component('landing')
                    ->has('cameras', 2)
                    ->where('cameras.0.id', $activeSale->id)
                    ->where('cameras.0.sale_active', true)
                    ->where('cameras.0.price', 3500)
                    ->where('cameras.1.id', $regularFeatured->id));
        } finally {
            Carbon::setTestNow();
        }
    }
}
