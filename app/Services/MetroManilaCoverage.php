<?php

namespace App\Services;

/**
 * Geo-fencing for delivery only. The 4 polygon shapes represent the NCR
 * administrative districts, in GeoJSON [longitude, latitude] order.
 */
class MetroManilaCoverage
{
    public function polygons(): array
    {
        return config('metro_manila_coverage.polygons', []);
    }

    public function contains(float $latitude, float $longitude): bool
    {
        if (!is_finite($latitude) || !is_finite($longitude)) {
            return false;
        }

        foreach ($this->polygons() as $polygon) {
            if (empty($polygon[0]) || !$this->insideRing($latitude, $longitude, $polygon[0])) {
                continue;
            }

            $inHole = false;
            foreach (array_slice($polygon, 1) as $hole) {
                if ($this->insideRing($latitude, $longitude, $hole)) {
                    $inHole = true;
                    break;
                }
            }

            if (!$inHole) {
                return true;
            }
        }

        return false;
    }

    private function insideRing(float $latitude, float $longitude, array $ring): bool
    {
        $inside = false;
        $count = count($ring);
        for ($i = 0, $j = $count - 1; $i < $count; $j = $i++) {
            if (!isset($ring[$i][0], $ring[$i][1], $ring[$j][0], $ring[$j][1])) {
                continue;
            }

            [$xi, $yi] = $ring[$i];
            [$xj, $yj] = $ring[$j];

            $crosses = (($yi > $latitude) !== ($yj > $latitude))
                && ($longitude < ($xj - $xi) * ($latitude - $yi) / ($yj - $yi) + $xi);
            if ($crosses) {
                $inside = !$inside;
            }
        }

        return $inside;
    }
}
