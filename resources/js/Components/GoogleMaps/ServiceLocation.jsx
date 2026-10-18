import { useEffect, useRef, useState } from "react";

const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
const MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || "";
let mapsApiPromise = null;

export function loadGoogleMapsApi(apiKey = MAPS_API_KEY) {
    if (typeof window !== "undefined" && window.google?.maps?.importLibrary) {
        return Promise.resolve(window.google.maps);
    }

    if (!apiKey) {
        return Promise.reject(new Error("Google Maps is not configured."));
    }

    if (mapsApiPromise) {
        return mapsApiPromise;
    }

    mapsApiPromise = new Promise((resolve, reject) => {
        const callbackName = "__secureviewGoogleMapsReady";
        const existingScript = document.querySelector("script[data-secureview-google-maps]");

        window[callbackName] = () => {
            if (window.google?.maps?.importLibrary) {
                resolve(window.google.maps);
            } else {
                reject(new Error("Google Maps loaded without its importLibrary interface."));
            }
        };

        if (existingScript) {
            existingScript.addEventListener("error", () => reject(new Error("Google Maps could not be loaded.")), { once: true });
            return;
        }

        const script = document.createElement("script");
        script.dataset.secureviewGoogleMaps = "true";
        script.src =
            "https://maps.googleapis.com/maps/api/js?key=" +
            encodeURIComponent(apiKey) +
            "&v=weekly&loading=async&callback=" +
            callbackName;
        script.async = true;
        script.defer = true;
        script.onerror = () => {
            mapsApiPromise = null;
            reject(new Error("Google Maps could not be loaded. Check the API key and enabled APIs."));
        };
        document.head.appendChild(script);
    });

    return mapsApiPromise;
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
    latitude,
    longitude,
    placeId = "",
    streetAddress = "",
    city = "",
    addressDetails = "",
}) {
    const coordinates = coordinatesFromProps(latitude, longitude);
    const address = fullAddress({ streetAddress, city, addressDetails });
    const query = coordinates
        ? coordinates.lat + "," + coordinates.lng
        : address || placeId || "service location";
    const params = new URLSearchParams({ api: "1", query });

    if (placeId) params.set("query_place_id", placeId);

    return "https://www.google.com/maps/search/?" + params.toString();
}

export function googleMapsDirectionsUrl({
    latitude,
    longitude,
    placeId = "",
    streetAddress = "",
    city = "",
    addressDetails = "",
}) {
    const coordinates = coordinatesFromProps(latitude, longitude);
    const address = fullAddress({ streetAddress, city, addressDetails });
    const destination = coordinates
        ? coordinates.lat + "," + coordinates.lng
        : address || "service location";
    const params = new URLSearchParams({ api: "1", destination, travelmode: "driving" });

    if (placeId) params.set("destination_place_id", placeId);

    return "https://www.google.com/maps/dir/?" + params.toString();
}

function extractCity(addressComponents = []) {
    const priorities = [
        "locality",
        "sublocality_level_1",
        "administrative_area_level_2",
        "administrative_area_level_1",
    ];

    for (const type of priorities) {
        const component = addressComponents.find((part) => (part.types || []).includes(type));
        if (component) {
            return component.longText || component.long_name || component.shortText || component.short_name || "";
        }
    }

    return "";
}

function setMarkerPosition(markerRecord, map, position) {
    if (!markerRecord) return;

    if (markerRecord.kind === "advanced") {
        markerRecord.marker.position = position;
        markerRecord.marker.map = map;
    } else {
        markerRecord.marker.setPosition(position);
        markerRecord.marker.setMap(map);
    }
}

function hideMarker(markerRecord) {
    if (!markerRecord) return;

    if (markerRecord.kind === "advanced") {
        markerRecord.marker.map = null;
    } else {
        markerRecord.marker.setMap(null);
    }
}

function markerPosition(markerRecord) {
    if (!markerRecord) return null;

    const position = markerRecord.kind === "advanced"
        ? markerRecord.marker.position
        : markerRecord.marker.getPosition();

    if (!position) return null;

    return {
        lat: typeof position.lat === "function" ? position.lat() : position.lat,
        lng: typeof position.lng === "function" ? position.lng() : position.lng,
    };
}

