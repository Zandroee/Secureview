# Google Maps service locations

## What this feature does

Google Maps is part of the service-inquiry and field-workflow, not just a map embedded beside an address.

1. Customers can search for an address with Places Autocomplete (New), review the result on a map, and click or drag the marker to the actual service entrance.
2. The customer can add unit, gate, landmark, or access instructions separately from the street address.
3. The inquiry saves the selected Google Place ID. If the customer manually pins an exact entrance, the selected coordinates are saved and take precedence over the general place.
4. Customers can review the location from their inquiry details.
5. Administrators can open the location from the inquiries list, review it on the inquiry detail page, and open the map from the schedule list.
6. Assigned technicians see service-address details and a one-tap Google Maps driving-directions link. Exact location details are not included in open jobs that technicians have not joined.

Older inquiries without a Place ID or a pinned coordinate remain supported; the map links use their saved text address.

## Configure Google Maps

1. Create or select a Google Cloud project and enable **Maps JavaScript API** and **Places API (New)**. Enable billing as required by Google Maps Platform for the project.
2. Create a browser API key. The key is intentionally exposed to the browser by Vite; it is not a server secret. Restrict it by allowed website referrers (include localhost for development and the exact production domains) and restrict API access to the Maps JavaScript API and Places API (New).
3. Add these values to the local `.env` file (do not commit the real key):

   ```dotenv
   VITE_GOOGLE_MAPS_API_KEY=your_restricted_browser_key
   # Optional. Create a Map ID in Google Cloud to enable Advanced Markers.
   VITE_GOOGLE_MAPS_MAP_ID=
   ```

4. Restart `npm run dev` or rebuild assets with `npm run build` after changing Vite environment values.

When no key is configured or Google Maps cannot load, the inquiry remains usable through manual address fields. Existing records also retain an external Google Maps link even when the embedded map is unavailable.

## Location data and privacy

- `street_address` and `city` are the customer-confirmed service address.
- `address_details` contains customer-provided unit, gate, landmark, or access instructions.
- `google_place_id` records the selected place identifier. Place IDs are specifically exempt from Google's general Maps content caching restrictions.
- `service_latitude` and `service_longitude` are written when the customer manually clicks the map or drags the marker to pin the exact entrance. Selecting a Google place alone does not persist its provider-returned coordinates.
- The customer's own inquiry and admin views can show the location. Assigned technicians can see it for field work. Open jobs do not reveal exact address details, Place IDs, or coordinates before a technician joins the team.

Before production, publish or update the site's public Terms of Use and Privacy Policy to describe Google Maps usage and service-location collection and sharing. Google requires public Terms of Use and a Privacy Policy for Maps JavaScript API applications. Preserve Google-provided map attribution on embedded maps.

## Suggested next stages

### Stage 2 — Admin dispatch map and travel-aware scheduling

- Show a map of confirmed and in-progress jobs on the admin schedule page, with filters for date, status, urgency, technician, and service type.
- Cluster nearby jobs and make each pin open the inquiry details.
- Add an opt-in "estimate travel time" action using the Google Routes API Compute Route Matrix. Calculate road distance and estimated drive time from a chosen technician/starting location to the day's jobs; do not treat straight-line distance as drive time.
- Use drive-time estimates as a scheduling aid, together with current job commitments and configurable travel buffers. Do not auto-reassign jobs without an administrator confirming the change.
- Cache application-generated operational decisions, not restricted Google Maps content; respect Maps Platform service-specific storage and attribution policies.

### Stage 3 — Technician arrival and customer coordination

- Add explicit job milestones such as En Route and Arrived.
- Let technicians open turn-by-turn navigation in Google Maps, while keeping SecureView as the system of record for assignments and job status.
- Send customer notifications when the technician is en route or arrives; only share an ETA when it is supported by a fresh route estimate.
- If live technician tracking is ever considered, make it a separate consent-based feature, visible only during an active job, with clear retention and privacy controls.

## Validation checklist

- Select a Google Place and verify the street/city fields are filled.
- Click or drag the marker and verify the manually pinned latitude/longitude are submitted together.
- Change the address manually and verify stale Place ID and pin coordinates are cleared.
- Submit with a Place ID but no manually pinned coordinates.
- Verify address/map display on customer inquiry details, admin inquiry details, and admin schedules.
- Verify assigned technicians receive the directions link, while open unclaimed jobs do not expose exact location details.
- Test with no API key and with a deliberately invalid/restricted key; the form should still allow manual address entry.
- Run `php artisan test --filter=GoogleMapsServiceLocationTest`, the booking/inquiry/technician feature tests, and `npm run build`.
