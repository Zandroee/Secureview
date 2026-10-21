<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

class SchedulerEndpointTest extends TestCase
{
    public function test_scheduler_endpoint_fails_closed_when_secret_is_not_configured(): void
    {
        config(['services.cron.secret' => null]);
        Artisan::shouldReceive('call')->never();

        $this->getJson('/api/scheduler/run')
            ->assertStatus(401)
            ->assertJsonPath('message', 'Unauthenticated.');
    }

    public function test_scheduler_endpoint_rejects_missing_or_incorrect_bearer_tokens(): void
    {
        config(['services.cron.secret' => 'unit-test-secret-with-enough-entropy']);
        Artisan::shouldReceive('call')->never();

        $this->getJson('/api/scheduler/run')
            ->assertStatus(401);

        $this->withToken('incorrect-secret')
            ->getJson('/api/scheduler/run')
            ->assertStatus(401);
    }

    public function test_authorized_scheduler_request_runs_schedule_command(): void
    {
        config(['services.cron.secret' => 'unit-test-secret-with-enough-entropy']);
        Artisan::shouldReceive('call')
            ->once()
            ->with('schedule:run')
            ->andReturn(0);

        $response = $this->withToken('unit-test-secret-with-enough-entropy')
            ->getJson('/api/scheduler/run');

        $response
            ->assertOk()
            ->assertJsonPath('message', 'Scheduler evaluated.');

        $this->assertStringContainsString(
            'no-store',
            (string) $response->headers->get('Cache-Control')
        );
    }

    public function test_scheduler_failure_returns_a_generic_error_without_command_output(): void
    {
        config(['services.cron.secret' => 'unit-test-secret-with-enough-entropy']);
        Artisan::shouldReceive('call')
            ->once()
            ->with('schedule:run')
            ->andThrow(new \RuntimeException('sensitive internal details'));

        $this->withToken('unit-test-secret-with-enough-entropy')
            ->getJson('/api/scheduler/run')
            ->assertStatus(500)
            ->assertJsonPath('message', 'Scheduler execution failed.')
            ->assertDontSee('sensitive internal details');
    }
}
