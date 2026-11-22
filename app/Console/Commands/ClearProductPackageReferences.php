<?php

namespace App\Console\Commands;

use App\Models\CartItem;
use App\Models\CatalogOption;
use App\Models\Inquiry;
use App\Models\InventoryAdjustment;
use App\Models\Package;
use App\Models\PackageItem;
use App\Models\Product;
use App\Models\Review;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ClearProductPackageReferences extends Command
{
    protected $signature = 'catalog:clear-product-package-references
                            {--force : Skip the interactive confirmation prompt}';

    protected $description = 'Clear temporary catalog references so products and packages can be removed while preserving purchase and service history.';

    public function handle(): int
    {
        if (!$this->option('force') && !$this->confirm(
            'This clears product/package bundle components, cart lines, reviews, stock-adjustment history and catalog dropdown options. It preserves products, packages, orders, invoices, order-item snapshots, warranty claims, service inquiries and admin audit logs. Continue?'
        )) {
            $this->warn('Catalog reference cleanup cancelled.');

            return self::FAILURE;
        }

        $types = [Product::class, Package::class];

        $counts = DB::transaction(function () use ($types): array {
            $cartItems = CartItem::query()
                ->whereIn('purchasable_type', $types)
                ->delete();

            $reviews = Review::query()
                ->whereIn('reviewable_type', $types)
                ->delete();

            $packageItems = PackageItem::query()->delete();

            // Preserve the service request as history but remove its live catalog-model pointer.
            // The copied item_name and customer/service details remain available to staff.
            $inquiriesDetached = Inquiry::query()
                ->whereIn('inquirable_type', $types)
                ->update([
                    'inquirable_type' => null,
                    'inquirable_id' => null,
                ]);

            $inventoryAdjustments = InventoryAdjustment::query()->delete();
            $catalogOptions = CatalogOption::query()->delete();

            return [
                'cart items removed' => $cartItems,
                'product/package reviews removed' => $reviews,
                'bundle component rows removed' => $packageItems,
                'service inquiry catalog links cleared' => $inquiriesDetached,
                'inventory adjustment rows removed' => $inventoryAdjustments,
                'catalog dropdown options removed' => $catalogOptions,
            ];
        });

        $this->newLine();
        $this->table(
            ['Related data', 'Rows affected'],
            collect($counts)->map(fn (int $count, string $label) => [$label, $count])->values()->all()
        );
        $this->newLine();
        $this->info('Catalog references cleared. You can now delete the old packages first, then the products.');
        $this->comment('Preserved: paid/unpaid orders, invoice records, immutable order-item name/price/quantity/subtotal snapshots, warranty claims, service inquiries, customer accounts and admin activity logs.');

        return self::SUCCESS;
    }
}
