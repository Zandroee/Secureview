<?php

namespace Tests\Feature;

use App\Models\CustomerNotification;
use App\Models\Inquiry;
use App\Models\InventoryAdjustment;
use App\Models\Order;
use App\Models\PendingInquiryCheckout;
use App\Models\Product;
use App\Models\User;
use App\Services\JobNotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class TechnicianWorkspaceTest extends TestCase
{
    use RefreshDatabase;

    private const SLOT = '08:00 AM - 11:00 AM';

    public function test_confirmation_assigns_multiple_technicians_and_notifies_the_team(): void
    {
        $customer = User::factory()->create(['role' => 'user']);
        $admin = User::factory()->create(['role' => 'admin']);
        $technicianOne = User::factory()->create(['role' => 'technician']);
        $technicianTwo = User::factory()->create(['role' => 'technician']);
        $inquiry = $this->makeInquiry($customer, today()->addDays(3)->toDateString());

        $this->actingAs($admin)->patch(route('admin.inquiries.confirm', $inquiry), [
            'preferred_date' => today()->addDays(3)->toDateString(),
            'preferred_time' => self::SLOT,
            'technician_ids' => [$technicianOne->id, $technicianTwo->id],
        ])->assertRedirect()->assertSessionHasNoErrors();

        $this->assertDatabaseHas('inquiries', [
            'id' => $inquiry->id,
            'status' => 'confirmed',
            // Legacy compatibility field; the full team is stored in the pivot table.
            'technician_id' => $technicianOne->id,
        ]);

        foreach ([$technicianOne, $technicianTwo] as $technician) {
            $this->assertDatabaseHas('inquiry_technician', [
                'inquiry_id' => $inquiry->id,
                'technician_id' => $technician->id,
            ]);
            $this->assertDatabaseHas('customer_notifications', [
                'user_id' => $technician->id,
                'type' => 'job_upcoming',
                'related_id' => $inquiry->id,
            ]);
        }

        $this->assertDatabaseHas('customer_notifications', [
            'user_id' => $admin->id,
            'type' => 'job_upcoming',
            'related_id' => $inquiry->id,
        ]);
    }

    public function test_technician_cannot_access_admin_users_transactions_or_activity_logs(): void
    {
        $technician = User::factory()->create(['role' => 'technician']);

        $this->actingAs($technician)->get(route('admin.users.index'))->assertForbidden();
        $this->actingAs($technician)->get(route('admin.transactions.index'))->assertForbidden();
        $this->actingAs($technician)->get(route('admin.activity-logs.index'))->assertForbidden();
        $this->actingAs($technician)->get(route('admin.products.index'))->assertForbidden();
        $this->actingAs($technician)->get(route('admin.inventory-adjustments.index'))->assertForbidden();
        $this->actingAs($technician)->get(route('technician.dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Technician/Workspace')
                ->has('jobs')
                ->has('openJobs')
                ->has('inventory'));
    }

    public function test_technician_sections_are_separate_routes_with_the_correct_active_page(): void
    {
        $technician = User::factory()->create(['role' => 'technician']);

        $pages = [
            'technician.dashboard' => 'dashboard',
            'technician.services' => 'services',
            'technician.available-jobs' => 'available-jobs',
            'technician.post-service-records' => 'post-service-records',
            'technician.service-history' => 'service-history',
            'technician.products' => 'products',
            'technician.schedule' => 'schedule',
        ];

        foreach ($pages as $routeName => $activePage) {
            $this->actingAs($technician)
                ->get(route($routeName))
                ->assertOk()
                ->assertInertia(fn (Assert $page) => $page
                    ->component('Technician/Workspace')
                    ->where('activePage', $activePage)
                    ->has('jobs')
                    ->has('openJobs')
                    ->has('serviceHistory')
                    ->has('inventory')
                    ->has('recentNotifications')
                    ->has('recentServices')
                    ->has('recentAnnouncements')
                    ->has('scheduleData')
                    ->has('calendarAvailability.fullyBookedDates')
                    ->has('calendarAvailability.partiallyBlockedDates')
                    ->has('unreadNotificationCount'));
        }
    }

    public function test_technician_service_history_is_paginated_separately_from_the_active_job_list(): void
    {
        $customer = User::factory()->create(['role' => 'user']);
        $admin = User::factory()->create(['role' => 'admin']);
        $technician = User::factory()->create(['role' => 'technician']);
        $oldestCompleted = null;

        // More records than fit on one page must still be available in history.
        for ($day = 1; $day <= 13; $day++) {
            $completed = $this->makeInquiry(
                $customer,
                today()->subDays($day)->toDateString(),
                'completed'
            );
            $completed->update(['technician_id' => $technician->id]);
            $completed->technicians()->attach($technician->id, [
                'assigned_by' => $admin->id,
            ]);
            $oldestCompleted = $completed;
        }

        $this->actingAs($technician)
            ->get(route('technician.service-history'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Technician/Workspace')
                ->where('activePage', 'service-history')
                ->where('serviceHistory.total', 13)
                ->where('serviceHistory.current_page', 1)
                ->has('serviceHistory.data', 12));

        $this->actingAs($technician)
            ->get(route('technician.service-history') . '?page=2')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Technician/Workspace')
                ->where('serviceHistory.total', 13)
                ->where('serviceHistory.current_page', 2)
                ->has('serviceHistory.data', 1)
                ->where('serviceHistory.data.0.id', $oldestCompleted->id));
    }

    public function test_technician_dashboard_sidebar_data_only_shows_services_assigned_to_that_technician(): void
    {
        $customer = User::factory()->create(['role' => 'user']);
        $otherCustomer = User::factory()->create(['role' => 'user']);
        $admin = User::factory()->create(['role' => 'admin']);
        $technician = User::factory()->create(['role' => 'technician']);
        $otherTechnician = User::factory()->create(['role' => 'technician']);

        $assignedService = $this->makeInquiry($customer, today()->addDays(3)->toDateString(), 'confirmed');
        $assignedService->update(['technician_id' => $technician->id]);
        $assignedService->technicians()->attach($technician->id, ['assigned_by' => $admin->id]);

        $otherService = $this->makeInquiry($otherCustomer, today()->addDays(4)->toDateString(), 'confirmed');
        $otherService->update(['technician_id' => $otherTechnician->id]);
        $otherService->technicians()->attach($otherTechnician->id, ['assigned_by' => $admin->id]);

        $this->actingAs($technician)
            ->get(route('technician.dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('recentServices.0.id', $assignedService->id)
                ->has('recentServices', 1)
                ->where('scheduleData.0.id', $assignedService->id)
                ->has('scheduleData', 1));
    }

    public function test_technician_service_history_hides_customer_contact_and_exact_location(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $technician = User::factory()->create(['role' => 'technician']);
        $customer = User::factory()->create(['role' => 'user']);
        $inquiry = $this->makeInquiry($customer, today()->subDays(3)->toDateString(), 'completed');
        $inquiry->update(['technician_id' => $technician->id]);
        $inquiry->technicians()->attach($technician->id, ['assigned_by' => $admin->id]);

        $this->actingAs($technician)
            ->get(route('technician.service-history'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('serviceHistory.data', 1)
                ->where('serviceHistory.data.0.customer_name', $customer->name)
                ->missing('serviceHistory.data.0.customer_phone')
                ->where('serviceHistory.data.0.street_address', null)
                ->missing('serviceHistory.data.0.payment_status')
            );
    }

    public function test_admin_announcement_is_delivered_to_technician_notifications(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $technician = User::factory()->create(['role' => 'technician']);
        $customer = User::factory()->create(['role' => 'user']);

        $this->actingAs($admin)
            ->post(route('admin.announcements.store'), [
                'title' => 'Technician notice',
                'message' => 'Please review the updated work schedule.',
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('customer_notifications', [
            'user_id' => $technician->id,
            'type' => 'announcement',
            'title' => 'Technician notice',
            'message' => 'Please review the updated work schedule.',
        ]);

        $this->assertDatabaseHas('customer_notifications', [
            'user_id' => $customer->id,
            'type' => 'announcement',
            'title' => 'Technician notice',
            'message' => 'Please review the updated work schedule.',
        ]);
    }

    public function test_application_timezone_defaults_to_philippines(): void
    {
        $this->assertSame('Asia/Manila', config('app.timezone'));
    }

    public function test_technician_can_join_an_open_job_if_their_schedule_is_free(): void
    {
        $customer = User::factory()->create(['role' => 'user']);
        $admin = User::factory()->create(['role' => 'admin']);
        $technicianOne = User::factory()->create(['role' => 'technician']);
        $technicianTwo = User::factory()->create(['role' => 'technician']);
        $date = today()->addDays(4)->toDateString();
        $inquiry = $this->makeInquiry($customer, $date, 'confirmed');
        $inquiry->update(['technician_id' => $technicianOne->id]);
        $inquiry->technicians()->attach($technicianOne->id, [
            'assigned_by' => $admin->id,
        ]);

        $this->actingAs($technicianTwo)->post(route('technician.jobs.claim', $inquiry))
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('inquiry_technician', [
            'inquiry_id' => $inquiry->id,
            'technician_id' => $technicianTwo->id,
        ]);
        $this->assertDatabaseHas('customer_notifications', [
            'user_id' => $admin->id,
            'type' => 'job_team_updated',
            'related_id' => $inquiry->id,
        ]);
        $this->assertDatabaseHas('customer_notifications', [
            'user_id' => $technicianOne->id,
            'type' => 'job_team_updated',
            'related_id' => $inquiry->id,
        ]);
    }

    public function test_pending_unassigned_service_is_visible_and_can_be_claimed_when_the_technician_is_free(): void
    {
        $customer = User::factory()->create(['role' => 'user']);
        $technician = User::factory()->create(['role' => 'technician']);
        $inquiry = $this->makeInquiry($customer, today()->addDays(4)->toDateString(), 'pending');

        $this->actingAs($technician)
            ->get(route('technician.dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Technician/Workspace')
                ->where('openJobs.0.id', $inquiry->id)
                ->where('openJobs.0.status', 'pending')
                ->missing('openJobs.0.customer_name')
                ->missing('openJobs.0.customer_phone')
                ->missing('openJobs.0.payment_status')
                ->missing('openJobs.0.payment_method')
                ->where('openJobs.0.street_address', null)
                ->where('openJobs.0.address_details', null)
                ->where('openJobs.0.google_place_id', null)
                ->where('openJobs.0.service_latitude', null)
                ->where('openJobs.0.service_longitude', null)
                ->missing('openJobs.0.notes'));

        $this->actingAs($technician)
            ->post(route('technician.jobs.claim', $inquiry))
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('inquiry_technician', [
            'inquiry_id' => $inquiry->id,
            'technician_id' => $technician->id,
        ]);
        $this->assertDatabaseHas('inquiries', [
            'id' => $inquiry->id,
            'status' => 'pending',
        ]);

        // A just-joined pending service must appear in My Services while it
        // waits for admin confirmation instead of disappearing from the list.
        $this->actingAs($technician)
            ->get(route('technician.services'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Technician/Workspace')
                ->where('jobs.0.id', $inquiry->id)
                ->where('jobs.0.status', 'pending')
                ->where('jobs.0.customer_name', $customer->name)
                ->missing('jobs.0.customer_phone')
                ->missing('jobs.0.payment_method'));
    }

    public function test_unassigned_jobs_with_unpaid_checkouts_are_not_exposed_as_available_to_technicians(): void
    {
        $customer = User::factory()->create(['role' => 'user']);
        $technician = User::factory()->create(['role' => 'technician']);
        $inquiry = $this->makeInquiry($customer, today()->addDays(4)->toDateString(), 'pending');

        $order = Order::create([
            'user_id' => $customer->id,
            'order_number' => 'SV-UNPAID-JOB-' . strtoupper(bin2hex(random_bytes(3))),
            'subtotal' => 1500,
            'shipping_fee' => 0,
            'installation_fee' => 0,
            'total' => 1500,
            'payment_method' => 'gcash',
            'payment_status' => 'pending',
            'order_status' => 'awaiting_payment',
            'customer_name' => $customer->name,
            'customer_phone' => '09171234567',
            'customer_email' => $customer->email,
            'delivery_address' => '123 Test Street, Taguig',
        ]);

        PendingInquiryCheckout::create([
            'user_id' => $customer->id,
            'order_id' => $order->id,
            'inquiry_id' => $inquiry->id,
            'payload' => [],
            'status' => 'pending_payment',
        ]);

        $this->actingAs($technician)
            ->get(route('technician.available-jobs'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Technician/Workspace')
                ->has('openJobs', 0)
            );

        $this->assertDatabaseHas('pending_inquiry_checkouts', [
            'order_id' => $order->id,
            'inquiry_id' => $inquiry->id,
            'status' => 'pending_payment',
        ]);
    }

    public function test_legacy_technician_id_assignment_is_visible_and_actionable_without_a_pivot_row(): void
    {
        $customer = User::factory()->create(['role' => 'user']);
        $technician = User::factory()->create(['role' => 'technician']);
        $inquiry = $this->makeInquiry($customer, today()->addDays(3)->toDateString(), 'confirmed');

        // Older records may still use the legacy technician_id field without
        // a matching inquiry_technician pivot row.
        $inquiry->update(['technician_id' => $technician->id]);

        $this->actingAs($technician)
            ->get(route('technician.services'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Technician/Workspace')
                ->where('jobs.0.id', $inquiry->id)
                ->where('jobs.0.status', 'confirmed')
                ->where('jobs.0.technicians.0.id', $technician->id));

        $this->actingAs($technician)
            ->patch(route('technician.jobs.status', $inquiry), [
                'status' => 'in_progress',
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('inquiries', [
            'id' => $inquiry->id,
            'technician_id' => $technician->id,
            'status' => 'in_progress',
        ]);
    }

    public function test_technician_cannot_join_a_job_when_they_have_a_time_conflict(): void
    {
        $customer = User::factory()->create(['role' => 'user']);
        $otherCustomer = User::factory()->create(['role' => 'user']);
        $admin = User::factory()->create(['role' => 'admin']);
        $technicianOne = User::factory()->create(['role' => 'technician']);
        $technicianTwo = User::factory()->create(['role' => 'technician']);
        $date = today()->addDays(5)->toDateString();

        $openJob = $this->makeInquiry($customer, $date, 'confirmed');
        $openJob->update(['technician_id' => $technicianOne->id]);
        $openJob->technicians()->attach($technicianOne->id, ['assigned_by' => $admin->id]);

        $conflictingJob = $this->makeInquiry($otherCustomer, $date, 'confirmed');
        $conflictingJob->update(['technician_id' => $technicianTwo->id]);
        $conflictingJob->technicians()->attach($technicianTwo->id, ['assigned_by' => $admin->id]);

        $this->actingAs($technicianTwo)->post(route('technician.jobs.claim', $openJob))
            ->assertSessionHasErrors('job');

        $this->assertDatabaseMissing('inquiry_technician', [
            'inquiry_id' => $openJob->id,
            'technician_id' => $technicianTwo->id,
        ]);
    }

    public function test_any_assigned_technician_can_complete_a_job_and_admin_is_notified(): void
    {
        $customer = User::factory()->create(['role' => 'user']);
        $admin = User::factory()->create(['role' => 'admin']);
        $technicianOne = User::factory()->create(['role' => 'technician']);
        $technicianTwo = User::factory()->create(['role' => 'technician']);
        $inquiry = $this->makeInquiry($customer, today()->addDays(2)->toDateString(), 'in_progress');
        $inquiry->update(['technician_id' => $technicianOne->id]);
        $inquiry->technicians()->attach([
            $technicianOne->id => ['assigned_by' => $admin->id],
            $technicianTwo->id => ['assigned_by' => $admin->id],
        ]);

        // A job cannot be marked completed without a Post-Service Record.
        $this->actingAs($technicianTwo)->patch(route('technician.jobs.status', $inquiry), [
            'status' => 'completed',
        ])->assertRedirect()->assertSessionHasErrors('status');

        $this->assertDatabaseHas('inquiries', ['id' => $inquiry->id, 'status' => 'in_progress']);

        // Any member of the assigned team can submit the record and complete the job.
        $this->actingAs($technicianTwo)->post(route('technician.jobs.post-service-record', $inquiry), [
            'work_summary' => 'Repaired the camera connection and verified live recording.',
            'labor_charge' => 1200,
            'additional_charge' => 0,
            'items' => [],
        ])->assertRedirect()->assertSessionHasNoErrors();

        $this->assertDatabaseHas('service_records', [
            'inquiry_id' => $inquiry->id,
            'technician_id' => $technicianTwo->id,
            'total_income' => 1200,
        ]);
        $this->assertDatabaseHas('inquiries', ['id' => $inquiry->id, 'status' => 'completed']);
        $this->assertDatabaseHas('customer_notifications', [
            'user_id' => $admin->id,
            'type' => 'job_completed',
            'related_id' => $inquiry->id,
        ]);
    }

    public function test_technician_stock_adjustment_is_audited_and_cannot_make_stock_negative(): void
    {
        $technician = User::factory()->create(['role' => 'technician']);
        $product = Product::create([
            'name' => 'Test Camera',
            'category' => 'CCTV',
            'warranty' => '1 year',
            'price' => 1000,
            'stock_quantity' => 2,
            'badge' => null,
            'image' => null,
            'images' => [],
            'specifications' => [],
            'rating' => 0,
            'is_featured' => false,
        ]);

        $this->actingAs($technician)->patch(route('technician.inventory.adjust', $product), [
            'quantity_change' => -1,
            'reason' => 'Used for installation',
        ])->assertRedirect()->assertSessionHasNoErrors();

        $this->assertDatabaseHas('products', ['id' => $product->id, 'stock_quantity' => 1]);
        $this->assertDatabaseHas('inventory_adjustments', [
            'product_id' => $product->id,
            'user_id' => $technician->id,
            'previous_quantity' => 2,
            'new_quantity' => 1,
            'quantity_change' => -1,
            'reason' => 'Used for installation',
        ]);

        $this->actingAs($technician)->patch(route('technician.inventory.adjust', $product), [
            'quantity_change' => -5,
            'reason' => 'Invalid reduction',
        ])->assertSessionHasErrors('quantity_change');

        $this->actingAs($technician)->patch(route('technician.inventory.adjust', $product), [
            'quantity_change' => -100001,
            'reason' => 'Excessive negative adjustment',
        ])->assertSessionHasErrors('quantity_change');

        $this->actingAs($technician)->patch(route('technician.inventory.adjust', $product), [
            'quantity_change' => 100001,
            'reason' => 'Excessive positive adjustment',
        ])->assertSessionHasErrors('quantity_change');

        $this->actingAs($technician)->patch(route('technician.inventory.adjust', $product), [
            'quantity_change' => 100000,
            'reason' => 'Resulting stock would exceed maximum',
        ])->assertSessionHasErrors('quantity_change');

        $this->actingAs($technician)->patch(route('technician.inventory.adjust', $product), [
            'quantity_change' => 0,
            'reason' => 'No change',
        ])->assertSessionHasErrors('quantity_change');

        $this->assertSame(1, (int) $product->fresh()->stock_quantity);
        $this->assertSame(1, InventoryAdjustment::where('product_id', $product->id)->count());
    }

    public function test_upcoming_job_reminders_notify_admin_and_team_once(): void
    {
        $now = now()->setTime(8, 0, 0);
        $this->travelTo($now);

        $customer = User::factory()->create(['role' => 'user']);
        $admin = User::factory()->create(['role' => 'admin']);
        $technician = User::factory()->create(['role' => 'technician']);
        $appointmentDate = today()->addDay()->toDateString();
        $inquiry = $this->makeInquiry($customer, $appointmentDate, 'confirmed');
        $inquiry->update(['technician_id' => $technician->id]);
        $inquiry->technicians()->attach($technician->id, [
            'assigned_by' => $admin->id,
        ]);

        $notifications = app(JobNotificationService::class);
        $notifications->sendUpcomingReminders();

        $this->assertDatabaseHas('customer_notifications', [
            'user_id' => $admin->id,
            'type' => 'job_reminder_24h',
            'related_id' => $inquiry->id,
        ]);
        $this->assertDatabaseHas('customer_notifications', [
            'user_id' => $technician->id,
            'type' => 'job_reminder_24h',
            'related_id' => $inquiry->id,
        ]);

        $this->travelTo($now->copy()->addDay()->subHour());
        $notifications->sendUpcomingReminders();
        $notifications->sendUpcomingReminders();

        $this->assertSame(1, CustomerNotification::query()
            ->where('user_id', $admin->id)
            ->where('type', 'job_reminder_1h')
            ->where('related_id', $inquiry->id)
            ->count());
        $this->assertSame(1, CustomerNotification::query()
            ->where('user_id', $technician->id)
            ->where('type', 'job_reminder_1h')
            ->where('related_id', $inquiry->id)
            ->count());

        $this->travelBack();
    }

    public function test_upcoming_reminder_handles_midnight_and_does_not_duplicate_after_rescheduling(): void
    {
        $now = now()->startOfDay()->setTime(23, 0, 0);
        $this->travelTo($now);

        $customer = User::factory()->create(['role' => 'user']);
        $admin = User::factory()->create(['role' => 'admin']);
        $technician = User::factory()->create(['role' => 'technician']);
        $appointmentDate = today()->addDay()->toDateString();
        $inquiry = $this->makeInquiry($customer, $appointmentDate, 'confirmed');
        $inquiry->update([
            'technician_id' => $technician->id,
            'preferred_time' => '12:00 AM - 03:00 AM',
        ]);
        $inquiry->technicians()->attach($technician->id, [
            'assigned_by' => $admin->id,
        ]);

        $notifications = app(JobNotificationService::class);
        $notifications->sendUpcomingReminders();
        $notifications->sendUpcomingReminders();

        $this->assertSame(1, CustomerNotification::query()
            ->where('user_id', $admin->id)
            ->where('type', 'job_reminder_1h')
            ->where('related_id', $inquiry->id)
            ->count());
        $this->assertSame(1, CustomerNotification::query()
            ->where('user_id', $technician->id)
            ->where('type', 'job_reminder_1h')
            ->where('related_id', $inquiry->id)
            ->count());

        $inquiry->update(['preferred_time' => '12:30 AM - 03:30 AM']);
        $this->travelTo($now->copy()->addMinutes(30));

        $notifications->sendUpcomingReminders();

        $this->assertSame(2, CustomerNotification::query()
            ->where('user_id', $admin->id)
            ->where('type', 'job_reminder_1h')
            ->where('related_id', $inquiry->id)
            ->count());
        $this->assertSame(2, CustomerNotification::query()
            ->where('user_id', $technician->id)
            ->where('type', 'job_reminder_1h')
            ->where('related_id', $inquiry->id)
            ->count());

        $this->travelBack();
    }

    public function test_technician_cannot_join_a_job_after_its_start_time_today(): void
    {
        $this->travelTo(now()->startOfDay()->setTime(9, 0, 0));

        $customer = User::factory()->create(['role' => 'user']);
        $admin = User::factory()->create(['role' => 'admin']);
        $technicianOne = User::factory()->create(['role' => 'technician']);
        $technicianTwo = User::factory()->create(['role' => 'technician']);
        $inquiry = $this->makeInquiry($customer, today()->toDateString(), 'confirmed');
        $inquiry->update(['technician_id' => $technicianOne->id]);
        $inquiry->technicians()->attach($technicianOne->id, [
            'assigned_by' => $admin->id,
        ]);

        $this->actingAs($technicianTwo)
            ->post(route('technician.jobs.claim', $inquiry))
            ->assertRedirect()
            ->assertSessionHasErrors('job');

        $this->assertDatabaseMissing('inquiry_technician', [
            'inquiry_id' => $inquiry->id,
            'technician_id' => $technicianTwo->id,
        ]);

        $this->travelBack();
    }

    public function test_technician_cannot_join_when_job_team_is_at_capacity(): void
    {
        $customer = User::factory()->create(['role' => 'user']);
        $admin = User::factory()->create(['role' => 'admin']);
        $team = User::factory()->count(10)->create(['role' => 'technician']);
        $extraTechnician = User::factory()->create(['role' => 'technician']);
        $inquiry = $this->makeInquiry($customer, today()->addDays(4)->toDateString(), 'confirmed');
        $inquiry->update(['technician_id' => $team->first()->id]);

        $pivot = $team->values()->mapWithKeys(function (User $technician, int $index) use ($admin) {
            return [$technician->id => [
                'assigned_by' => $admin->id,
            ]];
        })->all();
        $inquiry->technicians()->attach($pivot);

        $this->actingAs($extraTechnician)
            ->post(route('technician.jobs.claim', $inquiry))
            ->assertRedirect()
            ->assertSessionHasErrors('job');

        $this->assertDatabaseMissing('inquiry_technician', [
            'inquiry_id' => $inquiry->id,
            'technician_id' => $extraTechnician->id,
        ]);
        $this->assertSame(10, $inquiry->technicians()->count());
    }

    private function makeInquiry(User $customer, string $date, string $status = 'pending'): Inquiry
    {
        return Inquiry::create([
            'user_id' => $customer->id,
            'inquiry_number' => 'TEST-' . strtoupper(bin2hex(random_bytes(4))),
            'inquirable_type' => null,
            'inquirable_id' => null,
            'item_name' => 'CCTV installation',
            'customer_name' => $customer->name,
            'customer_phone' => '09171234567',
            'customer_email' => $customer->email,
            'street_address' => '123 Test Street',
            'city' => 'Taguig',
            'service_type' => 'Installation',
            'urgency' => 'normal',
            'preferred_date' => $date,
            'preferred_time' => self::SLOT,
            'notes' => null,
            'status' => $status,
        ]);
    }
}
