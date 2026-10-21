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

function makeSearchQuery(streetAddress, city) {
    return [streetAddress, city, "Philippines"].filter(Boolean).join(", ").trim();
}

export default function ServiceLocationPicker({
    streetAddress = "", city = "", latitude = null, longitude = null, placeId = "", apiErrors = {}, onChange,
    locationType = "service",
}) {
    const mapHostRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markerRef = useRef(null);
    const onChangeRef = useRef(onChange);
    const addressRef = useRef({ streetAddress, city });
    const lastAddressQueryRef = useRef(makeSearchQuery(streetAddress, city));
    const searchedAddressRef = useRef("");
    const pendingSearchPositionRef = useRef(null);
    const locationNoun = locationType === "delivery" ? "delivery" : "service";
    const locationTitle = locationNoun.charAt(0).toUpperCase() + locationNoun.slice(1);
    const [mapReady, setMapReady] = useState(false);
    const [mapError, setMapError] = useState("");
    const [searching, setSearching] = useState(false);
    const [pin, setPin] = useState(null);
    const [locationMessage, setLocationMessage] = useState(
        "Enter the " + locationNoun + " address above, then find it on the map. You can also click the map to place a pin."
    );

    onChangeRef.current = onChange;
    addressRef.current = { streetAddress, city };
    const hasSearchAddress = Boolean(streetAddress.trim() && city.trim());

    useEffect(() => {
        let cancelled = false;

        loadLeaflet().then((L) => {
            if (cancelled || !mapHostRef.current || mapInstanceRef.current) return;

            const savedPosition = coordinatesFromProps(latitude, longitude);
            const initialPosition = savedPosition || pendingSearchPositionRef.current;
            const map = L.map(mapHostRef.current, { scrollWheelZoom: false }).setView(
                initialPosition ? [initialPosition.lat, initialPosition.lng] : DEFAULT_CENTER,
                initialPosition ? 17 : 11
            );

            L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
                maxZoom: 19,
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
            }).addTo(map);

            const marker = L.marker(
                initialPosition ? [initialPosition.lat, initialPosition.lng] : DEFAULT_CENTER,
                { draggable: true, title: locationTitle + " entrance" }
            );

            if (initialPosition) marker.addTo(map);

            marker.on("dragend", () => {
                const position = positionFromLeaflet(marker.getLatLng());
                pendingSearchPositionRef.current = null;
                setPin({ ...position, manuallyPinned: true });
                setLocationMessage("Exact entrance saved. These coordinates will be included with your " + locationNoun + ".");
                onChangeRef.current?.({
                    service_latitude: String(position.lat),
                    service_longitude: String(position.lng),
                    google_place_id: "",
                });
            });

            map.on("click", (event) => {
                const position = positionFromLeaflet(event.latlng);
                pendingSearchPositionRef.current = null;
                showMarker(map, marker, position);
                setPin({ ...position, manuallyPinned: true });
                setLocationMessage("Exact entrance saved. These coordinates will be included with your " + locationNoun + ".");
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
                setLocationMessage("Saved entrance pin. Drag it or click the map to refine the location.");
            } else if (pendingSearchPositionRef.current) {
                setPin({ ...pendingSearchPositionRef.current, manuallyPinned: false });
                setLocationMessage("Address found approximately. Drag the marker or click the exact entrance to save its coordinates.");
            }

            setMapReady(true);
            window.setTimeout(() => map.invalidateSize(), 0);
        }).catch(() => {
            if (!cancelled) {
                setMapError("The map could not load. You can still submit the full address and open it in Google Maps.");
                setLocationMessage("The map is unavailable. Your typed address will still be submitted.");
            }
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
            pendingSearchPositionRef.current = null;
            moveMarkerAndMap(mapInstanceRef.current, markerRef.current, savedPosition);
            setPin({ ...savedPosition, manuallyPinned: true });
            setLocationMessage("Saved entrance pin. Drag it or click the map to refine the location.");
        } else if (!placeId && !pendingSearchPositionRef.current) {
            markerRef.current.remove();
            setPin(null);
        }
    }, [mapReady, latitude, longitude, placeId]);

    useEffect(() => {
        const latestQuery = makeSearchQuery(streetAddress, city);
        if (latestQuery === lastAddressQueryRef.current) return;

        lastAddressQueryRef.current = latestQuery;
        searchedAddressRef.current = "";
        pendingSearchPositionRef.current = null;
        markerRef.current?.remove();
        setPin(null);
        onChangeRef.current?.({
            service_latitude: "",
            service_longitude: "",
            google_place_id: "",
        });
        setLocationMessage("Address changed. Search again to update the map, or click the map to place the pin manually.");
    }, [streetAddress, city]);

    const searchAddress = async () => {
        const { streetAddress: street, city: municipality } = addressRef.current;
        const query = makeSearchQuery(street, municipality);

        if (!street.trim() || !municipality.trim()) {
            setLocationMessage("Enter both the street address and city above before searching.");
            return;
        }

        if (Date.now() - lastGeocodeRequestAt < 1100) {
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
                setLocationMessage("No match found. Try adding the barangay or a nearby landmark, or place the pin manually.");
                return;
            }

            const position = { lat: Number(result.lat), lng: Number(result.lon) };
            searchedAddressRef.current = query;
            pendingSearchPositionRef.current = position;

            if (mapInstanceRef.current && markerRef.current) {
                moveMarkerAndMap(mapInstanceRef.current, markerRef.current, position, 17);
            }

            setPin({ ...position, manuallyPinned: false });
            setLocationMessage("Address found approximately. Drag the marker or click the exact entrance to save its coordinates.");
        } catch {
            setMapError("Address search is temporarily unavailable. You can still click the map or drag the pin manually.");
            setLocationMessage("Address search is unavailable. You can still place the pin manually.");
        } finally {
            setSearching(false);
        }
    };

    const openMapsUrl = googleMapsSearchUrl({ latitude, longitude, placeId, streetAddress, city });

    return (
        <section className="mb-3">
            <div className="d-flex flex-wrap align-items-start justify-content-between gap-2 mb-2">
                <div>
                    <div className="fw-bold small">{locationTitle} location map</div>
                    <div className="small text-muted mt-1">
                        Find the address, then refine the pin to the actual entrance.
                    </div>
                </div>
                <span className="badge rounded-pill bg-light text-secondary border fw-semibold px-2 py-2">
                    <i className="bi bi-map me-1" />OpenStreetMap
                </span>
            </div>

            <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                <button
                    type="button"
                    className="btn btn-primary btn-sm px-3"
                    onClick={searchAddress}
                    disabled={searching || !hasSearchAddress}
                >
                    <i className="bi bi-search me-1" />
                    {searching ? "Finding address..." : "Find address on map"}
                </button>
                <a
                    href={openMapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-outline-secondary btn-sm"
                >
                    <i className="bi bi-box-arrow-up-right me-1" />Open Google Maps
                </a>
                {!hasSearchAddress && (
                    <span className="small text-muted">Enter the street address and city above first.</span>
                )}
            </div>

            {mapError && <div className="alert alert-warning small py-2 mb-2">{mapError}</div>}

            <div className="rounded-3 overflow-hidden border bg-light" style={{ boxShadow: "0 2px 8px rgba(20, 34, 60, 0.06)" }}>
                <div
                    ref={mapHostRef}
                    className="service-location-leaflet-map"
                    style={{ width: "100%", height: 280, background: "#eef2f6" }}
                    aria-label={"Interactive " + locationNoun + " location map"}
                />
            </div>

            <div className={"d-flex align-items-start gap-2 rounded-3 border p-2 mt-2 " + (
                pin?.manuallyPinned
                    ? "bg-success-subtle border-success-subtle"
                    : pin
                        ? "bg-primary-subtle border-primary-subtle"
                        : "bg-light"
            )}>
                <i className={"bi mt-1 " + (
                    pin?.manuallyPinned
                        ? "bi-check-circle-fill text-success"
                        : pin
                            ? "bi-info-circle-fill text-primary"
                            : "bi-cursor-fill text-secondary"
                )} />
                <div className="small">
                    <div className="fw-semibold">
                        {pin?.manuallyPinned ? "Exact entrance pin saved" : pin ? "Approximate address located" : mapReady ? "Pin your " + locationNoun + " entrance" : "Loading map"}
                    </div>
                    <div>{locationMessage}</div>
                    {pin?.manuallyPinned && (
                        <div className="text-muted mt-1">
                            Coordinates: {pin.lat.toFixed(6)}, {pin.lng.toFixed(6)}
                        </div>
                    )}
                </div>
            </div>

            <div className="small text-muted mt-2">
                <i className="bi bi-shield-check me-1" />
                A search result is approximate. Your pin is saved only after you click the map or drag the marker. Map data © OpenStreetMap contributors.
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
