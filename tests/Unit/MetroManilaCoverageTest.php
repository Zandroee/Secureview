<?php

namespace Tests\Unit;

use App\Services\MetroManilaCoverage;
use Tests\TestCase;

class MetroManilaCoverageTest extends TestCase
{
    public function test_metro_manila_addresses_are_inside_delivery_coverage(): void
    {
        $coverage = app(MetroManilaCoverage::class);

        $this->assertNotEmpty($coverage->polygons());
        $this->assertTrue($coverage->contains(14.5995, 120.9842)); // Manila
        $this->assertTrue($coverage->contains(14.5547, 121.0244)); // Makati
        $this->assertTrue($coverage->contains(14.5176, 121.0509)); // Taguig
    }

    public function test_outside_metro_manila_addresses_are_rejected(): void
    {
        $coverage = app(MetroManilaCoverage::class);

        $this->assertFalse($coverage->contains(14.83, 121.05)); // Bulacan
        $this->assertFalse($coverage->contains(14.58, 121.17)); // Rizal
        $this->assertFalse($coverage->contains(14.44, 120.95)); // Cavite
        $this->assertFalse($coverage->contains(0, 0));
    }
}
