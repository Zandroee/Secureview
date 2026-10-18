import { useEffect, useRef, useState } from "react";

const LEAFLET_CSS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
const DEFAULT_CENTER = [14.5995, 120.9842];
let leafletPromise = null;
let lastGeocodeRequestAt = 0;

function loadLeaflet() {
    if (typeof window !== "undefined" && window.L) return Promise.resolve(window.L);
    if (leafletPromise) return leafletPromise;

    leafletPromise = new Promise((resolve, reject) => {
        if (!document.querySelector('link[data-secureview-leaflet-css]')) {
            const link = document.createElement("link");
            link.rel = "stylesheet";
            link.href = LEAFLET_CSS_URL;
            link.dataset.secureviewLeafletCss = "true";
            document.head.appendChild(link);
        }

        const existingScript = document.querySelector('script[data-secureview-leaflet-js]');
        const script = existingScript || document.createElement("script");
        const handleLoad = () => {
            if (window.L) resolve(window.L);
            else {
                leafletPromise = null;
                reject(new Error("Leaflet loaded without its map library."));
            }
        };

        script.addEventListener("load", handleLoad, { once: true });
        script.addEventListener("error", () => {
            leafletPromise = null;
            reject(new Error("Leaflet could not be loaded."));
        }, { once: true });

        if (!existingScript) {
            script.src = LEAFLET_JS_URL;
            script.async = true;
            script.dataset.secureviewLeafletJs = "true";
            document.head.appendChild(script);
        } else if (window.L) {
            handleLoad();
        }
    });

    return leafletPromise;
}

