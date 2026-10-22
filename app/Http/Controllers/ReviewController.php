<?php

namespace App\Http\Controllers;

use App\Models\OrderItem;
use App\Models\Package;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ReviewController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'item_type' => ['required', Rule::in(['product', 'package'])],
            'item_id' => ['required', 'integer', 'min:1'],
            'rating' => ['required', 'integer', 'between:1,5'],
            'comment' => ['required', 'string', 'min:3', 'max:2000'],
        ]);

        $modelClass = $validated['item_type'] === 'package'
            ? Package::class
            : Product::class;

        $item = $modelClass::query()->findOrFail($validated['item_id']);

        $hasPaidPurchase = OrderItem::query()
            ->where('purchasable_type', $modelClass)
            ->where('purchasable_id', $item->getKey())
            ->whereHas('order', function ($query) use ($request) {
                $query->where('user_id', $request->user()->id)
                    ->where('payment_status', 'paid')
                    ->where('order_status', '!=', 'cancelled');
            })
            ->exists();

        if (!$hasPaidPurchase) {
            return back()->withErrors([
                'review' => 'You can review this item only after you have purchased and paid for it.',
            ]);
        }

        // One review per account per item. A later submission updates the
        // customer's own review instead of creating duplicate reviews.
        $item->reviews()->updateOrCreate(
            ['user_id' => $request->user()->id],
            [
                'rating' => (int) $validated['rating'],
                'comment' => trim($validated['comment']),
            ]
        );

        $averageRating = round((float) $item->reviews()->avg('rating'), 1);
        $item->update(['rating' => $averageRating]);

        return back()->with('success', 'Your review and rating have been saved.');
    }
}