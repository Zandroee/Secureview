<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\LandingController;
use App\Http\Controllers\PackageController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CartController;
use App\Http\Controllers\CheckoutController;
use App\Http\Controllers\PurchaseController;
use App\Http\Controllers\InquiryController;
use App\Http\Controllers\ScheduleController;
use App\Http\Controllers\NotificationController;
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

    Route::get('/inquiry', [InquiryController::class, 'create'])->name('inquiries.create');
    Route::post('/inquiries', [InquiryController::class, 'store'])->name('inquiries.store');
    Route::get('/inquiries', [InquiryController::class, 'index'])->name('inquiries.index');
    Route::get('/inquiries/{inquiry}', [InquiryController::class, 'show'])->name('inquiries.show');
    Route::get('/schedules', [ScheduleController::class, 'index'])->name('schedules.index');
    Route::get('/notifications', [NotificationController::class, 'index'])->name('notifications.index');
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllAsRead'])->name('notifications.read-all');
    Route::post('/notifications/{notification}/read', [NotificationController::class, 'markAsRead'])->name('notifications.read');

    Route::get('/dashboard', function () {
        return Inertia::render('Dashboard');
    })->name('dashboard');
});
