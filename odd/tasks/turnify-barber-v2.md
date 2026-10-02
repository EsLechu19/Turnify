# Turnify V2 Barber Shop UX/UI — Feature Record (ODD)

## Objective

Define, design, and implement the first V2 UX/UI base for Turnify as a commercial B2B2C queue product for Peruvian walk-in barbershops with two to six barbers. Customers must be able to select a named barber or choose **Any available barber** without adding operational friction to the queue.

## Problem

The existing product experience and data model were created for an earlier scope. They do not yet express the barber, service, and capacity choices required by a small walk-in barbershop, nor do they provide a coherent client, staff, and administrator V2 experience.

## Why

Turnify is now a real commercial product rather than a university-only project. The initial ICP needs a fast operational flow: customers join a queue quickly, staff can manage demand without manual workarounds, and business owners can configure the shop with confidence.

## Product and UX Decisions

| Topic | Decision |
| --- | --- |
| Product model | Commercial B2B2C product. |
| Initial ICP | Peruvian walk-in barbershops with 2–6 barbers. |
| Customer choice | The customer may select a specific on-shift barber, including one who is busy, or choose **Any available barber**. A barber who is off shift is not selectable. |
| Queue flow | Customer queue journeys must be fast, operationally simple, and suitable for walk-ins. |
| Design source | The V2 UX/UI base is designed first in the new Google Stitch project `turnifyV2.0`. |
| Implementation target | Approved base UI is then implemented in the existing Turnify application. |
| Existing wording | The current `notificado` UI wording is deferred until after MVP. |

## Authorized Scope

- Create and maintain the `turnifyV2.0` Google Stitch project and its V2 design system.
- Generate and review V2 screens for customer, barber/staff, and administrator roles.
- Make architecture and domain decisions required to support services, barbers, customer preference, and shop capacity.
- Implement the approved V2 base UI in the existing application after design review.
- Add the relevant service, barber, and capacity data-model work required by the approved flow.
- Verify design, implementation, accessibility, tests, type checks, and operational queue acceptance flows.
- Document decisions, implementation evidence, verification results, and deferred scope.
- Deliver the commercial product in this order: customer first, worker second, administrator later under a separate approved scope.

## Constraints

- No code is implemented by this documentation task.
- Preserve the B2B2C model and avoid adding customer-flow complexity that does not serve the walk-in queue.
- Treat a named-barber selection and **Any available barber** as first-class, explicit customer choices.
- Design for shops with 2–6 barbers before generalizing to larger operations.
- Use the Stitch design as the reviewed source before application UI writes begin.
- Do not access remote services, secrets, or credentials during this record-creation work.
- Keep all source code, generated artifacts, comments, UI copy, tests, and documentation in English unless a later approved task explicitly requires otherwise.

## Accepted Scope vs. Deferred Scope

### Accepted now

- Customer journey: shop discovery, active service selection, named-barber or any-available preference, confirmation, and live ticket.
- Worker journey: availability, compatible queue work, calling, service start/finish, absence, and bounded reassignment.
- Service selection, barber preference, any-available assignment, and operational capacity foundations.
- Stitch-derived commercial UX adapted to current product constraints, rather than copied literally.

### Deferred until later

- Payments, subscriptions, and billing.
- Inventory.
- ML features.
- Full future reservations.
- Geofencing.
- Advanced analytics.
- Public display.
- Countdown reminders.
- Existing `notificado` UI wording, until after MVP.
- Administrator management screens and any new administrator features; these require a separate product brief after customer and worker delivery.
- Payments, payment collection, SMS/WhatsApp, add-on services, ticket pausing, manual queue reordering, absent-ticket reinstatement, shift scheduling, multi-location support, CSV/PDF exports, predictions, and public/kiosk displays.

## Delivery Route and Evidence

| Item | Record |
| --- | --- |
| Work classification | Substantial work. Each implementation task closes with a focused Conventional Commit work unit; split review slices when the forecast exceeds 400 authored lines. |
| Route | Delegated direct route for focused task execution and review. |
| Required order | Implement commercial foundations and customer flow first; then worker operations; reserve administrator expansion for a separate scope. |
| Sources before writes | Product decisions in this record; current repository architecture and data model; reviewed `turnifyV2.0` Stitch screens/design system. No base UI implementation begins before these sources are recorded and approved. |
| Verification | Run focused tests for changed behavior, TypeScript/type checks, relevant lint/build checks, `git diff --check`, and role-based operational walkthroughs. Record exact commands and results in this file. |
| Runtime evidence | Verify customer named-barber and any-available flows, staff queue operations, and administrator configuration against a safe approved environment before declaring implementation complete. |
| Rollback | Each work unit identifies the exact screens, domain/data changes, tests, and documentation that can be reverted without unrelated changes. |

