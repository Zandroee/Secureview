<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CatalogExpansionSeeder extends Seeder
{
    public function run(): void
    {
        // Keep the catalog expansion all-or-nothing if a row or relationship fails.
        DB::transaction(function (): void {
            $now = now();

        // These are additive catalog suggestions. Never alter existing admin-managed
        // product/package records or re-run the general demo seeders in production.
        $products = [
            [
                'name' => 'Dahua 8MP WizColor TiOC PRO Bullet Network Camera',
                'brand' => 'Dahua',
                'category' => 'bullet',
                'warranty' => '1 Year',
                'price' => 10000,
                'installation_fee' => null,
                'stock_quantity' => 12,
                'badge' => 'NEW',
                'image' => 'https://images-cdn.ubuy.ma/639d0d49c4b5e50d1e5598c9-camara-ip-poe-de-disuasion-activa-a.jpg',
                'images' => json_encode(['https://images-cdn.ubuy.ma/639d0d49c4b5e50d1e5598c9-camara-ip-poe-de-disuasion-activa-a.jpg'], JSON_UNESCAPED_SLASHES),
                'specifications' => json_encode([
                    '8MP (4K) resolution',
                    'WizColor full-color low-light imaging',
                    'Two-way audio with built-in microphone and speaker',
                    'Red/blue warning lights and alarm sound',
                    'IP67 weather-resistant housing',
                ], JSON_UNESCAPED_SLASHES),
                'rating' => 0,
                'is_featured' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'name' => 'Hikvision 4MP ColorVu Smart Hybrid Light Turret Camera',
                'brand' => 'Hikvision',
                'category' => 'dome',
                'warranty' => '1 Year',
                'price' => 5000,
                'installation_fee' => null,
                'stock_quantity' => 20,
                'badge' => 'COLORVU',
                'image' => 'https://down-id.img.susercontent.com/file/id-11134207-7rbk6-m8kg7y42ljwb2c',
                'images' => json_encode(['https://down-id.img.susercontent.com/file/id-11134207-7rbk6-m8kg7y42ljwb2c'], JSON_UNESCAPED_SLASHES),
                'specifications' => json_encode([
                    '4MP high-resolution imaging',
                    'ColorVu color imaging in low light',
                    'Smart hybrid light with IR and white-light modes',
                    'Human and vehicle classification on supported model variants',
                    'Compact turret design for indoor or outdoor installation',
                ], JSON_UNESCAPED_SLASHES),
                'rating' => 0,
                'is_featured' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'name' => 'Hikvision 4MP ColorVu Bullet Network Camera',
                'brand' => 'Hikvision',
                'category' => 'bullet',
                'warranty' => '1 Year',
                'price' => 5200,
                'installation_fee' => null,
                'stock_quantity' => 20,
                'badge' => null,
                'image' => 'https://www.spycameracctv.com/cdn/shop/products/ds-2cd2t47g2-lsusl_1_1024x1024.png?v=1659515893',
                'images' => json_encode(['https://www.spycameracctv.com/cdn/shop/products/ds-2cd2t47g2-lsusl_1_1024x1024.png?v=1659515893'], JSON_UNESCAPED_SLASHES),
                'specifications' => json_encode([
                    '4MP high-resolution imaging',
                    'ColorVu full-color night imaging',
                    'Outdoor bullet camera form factor',
                    'Smart event and motion detection',
                    'Weather-resistant enclosure',
                ], JSON_UNESCAPED_SLASHES),
                'rating' => 0,
                'is_featured' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'name' => 'Dahua 4MP WizColor Eyeball Network Camera',
                'brand' => 'Dahua',
                'category' => 'dome',
                'warranty' => '1 Year',
                'price' => 4200,
                'installation_fee' => null,
                'stock_quantity' => 20,
                'badge' => null,
                'image' => 'https://www.bittel.bg/web/img/202411/37539/39195/600x600/dahua-ipc-hdw2449-t-s-led-0280-b-pro-4-mp-wiz-color-fixed-focal-eyeball-wiz-sense-network-camera.webp',
                'images' => json_encode(['https://www.bittel.bg/web/img/202411/37539/39195/600x600/dahua-ipc-hdw2449-t-s-led-0280-b-pro-4-mp-wiz-color-fixed-focal-eyeball-wiz-sense-network-camera.webp'], JSON_UNESCAPED_SLASHES),
                'specifications' => json_encode([
                    '4MP resolution',
                    'WizColor full-color night imaging',
                    'Fixed-focal eyeball/turret design',
                    'Smart motion detection',
                    'Suitable for residential and small-business surveillance',
                ], JSON_UNESCAPED_SLASHES),
                'rating' => 0,
                'is_featured' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'name' => 'Dahua DHI-NVR5208-EI 8-Channel Network Video Recorder',
                'brand' => 'Dahua',
                'category' => 'nvr',
                'warranty' => '1 Year',
                'price' => 12500,
                'installation_fee' => null,
                'stock_quantity' => 12,
                'badge' => '8 CHANNEL',
                'image' => 'https://rootitsupport.com/userfiles/DHI-NVR5208-EI.jpg',
                'images' => json_encode(['https://rootitsupport.com/userfiles/DHI-NVR5208-EI.jpg'], JSON_UNESCAPED_SLASHES),
                'specifications' => json_encode([
                    '8-channel IP camera recording',
                    'AI-enabled recorder model family',
                    'Supports compatible network cameras',
                    'HDD capacity depends on configuration and included drive',
                    'Network access for remote monitoring',
                ], JSON_UNESCAPED_SLASHES),
                'rating' => 0,
                'is_featured' => false,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'name' => 'Dahua DH-SG1008P 8-Port PoE Network Switch',
                'brand' => 'Dahua',
                'category' => 'networking',
                'warranty' => '1 Year',
                'price' => 3800,
                'installation_fee' => null,
                'stock_quantity' => 15,
                'badge' => null,
                'image' => 'https://c.dns-shop.ru/thumb/st1/fit/500/500/27af685883de7373eb0843957254df43/a54bee814a37f25a9ada8d2781a07ff6103df9a7d91bde75d507fe787a5304de.jpg',
                'images' => json_encode(['https://c.dns-shop.ru/thumb/st1/fit/500/500/27af685883de7373eb0843957254df43/a54bee814a37f25a9ada8d2781a07ff6103df9a7d91bde75d507fe787a5304de.jpg'], JSON_UNESCAPED_SLASHES),
                'specifications' => json_encode([
                    '8-port network switch',
                    'Power over Ethernet for compatible devices',
                    'Designed for network-camera installations',
                    'Check the selected hardware revision for PoE budget and port details',
                ], JSON_UNESCAPED_SLASHES),
                'rating' => 0,
                'is_featured' => false,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'name' => 'WD Purple 2TB Surveillance Hard Drive',
                'brand' => 'Western Digital',
                'category' => 'storage',
                'warranty' => '1 Year',
                'price' => 4700,
                'installation_fee' => null,
                'stock_quantity' => 15,
                'badge' => null,
                'image' => 'https://cctvimporters.com.au/cdn/shop/files/wdpurple2tb.jpg?v=1688613677',
                'images' => json_encode(['https://cctvimporters.com.au/cdn/shop/files/wdpurple2tb.jpg?v=1688613677'], JSON_UNESCAPED_SLASHES),
                'specifications' => json_encode([
                    '2TB storage capacity',
                    'Designed for surveillance recording workloads',
                    'For compatible NVR/DVR systems',
                    'Confirm recorder capacity and drive compatibility before purchase',
                ], JSON_UNESCAPED_SLASHES),
                'rating' => 0,
                'is_featured' => false,
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ];

        foreach ($products as $product) {
            $exists = DB::table('products')->where('name', $product['name'])->exists();

            if (!$exists) {
                DB::table('products')->insert($product);
            }
        }

        $packages = [
            [
                'name' => 'Dahua 4-Camera WizColor IP Security Package',
                'brand' => 'Dahua',
                'category' => 'CCTV Package',
                'warranty' => '1 Year',
                'price' => 36900,
                'installation_fee' => null,
                'badge' => 'NEW',
                'image' => 'https://cctvguru.com.au/cdn/shop/files/gr-dh-8mp4ch-dahua-8-mp-4-channels-kit-1-x-8-mp-tioc-and-3-x-8mp-turret-cameras-with-4ch-nvr-gr-dh-8mp4ch-cctv-kit-cctv-guru-148625.jpg?v=1718809983',
                'images' => json_encode(['https://cctvguru.com.au/cdn/shop/files/gr-dh-8mp4ch-dahua-8-mp-4-channels-kit-1-x-8-mp-tioc-and-3-x-8mp-turret-cameras-with-4ch-nvr-gr-dh-8mp4ch-cctv-kit-cctv-guru-148625.jpg?v=1718809983'], JSON_UNESCAPED_SLASHES),
                'specifications' => json_encode([
                    'Four-camera mixed-resolution IP security setup',
                    '1 Dahua 8MP TiOC PRO bullet camera and 3 Dahua 4MP WizColor eyeball cameras',
                    'Dahua 8-channel network video recorder',
                    'Includes one WD Purple 2TB surveillance drive',
                    'Installation can be quoted separately',
                ], JSON_UNESCAPED_SLASHES),
                'rating' => 0,
                'is_featured' => true,
                'created_at' => $now,
                'updated_at' => $now,
                'items' => [
                    ['product' => 'Dahua 8MP WizColor TiOC PRO Bullet Network Camera', 'quantity' => 1],
                    ['product' => 'Dahua 4MP WizColor Eyeball Network Camera', 'quantity' => 3],
                    ['product' => 'Dahua DHI-NVR5208-EI 8-Channel Network Video Recorder', 'quantity' => 1],
                    ['product' => 'WD Purple 2TB Surveillance Hard Drive', 'quantity' => 1],
                ],
            ],
            [
                'name' => 'Dahua 8-Camera Business IP Surveillance Package',
                'brand' => 'Dahua',
                'category' => 'CCTV Package',
                'warranty' => '1 Year',
                'price' => 64900,
                'installation_fee' => null,
                'badge' => 'BUSINESS',
                'image' => 'https://images.pcel.com/600/Electronica-Camaras-de-Vigilancia-Dahua-Technology-DH-KIT-XVR1B08-I-8-B2A21N-U-0360B-531104-0Nk3Lf9alBztCqaA.jpg',
                'images' => json_encode(['https://images.pcel.com/600/Electronica-Camaras-de-Vigilancia-Dahua-Technology-DH-KIT-XVR1B08-I-8-B2A21N-U-0360B-531104-0Nk3Lf9alBztCqaA.jpg'], JSON_UNESCAPED_SLASHES),
                'specifications' => json_encode([
                    'Eight-camera business surveillance configuration',
                    '4 Dahua 8MP TiOC PRO bullet cameras',
                    '4 Dahua 4MP WizColor eyeball cameras',
                    'Dahua 8-channel network video recorder and WD Purple 2TB drive',
                    'Installation can be quoted separately',
                ], JSON_UNESCAPED_SLASHES),
                'rating' => 0,
                'is_featured' => true,
                'created_at' => $now,
                'updated_at' => $now,
                'items' => [
                    ['product' => 'Dahua 8MP WizColor TiOC PRO Bullet Network Camera', 'quantity' => 4],
                    ['product' => 'Dahua 4MP WizColor Eyeball Network Camera', 'quantity' => 4],
                    ['product' => 'Dahua DHI-NVR5208-EI 8-Channel Network Video Recorder', 'quantity' => 1],
                    ['product' => 'WD Purple 2TB Surveillance Hard Drive', 'quantity' => 1],
                ],
            ],
            [
                'name' => '4-Camera ColorVu Network Package with 8-Channel Recorder',
                'brand' => 'Mixed Brand (Hikvision + Dahua)',
                'category' => 'CCTV Package',
                'warranty' => '1 Year',
                'price' => 34900,
                'installation_fee' => null,
                'badge' => 'COLORVU',
                'image' => 'https://www.thecctvcentre.co.uk/cdn/shop/files/4MGLISUSL_4CHNXI_1.png?v=1742089892',
                'images' => json_encode(['https://www.thecctvcentre.co.uk/cdn/shop/files/4MGLISUSL_4CHNXI_1.png?v=1742089892'], JSON_UNESCAPED_SLASHES),
                'specifications' => json_encode([
                    'Four-camera low-light color surveillance configuration',
                    '2 Hikvision 4MP ColorVu turret cameras',
                    '2 Hikvision 4MP ColorVu bullet cameras',
                    'Dahua 8-channel network video recorder and WD Purple 2TB drive',
                    'Mixed-brand package; check compatibility and installation layout before ordering',
                ], JSON_UNESCAPED_SLASHES),
                'rating' => 0,
                'is_featured' => true,
                'created_at' => $now,
                'updated_at' => $now,
                'items' => [
                    ['product' => 'Hikvision 4MP ColorVu Smart Hybrid Light Turret Camera', 'quantity' => 2],
                    ['product' => 'Hikvision 4MP ColorVu Bullet Network Camera', 'quantity' => 2],
                    ['product' => 'Dahua DHI-NVR5208-EI 8-Channel Network Video Recorder', 'quantity' => 1],
                    ['product' => 'WD Purple 2TB Surveillance Hard Drive', 'quantity' => 1],
                ],
            ],
        ];

        foreach ($packages as $package) {
            $items = $package['items'];
            unset($package['items']);

            // Never attach bundle contents to an existing same-named customer/admin package.
            // Only create the relationships when this seeder creates the package itself.
            $exists = DB::table('packages')->where('name', $package['name'])->exists();

            if ($exists) {
                continue;
            }

            DB::table('packages')->insert($package);
            $packageId = DB::table('packages')->where('name', $package['name'])->value('id');

            if (!$packageId) {
                continue;
            }

            foreach ($items as $item) {
                $productRow = DB::table('products')->where('name', $item['product'])->first();

                if (!$productRow) {
                    continue;
                }

                $timestamp = now();
                DB::table('package_items')->insertOrIgnore([
                    'package_id' => $packageId,
                    'product_id' => $productRow->id,
                    'quantity' => $item['quantity'],
                    'price' => $productRow->price,
                    'created_at' => $timestamp,
                    'updated_at' => $timestamp,
                ]);
            }
        }
        });
    }
}
