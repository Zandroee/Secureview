<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Package;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class ReviewController extends Controller
{
    /**
     * Open a review form from a paid order, using the exact order item so the
     * customer is not sent to an incorrect or stale catalog URL.
     */
    public function create(Request $request, Order $order, OrderItem $orderItem)
    {
        if (
            (int) $order->user_id !== (int) $request->user()->id
            || (int) $orderItem->order_id !== (int) $order->id
        ) {
            abort(404);
        }

        if ($order->payment_status !== 'paid' || $order->order_status === 'cancelled') {
            return redirect()
                ->route('purchases.show', $order)
                ->withErrors(['review' => 'You can review an item after its order has been paid and is not cancelled.']);
        }

        $purchasable = $orderItem->purchasable;

        if (! ($purchasable instanceof Product) && ! ($purchasable instanceof Package)) {
            return redirect()
                ->route('purchases.show', $order)
                ->withErrors(['review' => 'This item is no longer available in the catalog, so a product review cannot be attached to it.']);
        }

        $itemType = $purchasable instanceof Package ? 'package' : 'product';
        $userReview = $purchasable->reviews()->where('user_id', $request->user()->id)->first();
        $reviews = $purchasable->reviews()->with('user')->latest()->get();

        return Inertia::render('review_create', [
            'order' => [
                'id' => $order->id,
                'order_number' => $order->order_number,
            ],
            'orderItem' => [
                'id' => $orderItem->id,
            ],
            'itemType' => $itemType,
            'item' => [
                'id' => $purchasable->id,
                'name' => $orderItem->name ?: $purchasable->name,
                'price' => (float) $orderItem->price,
                'type' => $itemType,
                'image' => $orderItem->purchasable?->image ?? $purchasable->image,
                'warranty_period' => $orderItem->warranty_period,
            ],
            'userReview' => $userReview,
            'reviews' => $reviews,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'item_type' => ['required', Rule::in(['product', 'package'])],
            'item_id' => ['required', 'integer', 'min:1'],
            'rating' => ['required', 'integer', 'between:1,5'],
            'comment' => ['required', 'string', 'min:3', 'max:2000'],
            'images' => ['sometimes', 'array', 'max:5'],
            'images.*' => ['image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
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

        if (! $hasPaidPurchase) {
            return back()->withErrors([
                'review' => 'You can review this item only after you have purchased and paid for it.',
            ]);
        }

        $review = $item->reviews()->where('user_id', $request->user()->id)->first();
        $existingImages = $review?->images ?? [];

        $validatedRemovals = validator($request->only('remove_images'), [
            'remove_images' => ['sometimes', 'array', 'max:5'],
            'remove_images.*' => ['string', Rule::in($existingImages)],
        ])->validate()['remove_images'] ?? [];

        $keptImages = array_values(array_diff($existingImages, $validatedRemovals));
        $newUploads = $validated['images'] ?? [];

        if (count($keptImages) + count($newUploads) > 5) {
            return back()->withErrors([
                'images' => 'A review can contain up to five photos. Remove an existing photo before adding another.',
            ]);
        }

        $storedImages = [];
        foreach ($newUploads as $upload) {
            $storedImages[] = $upload->store('review-photos', 'public');
        }

        $review = $item->reviews()->updateOrCreate(
            ['user_id' => $request->user()->id],
            [
                'rating' => (int) $validated['rating'],
                'comment' => trim($validated['comment']),
                'images' => array_values(array_merge($keptImages, $storedImages)),
            ]
        );

        if ($validatedRemovals !== []) {
            Storage::disk('public')->delete($validatedRemovals);
        }

        $averageRating = round((float) $item->reviews()->avg('rating'), 1);
        $item->update(['rating' => $averageRating]);

        return back()->with('success', 'Your review and rating have been saved.');
    }
}