## Stable Task IDs

- [x] **TV2-ARCH-01 — Commercial queue foundation.** Migrations `0012_commercial_queue_foundation.sql` and `0013_commercial_assignment_and_eta.sql` add services, barber capabilities, on-shift operational state, immutable customer route snapshots, catalog and commercial ticket-creation RPCs, capacity-safe call-time assignment, and service-aware ETA data. A named on-shift barber remains selectable while busy; **Any available barber** chooses a deterministic compatible projected route and is assigned a free compatible barber only when called. Explicit reassignment remains worker-scope work.
- [x] **TV2-DES-02 — Stitch designs and visual language.** Customer, worker, and administrator designs were generated in their dedicated Stitch projects. The application implements only the shared V2 visual base so far; design-specific product flows remain pending.
- [x] **TV2-CLIENT-03 — Customer commercial flow.** Implement the customer Stitch journey first: QR/code discovery, active service catalog, named barber or **Any available barber**, confirmation, immutable ticket snapshot, live ticket with assignment/ETA, cancellation, loading, empty, closed, and error states. Adapt prices to optional PEN reference prices only; do not add payments, SMS/WhatsApp, location claims, or countdown reminders.
- [ ] **TV2-CLIENT-04 — Customer quality and rollout.** Add database/RPC concurrency and RLS tests plus mobile flow, accessibility, realtime, and device walkthrough coverage for the customer journey. Document the customer ETA and assignment contract.
- [x] **TV2-WORKER-05 — Worker operational flow.** After the customer flow is operational, implement the worker Stitch journey: availability state, compatible next-ticket claim, assigned-ticket view, call, start, finish, absent, and explicit reassignment. Do not add manual reordering, ticket pause, shift planning, WhatsApp, or nonessential dashboards.
- [ ] **TV2-WORKER-06 — Worker quality and rollout.** Add worker authorization, concurrency, assignment-ownership, reassignment, realtime, accessibility, and device walkthrough coverage. Preserve the existing called-ticket push outbox only for `llamado`.
- [ ] **TV2-ADMIN-07 — Administrator scope decision.** Deferred. Define a separate commercial brief for owner/admin needs after customer and worker delivery; do not implement or expand administrator features under this feature record.
- [x] **TV2-UI-07 — Base UI implementation.** Implemented the first bounded visual work unit: shared mobile tokens, typography, buttons, inputs, cards, status badges, and adaptations for the existing customer preview/ticket and staff/admin operational screens. No business behavior or backend data contract changed.
- [x] **TV2-CLIENT-08 — Customer Stitch shell and navigation.** Replaced the generic customer entry with a customer-only landing, reusable Stitch-derived bottom navigation, and role-aware route guard. The existing discovery, catalog, barber preference, confirmation, live ticket, history, profile, and scan routes remain real routes; customer access to worker, admin, configuration, and business-registration routes is redirected to the customer landing. Worker and administrator routes remain unchanged and retain their own entry redirects.
- [x] **TV2-CLIENT-09 — Customer Stitch visual parity.** Implement the remaining customer screen-specific layouts, empty/loading/error states, visual assets, responsive spacing, interactions, and accessibility states from the approved Stitch screens. Remove or adapt any mock-only payment, SMS/WhatsApp, location, countdown, or unsupported content instead of faking it.
- [x] **TV2-WORKER-10 — Worker Stitch shell and navigation.** Replaced the generic worker route entry with the approved worker navigation and operational hierarchy: live operations, compatible queue, history, and profile. The shell uses assignment-safe live data only; remaining per-screen visual parity is deferred to TV2-WORKER-11.
- [x] **TV2-WORKER-11 — Worker Stitch visual parity.** Implemented the worker screen-level layout hierarchy, availability/assignment exceptions, empty/loading/error states, responsive spacing, interactions, and accessibility states from the approved Stitch screens while preserving the explicit reassignment and lifecycle invariants.
- [ ] **TV2-VISUAL-12 — Role-based visual acceptance.** Compare every customer and worker route with its approved Stitch source using device/emulator captures, verify layout/state coverage and accessibility, then record accepted deviations required by real backend constraints. Administrator screens remain excluded.
- [ ] **TV2-DOC-08 — Incremental documentation and closure.** Update this record and product/technical documentation after each customer and worker work unit with verification evidence, migration notes, rollout/rollback boundaries, and deferred administrator scope.