export default function ServiceLocationPicker({
    streetAddress = "",
    city = "",
    latitude = null,
    longitude = null,
    placeId = "",
    apiErrors = {},
    onChange,
}) {
    const autocompleteHostRef = useRef(null);
    const mapHostRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markerRecordRef = useRef(null);
    const onChangeRef = useRef(onChange);
    const placeSelectCleanupRef = useRef(null);
    const [mapsReady, setMapsReady] = useState(false);
    const [mapsError, setMapsError] = useState("");
    const [pin, setPin] = useState(null);
    const [locationMessage, setLocationMessage] = useState(
        "Search for an address, then click the map or drag the pin to the exact service entrance."
    );

    onChangeRef.current = onChange;

    useEffect(() => {
        if (!MAPS_API_KEY) {
            setMapsError("");
            return undefined;
        }

        let cancelled = false;

        const initialize = async () => {
            try {
                const google = await loadGoogleMapsApi();
                const [mapsLibrary, placesLibrary, markerLibrary] = await Promise.all([
                    google.importLibrary("maps"),
                    google.importLibrary("places"),
                    google.importLibrary("marker"),
                ]);

                if (cancelled || !autocompleteHostRef.current || !mapHostRef.current) return;

                const PlaceAutocompleteElement = placesLibrary.PlaceAutocompleteElement;
                const autocomplete = new PlaceAutocompleteElement();
                autocomplete.includedRegionCodes = ["ph"];
                autocomplete.placeholder = "Search a service address in Google Maps";
                autocomplete.style.display = "block";
                autocomplete.style.width = "100%";
                autocomplete.style.minHeight = "44px";
                autocomplete.style.marginBottom = "2px";
                autocompleteHostRef.current.replaceChildren(autocomplete);

                const initialPosition = coordinatesFromProps(latitude, longitude);
                const mapOptions = {
                    center: initialPosition || { lat: 14.5995, lng: 120.9842 },
                    zoom: initialPosition ? 17 : 11,
                    mapTypeControl: false,
                    streetViewControl: false,
                    fullscreenControl: true,
                    clickableIcons: false,
                };

                if (MAP_ID) mapOptions.mapId = MAP_ID;

                const map = new mapsLibrary.Map(mapHostRef.current, mapOptions);
                mapInstanceRef.current = map;

                const markerRecord = MAP_ID
                    ? {
                        kind: "advanced",
                        marker: new markerLibrary.AdvancedMarkerElement({
                            map: null,
                            gmpDraggable: true,
                            title: "Service entrance",
                        }),
                    }
                    : {
                        kind: "legacy",
                        marker: new google.Marker({
                            map: null,
                            draggable: true,
                            title: "Service entrance",
                        }),
                    };

                markerRecordRef.current = markerRecord;

                const reportManualPin = (position) => {
                    if (!position || !Number.isFinite(position.lat) || !Number.isFinite(position.lng)) return;

                    const roundedLat = Number(position.lat.toFixed(7));
                    const roundedLng = Number(position.lng.toFixed(7));
                    setMarkerPosition(markerRecordRef.current, map, { lat: roundedLat, lng: roundedLng });
                    map.panTo({ lat: roundedLat, lng: roundedLng });
                    setPin({ lat: roundedLat, lng: roundedLng, manuallyPinned: true });
                    setLocationMessage("Pin saved to this inquiry. Drag it or click the map to refine the entrance.");
                    onChangeRef.current?.({
                        service_latitude: String(roundedLat),
                        service_longitude: String(roundedLng),
                        // A manually placed entrance pin takes precedence over the suggested place.
                        google_place_id: "",
                    });
                };

                map.addListener("click", (event) => {
                    if (!event.latLng) return;
                    reportManualPin({ lat: event.latLng.lat(), lng: event.latLng.lng() });
                });

                const onMarkerDragEnd = () => reportManualPin(markerPosition(markerRecordRef.current));
                if (markerRecord.kind === "advanced") {
                    markerRecord.marker.addEventListener("dragend", onMarkerDragEnd);
                } else {
                    markerRecord.marker.addListener("dragend", onMarkerDragEnd);
                }

                const onPlaceSelected = async (event) => {
                    try {
                        const place = event.placePrediction?.toPlace();
                        if (!place) return;

                        await place.fetchFields({
                            fields: ["id", "formattedAddress", "location", "addressComponents", "viewport"],
                        });

                        if (!place.location) {
                            setLocationMessage("That result has no map location. Try another suggestion or pin the entrance manually.");
                            return;
                        }

                        const position = {
                            lat: typeof place.location.lat === "function" ? place.location.lat() : place.location.lat,
                            lng: typeof place.location.lng === "function" ? place.location.lng() : place.location.lng,
                        };

                        if (place.viewport) {
                            map.fitBounds(place.viewport);
                        } else {
                            map.setCenter(position);
                            map.setZoom(17);
                        }

                        setMarkerPosition(markerRecordRef.current, map, position);
                        setPin({ ...position, manuallyPinned: false });
                        setLocationMessage("Address selected. Confirm the pin is at the service entrance; click the map or drag the pin to save a precise point.");

                        onChangeRef.current?.({
                            street_address: place.formattedAddress || streetAddress,
                            city: extractCity(place.addressComponents) || city,
                            google_place_id: place.id || "",
                            service_latitude: "",
                            service_longitude: "",
                        });
                    } catch (error) {
                        setMapsError("Google Maps found the address, but its details could not be loaded. You can still enter the address manually.");
                    }
                };

                autocomplete.addEventListener("gmp-select", onPlaceSelected);
                placeSelectCleanupRef.current = () => autocomplete.removeEventListener("gmp-select", onPlaceSelected);

                if (initialPosition) {
                    setMarkerPosition(markerRecord, map, initialPosition);
                    setPin({ ...initialPosition, manuallyPinned: true });
                    setLocationMessage("Saved service entrance. You can refine it by dragging the pin or clicking the map.");
                } else if (placeId) {
                    try {
                        const place = new placesLibrary.Place({ id: placeId });
                        await place.fetchFields({ fields: ["location", "viewport"] });
                        if (!cancelled && place.location) {
                            const position = {
                                lat: typeof place.location.lat === "function" ? place.location.lat() : place.location.lat,
                                lng: typeof place.location.lng === "function" ? place.location.lng() : place.location.lng,
                            };
                            setMarkerPosition(markerRecord, map, position);
                            if (place.viewport) map.fitBounds(place.viewport);
                            else {
                                map.setCenter(position);
                                map.setZoom(17);
                            }
                            setPin({ ...position, manuallyPinned: false });
                        }
                    } catch {
                        setLocationMessage("We could not preview the saved Google Maps place. The address and external map link are still available.");
                    }
                }

                setMapsReady(true);
            } catch (error) {
                if (!cancelled) {
                    setMapsError("Google Maps could not load. Check the browser API key restrictions and enabled Maps JavaScript API / Places API (New). Manual address entry remains available.");
                }
            }
        };

        initialize();

        return () => {
            cancelled = true;
            placeSelectCleanupRef.current?.();
            placeSelectCleanupRef.current = null;
            mapInstanceRef.current = null;
            markerRecordRef.current = null;
        };
    }, [MAPS_API_KEY]);

    useEffect(() => {
        if (!mapsReady || !mapInstanceRef.current) return;

        const map = mapInstanceRef.current;
        const record = markerRecordRef.current;
        const savedPosition = coordinatesFromProps(latitude, longitude);

        if (savedPosition) {
            setMarkerPosition(record, map, savedPosition);
            map.setCenter(savedPosition);
            setPin({ ...savedPosition, manuallyPinned: true });
            setLocationMessage("Saved service entrance. You can refine it by dragging the pin or clicking the map.");
        } else if (!placeId && record) {
            hideMarker(record);
            setPin(null);
            map.setCenter({ lat: 14.5995, lng: 120.9842 });
            map.setZoom(11);
            setLocationMessage("Search for an address, then click the map or drag the pin to the exact service entrance.");
        }
    }, [mapsReady, latitude, longitude, placeId]);

    const openMapsUrl = googleMapsSearchUrl({
        latitude,
        longitude,
        placeId,
        streetAddress,
        city,
    });

    return (
        <section className="mb-3">
            <div className="d-flex align-items-center justify-content-between gap-2 mb-2">
                <label className="form-label small fw-semibold mb-0">Find service address on Google Maps</label>
                {placeId && <span className="badge rounded-pill text-bg-success">Place selected</span>}
            </div>

            {MAPS_API_KEY ? (
                <>
                    <div ref={autocompleteHostRef} className="google-maps-autocomplete mb-2" />
                    {mapsError && <div className="alert alert-warning small py-2 mb-2">{mapsError}</div>}
                    <div ref={mapHostRef} className="border rounded-3 overflow-hidden" style={{ width: "100%", height: 260, background: "#f1f4f8" }} />
                    <div className="small text-muted mt-2">{locationMessage}</div>
                    {pin && (
                        <div className="small mt-1">
                            {pin.manuallyPinned ? (
                                <span className="text-success"><i className="bi bi-geo-alt-fill me-1" />Exact map pin saved: {pin.lat.toFixed(6)}, {pin.lng.toFixed(6)}</span>
                            ) : (
                                <span className="text-muted"><i className="bi bi-geo-alt me-1" />Address located on map. Adjust the pin to store a precise entrance point.</span>
                            )}
                        </div>
                    )}
                    {mapsReady && (
                        <div className="mt-2">
                            <a href={openMapsUrl} target="_blank" rel="noreferrer" className="small text-decoration-none">
                                <i className="bi bi-box-arrow-up-right me-1" />Open selected location in Google Maps
                            </a>
                        </div>
                    )}
                </>
            ) : (
                <div className="alert alert-info small mb-2">
                    Google Maps address search is not configured yet. You can still enter the service address below. Add <code>VITE_GOOGLE_MAPS_API_KEY</code> to your local environment to enable address search and pin selection.
                </div>
            )}

            <div className="small text-muted mt-2">
                Your service address and pin are shared with SecureView administrators and technicians assigned to the job so they can plan and perform the service.
            </div>

            {apiErrors.service_location && <div className="small text-danger mt-1">{apiErrors.service_location}</div>}
        </section>
    );
}

