<?php

namespace Tests\Feature;

use App\Models\Inquiry;
use App\Models\Product;
use App\Models\StockAdjustment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

class StaffTeamWorkflowTest extends TestCase
{
    use RefreshDatabase;

    private const MORNING_SLOT = '08:00 AM - 11:00 AM';
    private const MIDDAY_SLOT = '11:00 AM - 02:00 PM';

    public function test_technician_can_join_a_job_only_when_the_admin_opens_it_for_more_staff(): void
    {
        $customer = User::factory()->create(['role' => 'user']);
        $admin = User::factory()->create(['role' => 'admin']);
        $lead = User::factory()->create(['role' => 'technician']);
        $support = User::factory()->create(['role' => 'technician']);
        $date = today()->addDays(5)->toDateString();
        $inquiry = $this->createPendingInquiry($customer, $date);

        $this->confirm($admin, $inquiry, [$lead->id], $lead->id, false, 2)
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->actingAs($support)
            ->post(route('staff.jobs.join', $inquiry))
            ->assertSessionHasErrors('job');

        $inquiry->refresh()->update(['accepting_technician_signups' => true]);

        $this->actingAs($support)
            ->get(route('staff.jobs.show', $inquiry))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Staff/JobDetails')
                ->where('job.is_assigned', false)
                ->where('job.can_join', true)
                ->where('job.customer', null)
                ->where('job.street_address', null)
            );

        $this->actingAs($support)
            ->post(route('staff.jobs.join', $inquiry))
            ->assertRedirect(route('staff.jobs.show', $inquiry))
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('inquiry_technicians', [
            'inquiry_id' => $inquiry->id,
            'technician_id' => $lead->id,
            'is_lead' => 1,
        ]);
        $this->assertDatabaseHas('inquiry_technicians', [
            'inquiry_id' => $inquiry->id,
            'technician_id' => $support->id,
            'is_lead' => 0,
            'assignment_source' => 'self_service',
        ]);

