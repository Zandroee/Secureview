<?php

namespace Database\Seeders;

use App\Models\Package;
use App\Models\PackageItem;
use App\Models\Product;
use Illuminate\Database\Seeder;

class PackageItemSeeder extends Seeder
{
    public function run(): void
    {
        $items = [
            [
                'package' => '4 Channel HikVision Dome Cameras',
                'product' => 'HikVision Dome Camera 5MP',
                'quantity' => 4,
            ],
            [
                'package' => '4 Channel Dahua Bullet Cameras',
                'product' => 'Dahua Bullet HDCVI 5MP',
                'quantity' => 4,
            ],
            [
                'package' => '8 Channel HikVision Package',
                'product' => 'HikVision Dome Camera 5MP',
                'quantity' => 4,
            ],
            [
                'package' => '8 Channel HikVision Package',
                'product' => 'HikVision Indoor Dome',
                'quantity' => 4,
            ],
            [
                'package' => '8 Channel Dahua Security Package',
                'product' => 'Dahua Bullet HDCVI 5MP',
                'quantity' => 4,
            ],
            [
                'package' => '8 Channel Dahua Security Package',
                'product' => 'Dahua Outdoor Bullet Camera',
                'quantity' => 4,
            ],
            [
                'package' => '4 Channel Home Security Package',
                'product' => 'HikVision Indoor Dome',
                'quantity' => 2,
            ],
            [
                'package' => '4 Channel Home Security Package',
                'product' => 'Dahua Dome Camera 4MP',
                'quantity' => 2,
            ],
            [
                'package' => '8 Channel Premium Package',
                'product' => 'HikVision Dome Camera 5MP',
                'quantity' => 4,
            ],
            [
                'package' => '8 Channel Premium Package',
                'product' => '360° Security Camera Pro',
                'quantity' => 4,
            ],
            [
                'package' => '16 Channel Business Package',
                'product' => 'Dahua Bullet HDCVI 5MP',
                'quantity' => 8,
            ],
            [
                'package' => '16 Channel Business Package',
                'product' => 'HikVision Dome Camera 5MP',
                'quantity' => 8,
            ],
            [
                'package' => 'Complete Premium CCTV Package',
                'product' => 'Dahua Bullet HDCVI 8MP',
                'quantity' => 4,
            ],
            [
                'package' => 'Complete Premium CCTV Package',
                'product' => '360° Security Camera Pro',
                'quantity' => 4,
            ],
            [
                'package' => 'Complete Premium CCTV Package',
                'product' => 'HikVision Outdoor Dome',
                'quantity' => 4,
            ],
        ];

        foreach ($items as $item) {
            $package = Package::where('name', $item['package'])->first();
            $product = Product::where('name', $item['product'])->first();

            if (!$package || !$product) {
                continue;
            }

            PackageItem::updateOrCreate(
                [
                    'package_id' => $package->id,
                    'product_id' => $product->id,
                ],
                [
                    'quantity' => $item['quantity'],
                    'price' => $product->price,
                ]
            );
        }
    }
}