export function ServiceLocationMap({
    latitude = null,
    longitude = null,
    placeId = "",
    streetAddress = "",
    city = "",
    addressDetails = "",
    height = 230,
    showDirections = true,
}) {
    const mapHostRef = useRef(null);
    const [mapError, setMapError] = useState("");
    const [mapReady, setMapReady] = useState(false);
    const mapsKey = MAPS_API_KEY;
    const position = coordinatesFromProps(latitude, longitude);
    const address = fullAddress({ streetAddress, city, addressDetails });
    const searchUrl = googleMapsSearchUrl({
        latitude,
        longitude,
        placeId,
        streetAddress,
        city,
        addressDetails,
    });
    const directionsUrl = googleMapsDirectionsUrl({
        latitude,
        longitude,
        placeId,
        streetAddress,
        city,
        addressDetails,
    });

    useEffect(() => {
        if (!mapsKey || (!position && !placeId) || !mapHostRef.current) return undefined;

        let cancelled = false;

        const initialize = async () => {
            try {
                const google = await loadGoogleMapsApi(mapsKey);
                const [mapsLibrary, placesLibrary, markerLibrary] = await Promise.all([
                    google.importLibrary("maps"),
                    google.importLibrary("places"),
                    google.importLibrary("marker"),
                ]);

                let resolvedPosition = position;
                if (!resolvedPosition && placeId) {
                    const place = new placesLibrary.Place({ id: placeId });
                    await place.fetchFields({ fields: ["location", "viewport"] });
                    if (!place.location) throw new Error("Place has no map location.");
                    resolvedPosition = {
                        lat: typeof place.location.lat === "function" ? place.location.lat() : place.location.lat,
                        lng: typeof place.location.lng === "function" ? place.location.lng() : place.location.lng,
                    };
                }

                if (cancelled || !mapHostRef.current || !resolvedPosition) return;

                const mapOptions = {
                    center: resolvedPosition,
                    zoom: 16,
                    mapTypeControl: false,
                    streetViewControl: false,
                    fullscreenControl: true,
                    clickableIcons: false,
                };
                if (MAP_ID) mapOptions.mapId = MAP_ID;

                const map = new mapsLibrary.Map(mapHostRef.current, mapOptions);

                if (MAP_ID) {
                    new markerLibrary.AdvancedMarkerElement({
                        map,
                        position: resolvedPosition,
                        title: "Service location",
                    });
                } else {
                    new google.Marker({
                        map,
                        position: resolvedPosition,
                        title: "Service location",
                    });
                }

                setMapReady(true);
            } catch (error) {
                if (!cancelled) setMapError("Map preview is unavailable. Use the Google Maps link below to view the location.");
            }
        };

        initialize();
        return () => { cancelled = true; };
    }, [mapsKey, latitude, longitude, placeId]);

    return (
        <div className="border rounded-3 overflow-hidden bg-white">
            {mapsKey && (position || placeId) ? (
                <>
                    <div ref={mapHostRef} style={{ width: "100%", height, background: "#f1f4f8" }} />
                    {mapError && <div className="small text-muted px-3 pt-2">{mapError}</div>}
                </>
            ) : (
                <div className="d-flex align-items-center gap-3 p-3" style={{ minHeight: Math.min(height, 130), background: "#f7f9fc" }}>
                    <div className="rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: 42, height: 42 }}>
                        <i className="bi bi-geo-alt-fill fs-5" />
                    </div>
                    <div className="small">
                        <div className="fw-semibold">{address || "Service location not specified"}</div>
                        <div className="text-muted mt-1">
                            {placeId ? "Google Maps place saved" : position ? "Pinned service location" : "No map pin saved for this inquiry yet."}
                        </div>
                    </div>
                </div>
            )}

            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 px-3 py-2 border-top">
                <div className="small text-muted text-truncate" style={{ maxWidth: "65%" }}>
                    {address || "Service location"}
                </div>
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
            {mapReady && <span className="visually-hidden">Google Maps location preview loaded.</span>}
        </div>
    );
}