        $this->assertDatabaseHas('customer_notifications', [
            'user_id' => $admin->id,
            'title' => 'Technician joined service job',
            'related_id' => $inquiry->id,
        ]);
    }

    public function test_technicians_can_manage_assigned_jobs_but_cannot_open_admin_only_pages(): void
    {
        $customer = User::factory()->create(['role' => 'user']);
        $admin = User::factory()->create(['role' => 'admin']);
        $technician = User::factory()->create(['role' => 'technician']);
        $otherTechnician = User::factory()->create(['role' => 'technician']);
        $date = today()->addDays(4)->toDateString();
        $inquiry = $this->createPendingInquiry($customer, $date);

        $this->confirm($admin, $inquiry, [$technician->id], $technician->id, false, 1)
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->actingAs($technician)
            ->get(route('staff.jobs.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Staff/Jobs'));

        $this->actingAs($technician)->get(route('admin.users.index'))->assertForbidden();
        $this->actingAs($technician)->get(route('admin.transactions.index'))->assertForbidden();
        $this->actingAs($technician)->get(route('admin.activity-logs.index'))->assertForbidden();
        $this->actingAs($technician)->get(route('admin.products.index'))->assertForbidden();
        $this->actingAs($technician)->get(route('dashboard'))->assertForbidden();

        $this->actingAs($technician)
            ->patch(route('staff.jobs.status', $inquiry), ['status' => 'in_progress'])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('inquiries', [
            'id' => $inquiry->id,
            'status' => 'in_progress',
        ]);

        $this->actingAs($otherTechnician)
            ->patch(route('staff.jobs.status', $inquiry), ['status' => 'completed'])
            ->assertForbidden();
    }

    public function test_technician_stock_changes_require_a_reason_and_are_audited(): void
    {
        $technician = User::factory()->create(['role' => 'technician']);
        $product = Product::create([
            'name' => 'CCTV Test Camera',
            'category' => 'Camera',
            'warranty' => '1 year',
            'price' => 1500,
            'stock_quantity' => 10,
            'badge' => null,
            'image' => null,
            'specifications' => [],
            'rating' => 0,
            'is_featured' => false,
        ]);

        $this->actingAs($technician)
            ->patch(route('staff.inventory.stock', $product), [
                'stock_quantity' => 7,
                'reason' => 'Three cameras used for a service job',
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('products', [
            'id' => $product->id,
            'stock_quantity' => 7,
        ]);

        $this->assertDatabaseHas('stock_adjustments', [
            'product_id' => $product->id,
            'changed_by' => $technician->id,
            'previous_quantity' => 10,
            'new_quantity' => 7,
            'quantity_change' => -3,
            'reason' => 'Three cameras used for a service job',
        ]);

        $this->actingAs($technician)
            ->patch(route('staff.inventory.stock', $product), [
                'stock_quantity' => 6,
                'reason' => '',
            ])
            ->assertSessionHasErrors('reason');

        $this->actingAs($technician)
            ->get(route('admin.stock-adjustments.index'))
            ->assertForbidden();

        $this->actingAs(User::factory()->create(['role' => 'admin']))
            ->get(route('admin.stock-adjustments.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/StockAdjustments')
                ->where('adjustments.data.0.product_name', 'CCTV Test Camera')
                ->where('adjustments.data.0.changed_by', $technician->name)
            );
    }

    public function test_upcoming_job_reminders_are_sent_to_customer_admin_and_assigned_technician_only_once(): void
    {
        $this->travelTo(now()->startOfDay()->setTime(8, 0));

        $customer = User::factory()->create(['role' => 'user']);
        $admin = User::factory()->create(['role' => 'admin']);
        $technician = User::factory()->create(['role' => 'technician']);
        $date = today()->addDay()->toDateString();
        $inquiry = $this->createPendingInquiry($customer, $date);

        $this->confirm($admin, $inquiry, [$technician->id], $technician->id, false, 1)
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        Artisan::call('secureview:send-job-reminders');
        Artisan::call('secureview:send-job-reminders');

        $reminders = \App\Models\CustomerNotification::query()
            ->where('related_type', Inquiry::class)
            ->where('related_id', $inquiry->id)
            ->where('title', 'Service job tomorrow')
            ->get();

        $this->assertCount(3, $reminders);
        $this->assertEqualsCanonicalizing(
            [$customer->id, $admin->id, $technician->id],
            $reminders->pluck('user_id')->all()
        );

        $this->travelBack();
    }

    private function createPendingInquiry(User $customer, string $date): Inquiry
    {
        $this->actingAs($customer)
            ->post(route('inquiries.store'), [
                'item_type' => null,
                'item_id' => null,
                'customer_name' => 'Test Customer ' . $customer->id,
                'customer_phone' => '09171234567',
                'customer_email' => $customer->email,
                'street_address' => '123 Test Street',
                'city' => 'Taguig',
                'service_type' => 'Installation',
                'urgency' => 'normal',
                'preferred_date' => $date,
                'preferred_time' => self::MORNING_SLOT,
                'notes' => 'Test job',
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        return Inquiry::query()
            ->where('customer_email', $customer->email)
            ->whereDate('preferred_date', $date)
            ->latest('id')
            ->firstOrFail();
    }

    private function confirm(
        User $admin,
        Inquiry $inquiry,
        array $technicianIds,
        int $leadTechnicianId,
        bool $acceptingSignups,
        int $maxTechnicians
    ) {
        return $this->actingAs($admin)
            ->patch(route('admin.inquiries.confirm', $inquiry), [
                'preferred_date' => $inquiry->preferred_date->format('Y-m-d'),
                'preferred_time' => self::MORNING_SLOT,
                'technician_ids' => $technicianIds,
                'lead_technician_id' => $leadTechnicianId,
                'accepting_technician_signups' => $acceptingSignups,
                'max_technicians' => $maxTechnicians,
            ]);
    }
}