function numericCoordinate(value) {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

function coordinatesFromProps(latitude, longitude) {
    const lat = numericCoordinate(latitude);
    const lng = numericCoordinate(longitude);
    return lat === null || lng === null ? null : { lat, lng };
}

function fullAddress({ streetAddress = "", city = "", addressDetails = "" }) {
    return [streetAddress, addressDetails, city].filter(Boolean).join(", ");
}

export function googleMapsSearchUrl({
    latitude, longitude, placeId = "", streetAddress = "", city = "", addressDetails = "",
}) {
    const coordinates = coordinatesFromProps(latitude, longitude);
    const address = fullAddress({ streetAddress, city, addressDetails });
    const query = coordinates ? coordinates.lat + "," + coordinates.lng : address || placeId || "service location";
    return "https://www.google.com/maps/search/?" + new URLSearchParams({ api: "1", query }).toString();
}

export function googleMapsDirectionsUrl({
    latitude, longitude, placeId = "", streetAddress = "", city = "", addressDetails = "",
}) {
    const coordinates = coordinatesFromProps(latitude, longitude);
    const address = fullAddress({ streetAddress, city, addressDetails });
    const destination = coordinates ? coordinates.lat + "," + coordinates.lng : address || "service location";
    return "https://www.google.com/maps/dir/?" + new URLSearchParams({
        api: "1", destination, travelmode: "driving",
    }).toString();
}

function positionFromLeaflet(position) {
    return { lat: Number(position.lat.toFixed(7)), lng: Number(position.lng.toFixed(7)) };
}

function showMarker(map, marker, position) {
    marker.setLatLng([position.lat, position.lng]);
    if (!map.hasLayer(marker)) marker.addTo(map);
}

function moveMarkerAndMap(map, marker, position, zoom = 17) {
    showMarker(map, marker, position);
    map.setView([position.lat, position.lng], zoom);
}

export default function ServiceLocationPicker({
    streetAddress = "", city = "", latitude = null, longitude = null, placeId = "", apiErrors = {}, onChange,
}) {
    const mapHostRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markerRef = useRef(null);
    const onChangeRef = useRef(onChange);
    const addressRef = useRef({ streetAddress, city });
    const [mapReady, setMapReady] = useState(false);
    const [mapError, setMapError] = useState("");
    const [searching, setSearching] = useState(false);
    const [pin, setPin] = useState(null);
    const [locationMessage, setLocationMessage] = useState(
        "Search your address, then click the map or drag the pin to the exact service entrance."
    );

    onChangeRef.current = onChange;
    addressRef.current = { streetAddress, city };

    useEffect(() => {
        let cancelled = false;

        loadLeaflet().then((L) => {
            if (cancelled || !mapHostRef.current || mapInstanceRef.current) return;
            const savedPosition = coordinatesFromProps(latitude, longitude);
            const map = L.map(mapHostRef.current, { scrollWheelZoom: false }).setView(
                savedPosition ? [savedPosition.lat, savedPosition.lng] : DEFAULT_CENTER,
                savedPosition ? 17 : 11
            );

            L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
                maxZoom: 19,
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
            }).addTo(map);

            const marker = L.marker(
                savedPosition ? [savedPosition.lat, savedPosition.lng] : DEFAULT_CENTER,
                { draggable: true, title: "Service entrance" }
            );
            if (savedPosition) marker.addTo(map);

            marker.on("dragend", () => {
                const position = positionFromLeaflet(marker.getLatLng());
                setPin({ ...position, manuallyPinned: true });
                setLocationMessage("Exact service entrance saved. You can drag the pin or click the map to adjust it.");
                onChangeRef.current?.({
                    service_latitude: String(position.lat),
                    service_longitude: String(position.lng),
                    google_place_id: "",
                });
            });

            map.on("click", (event) => {
                const position = positionFromLeaflet(event.latlng);
                showMarker(map, marker, position);
                setPin({ ...position, manuallyPinned: true });
                setLocationMessage("Exact service entrance saved. You can drag the pin or click the map to adjust it.");
                onChangeRef.current?.({
                    service_latitude: String(position.lat),
                    service_longitude: String(position.lng),
                    google_place_id: "",
                });
            });

            mapInstanceRef.current = map;
            markerRef.current = marker;
            if (savedPosition) {
                setPin({ ...savedPosition, manuallyPinned: true });
                setLocationMessage("Saved service entrance. Drag the pin or click the map to refine it.");
            }
            setMapReady(true);
            window.setTimeout(() => map.invalidateSize(), 0);
        }).catch(() => {
            if (!cancelled) setMapError("The map could not load. You can still enter the full address manually and use the map link below.");
        });

        return () => {
            cancelled = true;
            if (mapInstanceRef.current) mapInstanceRef.current.remove();
            mapInstanceRef.current = null;
            markerRef.current = null;
        };
    }, []);

    useEffect(() => {
        if (!mapReady || !mapInstanceRef.current || !markerRef.current) return;
        const savedPosition = coordinatesFromProps(latitude, longitude);
        if (savedPosition) {
            moveMarkerAndMap(mapInstanceRef.current, markerRef.current, savedPosition);
            setPin({ ...savedPosition, manuallyPinned: true });
            setLocationMessage("Saved service entrance. Drag the pin or click the map to refine it.");
        } else if (!placeId) {
            markerRef.current.remove();
            setPin(null);
        }
    }, [mapReady, latitude, longitude, placeId]);

    const searchAddress = async () => {
        const { streetAddress: street, city: municipality } = addressRef.current;
        const query = [street, municipality, "Philippines"].filter(Boolean).join(", ");
        if (!street.trim() && !municipality.trim()) {
            setLocationMessage("Enter the full service address and city below before searching the map.");
            return;
        }

        const waitMs = Math.max(0, 1100 - (Date.now() - lastGeocodeRequestAt));
        if (waitMs > 0) {
            setLocationMessage("Please wait a moment before searching again.");
            return;
        }

        setSearching(true);
        setMapError("");
        try {
            lastGeocodeRequestAt = Date.now();
            const response = await fetch(
                "https://nominatim.openstreetmap.org/search?" +
                    new URLSearchParams({ format: "jsonv2", limit: "1", countrycodes: "ph", q: query }),
                { headers: { Accept: "application/json" } }
            );
            if (!response.ok) throw new Error("Address search unavailable");
            const results = await response.json();
            const result = results[0];
            if (!result) {
                setLocationMessage("No matching address was found. Try adding the barangay or a nearby landmark, or place the pin manually.");
                return;
            }

            const position = { lat: Number(result.lat), lng: Number(result.lon) };
            if (mapInstanceRef.current && markerRef.current) {
                moveMarkerAndMap(mapInstanceRef.current, markerRef.current, position, 17);
            }
            setPin({ ...position, manuallyPinned: false });
            setLocationMessage("Address found. Confirm the pin is at the service entrance; click the map or drag the pin to save exact coordinates.");
        } catch {
            setMapError("Address search is temporarily unavailable. You can still move the map and place the pin manually.");
        } finally {
            setSearching(false);
        }
    };

    const openMapsUrl = googleMapsSearchUrl({ latitude, longitude, placeId, streetAddress, city });

    return (
        <section className="mb-3">
            <div className="d-flex align-items-center justify-content-between gap-2 mb-2">
                <label className="form-label small fw-semibold mb-0">Locate service address on the map</label>
                <span className="badge rounded-pill text-bg-success">No API key needed</span>
            </div>
            <div className="d-flex flex-wrap gap-2 mb-2">
                <button type="button" className="btn btn-outline-primary btn-sm" onClick={searchAddress} disabled={searching}>
                    <i className="bi bi-search me-1" />{searching ? "Searching..." : "Find address on map"}
                </button>
                <a href={openMapsUrl} target="_blank" rel="noreferrer" className="btn btn-link btn-sm text-decoration-none p-1">
                    <i className="bi bi-box-arrow-up-right me-1" />Open Google Maps
                </a>
            </div>
            {mapError && <div className="alert alert-warning small py-2 mb-2">{mapError}</div>}
            <div ref={mapHostRef} className="border rounded-3 overflow-hidden" style={{ width: "100%", height: 280, background: "#f1f4f8" }} />
            <div className="small text-muted mt-2">{locationMessage}</div>
            {pin && (
                <div className="small mt-1">
                    {pin.manuallyPinned ? (
                        <span className="text-success"><i className="bi bi-geo-alt-fill me-1" />Exact entrance pin saved: {pin.lat.toFixed(6)}, {pin.lng.toFixed(6)}</span>
                    ) : (
                        <span className="text-muted"><i className="bi bi-geo-alt me-1" />Approximate address found. Place the pin precisely to save coordinates.</span>
                    )}
                </div>
            )}
            <div className="small text-muted mt-2">
                Map data © OpenStreetMap contributors. Your service address and saved pin are shared with SecureView administrators and technicians assigned to the job.
            </div>
            {apiErrors.service_location && <div className="small text-danger mt-1">{apiErrors.service_location}</div>}
        </section>
    );
}

