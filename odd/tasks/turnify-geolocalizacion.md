# Turnify geolocation (customer-facing, 100% free stack)

Guest flow shows "Cómo llegar" (distance + estimated travel time) after code/QR entry; admin Configuración gains a map picker for the shop point. Uncommitted work-unit; parent commit pending.

## Quick path

1. Parent provisions the free OpenRouteService key and sets `EXPO_PUBLIC_OPENROUTESERVICE_KEY` (mobile build env; get it at https://openrouteservice.org → sign up → dashboard → API keys, free tier).
2. Parent applies migration `supabase/migrations/0043_geolocalizacion_tienda.sql` to the remote database (local only here; never applied remotely by this task).
3. Verify: `npx vitest run tests/supabase/geolocalizacion-tienda.test.ts tests/mobile/geolocalizacion.test.ts tests/web/geolocalizacion.test.ts` → 21 passed; `npm --workspace turnify-mobile run typecheck`; `npm --workspace turnify-web run typecheck`; `npm --workspace turnify-web run build`.

## Objective

Let a guest who just entered via code/QR see how far the shop is and how long the drive takes, without ever blocking ticket creation.

## Problem / why

Guests arrive without knowing the shop's exact location or travel time, which causes late arrivals and no-shows. The approved decision mandates a 100% free stack (no billing, no vendor key beyond the ORS free tier) and honest copy: travel time is a route-based estimate, never live traffic.

## Scope

Only: new migration `0043`, one `supabase/` test, mobile public flow + location/routing modules (+ `expo-location` dep), web settings map picker (+ `leaflet` dep), minimal `live.ts`/company-settings wiring, focused tests, this record. No commit, no push, no remote migration apply, no changes to unrelated dirty work.

## Details

| Topic | Decision |
|---|---|
| Free stack | Leaflet + OpenStreetMap tiles (admin picker, no key) · OpenRouteService free tier, driving-car (distance/duration) · phone GPS via `expo-location`. Paid map vendors stay out of the codebase and its tests. |
| No-live-traffic limitation | UI copy states travel time is "estimado según ruta, sin tráfico en vivo". The offline fallback (straight-line + 30 km/h urban assumption, 1.3x circuity) is always labelled an estimate. |
| Routing abstraction | `RouteProvider` interface (`name` + `getDrivingRoute`, `RouteEstimate { distanceMeters, durationSeconds, source }`). Implementations: `OpenRouteServiceProvider`, `HaversineRouteProvider`. A future paid provider plugs in as a new implementation without touching flows. |
| Migration `0043` | Forward-only. `empresas` gains nullable `latitud`/`longitud` (numeric, range checks -90..90 / -180..180). RLS-safe: no new policies, no direct guest SELECT; coordinates reach guests only through `catalogo_comercial` (security definer, existing anon grant). Admin write stays under the existing `empresas_update` policy. `catalogo_comercial` keeps its 0042 body (measured durations + global worker photo) plus the point. |
| Mobile guest flow | `CommercialCatalog.shopLocation` (optional, parsed from `latitud`/`longitud`). `shop.tsx` renders `<HowToGetThere>` after identification, before the service CTA; the CTA is never gated. Degradation: no shop point → explanatory message; GPS denied/unavailable → message + retry; key missing/route failure → offline estimate. `details.tsx` confirmation path untouched. |
| Admin web | `SettingsPage` → new "Ubicación del local" section with `ShopLocationPicker` (click/drag to set, "Quitar punto" to clear, current point shown). `fetchShopSettings`/`saveShopSettings` carry `shopLatitude`/`shopLongitude`; save omits coordinates when `undefined` so non-mapping callers never wipe the point. Spanish UI throughout. |
| Env | `EXPO_PUBLIC_OPENROUTESERVICE_KEY` (mobile). Missing key degrades to the offline estimate; never blocks. |

## Acceptance checklist

- [x] Migration contract test (columns, ranges, RPC exposure, RLS, forward-only, vendor-free).
- [x] Provider abstraction test (interface, ORS parse via injected fetch, missing-key/network degradation, honest summary copy).
- [x] Guest rendering + degradation test (GPS boundary, "Cómo llegar" wiring, CTA ungated, confirmation path intact).
- [x] Admin picker persistence test (live wiring, Leaflet+OSM, Spanish copy, no key).
- [x] Focused RED → GREEN, both typechecks, web build, related-suite regressions green.
- [ ] Parent: provision ORS key, apply remote migration, commit (all explicitly out of scope here).

## Progress

Implemented, tested, verified locally. All changes are new files except minimal in-scope edits (`commercial-queue-api.ts`, `(public)/shop.tsx`, `app.json`, `live.ts`, `SettingsPage.tsx`, both `package.json`, `package-lock.json` additions only).

## Evidence

- RED: `npx vitest run tests/supabase/geolocalizacion-tienda.test.ts tests/mobile/geolocalizacion.test.ts tests/web/geolocalizacion.test.ts` → `Test Files 3 failed (3), Tests no tests` (ENOENT migration + unresolvable new-module imports).
- GREEN (same command): `Test Files 3 passed (3), Tests 21 passed (21)`.
- `npm --workspace turnify-mobile run typecheck` → clean.
- `npm --workspace turnify-web run typecheck` → clean.
- `npm --workspace turnify-web run build` → `✓ built in 8.37s` (chunk-size warning only; bundle grew with Leaflet).
- Related regressions: 10 files / 32 tests passed (`public-guest-flow`, `commercial-booking`, `qr-parse`, `guest-ticket-details`, `settings-real`, `catalogo-duracion-medida`, `commercial-queue-foundation`, `worker-linked-catalog`, `perfil-global-foto-trabajador`, `foto-barbero`).
- Full suite: 317 passed / 6 failed; the 6 failures are pre-existing and unrelated (route-string expectations in `worker-invitation-ui`, `called-ticket-customer-response`, `customer-navigation` from the parent's in-progress dirty work; none import the new modules).
- Runtime/browser: N/A — no mobile/web runtime harness exists in this repo; coverage is Vitest contracts plus typecheck/build.

## Evidence (settings-wiring verification, this session, HEAD `87eb3b4`)

State found: parent commits `7470bcd` (picker, `shop-location`, migration
`0043`, mobile flow, supabase/mobile tests) and `87eb3b4` (OSRM default)
exist. The Configuración slice itself is uncommitted working-tree state:
`ShopSettings` + `fetch`/`saveShopSettings` latitud/longitud wiring in
`apps/web/src/data/live.ts`, the "Ubicación del local" section in
`apps/web/src/features/settings/SettingsPage.tsx`, and untracked
`tests/web/geolocalizacion.test.ts`. No commit, push, migration apply, or
remote access performed here; unrelated dirty work untouched.

- RED (throwaway baseline, deleted after the run):
  `npx vitest run tests/web/geolocalizacion-red-baseline.test.ts`
  → `Test Files 1 failed (1), Tests 2 failed (2)` — contract assertions
  (`shopLatitude`/`shopLongitude` in `live.ts`, `ShopLocationPicker` /
  `Ubicación del local` in `SettingsPage.tsx`) run against
  `git show HEAD:...` content, which contains neither (verified 0 matches).
- GREEN (same contract against the working tree):
  `npx vitest run tests/web/geolocalizacion.test.ts`
  → `Test Files 1 passed (1), Tests 4 passed (4)`.
- Neighbor regression:
  `npx vitest run tests/web/geolocalizacion.test.ts tests/web/settings-real.test.ts`
  → `Test Files 2 passed (2), Tests 5 passed (5)` (unrelated settings
  controls unbroken).
- `npm --workspace turnify-web run typecheck` → clean.
- `npm --workspace turnify-web run build` → `✓ built in 21.27s`
  (chunk-size warning only; Leaflet in the bundle).

## Rollback boundary

Remove without touching unrelated work: delete `supabase/migrations/0043_geolocalizacion_tienda.sql`, `apps/mobile/src/features/location/`, `apps/mobile/src/features/routing/`, `apps/mobile/src/components/customer/how-to-get-there.tsx`, `apps/web/src/features/settings/ShopLocationPicker.tsx`, `apps/web/src/features/settings/shop-location.ts`, the three `geolocalizacion*.test.ts` files, this record; revert the in-scope edits (catalog `shopLocation`, `HowToGetThere` render, `app.json` location plugin, `ShopSettings` lat/lng, Settings location section); drop `expo-location` / `leaflet` + `@types/leaflet` deps. Nothing else depends on these.
Caution: the working-tree diffs of `apps/web/src/data/live.ts` and
`apps/web/src/features/settings/SettingsPage.tsx` also carry the parent's
unrelated in-progress work — revert only the geo hunks
(`ShopSettings.shopLatitude/shopLongitude`, the `latitud`/`longitud`
select/update lines, the `ShopLocationPicker` import + "Ubicación del local"
section), never the whole files.

## Next step

Parent: set `EXPO_PUBLIC_OPENROUTESERVICE_KEY`, apply `0043` remotely, and commit this work-unit (conventional commit, tests + docs travel with the behavior).

## Memory note

Engram mirror was not possible: no memory tools are exposed in this execution environment, so nothing was registered. This record is the source of truth for the next session. Update (settings-wiring session, HEAD `87eb3b4`): memory tools are exposed but `mem_save` (project `turnify`) failed with "could not confirm Engram session registration", so again nothing was registered. This record remains the source of truth.

## Swap: OSRM temporary default (uncommitted work-unit; parent commit pending)

Guest routing default moves from OpenRouteService to the OSRM public demo
server. No signup/key, no copy changes, no new dependencies. Parent commit for
this work-unit is pending (do not commit here); base is `7470bcd feat(geo):
cliente ve distancia y tiempo al local`.

### Change

- `apps/mobile/src/features/routing/route-provider.ts`:
  - `RouteSource` gains `'osrm'`.
  - New `OsrmRouteProvider` implementing `RouteProvider` (`name = 'osrm'`),
    GET `https://router.project-osrm.org/route/v1/driving/{lng},{lat};{lng},{lat}?overview=false`,
    parses `routes[0].distance`/`duration`; network/non-OK/invalid JSON → `'red'`,
    empty route or non-positive distance/duration → `'sin-ruta'`.
  - New `resolveRoutingProviderKind(env?)`: `'osrm'` unless
    `EXPO_PUBLIC_ROUTING_PROVIDER === 'openrouteservice'`.
  - New `createDefaultRouteProvider({ env, apiKey, fetchImpl })`: OSRM by
    default; `OpenRouteServiceProvider` only when the env opts into
    `openrouteservice` (ORS code untouched and dormant, switch-back is config-only).
  - New `getDrivingRouteWithFallback(origin, destination, { provider, fallback })`:
    defaults to OSRM → haversine; degrades to the honest estimate on any
    `RouteUnavailableError`, never throws, never blocks ticket creation.
- `apps/mobile/src/components/customer/how-to-get-there.tsx`: untouched
  (out of scope). It still resolves ORS-or-haversine locally with Spanish copy
  and the honest "sin tráfico en vivo" note, one request per card render, no
  polling/prefetch. Adopting `createDefaultRouteProvider` /
  `getDrivingRouteWithFallback` there is a one-line parent follow-up.
- `apps/mobile/src/features/location/`: untouched (not required).

### Evidence (actual)

- RED: `npx vitest run tests/mobile/geolocalizacion.test.ts` → `Test Files 1 failed (1), Tests 4 failed | 13 passed (17)` (new OSRM tests: default-kind/ORS-dormant, OSRM parse + URL, OSRM red/sin-ruta, OSRM→haversine fallback).
- GREEN (same command): `Test Files 1 passed (1), Tests 17 passed (17)`.
- `npm --workspace turnify-mobile run typecheck` → clean.
- No migration, no web, no new dependencies, no remote calls (fetch only injected in tests).

### Rollback boundary

Remove without touching unrelated work: delete `OsrmRouteProvider`,
`resolveRoutingProviderKind`, `createDefaultRouteProvider`,
`getDrivingRouteWithFallback` (+ `OsrmRouteProviderDeps`/`OsrmRouteResponse`/
`RoutingProviderKind`/`DefaultRouteProviderDeps`/`RouteFallbackDeps` types) from
`apps/mobile/src/features/routing/route-provider.ts`, restore
`RouteSource = 'openrouteservice' | 'estimate'`; remove the 5 new OSRM tests
from `tests/mobile/geolocalizacion.test.ts` (restore the original import block);
drop this section from the record. Nothing else imports the new symbols.

### Next step

Parent: wire the card to `createDefaultRouteProvider` /
`getDrivingRouteWithFallback` (one line), then commit this work-unit
(conventional commit, tests + docs travel with the behavior).

### Memory note (swap)

Engram mirror attempted twice via memory save (project `turnify`); both attempts
failed with "could not confirm Engram session registration", so nothing was
registered. This record is the source of truth.

## Fast paths: address search + current location (uncommitted work-unit; parent commit pending)

Clicking blindly on the map is tedious. The Configuración picker gains two fast
paths besides the map: (1) "Buscar dirección" search box with suggestions over
the free Nominatim/OSM endpoint (no key, 400 ms debounce, OSM attribution
kept) — picking a result moves the marker through the unchanged `onChange`
persistence path; (2) "Usar mi ubicación actual" button via browser
geolocation with graceful denial handling (Spanish message, map stays usable).
The map stays as visual confirmation only. Spanish UI, real persistence path
unchanged. Strict TDD: focused tests first (RED observed), then implementation
(GREEN). No migration, no mobile, no new paid deps.

### Change

- `apps/web/src/features/settings/shop-location.ts` (pure, no Leaflet):
  - `AddressSuggestion { id, label, point }`.
  - `NOMINATIM_SEARCH_ENDPOINT` (`https://nominatim.openstreetmap.org/search`).
  - `buildNominatimSearchUrl(query, limit = 5)`: keyless `format=jsonv2` URL,
    encoded query, limit clamped 1..10. Never throws.
  - `parseNominatimResults(data)`: maps `display_name`/`lat`/`lon` to
    suggestions, drops invalid/out-of-range entries, `[]` on garbage. Never
    throws.
  - `parseGeolocationPosition(value)`: reads `coords.latitude/longitude`,
    null when missing or invalid. Never throws.
- `apps/web/src/features/settings/ShopLocationPicker.tsx`:
  - New "Buscar dirección" input (min 3 chars, 400 ms debounce, `Accept-Language:
    es`); suggestion listbox buttons call the unchanged `onChange(point)`, so
    the existing marker effect moves/zooms the map. "Sin resultados…" and
    search-failure messages in Spanish; visible "Búsqueda © OpenStreetMap ·
    Nominatim" line; OSM tile attribution untouched.
  - New "Usar mi ubicación actual" button (`navigator.geolocation`, 10 s
    timeout): success → `onChange(point)`; denial/unavailable/unsupported →
    Spanish `role="alert"` message ("…permiso del navegador…"), map stays
    usable. Hidden while `disabled` (saving), like the rest of the fast paths.
- `tests/web/geolocalizacion.test.ts`: +6 tests (search-URL keyless/encoded,
  results-to-point + invalid filtering, garbage payloads, geolocation parse +
  denial, picker fast-path/denial/attribution contract, no-paid-vendor scan of
  picker + lib + page).

### Evidence (actual)

- RED: `npx vitest run tests/web/geolocalizacion.test.ts`
  → `Test Files 1 failed (1), Tests 6 failed | 4 passed (10)` (new
  `buildNominatimSearchUrl` / `parseNominatimResults` /
  `parseGeolocationPosition` imports unresolvable + picker fast-path strings
  absent).
- GREEN (same command): `Test Files 1 passed (1), Tests 10 passed (10)`.
- Neighbor regression:
  `npx vitest run tests/web/geolocalizacion.test.ts tests/web/settings-real.test.ts`
  → `Test Files 2 passed (2), Tests 11 passed (11)`.
- `npm --workspace turnify-web run typecheck` → clean.
- `npm --workspace turnify-web run build` → `✓ built in 13.29s`
  (chunk-size warning only, pre-existing Leaflet weight).
- Runtime/browser: N/A — no web runtime harness exists in this repo; coverage
  is Vitest contracts plus typecheck/build.

### Rollback boundary

Remove without touching unrelated work: revert the `AddressSuggestion` /
Nominatim / geolocation helpers from
`apps/web/src/features/settings/shop-location.ts`; revert the search +
current-location blocks in
`apps/web/src/features/settings/ShopLocationPicker.tsx` (keep the Leaflet map
effect and "Quitar punto" as committed in `7470bcd`); remove the 6 fast-path
tests from `tests/web/geolocalizacion.test.ts` (restore the original import
block); drop this section from the record. Nothing else imports the new
symbols; no new dependencies were added.

### Next step

Parent: commit this work-unit (conventional commit, tests + docs travel with
the behavior). Do not commit, push, access remote services, or apply
migrations here.

## Durable admin address (uncommitted work-unit)

The admin-selected Nominatim `display_name` now persists independently from
the map point. Migration `0044_direccion_tienda.sql` adds nullable
`public.empresas.direccion`, preserving backward compatibility and requiring
no remote access from this task. `fetchShopSettings` reads it as
`shopAddress`; `saveShopSettings` writes it only when explicitly supplied, so
coordinate-only saves preserve the existing address. The picker initializes
its search field from the saved address, but typing a transient query does not
change it. Selecting a suggestion updates both the point and address. GPS,
map clicks, marker drags, and “Quitar punto” change coordinates only; the
previous canonical address remains because those actions do not semantically
edit the address. The map remains a visual fallback.

### Evidence (actual)

- RED: `npx vitest run tests/web/geolocalizacion.test.ts tests/web/settings-real.test.ts` → `Test Files 1 failed, 1 passed; Tests 4 failed, 11 passed` (the four new address contract assertions failed before implementation).
- GREEN: `npx vitest run tests/web/geolocalizacion.test.ts tests/web/settings-real.test.ts` → `Test Files 2 passed; Tests 15 passed`.
- `npm --workspace turnify-web run typecheck` → clean.
- `npm --workspace turnify-web run build` → successful (`✓ built in 16.33s`); Vite emitted only the existing chunk-size warning.
- Engram mirror attempted for project `turnify` but registration could not be confirmed; no memory entry was recorded.
- Remote migration: pending. `0044_direccion_tienda.sql` was not applied remotely, and no remote service was accessed.

### Rollback boundary

Remove `supabase/migrations/0044_direccion_tienda.sql`, the address fields and
conditional update in `apps/web/src/data/live.ts`, the `shopAddress` state and
picker callbacks in `SettingsPage.tsx`/`ShopLocationPicker.tsx`, and the four
address contract tests. Leave the existing coordinate persistence and map
fallback intact.

### Memory note (fast paths)

Engram mirror attempted via memory save (project `turnify`); it failed with
"could not confirm Engram session registration", so nothing was registered.
This record is the source of truth.