## Acceptance Criteria

- [ ] The implemented customer journey matches the approved customer Stitch intent while remaining truthful to the live backend contract.
- [ ] A customer can explicitly select a barber or **Any available barber** without ambiguity.
- [ ] The customer walk-in path is operationally simple and optimized for a small barbershop.
- [ ] Workers can understand availability, assignment responsibility, and compatible capacity from the implemented flow.
- [ ] Administrator functionality remains deliberately deferred and is not expanded accidentally.
- [ ] Base UI implementation follows the accepted Stitch design review.
- [ ] Customer and worker navigation, layouts, components, states, and responsive behavior match the approved Stitch role designs wherever the real product contract supports them.
- [ ] Mock-only Stitch content is removed or truthfully adapted; it is never displayed as a live product capability.
- [ ] Data-model changes preserve queue, authorization, and capacity invariants with focused automated coverage.
- [ ] Verification evidence records exact commands, results, walkthrough scenario, and rollback boundary for every implementation work unit.
- [ ] Deferred features are not implemented accidentally.

## Verification Record

- This record creation: `git diff --check` must pass before commit.
- Implementation tasks: record the exact focused test, type-check, lint/build, runtime walkthrough, and `git diff --check` results here.
- This documentation task has no runtime boundary; runtime verification is N/A because it writes no application code or configuration.
- 2026-10-02 — UI base work unit:
  - `npx vitest run` — passed: 11 test files, 74 tests.
  - `npm --workspace turnify-mobile run typecheck` — passed.
  - `npx expo config --type public` (from `apps/mobile`) — passed without downloads.
  - `git diff --check` — passed.
  - Runtime visual walkthrough/screenshots — N/A: no emulator or connected device was available in this local environment. The focused route markup and type check were inspected instead.
  - Rollback boundary: `apps/mobile/src/constants/theme.ts`, shared mobile UI components, `preview.tsx`, `ticket.tsx`, and `admin.tsx`; this is visual-only and can be reverted without changing queue behavior or persisted data.

## Progress

