<?php

namespace Database\Seeders;

use App\Models\Product;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        Product::create([
            'name' => 'Dahua Bullet HDCVI 5MP',
            'category' => 'bullet',
            'warranty' => '1 Year',
            'price' => 4000,
            'badge' => 'BEST SELLER',
            'specifications' => [
                '1920 × 1080 @25/30 FPS',
                '5MP CMOS Image Sensor',
                'Built-In Warm Light LED',
                'H.265 Codec, High Compression',
            ],
            'rating' => 5,
            'is_featured' => true,
        ]);

        Product::create([
            'name' => 'HikVision Dome Camera 5MP',
            'category' => 'dome',
            'warranty' => '1 Year',
            'price' => 4500,
            'badge' => 'POPULAR',
            'specifications' => [
                '5MP High Resolution',
                'Night Vision',
                'Indoor Surveillance',
                'H.265+ Compression',
            ],
            'rating' => 5,
            'is_featured' => true,
        ]);

        Product::create([
            'name' => 'Dahua Dome Camera 4MP',
            'category' => 'dome',
            'warranty' => '1 Year',
            'price' => 3500,
            'specifications' => [
                '4MP CMOS Sensor',
                'Infrared Night Vision',
                'Smart IR',
                'Weather Resistant',
            ],
            'rating' => 4,
        ]);

        Product::create([
            'name' => 'HikVision Bullet Camera 5MP',
            'category' => 'bullet',
            'warranty' => '1 Year',
            'price' => 4800,
            'specifications' => [
                '5MP Resolution',
                'ColorVu Technology',
                'Night Vision',
                'Weatherproof Housing',
            ],
            'rating' => 5,
        ]);

        Product::create([
            'name' => '360° Panoramic Camera',
            'category' => 'camera360',
            'warranty' => '1 Year',
            'price' => 6500,
            'badge' => 'NEW',
            'specifications' => [
                '360° Coverage',
                '5MP Resolution',
                'Wide Angle Lens',
                'Smart Motion Detection',
            ],
            'rating' => 4,
        ]);

        Product::create([
            'name' => 'Dahua Outdoor Bullet Camera',
            'category' => 'bullet',
            'warranty' => '1 Year',
            'price' => 5200,
            'specifications' => [
                'Outdoor Surveillance',
                'Full HD Resolution',
                'Infrared Night Vision',
                'IP67 Weatherproof',
            ],
            'rating' => 5,
        ]);

        Product::create([
            'name' => 'HikVision Indoor Dome',
            'category' => 'dome',
            'warranty' => '1 Year',
            'price' => 3200,
            'specifications' => [
                '4MP Resolution',
                'Indoor Use',
                'Night Vision',
                'Motion Detection',
            ],
            'rating' => 4,
        ]);

        Product::create([
            'name' => '360° Security Camera Pro',
            'category' => 'camera360',
            'warranty' => '1 Year',
            'price' => 7500,
            'badge' => 'PREMIUM',
            'specifications' => [
                '360° Panoramic View',
                '6MP Resolution',
                'AI Motion Detection',
                'Night Vision',
            ],
            'rating' => 5,
        ]);

        Product::create([
            'name' => 'Dahua Bullet HDCVI 8MP',
            'category' => 'bullet',
            'warranty' => '1 Year',
            'price' => 8000,
            'specifications' => [
                '8MP Ultra HD',
                'Smart IR',
                'Night Vision',
                'IP67 Protection',
            ],
            'rating' => 5,
        ]);

        Product::create([
            'name' => 'HikVision Dome 4MP',
            'category' => 'dome',
            'warranty' => '1 Year',
            'price' => 3800,
            'specifications' => [
                '4MP CMOS Sensor',
                'Smart IR',
                'Indoor Surveillance',
                'H.265+ Compression',
            ],
            'rating' => 4,
        ]);

        Product::create([
            'name' => 'Dahua 360° Camera',
            'category' => 'camera360',
            'warranty' => '1 Year',
            'price' => 6200,
            'specifications' => [
                '360° Viewing Angle',
                '5MP Resolution',
                'Motion Detection',
                'Night Vision',
            ],
            'rating' => 4,
        ]);

        Product::create([
            'name' => 'HikVision Outdoor Dome',
            'category' => 'dome',
            'warranty' => '1 Year',
            'price' => 5500,
            'specifications' => [
                '5MP Resolution',
                'Outdoor Use',
                'Night Vision',
                'IP67 Weatherproof',
            ],
            'rating' => 5,
        ]);
    }
}