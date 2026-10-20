<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ChatbotController;
use App\Http\Controllers\LandingController;
use App\Http\Controllers\PackageController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CartController;
use App\Http\Controllers\CheckoutController;
use App\Http\Controllers\PurchaseController;
use App\Http\Controllers\InquiryController;
use App\Http\Controllers\ScheduleController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\TechnicianWorkspaceController;
use App\Http\Controllers\Admin\InquiryController as AdminInquiryController;
use App\Http\Controllers\Admin\UserController as AdminUserController;
use App\Http\Controllers\Admin\ScheduleController as AdminScheduleController;
use App\Http\Controllers\Admin\PurchaseController as AdminPurchaseController;
use App\Http\Controllers\Admin\ProductController as AdminProductController;
use App\Http\Controllers\Admin\ActivityLogController as AdminActivityLogController;
use App\Http\Controllers\Admin\PackageController as AdminPackageController;
use App\Http\Controllers\Admin\CatalogOptionController as AdminCatalogOptionController;
use App\Http\Controllers\Admin\TransactionController as AdminTransactionController;
use App\Http\Controllers\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Admin\InventoryAdjustmentController as AdminInventoryAdjustmentController;
use App\Http\Controllers\Admin\WarrantyController as AdminWarrantyController;
use App\Http\Controllers\WarrantyClaimController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Cache;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Support\Str;
use App\Models\User;

Route::get('/', [LandingController::class, 'index']);

Route::get('/products', [ProductController::class, 'index']);
Route::get('/products/{id}', [ProductController::class, 'show']);

Route::get('/packages', [PackageController::class, 'index']);
Route::get('/packages/{id}', [PackageController::class, 'show']);

Route::get('/services', function () {
    return Inertia::render('services');
})->name('services');

Route::get('/about', function () {
    return Inertia::render('about');
})->name('about');

Route::post('/chatbot/message', [ChatbotController::class, 'reply'])
    ->middleware('throttle:10,1')
    ->name('chatbot.reply');

Route::get('/login', function () {
    return Inertia::render('login');
})->name('login');

Route::get('/signup', function (Request $request) {
    return Inertia::render('signup', [
        'verificationSent' => $request->session()->get('verificationSent', false),
        'verificationEmail' => $request->session()->get('verificationEmail', ''),
    ]);
})->name('signup');

Route::post('/login', [AuthController::class, 'authenticate'])->name('login.authenticate');
Route::post('/register', [AuthController::class, 'register'])->name('register');
Route::post('/logout', [AuthController::class, 'logout'])->name('logout');

Route::get('/email/verify', function () {
    return redirect()->route('signup');
})->name('verification.notice');

Route::get('/email/verify/{id}/{hash}', function (Request $request, $id, $hash) {
    $user = User::findOrFail($id);

    if (!hash_equals((string) $hash, sha1($user->getEmailForVerification()))) {
        abort(403);
    }

    if (!$user->hasVerifiedEmail()) {
        $user->markEmailAsVerified();
    }

    return redirect()->route('login')->with([
        'status' => 'Your email has been verified successfully. You can now log in.',
    ]);
})->middleware('signed')->name('verification.verify');

Route::post('/email/verification-notification', function (Request $request) {
    $validated = $request->validate([
        'email' => ['required', 'email'],
    ]);

    $user = User::where('email', $validated['email'])->first();

    if ($user && !$user->hasVerifiedEmail()) {
        $cooldownKey = 'verification-email-cooldown:' . $user->id;

        if (Cache::add($cooldownKey, true, now()->addSeconds(60))) {
            $user->sendEmailVerificationNotification();
        }
    }

    return back()->with('message', 'Verification link sent!');
})->middleware('throttle:1,1')->name('verification.send');

Route::get('/auth/google', [AuthController::class, 'redirectGoogle'])
    ->name('auth.google');

Route::get('/auth/google/callback', [AuthController::class, 'googleCallback'])
    ->name('auth.google.callback');

Route::get('/auth/facebook', [AuthController::class, 'redirectFacebook'])
    ->name('auth.facebook');

Route::get('/auth/facebook/callback', [AuthController::class, 'facebookCallback'])
    ->name('auth.facebook.callback');

Route::get('/forgot-password', function () {
    return Inertia::render('forgot-password');
})->middleware('guest')->name('password.request');

Route::post('/forgot-password', function (Request $request) {
    $request->validate([
        'email' => ['required', 'email'],
    ]);

    $status = Password::sendResetLink(
        $request->only('email')
    );

    return $status === Password::ResetLinkSent
        ? back()->with('status', __($status))
        : back()->withErrors([
            'email' => __($status),
        ]);
})->middleware(['guest', 'throttle:1,1'])->name('password.email');

Route::get('/reset-password/{token}', function (Request $request, string $token) {
    return Inertia::render('reset-password', [
        'token' => $token,
        'email' => $request->query('email', ''),
    ]);
})->middleware('guest')->name('password.reset');