export function ServiceLocationMap({
    latitude = null, longitude = null, placeId = "", streetAddress = "", city = "", addressDetails = "",
    height = 230, showDirections = true,
}) {
    const mapHostRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const [mapError, setMapError] = useState("");
    const [mapReady, setMapReady] = useState(false);
    const position = coordinatesFromProps(latitude, longitude);
    const address = fullAddress({ streetAddress, city, addressDetails });
    const searchUrl = googleMapsSearchUrl({ latitude, longitude, placeId, streetAddress, city, addressDetails });
    const directionsUrl = googleMapsDirectionsUrl({ latitude, longitude, placeId, streetAddress, city, addressDetails });

    useEffect(() => {
        if (!position || !mapHostRef.current) return undefined;
        let cancelled = false;
        loadLeaflet().then((L) => {
            if (cancelled || !mapHostRef.current) return;
            const map = L.map(mapHostRef.current, { scrollWheelZoom: false }).setView([position.lat, position.lng], 16);
            L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
                maxZoom: 19,
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
            }).addTo(map);
            L.marker([position.lat, position.lng], { title: "Service location" }).addTo(map);
            mapInstanceRef.current = map;
            setMapReady(true);
            window.setTimeout(() => map.invalidateSize(), 0);
        }).catch(() => {
            if (!cancelled) setMapError("Map preview is unavailable. Use the map link below to view the location.");
        });

        return () => {
            cancelled = true;
            if (mapInstanceRef.current) mapInstanceRef.current.remove();
            mapInstanceRef.current = null;
        };
    }, [latitude, longitude]);

    return (
        <div className="border rounded-3 overflow-hidden bg-white">
            {position ? (
                <>
                    <div ref={mapHostRef} style={{ width: "100%", height, background: "#f1f4f8" }} />
                    {mapError && <div className="small text-muted px-3 pt-2">{mapError}</div>}
                    {mapReady && <div className="small text-muted px-3 pt-1">© OpenStreetMap contributors</div>}
                </>
            ) : (
                <div className="d-flex align-items-center gap-3 p-3" style={{ minHeight: Math.min(height, 130), background: "#f7f9fc" }}>
                    <div className="rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: 42, height: 42 }}>
                        <i className="bi bi-geo-alt-fill fs-5" />
                    </div>
                    <div className="small">
                        <div className="fw-semibold">{address || "Service location not specified"}</div>
                        <div className="text-muted mt-1">
                            {address ? "No exact map pin saved. Open the address in Google Maps to view it." : "No service location specified."}
                        </div>
                    </div>
                </div>
            )}
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 px-3 py-2 border-top">
                <div className="small text-muted text-truncate" style={{ maxWidth: "65%" }}>{address || "Service location"}</div>
                <div className="d-flex flex-wrap gap-3 small">
                    <a href={searchUrl} target="_blank" rel="noreferrer" className="text-decoration-none">
                        <i className="bi bi-map me-1" />View map
                    </a>
                    {showDirections && (
                        <a href={directionsUrl} target="_blank" rel="noreferrer" className="text-decoration-none fw-semibold">
                            <i className="bi bi-sign-turn-right me-1" />Directions
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
}
