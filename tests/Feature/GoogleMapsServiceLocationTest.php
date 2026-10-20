<?php

namespace Tests\Feature;

use App\Models\Inquiry;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class GoogleMapsServiceLocationTest extends TestCase
{
    use RefreshDatabase;

    private const SERVICE_SLOT = '02:00 PM - 05:00 PM';

    protected function setUp(): void
    {
        parent::setUp();

        // The booking capacity guard rejects submissions when no technician exists.
        User::factory()->create(['role' => 'technician']);
    }

    public function test_customer_can_submit_a_service_address_with_a_google_place_and_precise_pin(): void
    {
        $customer = User::factory()->create(['role' => 'user']);
        $date = today()->addDays(4)->toDateString();

        $this->actingAs($customer)
            ->post(route('inquiries.store'), $this->validInquiryPayload($customer, $date, [
                'street_address' => '123 Sample Street, Taguig, Metro Manila, Philippines',
                'address_details' => 'Unit 4B, enter through the blue gate',
                'city' => 'Taguig',
                'google_place_id' => 'ChIJsecureviewSamplePlaceId',
                'service_latitude' => 14.5176001,
                'service_longitude' => 121.0509002,
            ]))
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $inquiry = Inquiry::query()->where('user_id', $customer->id)->firstOrFail();

        $this->assertSame('123 Sample Street, Taguig, Metro Manila, Philippines', $inquiry->street_address);
        $this->assertSame('Unit 4B, enter through the blue gate', $inquiry->address_details);
        $this->assertSame('Taguig', $inquiry->city);
        $this->assertSame('ChIJsecureviewSamplePlaceId', $inquiry->google_place_id);
        $this->assertEquals(14.5176001, $inquiry->service_latitude);
        $this->assertEquals(121.0509002, $inquiry->service_longitude);
    }

    public function test_customer_can_submit_a_google_place_without_a_manually_pinned_coordinate(): void
    {
        $customer = User::factory()->create(['role' => 'user']);
        $date = today()->addDays(5)->toDateString();

        $this->actingAs($customer)
            ->post(route('inquiries.store'), $this->validInquiryPayload($customer, $date, [
                'google_place_id' => 'ChIJplaceOnlyExample',
            ]))
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $inquiry = Inquiry::query()->where('user_id', $customer->id)->firstOrFail();

        $this->assertSame('ChIJplaceOnlyExample', $inquiry->google_place_id);
        $this->assertNull($inquiry->service_latitude);
        $this->assertNull($inquiry->service_longitude);

        $this->actingAs($customer)
            ->get(route('inquiries.show', $inquiry))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('inquiry_details')
                ->where('inquiry.google_place_id', 'ChIJplaceOnlyExample')
                ->where('inquiry.address_details', 'Unit 4B, enter through the blue gate')
            );
    }

    public function test_service_pin_requires_latitude_and_longitude_together(): void
    {
        $customer = User::factory()->create(['role' => 'user']);
        $date = today()->addDays(6)->toDateString();

        $this->actingAs($customer)
            ->post(route('inquiries.store'), $this->validInquiryPayload($customer, $date, [
                'service_latitude' => 14.5176,
            ]))
            ->assertSessionHasErrors('service_location');

        $this->assertDatabaseMissing('inquiries', [
            'user_id' => $customer->id,
            'preferred_time' => self::SERVICE_SLOT,
        ]);
    }

    public function test_precise_location_is_shared_with_assigned_technicians_but_hidden_on_available_jobs(): void
    {
        $customer = User::factory()->create(['role' => 'user']);
        $technician = User::factory()->create(['role' => 'technician']);
        $admin = User::factory()->create(['role' => 'admin']);

        $assignedJob = $this->createInquiry($customer, today()->addDays(3)->toDateString(), [
            'status' => 'confirmed',
            'google_place_id' => 'ChIJassignedExample',
            'service_latitude' => 14.5176,
            'service_longitude' => 121.0509,
        ]);
        $assignedJob->technicians()->attach($technician->id, ['assigned_by' => $admin->id]);

        $this->createInquiry($customer, today()->addDays(5)->toDateString(), [
            'status' => 'confirmed',
            'google_place_id' => 'ChIJopenExample',
            'service_latitude' => 14.6000,
            'service_longitude' => 121.0000,
        ]);

        $this->actingAs($technician)
            ->get(route('technician.dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Technician/Workspace')
                ->where('jobs.0.google_place_id', 'ChIJassignedExample')
                ->where('jobs.0.service_latitude', 14.5176)
                ->where('openJobs.0.google_place_id', null)
                ->where('openJobs.0.service_latitude', null)
                ->where('openJobs.0.service_longitude', null)
            );
    }

    private function validInquiryPayload(User $customer, string $date, array $overrides = []): array
    {
        return array_merge([
            'item_type' => null,
            'item_id' => null,
            'customer_name' => $customer->name,
            'customer_phone' => '09171234567',
            'customer_email' => $customer->email,
            'street_address' => '123 Sample Street',
            'address_details' => 'Unit 4B, enter through the blue gate',
            'city' => 'Taguig',
            'service_type' => 'Maintenance',
            'urgency' => 'normal',
            'preferred_date' => $date,
            'preferred_time' => self::SERVICE_SLOT,
            'notes' => null,
        ], $overrides);
    }

    private function createInquiry(User $customer, string $date, array $overrides = []): Inquiry
    {
        return Inquiry::create(array_merge([
            'user_id' => $customer->id,
            'inquiry_number' => 'MAP-' . strtoupper(bin2hex(random_bytes(5))),
            'inquirable_type' => null,
            'inquirable_id' => null,
            'item_name' => 'CCTV installation',
            'customer_name' => $customer->name,
            'customer_phone' => '09171234567',
            'customer_email' => $customer->email,
            'street_address' => '123 Sample Street, Taguig',
            'address_details' => 'Unit 4B, blue gate',
            'city' => 'Taguig',
            'service_latitude' => 14.5176,
            'service_longitude' => 121.0509,
            'google_place_id' => 'ChIJtestDefault',
            'service_type' => 'Maintenance',
            'urgency' => 'normal',
            'preferred_date' => $date,
            'preferred_time' => self::SERVICE_SLOT,
            'notes' => null,
            'status' => 'pending',
        ], $overrides));
    }
}
