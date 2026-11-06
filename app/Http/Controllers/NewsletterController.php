<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class NewsletterController extends Controller
{
    public function unsubscribe(Request $request, User $user): RedirectResponse
    {
        $user->forceFill([
            'newsletter_opt_in' => false,
            'newsletter_opted_out_at' => now(),
        ])->save();

        return redirect('/')
            ->with('status', 'You have been unsubscribed from Netmax Trading promotional emails.');
    }
}
