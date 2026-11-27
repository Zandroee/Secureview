/**
 * Delivery coverage polygons use GeoJSON [longitude, latitude] coordinates.
 * Keep this rule aligned with app/Services/MetroManilaCoverage.php.
 */
export function isWithinMetroManila(latitude, longitude, polygons) {
    if (latitude === null || longitude === null ||
        latitude === undefined || longitude === undefined ||
        latitude === "" || longitude === "") {
        return false;
    }

    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Array.isArray(polygons)) {
        return false;
    }

    return polygons.some((polygon) =>
        Array.isArray(polygon) && polygon.length > 0 &&
        isWithinRing(lat, lng, polygon[0]) &&
        !polygon.slice(1).some((hole) => isWithinRing(lat, lng, hole))
    );
}

function isWithinRing(latitude, longitude, ring) {
    if (!Array.isArray(ring) || ring.length < 3) return false;

    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i];
        const [xj, yj] = ring[j];

        if ((yi > latitude) !== (yj > latitude) &&
            longitude < ((xj - xi) * (latitude - yi)) / (yj - yi) + xi) {
            inside = !inside;
        }
    }
    return inside;
}
