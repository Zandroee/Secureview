<?php

namespace Database\Seeders;

use App\Models\Product;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        $products = [
            [
                'name' => 'Dahua Bullet HDCVI 5MP',
                'category' => 'bullet',
                'warranty' => '1 Year',
                'price' => 4000,
                'badge' => 'BEST SELLER',
                'image' => '/images/cctv-cameras.jpg',
                'specifications' => [
                    '1920 × 1080 @25/30 FPS',
                    '5MP CMOS Image Sensor',
                    'Built-In Warm Light LED',
                    'H.265 Codec, High Compression',
                ],
                'rating' => 5,
                'is_featured' => true,
            ],
            [
                'name' => 'HikVision Dome Camera 5MP',
                'category' => 'dome',
                'warranty' => '1 Year',
                'price' => 4500,
                'badge' => 'POPULAR',
                'image' => '/images/cctv-cameras.jpg',
                'specifications' => [
                    '5MP High Resolution',
                    'Night Vision',
                    'Indoor Surveillance',
                    'H.265+ Compression',
                ],
                'rating' => 5,
                'is_featured' => true,
            ],
            [
                'name' => 'Dahua Dome Camera 4MP',
                'category' => 'dome',
                'warranty' => '1 Year',
                'price' => 3500,
                'badge' => null,
                'image' => '/images/cctv-cameras.jpg',
                'specifications' => [
                    '4MP CMOS Sensor',
                    'Infrared Night Vision',
                    'Smart IR',
                    'Weather Resistant',
                ],
                'rating' => 4,
                'is_featured' => true,
            ],
            [
                'name' => 'HikVision Bullet Camera 5MP',
                'category' => 'bullet',
                'warranty' => '1 Year',
                'price' => 4800,
                'badge' => null,
                'image' => '/images/cctv-cameras.jpg',
                'specifications' => [
                    '5MP Resolution',
                    'ColorVu Technology',
                    'Night Vision',
                    'Weatherproof Housing',
                ],
                'rating' => 5,
                'is_featured' => true,
            ],
            [
                'name' => '360° Panoramic Camera',
                'category' => 'camera360',
                'warranty' => '1 Year',
                'price' => 6500,
                'badge' => 'NEW',
                'image' => '/images/cctv-cameras.jpg',
                'specifications' => [
                    '360° Coverage',
                    '5MP Resolution',
                    'Wide Angle Lens',
                    'Smart Motion Detection',
                ],
                'rating' => 4,
                'is_featured' => true,
            ],
            [
                'name' => 'Dahua Outdoor Bullet Camera',
                'category' => 'bullet',
                'warranty' => '1 Year',
                'price' => 5200,
                'badge' => null,
                'image' => '/images/cctv-cameras.jpg',
                'specifications' => [
                    'Outdoor Surveillance',
                    'Full HD Resolution',
                    'Infrared Night Vision',
                    'IP67 Weatherproof',
                ],
                'rating' => 5,
                'is_featured' => true,
            ],
            [
                'name' => 'HikVision Indoor Dome',
                'category' => 'dome',
                'warranty' => '1 Year',
                'price' => 3200,
                'badge' => null,
                'image' => '/images/cctv-cameras.jpg',
                'specifications' => [
                    '4MP Resolution',
                    'Indoor Use',
                    'Night Vision',
                    'Motion Detection',
                ],
                'rating' => 4,
                'is_featured' => true,
            ],
            [
                'name' => '360° Security Camera Pro',
                'category' => 'camera360',
                'warranty' => '1 Year',
                'price' => 7500,
                'badge' => 'PREMIUM',
                'image' => '/images/cctv-cameras.jpg',
                'specifications' => [
                    '360° Panoramic View',
                    '6MP Resolution',
                    'AI Motion Detection',
                    'Night Vision',
                ],
                'rating' => 5,
                'is_featured' => true,
            ],
            [
                'name' => 'Dahua Bullet HDCVI 8MP',
                'category' => 'bullet',
                'warranty' => '1 Year',
                'price' => 8000,
                'badge' => null,
                'image' => '/images/cctv-cameras.jpg',
                'specifications' => [
                    '8MP Ultra HD',
                    'Smart IR',
                    'Night Vision',
                    'IP67 Protection',
                ],
                'rating' => 5,
                'is_featured' => false,
            ],
            [
                'name' => 'HikVision Dome 4MP',
                'category' => 'dome',
                'warranty' => '1 Year',
                'price' => 3800,
                'badge' => null,
                'image' => '/images/cctv-cameras.jpg',
                'specifications' => [
                    '4MP CMOS Sensor',
                    'Smart IR',
                    'Indoor Surveillance',
                    'H.265+ Compression',
                ],
                'rating' => 4,
                'is_featured' => false,
            ],
            [
                'name' => 'Dahua 360° Camera',
                'category' => 'camera360',
                'warranty' => '1 Year',
                'price' => 6200,
                'badge' => null,
                'image' => '/images/cctv-cameras.jpg',
                'specifications' => [
                    '360° Viewing Angle',
                    '5MP Resolution',
                    'Motion Detection',
                    'Night Vision',
                ],
                'rating' => 4,
                'is_featured' => false,
            ],
            [
                'name' => 'HikVision Outdoor Dome',
                'category' => 'dome',
                'warranty' => '1 Year',
                'price' => 5500,
                'badge' => null,
                'image' => '/images/cctv-cameras.jpg',
                'specifications' => [
                    '5MP Resolution',
                    'Outdoor Use',
                    'Night Vision',
                    'IP67 Weatherproof',
                ],
                'rating' => 5,
                'is_featured' => false,
            ],
        ];

        foreach ($products as $product) {
            Product::updateOrCreate(
                ['name' => $product['name']],
                $product
            );
        }
    }
}