Route::post('/reset-password', function (Request $request) {
    $request->validate([
        'token' => ['required'],
        'email' => ['required', 'email'],
        'password' => [
            'required',
            'confirmed',
            Password::min(8)
                ->mixedCase()
                ->numbers()
                ->symbols(),
        ],
    ]);

    $status = Password::reset(
        $request->only(
            'email',
            'password',
            'password_confirmation',
            'token'
        ),
        function ($user, $password) {
            $user->forceFill([
                'password' => Hash::make($password),
                'remember_token' => Str::random(60),
            ])->save();

            event(new PasswordReset($user));
        }
    );

    return $status === Password::PasswordReset
        ? redirect()->route('login')->with('status', __($status))
        : back()->withErrors([
            'email' => [__($status)],
        ]);
})->middleware('guest')->name('password.update');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/cart', [CartController::class, 'index'])->name('cart.index');
    Route::post('/cart/items', [CartController::class, 'store'])->name('cart.items.store');
    Route::patch('/cart/items/{cartItem}', [CartController::class, 'update'])->name('cart.items.update');
    Route::delete('/cart/items/{cartItem}', [CartController::class, 'destroy'])->name('cart.items.destroy');
    Route::delete('/cart', [CartController::class, 'clear'])->name('cart.clear');

    Route::get('/checkout', [CheckoutController::class, 'index'])->name('checkout');
    Route::post('/checkout', [CheckoutController::class, 'store'])->name('checkout.store');
    Route::get('/checkout/payment/{order}/success', [CheckoutController::class, 'paymentSuccess'])->name('checkout.payment.success');
    Route::get('/checkout/payment/{order}/cancel', [CheckoutController::class, 'paymentCancel'])->name('checkout.payment.cancel');

    Route::get('/purchases', [PurchaseController::class, 'index'])->name('purchases.index');
    Route::get('/purchases/{order}', [PurchaseController::class, 'show'])->name('purchases.show');
    Route::post('/purchases/{order}/pay', [PurchaseController::class, 'pay'])->name('purchases.pay');
    Route::patch('/purchases/{order}/cancel', [PurchaseController::class, 'cancel'])->name('purchases.cancel');

    Route::get('/warranty-claims', [WarrantyClaimController::class, 'index'])->name('warranty-claims.index');
    Route::post('/warranty-claims', [WarrantyClaimController::class, 'store'])->name('warranty-claims.store');

    Route::get('/inquiry', [InquiryController::class, 'create'])->name('inquiries.create');
    Route::post('/inquiries', [InquiryController::class, 'store'])->name('inquiries.store');
    Route::get('/inquiries', [InquiryController::class, 'index'])->name('inquiries.index');
    Route::get('/inquiries/{inquiry}', [InquiryController::class, 'show'])->name('inquiries.show');
    Route::post('/inquiries/{inquiry}/reschedule', [InquiryController::class, 'requestReschedule'])->name('inquiries.reschedule');
    Route::get('/schedules', [ScheduleController::class, 'index'])->name('schedules.index');
    Route::get('/notifications', [NotificationController::class, 'index'])->name('notifications.index');
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllAsRead'])->name('notifications.read-all');
    Route::post('/notifications/{notification}/read', [NotificationController::class, 'markAsRead'])->name('notifications.read');

});

Route::middleware(['auth', 'verified', 'technician'])->prefix('technician')->name('technician.')->group(function () {
    Route::get('/dashboard', [TechnicianWorkspaceController::class, 'index'])->name('dashboard');
    Route::post('/jobs/{inquiry}/claim', [TechnicianWorkspaceController::class, 'claimJob'])->name('jobs.claim');
    Route::patch('/jobs/{inquiry}/status', [TechnicianWorkspaceController::class, 'updateJobStatus'])->name('jobs.status');
    Route::patch('/jobs/{inquiry}/schedule', [TechnicianWorkspaceController::class, 'updateJobSchedule'])->name('jobs.schedule');
    Route::patch('/jobs/{inquiry}/reschedule/{decision}', [TechnicianWorkspaceController::class, 'reviewReschedule'])->whereIn('decision', ['approve', 'decline'])->name('jobs.reschedule.review');
    Route::patch('/inventory/{product}', [TechnicianWorkspaceController::class, 'adjustStock'])->name('inventory.adjust');
});

