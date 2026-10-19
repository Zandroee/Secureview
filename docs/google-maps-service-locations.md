# Service location maps (Leaflet + OpenStreetMap)

## What this feature does

The map is part of SecureView's inquiry and field-workflow, not just an embedded address.

1. Customers enter the full service address and city, then explicitly choose **Find address on map** to locate an approximate position.
2. Customers can click the map or drag the marker to the actual service entrance. Coordinates are saved only after the customer deliberately places or drags the pin.
3. Customers can add unit, gate, landmark, or access instructions separately from the street address.
4. Customers can review saved locations in their inquiry details.
5. Administrators can review pinned locations in inquiry details and open map links from inquiry and schedule views.
6. Assigned technicians can see service-address details and open driving directions. Exact location details remain hidden from unclaimed jobs.

Older inquiries without coordinates remain supported. They can still show the saved address and offer an external map/directions link.

## Setup

No Google Cloud project, billing account, Google Maps API key, or npm map package is required. Leaflet is loaded from its official CDN and the interactive map uses OpenStreetMap tiles.

1. Run `php artisan migrate` to add the service-location fields.
2. Start the Laravel app and Vite as usual.
3. Test the inquiry form and confirm the map loads. The browser must be able to access the Leaflet CDN, OpenStreetMap tile service, and address-search service.
4. No map-specific environment variables are required.

The **Find address on map** button makes an explicit user-triggered search through the public Nominatim service. It is not autocomplete. Nominatim's public endpoint has strict usage limits (including a maximum of one request per second), forbids autocomplete, and is not an unlimited production geocoding service. The app intentionally does not issue background or keystroke-triggered geocoding requests. For a production deployment with more traffic, choose a hosted geocoding provider or run a service that meets your traffic and policy requirements; keep the provider configurable.

## Map tile policy and attribution

The map uses `https://tile.openstreetmap.org/{z}/{x}/{y}.png` and visibly credits OpenStreetMap contributors. Follow the [OpenStreetMap tile usage policy](https://operations.osmfoundation.org/policies/tiles/): the public tile servers are best-effort, may block excessive use, and are not a guaranteed production service. Do not bulk-download tiles or bypass their caching rules.

Address-search policy: [Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/).

## Location data and privacy

- `street_address` and `city` are the customer's confirmed service address.
- `address_details` contains customer-provided unit, gate, landmark, or access instructions.
- `service_latitude` and `service_longitude` are saved only when the customer manually pins the exact entrance.
- `google_place_id` remains nullable for compatibility with older data and earlier development; the Leaflet workflow does not generate Google Place IDs.
- Customer and admin views can show the location. Assigned technicians can see it for field work. Open jobs do not reveal exact address details, Place IDs, or coordinates before a technician joins the team.
- External Google Maps search/directions links are just ordinary links and do not use the Google Maps API or require a Google Cloud API key.

Before production, ensure the site's public Terms of Use and Privacy Policy describe service-location collection and sharing, and review the selected map and geocoding providers' terms.

## Suggested next stages

### Stage 2 — Admin dispatch map and travel-aware scheduling

- Show confirmed and in-progress jobs on an admin schedule map, with filters for date, status, urgency, technician, and service type.
- Cluster nearby jobs and make each pin open the inquiry details.
- Use a properly licensed route/time provider for road distance and estimated drive time; do not treat straight-line distance as drive time.
- Use estimates as scheduling aids with configurable travel buffers. Do not automatically reassign jobs without an administrator confirming the change.

### Stage 3 — Technician arrival and customer coordination

- Add explicit job milestones such as En Route and Arrived.
- Let technicians open turn-by-turn navigation while SecureView remains the system of record for assignments and job status.
- Send customer notifications when the technician is en route or arrives.
- If live technician tracking is ever considered, make it a separate consent-based feature, visible only during an active job, with clear retention and privacy controls.

## Validation checklist

- Confirm the map loads without a Google API key.
- Enter a full address and city and click **Find address on map**.
- Click the map or drag the marker and verify latitude/longitude are submitted together.
- Change the address manually and verify stale pin coordinates are cleared.
- Submit an inquiry without coordinates and confirm manual address entry still works.
- Verify address/map display on customer inquiry details, admin inquiry details, and admin schedules.
- Verify assigned technicians receive the directions link, while unclaimed jobs do not expose exact location details.
- Run `php artisan test --filter=GoogleMapsServiceLocationTest`, the booking/inquiry/technician feature tests, and `npm run build`.