- 2026-10-02: Feature record created. No source code, remote service, secret, or credential access is authorized or performed by this task.
- 2026-10-02: Completed the first bounded source work unit after the user-approved Stitch client, worker, and admin designs. The mobile theme now uses warm ivory, deep ink, teal actions, terracotta destructive states, and warm borders. Existing Spanish UI copy and the customer-facing `notificado` label were preserved. The implementation intentionally does not display services, barbers, capacity, payments, subscriptions, geolocation, or analytics because the current backend contract does not provide those facts.
- 2026-10-02: Re-scoped delivery for commercial product execution. The customer journey is implemented first, followed by worker operations. Administrator expansion is deferred to a separate product brief. Customer named-barber selection supports any on-shift barber, even while busy; **Any available barber** remains the fast compatible option. Stitch concepts that do not fit the initial ICP or current product commitments are excluded rather than copied literally.
- 2026-10-02: TV2-ARCH-01 partial foundation added in work-unit commit `244f1fb`. Migration `0012_commercial_queue_foundation.sql` is additive and keeps legacy `tomar_turno` intact. It adds services, barber operational/capability records, immutable service/requested-barber snapshots plus a future assigned-barber snapshot, a public catalog RPC, and authenticated commercial ticket creation. The commercial RPC permits a compatible named barber whenever they are on shift, including when occupied; **Any available barber** routes deterministically by operational state, active assigned workload, name, then ID. No migration was deployed. Verification: `npx vitest run` passed (12 test files, 77 tests); `npm --workspace turnify-mobile run typecheck` passed; `git diff --check` passed. Runtime walkthrough: N/A because no local Supabase database or approved remote environment was used. Rollback boundary: revert migration `0012_commercial_queue_foundation.sql`, `commercial-queue-api.ts`, and its focused migration test together; no existing ticket or legacy RPC behavior was altered.
- 2026-10-02: TV2-ARCH-01 completion work unit (`feat(queue): reserve barber capacity and expose ETAs`): migration `0013_commercial_assignment_and_eta.sql` is additive and replaces only the commercial creation, call, and customer-ticket RPC definitions. It separates immutable projected-barber snapshots from actual assignment; `llamar_siguiente` is the sole capacity reservation point, with a partial unique index allowing one called/in-service ticket per barber. Named requests are never silently reassigned and wait until their requested on-shift barber is free; any-available is assigned deterministically to a free compatible barber. Customer ticket state now returns service, requested, projected, and actual barber facts with projected-route, service-duration ETA. The existing `notificado` state and `llamado` transition remain unchanged, so the called-ticket outbox behavior is preserved. No migration was deployed. Verification: `npx vitest run` passed (13 test files, 80 tests); `npm --workspace turnify-mobile run typecheck` passed; `git diff --check` passed. Runtime walkthrough: N/A because no local Supabase database or approved remote environment was used. Rollback boundary: revert `0013_commercial_assignment_and_eta.sql`, `tests/supabase/commercial-assignment-and-eta.test.ts`, and the additive `TicketState` fields in `apps/mobile/src/features/queue/queue-api.ts` together; migration `0012`, legacy ticket creation, and unrelated UI remain intact.
- 2026-10-02: TV2-CLIENT-03 commercial intake segment completed in the work-unit commit containing this entry (`feat(mobile): add commercial customer booking flow`). The customer preview now loads the public commercial catalog, requires an active service choice, exposes compatible named on-shift barbers including busy barbers, and offers **Cualquier barbero disponible** as the compatible fast path. Its confirmation copy states only the truthful assignment/waiting expectation; optional reference prices are rendered as PEN references, without payment behavior. The typed commercial creation result now carries the returned queue ID so the existing ticket route retains its realtime subscription boundary. Focused pure mobile choice tests cover busy named selection, any-compatible copy, and optional prices. Verification: `npx vitest run` passed (14 test files, 83 tests); `npm --workspace turnify-mobile run typecheck` passed; `git diff --check` passed. Runtime walkthrough: N/A because no emulator, local Supabase database, or approved remote environment was used. Rollback boundary: revert `preview.tsx`, `commercial-booking.ts`, `commercial-queue-api.ts`, `commercial-booking.test.ts`, and this entry together; existing ticket presentation, cancellation semantics, notification lifecycle, legacy ticket creation, and database migrations remain intact. The live-ticket commercial presentation is deliberately left for the next customer slice.
- 2026-10-02: TV2-CLIENT-03 live-ticket segment completed in work-unit commit `feat(mobile): present truthful commercial live ticket`. The customer ticket now maps its view from the typed `mi_ticket_estado` facts only: immutable service snapshot, named-barber preference when supplied, actual assigned barber only after allocation, queue position derived from `personas_delante`, and the deterministic service-aware `espera_min` ETA while waiting. Waiting, called, in-service, finalised, cancelled, absent, loading, error, and empty states have distinct presentation. Cancellation remains available only for `en_espera` and `notificado`, matching the existing RPC contract. Projected barber data is intentionally not shown because it is not an actual allocation. No countdown, location/chair tracking, payment, SMS, or WhatsApp claims were added. Verification: `npx vitest run` passed (15 test files, 86 tests); `npm --workspace turnify-mobile run typecheck` passed; `git diff --check` passed. Runtime walkthrough: N/A because no emulator, local Supabase database, or approved remote environment was used. Rollback boundary: revert `ticket.tsx`, `ticket-presentation.ts`, `ticket-presentation.test.ts`, and this entry together; booking intake, realtime subscription, queue backend contract, cancellation RPC, and unrelated mobile screens remain intact.
- 2026-10-02: TV2-WORKER-05 first operational slice completed in the `feat(worker): add barber operations flow` work-unit commit. Migration `0014_worker_barber_operations.sql` adds worker-owned availability, compatible/assigned queue retrieval, atomic per-barber claiming, and assignment-ownership lifecycle RPCs. A worker can set only available or off-shift; busy is derived when they claim work and availability returns only when they finish or mark their own assigned ticket absent. The mobile worker route shows loading, empty, off-shift, compatible-queue, active-ticket, error/conflict, and realtime-refresh states using only queue, service, request, and assignment facts returned by the worker RPC. Explicit reassignment, worker authorization/RLS concurrency testing against a running database, accessibility, and device walkthrough coverage remain TV2-WORKER-06/following work. Verification: `npx vitest run` passed (16 test files, 89 tests); `npm --workspace turnify-mobile run typecheck` passed; `git diff --check` passed. Runtime walkthrough: N/A because no emulator, local Supabase database, or approved remote environment was used. Rollback boundary: revert `0014_worker_barber_operations.sql`, `worker-barber-operations.test.ts`, `worker-barber-api.ts`, `worker.tsx`, the home-route link, and this entry together; customer booking, customer live-ticket behavior, legacy staff operations, and prior queue migrations remain intact.
- 2026-10-02: TV2-WORKER-05 reassignment work unit completed (`feat(worker): add explicit barber reassignment`). Migration `0015_worker_barber_reassignment.sql` adds security-definer candidate and reassignment RPCs. An assigned worker may move only their own `llamado` ticket; an authenticated same-business administrator is also authorized by the RPC but has no new UI surface. The target must be active, compatible, available/on shift, and free of another called or in-service ticket. The transaction locks the called ticket and target operational record, transfers actual assignment and lifecycle ownership without changing customer request snapshots or ticket state, and updates both operational states. The worker screen loads valid candidates, requires native confirmation before reassignment, and reports success plus stale-state, eligibility, and concurrent-capacity conflict feedback. Existing `llamado` transition behavior is untouched, so no additional called-ticket push is emitted. Focused migration assertions cover authorization, lifecycle guard, compatibility, locking/conflict semantics, and source/destination operational state transfer. Verification: `npx vitest run` passed (16 test files, 92 tests); `npm --workspace turnify-mobile run typecheck` passed; `git diff --check` passed. Runtime walkthrough: N/A because no emulator, local Supabase database, or approved remote environment was used. Rollback boundary: revert `0015_worker_barber_reassignment.sql`, the reassignment additions in `worker-barber-api.ts`, `worker.tsx`, `worker-barber-operations.test.ts`, and this entry together; prior worker call/start/finish/absence flow, customer assignment truth, existing `llamado` push behavior, and all earlier migrations remain intact. Administrator UI remains deferred under TV2-ADMIN-07.
- 2026-10-02: The user explicitly requested full Stitch-derived implementation for Customer and Worker, not only a shared color theme. The delivery plan now adds role-specific navigation shells plus screen-by-screen visual parity work. Customer and Worker designs must be reproduced with real commercial Turnify behavior; unsupported Stitch mock content must be removed or truthfully adapted. Administrator remains deferred.
- 2026-10-02: TV2-CLIENT-08 completed in work-unit commit `feat(mobile): add customer Stitch navigation shell`. Customer routes now share a mobile-first bottom navigation with only Inicio, Mis turnos, and Perfil as real destinations, while discovery, QR scan, catalog/barber preference/confirmation, and the live ticket remain integrated into that shell. The app-level route guard permits customer-only routes and redirects customers away from worker, admin, configuration, and business-registration routes without changing worker or administrator features. Focused navigation tests cover allowed customer routes, blocked worker/admin routes, and root route resolution. Verification: `npx vitest run` passed (17 test files, 95 tests); `npm --workspace turnify-mobile run typecheck` passed; `git diff --check` passed. Runtime walkthrough: N/A because no emulator or connected device was available in this local environment. Rollback boundary: revert `customer-navigation.ts`, `customer-screen-container.tsx`, the customer route container and guard changes in `(app)`, `customer-navigation.test.ts`, and this entry together; customer booking, ticket lifecycle, worker operations, administrator features, and database contracts remain intact. TV2-CLIENT-09 remains responsible for per-screen Stitch visual parity, assets, responsive refinements, and expanded state/accessibility coverage.
- 2026-10-02: TV2-CLIENT-09 completed in the `feat(mobile): align customer screens with Stitch` work-unit commit. The customer landing, QR scan, discovery/catalog, service and barber selection, confirmation summary, live ticket, history, and profile now use a shared Stitch-derived mobile page rhythm: 20px canvas gutters, 16px layered cards, 52px controls, explicit radio selections, status chips, and designed loading, empty, and error states. The existing service, barber, customer profile, ticket, and lifecycle APIs remain the sole facts displayed. Verification: `npx vitest run` passed (17 test files, 95 tests); `npm --workspace turnify-mobile run typecheck` passed; `git diff --check` passed. Runtime walkthrough: N/A because no emulator or connected device was available locally. Rollback boundary: revert `apps/mobile/src/components/customer/customer-ui.tsx`, the customer screen container, the six customer route files (`index`, `scan`, `preview`, `ticket`, `history`, and `profile`), and this entry together; worker/admin routes, queue lifecycle, database contracts, and the unrelated unstaged `apps/mobile/expo-env.d.ts` remain intact. Design deviations: Stitch's mock photos/illustrations were not embedded because no permitted local product assets exist; mock location, chair, price/payment collection, SMS/WhatsApp, countdown/tolerance, arrival, delay, availability counts, ratings, and reservation-date content were removed. Real reference prices remain only where the catalog supplies them.
- 2026-10-02: TV2-WORKER-10 completed in work-unit commit `feat(worker): add Stitch navigation shell`. The worker route now uses a persistent four-destination shell: En vivo, Cola, Historial, and Perfil. Live operations retain the existing worker-owned availability, call, start, finish, absent, and reassignment workflow. Cola reads only `mi_cola_barbero` compatible tickets and calls through the existing ownership-safe RPC. Historial intentionally renders an explicit unavailable state because the current worker RPC does not expose historic assignment-safe records; it does not invent metrics or historical clients. Perfil presents only authenticated account facts and sign-out. The app guard now permits these routes only to `personal`; customer and administrator access is redirected to their existing role landings. Verification: `npx vitest run` passed (17 test files, 96 tests); `npm --workspace turnify-mobile run typecheck` passed; `git diff --check` passed. Runtime walkthrough: N/A because no emulator or connected device was available locally. Rollback boundary: revert the worker navigation module, worker shell, three worker destination routes, worker route-guard changes, worker live-shell integration, navigation tests, and this entry together; worker lifecycle RPCs, ownership protections, reassignment behavior, customer routes, and the unrelated unstaged `apps/mobile/expo-env.d.ts` remain intact. TV2-WORKER-11 remains responsible for detailed Stitch layouts, visual states, accessibility refinements, and any history presentation supported by a future assignment-safe API.
- 2026-10-02: TV2-WORKER-11 completed in work-unit commit `feat(worker): align worker screens with Stitch` (commit hash recorded in the delivery response). Worker live operations, compatible queue, unavailable history, and profile now share the approved mobile rhythm: 16px compact gutters, 20px vertical sections, bordered 16px cards, prominent ticket codes, status hierarchy, 48px+ controls, responsive 640px content clamp, tactile pressed states, and accessible loading, error, empty, and success feedback. Availability, call, start, finish, absence, and reassignment continue to call the existing worker-owned APIs without changing ownership checks, lifecycle guards, reassignment limits, or `llamado` push behavior. Verification: `npx vitest run` passed (17 test files, 96 tests); `npm --workspace turnify-mobile run typecheck` passed; `git diff --check` passed. Runtime walkthrough: N/A because no emulator or connected device was available locally; device acceptance remains TV2-VISUAL-12. Rollback boundary: revert `apps/mobile/src/app/(app)/worker.tsx`, `worker-queue.tsx`, `worker-history.tsx`, `worker-profile.tsx`, `apps/mobile/src/components/worker/worker-screen-container.tsx`, and this entry together; worker RPCs, queue lifecycle, route guards, customer/admin routes, and the unrelated unstaged `apps/mobile/expo-env.d.ts` remain intact. Design deviations: no approved local visual assets were available; the Stitch walk-in-client creation screen is omitted because the worker API only exposes compatible queue operations; worker history remains explicitly unavailable because no assignment-safe historical records exist; mock metrics, wait times, schedules, customer details, payments, and messaging are not rendered.

## Engram Mirror

- Topic: `odd/turnify-barber-v2/tasks`.
- Status: pending. The attempted full-document mirror with `capture_prompt: false` could not be saved because Engram session registration was unavailable; retry it before starting implementation.

## Next Step

Implement **TV2-WORKER-11** next. Complete **TV2-VISUAL-12**, **TV2-CLIENT-04**, and **TV2-WORKER-06** when a device/emulator and authorized Supabase runtime are available. Administrator remains deferred.
