<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CustomNotFoundPageTest extends TestCase
{
    use RefreshDatabase;

    public function test_unknown_url_shows_helpful_secureview_navigation(): void
    {
        $this->get('/this-secureview-page-does-not-exist')
            ->assertNotFound()
            ->assertSee("We couldn't find that page.", false)
            ->assertSee('Browse Products')
            ->assertSee('Browse Packages')
            ->assertSee('View Services')
            ->assertSee(url('/products'))
            ->assertSee(url('/packages'))
            ->assertSee(url('/services'));
    }
}