Route::middleware(['auth', 'verified', 'admin'])->group(function () {
    Route::post('/admin/announcements', [NotificationController::class, 'storeAnnouncement'])
        ->name('admin.announcements.store');
    Route::post('/admin/catalog-options', [AdminCatalogOptionController::class, 'store'])
        ->name('admin.catalog-options.store');

    Route::delete('/admin/catalog-options', [AdminCatalogOptionController::class, 'destroy'])
        ->name('admin.catalog-options.destroy');

    Route::get('/dashboard', [AdminDashboardController::class, 'index'])->name('dashboard');

    Route::get('/admin/activity-logs', [AdminActivityLogController::class, 'index'])
        ->name('admin.activity-logs.index');

    Route::get('/admin/packages', [AdminPackageController::class, 'index'])
        ->name('admin.packages.index');

    Route::post('/admin/packages', [AdminPackageController::class, 'store'])
        ->name('admin.packages.store');

    Route::patch('/admin/packages/{package}', [AdminPackageController::class, 'update'])
        ->name('admin.packages.update');

    Route::delete('/admin/packages/{package}', [AdminPackageController::class, 'destroy'])
        ->name('admin.packages.destroy');

    Route::get('/admin/transactions', [AdminTransactionController::class, 'index'])
        ->name('admin.transactions.index');

    Route::get('/admin/inquiries', [AdminInquiryController::class, 'index'])
        ->name('admin.inquiries.index');

    Route::get('/admin/products', [AdminProductController::class, 'index'])
        ->name('admin.products.index');

    Route::get('/admin/inventory-adjustments', [AdminInventoryAdjustmentController::class, 'index'])
        ->name('admin.inventory-adjustments.index');

    Route::get('/admin/warranty', [AdminWarrantyController::class, 'index'])
        ->name('admin.warranty.index');
    Route::patch('/admin/warranty/{warrantyClaim}', [AdminWarrantyController::class, 'update'])
        ->name('admin.warranty.update');

    Route::post('/admin/products', [AdminProductController::class, 'store'])
        ->name('admin.products.store');

    Route::patch('/admin/products/{product}', [AdminProductController::class, 'update'])
        ->name('admin.products.update');

    Route::delete('/admin/products/{product}', [AdminProductController::class, 'destroy'])
        ->name('admin.products.destroy');

    Route::patch('/admin/products/{product}/stock', [AdminProductController::class, 'updateStock'])
        ->name('admin.products.stock');

    Route::get('/admin/inquiries/{inquiry}', [AdminInquiryController::class, 'show'])
        ->name('admin.inquiries.show');

    Route::patch('/admin/inquiries/{inquiry}/status', [AdminInquiryController::class, 'updateStatus'])
        ->name('admin.inquiries.status');

    Route::patch('/admin/inquiries/{inquiry}/confirm', [AdminInquiryController::class, 'confirm'])
        ->name('admin.inquiries.confirm');

    Route::patch('/admin/inquiries/{inquiry}/technician', [AdminInquiryController::class, 'assignTechnician'])
        ->name('admin.inquiries.technician');

    Route::get('/admin/users', [AdminUserController::class, 'index'])
        ->name('admin.users.index');

    Route::get('/admin/schedules', [AdminScheduleController::class, 'index'])
        ->name('admin.schedules.index');
    Route::get('/admin/service-history', [AdminScheduleController::class, 'history'])
        ->name('admin.service-history.index');
    Route::get('/admin/schedules/{inquiry}', [AdminScheduleController::class, 'show'])
        ->name('admin.schedules.show');
    Route::patch('/admin/schedules/{inquiry}', [AdminScheduleController::class, 'updateSchedule'])->name('admin.schedules.update');
    Route::patch('/admin/reschedule-requests/{inquiry}/approve', [AdminScheduleController::class, 'approveReschedule'])->name('admin.reschedule-requests.approve');
    Route::patch('/admin/reschedule-requests/{inquiry}/decline', [AdminScheduleController::class, 'declineReschedule'])->name('admin.reschedule-requests.decline');

    Route::post('/admin/booking-availability', [AdminScheduleController::class, 'storeBookingDateBlock'])
        ->name('admin.booking-availability.store');

    Route::delete('/admin/booking-availability/{blockedBookingDate}', [AdminScheduleController::class, 'destroyBookingDateBlock'])
        ->name('admin.booking-availability.destroy');

    Route::delete('/admin/booking-time-slots/{blockedBookingTimeSlot}', [AdminScheduleController::class, 'destroyBookingTimeSlot'])
        ->name('admin.booking-time-slots.destroy');

    Route::get('/admin/purchases', [AdminPurchaseController::class, 'index'])
        ->name('admin.purchases.index');
    Route::patch('/admin/purchases/{order}/cancel', [AdminPurchaseController::class, 'cancel'])
        ->name('admin.purchases.cancel');
    Route::patch('/admin/purchases/{order}/confirm-cash-payment', [AdminPurchaseController::class, 'confirmCashPayment'])
        ->name('admin.purchases.confirm-cash-payment');
    Route::patch('/admin/purchases/{order}/complete', [AdminPurchaseController::class, 'markCompleted'])
        ->name('admin.purchases.complete');

    Route::patch('/admin/users/{user}/role', [AdminUserController::class, 'updateRole'])
        ->name('admin.users.role');
});
