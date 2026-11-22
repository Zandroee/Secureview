<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LogoutRedirectTest extends TestCase
{
    use RefreshDatabase;

    public function test_logout_keeps_a_user_on_a_public_catalog_page_and_preserves_filters(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->withHeaders(['Referer' => 'http://localhost/products?search=dahua'])
            ->post('/logout')
            ->assertRedirect('/products?search=dahua');

        $this->assertGuest();
    }

    public function test_logout_does_not_return_to_a_protected_account_page(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->withHeaders(['Referer' => 'http://localhost/settings'])
            ->post('/logout')
            ->assertRedirect('/');

        $this->assertGuest();
    }

    public function test_logout_rejects_external_referers_to_prevent_open_redirects(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->withHeaders(['Referer' => 'https://example.com/about'])
            ->post('/logout')
            ->assertRedirect('/');

        $this->assertGuest();
    }
}
