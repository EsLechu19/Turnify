# turnify-mvp-cobrable-cola — Paid-ready queue-management MVP

## Objective

Deliver a deployable, paid-ready queue-management MVP for a barbershop: workers operate a truthful live queue, administrators see reliable operational data, and historical reporting remains usable as data grows. This is **not** a full barbershop ERP.

## Problem

The current product has real queue paths, but key operational contracts are split between UI assumptions, server behavior, local/fixture fallbacks, and client-side data loading. That can produce misleading worker actions, inconsistent operational dates, stale admin views, silent production demo data, incomplete walk-in records, and reports that do not scale.

## Why

Before the product can be sold as an operational queue tool, staff and owners must be able to trust that an action, day boundary, dashboard value, and history row correspond to server-backed reality.

## Scope constraints

- In scope: the worker queue, worker walk-ins, Lima operational-day rules, web dashboard and administration data freshness, Supabase configuration safety in every runtime mode, server-backed reporting/history, deployable acceptance coverage, and supporting documentation.
- The server is authoritative for permissions, queue state transitions, business scope, and operational-day calculation. UI validation may guide users but must not be the enforcement boundary.
- Keep the feature focused on queue operations and observable operational reporting. Do not expand the domain merely to make screens look complete.
- Preserve tenant isolation and do not introduce client-side secrets or privileged credentials.
- TDD mode: **STRICT TDD MODE IS ACTIVE**. Source: `user selection`. Test runner: `npx vitest run <focused test>`.

## Delivery strategy

- Strategy: `ask-on-risk`.
- Work units must be independently reviewable. Each completed task records its work-unit commit, focused verification, runtime scenario (or an explicit N/A reason), rollback boundary, and authored line count.
- If an implementation slice approaches the review budget or requires a schema/API contract decision, stop and ask before choosing a chain or exception.

## Explicitly excluded product scope

The following are future product work, not acceptance requirements for this MVP: appointments, payments/POS, receipts, inventory, CRM, staff scheduling, finance, and backups/audit-log.

## Tasks

### TMC-001 — Align the worker UI rule with server behavior

- **Outcome:** The worker UI only offers actions consistent with the current server-resolved ticket and worker state; server-side RPCs remain the final authority and errors refresh the rendered state rather than leaving a local fiction.
- **Route / trigger evidence:** Expo route `apps/mobile/src/app/(app)/worker.tsx`; focus, app-active, and Realtime triggers call `refresh()`. Its `act()` wrapper executes worker actions and refreshes afterward. `apps/mobile/src/features/queue/worker-barber-api.ts` invokes RPCs such as `mi_cola_barbero` through `runWorkerAction`.
- **Acceptance criteria:** A worker cannot complete a UI transition that the server rejects; unavailable or stale actions are disabled/hidden or clearly rejected; after success or failure, the rendered queue reconciles to the server response.
- **Relevant functional checks:** Exercise valid, stale, unauthorized, and concurrent worker actions against the same ticket; confirm the final worker screen matches the server queue and does not report a false success.

### TMC-002 — Use one business/Lima operational day for worker walk-ins

- **Outcome:** A worker-created walk-in is assigned, reported, and queried using one server-defined `America/Lima` operational-day rule, including the boundary around local midnight.
- **Route / trigger evidence:** Worker walk-in API path `apps/mobile/src/features/queue/worker-barber-api.ts` → `createMyWalkInTicket()` → RPC `crear_mi_ticket_presencial`; worker queue refresh is driven by `apps/mobile/src/app/(app)/worker.tsx` focus, app-state, and Realtime triggers.
- **Acceptance criteria:** The same Lima date is used by the write contract and the dashboard/history read contracts; no device timezone changes the assigned operational day; boundary cases are explicit and tested.
- **Relevant functional checks:** Create walk-ins immediately before and after the selected Lima day boundary from devices in different timezones; verify the ticket appears in exactly one operational-day summary and history result.

### TMC-003 — Refresh web dashboard and administration operational data reliably

- **Outcome:** Dashboard and admin data refresh on meaningful lifecycle, mutation, and live-data triggers without duplicate subscriptions or stale state.
- **Route / trigger evidence:** Web routes in `apps/web/src/app/routes.tsx`: `/` renders `DashboardPage`, `/equipo`, `/servicios`, `/historial`, and `/configuracion` are admin routes. `apps/web/src/features/dashboard/DashboardPage.tsx` currently loads operational aggregates in a one-time `useEffect`; `apps/web/src/state/QueueContext.tsx` loads queue state on provider mount.
- **Acceptance criteria:** A server-side queue, staff, configuration, or completed-ticket change becomes visible in the affected web route within the defined refresh contract; loading and error states remain distinguishable from zero operational data.
- **Relevant functional checks:** Keep dashboard and each affected admin route open while making worker-side changes; navigate away/back and reconnect; verify refreshed values, no stale overwrite, and no duplicated live updates.

### TMC-004 — Fail closed for web Supabase configuration

- **Outcome:** A web runtime with missing or invalid backend configuration shows an explicit unavailable/configuration state and never silently serves fixture data or demo authentication as operational truth.
- **Route / trigger evidence:** `apps/web/src/App.tsx` blocks before providers and routes through `isSupabaseConfigurationUnavailable()`. `apps/web/src/data/repositories.ts` routes all operational reads and authentication through Supabase only.
- **Acceptance criteria:** Configuration validation occurs before operational data is presented in development and production; missing configuration, authentication failure, and backend failure are visible and non-destructive; runtime fixtures and demo authentication do not exist.
- **Relevant functional checks:** Run development and production-mode builds with valid configuration, missing URL/key, malformed configuration, and an unreachable backend; verify that no operational route renders fixture values or accepts mock credentials in any case.

### TMC-005 — Scale reports and history with server-backed pagination and aggregation

- **Outcome:** History lists and report summaries request bounded pages and server aggregates instead of downloading an unbounded ticket history and deriving business metrics in the browser.
- **Route / trigger evidence:** `/historial` renders `HistoryPage` from `apps/web/src/app/routes.tsx`; `apps/web/src/data/repositories.ts` exposes `historyRepository.list()` and delegates configured reads to `live.fetchHistory()`. `HistoryRecord` is the web read model in `apps/web/src/data/types.ts`.
- **Acceptance criteria:** The API contract supports deterministic pagination, server-side filtering/sorting, total or cursor continuation information, and server-generated report aggregates for the requested range; the UI can render empty, loading, error, and next/previous states truthfully.
- **Relevant functional checks:** Seed or simulate a history larger than one page; traverse pages and filters, compare aggregate values with server results, and verify that page changes do not request the full history.

### TMC-006 — Make worker walk-in capture truthful and complete

- **Outcome:** The walk-in form promises only fields that the server persists, or the server contract is extended so every stated field is persisted and visible in the relevant operational read model.
- **Route / trigger evidence:** `apps/mobile/src/features/queue/worker-barber-api.ts` exposes `getWorkerWalkInOptions()` and `createMyWalkInTicket(queueId, referenceName)`, which currently sends `p_fila_id`, normal priority, and `p_nombre_ref` to `crear_mi_ticket_presencial`.
- **Acceptance criteria:** Every field labeled as captured by the worker has a defined storage, validation, authorization, and read-back contract; unsupported promises are removed; submitted data survives refresh and is shown only to roles allowed to see it.
- **Relevant functional checks:** Submit complete, blank, invalid, duplicate, and retry submissions; refresh and inspect worker/admin-allowed reads; verify that the visible data matches persisted data and that no claimed field disappears silently.

### TMC-007 — Prove deployable end-to-end acceptance and document operations

- **Outcome:** A deployable environment proves the queue flow end to end and documents setup, production configuration, operational-day behavior, refresh expectations, failure states, and recovery/rollback boundaries.
- **Route / trigger evidence:** Customer and worker flow is anchored by mobile worker route `apps/mobile/src/app/(app)/worker.tsx`; the admin surface is gated by `RequireAuth` and `RequireAdmin` in `apps/web/src/app/routes.tsx`; server delivery configuration already validates required environment in `supabase/functions/dispatch-ticket-calls/index.ts`.
- **Acceptance criteria:** An authorized environment demonstrates ticket creation/walk-in, worker action, server reconciliation, dashboard/admin refresh, paged history/reporting, and production configuration failure behavior; documentation is sufficient for another operator to deploy and verify the flow without hidden fixture assumptions.
- **Relevant functional checks:** Execute the documented end-to-end scenario in a deployable environment, record environment-safe evidence and results, then exercise one negative configuration path and one rollback/recovery path.

## Feature acceptance criteria

- The product operates as a paid-ready queue-management MVP with truthful worker, admin, and history behavior.
- Server behavior, not client assumptions, decides queue transitions, operational day, tenant scope, and persisted walk-in data.
- Web operational routes do not masquerade as live when production configuration or backend access is unavailable.
- Reports/history remain bounded and responsive through server-backed pagination and aggregation.
- The deployable flow is documented and demonstrated end to end.
- No excluded ERP capability is added as part of this feature.

## Progress

- 2026-10-10: Feature record created; all tasks are planned and unchecked. No source code, migrations, tests, configuration, commits, pushes, or remote operations were performed by this record.
- 2026-10-10: TMC-001 implementation is complete and pending the parent work-unit commit. Changed paths: `apps/mobile/src/app/(app)/worker.tsx`, `tests/mobile/worker-live-operations.test.ts`, and this feature record. No migration, server RPC, tenant-boundary, remote, or commit operation was performed.
- 2026-10-10: TMC-002 implementation is complete and pending the parent work-unit commit. Changed paths: `supabase/migrations/0041_worker_walkin_lima_operational_day.sql`, `tests/supabase/worker-walkin-lima-operational-day.test.ts`, and this feature record. The forward-only migration replaces only `crear_mi_ticket_presencial` so it derives one `America/Lima` date for the sequence lookup and inserted `fecha_operativa`; selected-shop and worker authority remain server-side. No migration was applied, and no remote operation or commit was performed.
- 2026-10-10: TMC-003 implementation is complete and pending the parent work-unit commit. Changed paths: `apps/web/src/state/QueueContext.tsx`, `apps/web/src/features/dashboard/DashboardPage.tsx`, `tests/web/dashboard-refresh.test.ts`, and this feature record. The dashboard now uses the shared operational snapshot's bounded 15-second refresh plus browser-focus trigger; in-flight stale responses are ignored, unmount clears its timer/listener, and successful snapshots refresh dashboard aggregates. No migration, remote operation, fixture/demo behavior, or commit was performed. Authored implementation/test change count: 131 lines.
- 2026-10-10: TMC-004 initially restricted repository and authentication fixtures to Vite development mode. That scope is superseded by the explicit policy that the panel uses real Supabase data and authentication in every runtime mode.
- 2026-10-10: TMC-004 correction is complete and pending the parent work-unit commit. Changed paths: `apps/web/src/App.tsx`, `apps/web/src/app/ConfigurationUnavailable.tsx`, `apps/web/src/data/supabase.ts`, `apps/web/src/data/repositories.ts`, `apps/web/src/data/types.ts`, `apps/web/src/data/labels.ts`, removed `apps/web/src/data/mocks/*`, `tests/web/production-config.test.ts`, and this feature record. All invalid Supabase configuration now blocks before providers/routes, and runtime repositories/auth no longer deliver fixtures or mock accounts. No migration, remote operation, or commit was performed.

## Verification evidence

- Planning evidence: current routes and triggers were inspected before this record was written: `apps/mobile/src/app/(app)/worker.tsx`, `apps/mobile/src/features/queue/worker-barber-api.ts`, `apps/web/src/app/routes.tsx`, `apps/web/src/features/dashboard/DashboardPage.tsx`, `apps/web/src/state/QueueContext.tsx`, `apps/web/src/data/repositories.ts`, `apps/web/src/features/settings/SettingsPage.tsx`, and `supabase/functions/dispatch-ticket-calls/index.ts`.
- Before TMC-001, no implementation verification had been run. Deploy target and production environment remain intentionally unconfirmed.
- Engram mirror status: pending. Save attempted with project `turnify`, topic key `odd/turnify-mvp-cobrable-cola/tasks`, and `capture_prompt: false`; exact failure: `gentle-engram could not confirm Engram session registration for engram_mem_save; verify that the Engram server is available and retry`.
- TMC-001 RED observed: `npx vitest run tests/mobile/worker-live-operations.test.ts` failed twice, first because the worker screen lacked the server-consistent `presente` action guard and effective-tolerance copy, then because successful feedback was not gated on a successful queue refresh.
- TMC-001 GREEN observed: `npx vitest run tests/mobile/worker-live-operations.test.ts` passed: 1 test file, 9 tests.
- TMC-001 typecheck observed: `npm --workspace turnify-mobile run typecheck` passed (`tsc --noEmit`). Runtime harness: N/A; this focused UI source-contract test has no local device harness, and no remote operation was authorized.
- TMC-001 rollback boundary: revert only the worker action/rendering changes in `apps/mobile/src/app/(app)/worker.tsx` and its focused assertions in `tests/mobile/worker-live-operations.test.ts`; no server contract or schema rollback is needed.
- TMC-001 Engram mirror attempted with project `turnify`; exact failure: `gentle-engram could not confirm Engram session registration for engram_mem_save; verify that the Engram server is available and retry`.
- TMC-002 RED observed: `npx vitest run tests/supabase/worker-walkin-lima-operational-day.test.ts` failed before the migration existed with `ENOENT` for `supabase/migrations/0041_worker_walkin_lima_operational_day.sql`.
- TMC-002 GREEN observed: `npx vitest run tests/supabase/worker-walkin-lima-operational-day.test.ts` passed: 1 test file, 3 tests. The source contract verifies server-defined `America/Lima` assignment, use of the same date for numbering and insert, `en_espera` status, absence of `current_date`, server-side selected-shop/worker authority, and the 04:59:59Z/05:00:00Z Lima-midnight boundary (`2026-01-14`/`2026-01-15`).
- TMC-002 typecheck: N/A; no TypeScript source was modified. Runtime harness: N/A; this is a migration source-contract test and no local or remote database migration was applied.
- TMC-002 rollback boundary: deploy a new forward-only migration that restores the previous function body only if rollback is required; do not rewrite or remove `0041_worker_walkin_lima_operational_day.sql` after it has been applied. The code rollback boundary is the function definition in that migration and its focused test.
- TMC-002 commit identity: pending parent work-unit commit.
- TMC-002 Engram mirror attempted with project `turnify`; exact failure: `gentle-engram could not confirm Engram session registration for engram_mem_save; verify that the Engram server is available and retry`.
- TMC-003 RED observed: `npx vitest run tests/web/dashboard-refresh.test.ts` failed: 1 test file, 3 tests failed. The focused contract test found no bounded refresh interval/focus cleanup, no error and stale-response handling, and no dashboard dependency on the shared refresh version.
- TMC-003 GREEN observed: `npx vitest run tests/web/dashboard-refresh.test.ts` passed: 1 test file, 3 tests.
- TMC-003 typecheck observed: `npm --workspace turnify-web run typecheck` passed (`tsc --noEmit`).
- TMC-003 build observed: `npm --workspace turnify-web run build` passed (`vite build`; 784 modules transformed). Vite emitted its existing chunk-size warning for a 1,115.72 kB JavaScript bundle after minification; it did not fail the build.
- TMC-003 runtime harness: N/A; this repository has no configured browser test harness, and no remote/deployed environment was authorized. The focused source-contract test verifies the refresh lifecycle wiring locally.
- TMC-003 rollback boundary: revert only `QueueContext.tsx`'s operational refresh lifecycle and state metadata, `DashboardPage.tsx`'s refresh-version aggregate effect and visible loading/error states, and `dashboard-refresh.test.ts`; no server contract, authentication boundary, migration, or fixture behavior needs rollback.
- TMC-003 commit identity: pending parent work-unit commit.
- TMC-003 Engram mirror attempted with project `turnify`; exact failure: `gentle-engram could not confirm Engram session registration for engram_mem_save; verify that the Engram server is available and retry`.
- TMC-004 RED observed: `npx vitest run tests/web/production-config.test.ts` failed: 1 test file, 3 tests failed. The focused contract test found no explicit development-only fixture mode, no URL validation, no production repository/auth rejection path, and no application-level unavailable state before providers.
- TMC-004 GREEN observed: `npx vitest run tests/web/production-config.test.ts` passed: 1 test file, 3 tests.
- TMC-004 typecheck observed: `npm --workspace turnify-web run typecheck` passed (`tsc --noEmit`).
- TMC-004 build observed: `npm --workspace turnify-web run build` passed (`vite build`; 785 modules transformed). Vite emitted its existing chunk-size warning for a 1,108.02 kB JavaScript bundle after minification; it did not fail the build.
- TMC-004 runtime harness: N/A; this repository has no configured browser test harness, and no remote/deployed environment was authorized. The focused contract test verifies production configuration gating, development-only fixture access, URL validation, and the pre-provider unavailable state locally.
- TMC-004 rollback boundary: revert only the production configuration gate in `App.tsx`, `ConfigurationUnavailable.tsx`, `supabase.ts`, and the associated repository fixture/auth selection plus `production-config.test.ts`; no schema, server contract, credential, or migration rollback is needed.
- TMC-004 commit identity: pending parent work-unit commit.
- TMC-004 Engram mirror attempted with project `turnify`; exact failure: `gentle-engram could not confirm Engram session registration for engram_mem_save; verify that the Engram server is available and retry`.
- TMC-004 correction RED observed: `npx vitest run tests/web/production-config.test.ts` failed: 1 test file, 3 tests failed. The focused contract test found the prior development demo mode, fixture imports/mock authentication in runtime repositories, and a production-only application gate.
- TMC-004 correction GREEN observed: `npx vitest run tests/web/production-config.test.ts` passed: 1 test file, 3 tests. It verifies URL validation, an all-runtime configuration gate before providers, and no runtime fixture/mock-auth repository path.
- TMC-004 correction rollback boundary: restore only the removed runtime demo-fixture/auth code and the all-runtime configuration gate in the TMC-004 paths above. No schema, server contract, credential, migration, remote, or commit operation is involved.
- Dashboard scanability RED observed: `npx vitest run tests/web/dashboard-scanability.test.ts` failed: 1 test file, 4 tests failed. The focused layout-contract test found no `OperatingVerdict`, no tiered `aria-label` ordering, no `<details>` progressive disclosure, and no verdict source file.
- Dashboard scanability GREEN observed: `npx vitest run tests/web/dashboard-scanability.test.ts tests/web/dashboard-refresh.test.ts` passed: 2 test files, 8 tests. The layout contract (Tier 1 verdict first, trends center, detail last with disclosure, state-only color, preserved refresh/truthful Spanish states) and the existing refresh lifecycle contract both hold.
- Dashboard scanability typecheck observed: `npm --workspace turnify-web run typecheck` passed (`tsc --noEmit`).
- Dashboard scanability build observed: `npm --workspace turnify-web run build` passed (`vite build`; 781 modules transformed). Vite emitted its existing chunk-size warning for a 1,107.36 kB JavaScript bundle after minification; it did not fail the build.
- Dashboard scanability runtime harness: N/A; this repository has no configured browser test harness, and no remote/deployed environment was authorized. The focused source-contract tests verify the tiered layout wiring locally.
- Dashboard global-overview RED observed: `npx vitest run tests/web/dashboard-scanability.test.ts tests/web/dashboard-refresh.test.ts tests/web/panel-profesional.test.ts tests/web/demanda-card.test.ts tests/web/resumen-dia.test.ts` failed: 5 test files, 3 tests failed of 18. The rewritten layout-contract test found no `Secciones del panel` section, the still-present `<details>` Tier 3 block, and no section links.
- Dashboard global-overview GREEN observed: same command passed: 5 test files, 18 tests. Related contracts (`dashboard-refresh`, `panel-profesional`, `demanda-card`, `resumen-dia`) stayed green throughout.
- Dashboard global-overview typecheck observed: `npm --workspace turnify-web run typecheck` passed (`tsc --noEmit`).
- Dashboard global-overview build observed: `npm --workspace turnify-web run build` passed (`vite build`; 780 modules transformed). Vite emitted its existing chunk-size warning for a 1,104.41 kB JavaScript bundle after minification; it did not fail the build.
- Dashboard global-overview runtime harness: N/A; this repository has no configured browser test harness, and no remote/deployed environment was authorized. The focused source-contract tests verify the overview layout wiring locally.
- Dashboard global-overview authored change count: tracked diff 30 insertions/28 deletions across `DashboardPage.tsx` and `dashboard-scanability.test.ts`, plus the new 84-line `SectionOverview.tsx`.

## Dashboard global-overview rework (explicit user feedback, pending parent commit)

- **Outcome:** The start dashboard is now the global overview: Tier 1 operating verdict plus decision KPIs first, Tier 2 trends center, and a new `Secciones del panel` overview last that orients, summarizes, and links into each live section. The Tier 3 `<details>/<summary>` "Detalle operativo: cola activa y equipo" disclosure is removed entirely — no expander, no duplicated queue/team detail. Queue and team live state stays visible only through the Tier 1 verdict, `StatCards`, and alerts; the team overview row adds the one live count the dashboard already owns (`disponibles de N`, with a truthful `Sin personal registrado todavía.` empty state). No data-layer change; every number stays live; 15s/focus refresh, Spanish UI, and state-only color are preserved.
- **Changed paths:** `apps/web/src/features/dashboard/DashboardPage.tsx`, new `apps/web/src/features/dashboard/components/SectionOverview.tsx`, `tests/web/dashboard-scanability.test.ts`, and this feature record. No migration, backend, fixture, remote, or commit operation was performed. `ActiveQueueCard.tsx`/`BarberStationsCard.tsx` were deliberately left untouched: `panel-profesional.test.ts` pins `ActiveQueueCard`'s `/cola` copy, and unrelated dirty work in this worktree deleted the `/cola` route, so the dashboard no longer links to that dead route.
- **Layout contract:** `Secciones del panel` links to the four live routes (`/equipo`, `/servicios`, `/historial`, `/configuracion`) with one-line orientation copy each; neither it nor the dashboard references `/cola`. Queue/operations has no dedicated web route in this worktree, so Tier 1 remains its live surface.
- **Out of scope (left untouched):** the `/cola` route removal, `ActiveQueueCard`'s dead `/cola` button copy, and all unrelated dirty work across mobile/web/supabase paths listed in `git status`.
- **Rollback boundary:** revert only `DashboardPage.tsx`'s overview section, delete `SectionOverview.tsx`, and restore `dashboard-scanability.test.ts`; no server contract, refresh lifecycle, authentication boundary, or migration rollback is needed.
- **Commit identity:** pending parent work-unit commit.
- **Engram mirror:** attempted with project `turnify`; exact failure: `gentle-engram could not confirm Engram session registration for engram_mem_save; verify that the Engram server is available and retry`.

## Next step

Parent: review and create the pending TMC-001, TMC-002, and TMC-003 work-unit commits plus the two dashboard slices (scanability redesign and this global-overview rework). Confirm the production/deploy environment before any deployable verification; use `ask-on-risk` if a contract, migration, or review-size risk appears.

## Dashboard scanability redesign (unplanned slice, pending parent commit)

- **Outcome:** The admin start dashboard (`apps/web/src/features/dashboard/DashboardPage.tsx`) now follows an inverted-pyramid layout: Tier 1 operating verdict plus decision KPIs first, Tier 2 trends center, Tier 3 operational detail last behind progressive disclosure. No data-layer semantic change; every number stays live; the 15s/focus refresh behavior and Spanish UI are preserved.
- **Changed paths:** `apps/web/src/features/dashboard/DashboardPage.tsx`, new `apps/web/src/features/dashboard/components/OperatingVerdict.tsx`, new `tests/web/dashboard-scanability.test.ts`, and this feature record. No migration, backend, fixture, remote, or commit operation was performed.
- **Layout contract:** `OperatingVerdict` renders `Estado de hoy` with `role="status"` from already-live `stats` plus `computeAlerts` output (`normal`/`requiere atención`/`acción inmediata`); its signal color uses only success/gold/danger state tokens. Tier 1 holds the verdict, `StatCards`, and `AlertsCard`; Tier 2 (`aria-label="Tendencias"`) holds hourly demand, daily summary, and ratings; Tier 3 (`aria-label="Detalle operativo"`) holds the active queue and team snapshot inside `<details>/<summary>`.
- **Out of scope (left untouched):** decorative chart colors in `apps/web/src/features/history/components/HourlyDemandCard.tsx` (owned by the history feature) and unrelated dirty work across mobile/web/supabase paths listed in `git status`.
- **Rollback boundary:** revert only `DashboardPage.tsx`'s tiered sections, delete `OperatingVerdict.tsx`, and remove `dashboard-scanability.test.ts`; no server contract, refresh lifecycle, authentication boundary, or migration rollback is needed.
- **Commit identity:** pending parent work-unit commit.
- **Engram mirror attempted with project `turnify`; exact failure:** `gentle-engram could not confirm Engram session registration for engram_mem_save; verify that the Engram server is available and retry`.

## Admin visual polish: services catalog + team roster (unplanned slice, pending parent commit)

- **Outcome:** `Servicios` catalog redesigned for a cleaner professional look with its icon-overlap defect fixed structurally; `Barberos y empleados` improved visually while keeping its exact structure and all real-data behavior (roster, availability, services assignment, invitations, avatars). Sole writer; no commit, push, remote, migration, or `history/` change was performed.
- **Overlap diagnosis (structural, not pixel-nudging):** the catalog/roster tables use automatic layout with only a global `min-width: 780px`, and the icon-bearing cells used unprotected inline flex rows (`display: flex; gap: 4`, no `flex-wrap`, no `white-space`, shrinkable buttons) plus FontAwesome svgs that render with `overflow: visible` and no `flex: none`. When long Servicio/Detalle text competes for column width, the auto-layout algorithm squeezes the Estado/Barberos/Acciones columns and the icons compress/paint over text and each other. Request/assignment split rows (`space-between`, no wrap, no `min-width: 0`) had the same squeeze risk at narrow widths.
- **Fix:** shared CSS contract in `apps/web/src/styles/app.css` — `.table__actions` is now `inline-flex` with `flex-wrap: nowrap` and `flex: none` children; `.cell--nowrap` (`white-space: nowrap; width: 1%`) pins icon columns to intrinsic width while `.table-wrap` keeps `overflow-x: auto` for narrow viewports; `.badge > svg, .btn > svg` get `flex: none`; long service names yield via `.cell--truncate` ellipsis; request/assignment rows use wrap-safe `.row-split` (text `flex: 1 1 160px; min-width: 0`, trailing controls `flex: none`). Both pages now use these classes; tables also gained `scope="col"` headers and search `aria-label`s. All copy, filters, modals, RPCs, and loading/error/empty states are unchanged.
- **Changed paths:** `apps/web/src/features/services/ServicesPage.tsx`, `apps/web/src/features/team/TeamPage.tsx`, `apps/web/src/styles/app.css` (shared, required for the overlap fix), new `tests/web/servicios-catalogo.test.ts`, new `tests/web/equipo-diseno.test.ts`, and this feature record. No migration, backend, fixture, remote, commit, or `history/` operation was performed. Other dirty work in the worktree was left untouched.
- **Kept:** real Supabase data only (`createService`/`updateService`/`removeService`, `fetchServicePerformance`, `staffRepository`, `updateStaff` + `reloadServices`, `generateWorkerInvitation`/`fetchShopWorkerRequests`/`resolveWorkerRequest`, `fotoUrl`/`initialsOf`), existing refresh/loading/error/empty behavior, Spanish UI, color-as-state-signal discipline (`success`/`neutral` status tones, `staffAvailabilityTone`).
- **Rollback boundary:** revert only the class swaps and header/label polish in `ServicesPage.tsx`/`TeamPage.tsx`, the appended no-overlap contract block in `app.css`, and the two new test files; no server contract, refresh lifecycle, authentication boundary, migration, or fixture rollback is needed.
- **Commit identity:** pending parent work-unit commit.
- **Engram mirror:** attempted with project `turnify`; exact failure: `gentle-engram could not confirm Engram session registration for engram_mem_save; verify that the Engram server is available and retry`.

## Verification evidence (admin visual polish slice)

- RED observed: `npx vitest run tests/web/servicios-catalogo.test.ts tests/web/equipo-diseno.test.ts` failed: 2 test files, 8 tests failed of 12. The 4 behavior-preservation pins passed; the 8 new no-overlap/design contract assertions failed (no `table__actions`/`cell--nowrap`/`cell--truncate`/`row-split` usage, no shared CSS contract).
- GREEN observed: same command passed: 2 test files, 12 tests.
- Regression sweep observed: `npx vitest run tests/web/` passed: 15 test files, 46 tests (neighboring `servicios-crud`, `servicios-profesional`, `equipo-real`, `invitacion-nominativa`, `foto-barbero`, `panel-profesional`, and dashboard contracts all stay green).
- Typecheck observed: `npm --workspace turnify-web run typecheck` passed (`tsc --noEmit`).
- Build observed: `npm --workspace turnify-web run build` passed (`vite build`; 780 modules transformed). Vite emitted its existing chunk-size warning for a 1,104.63 kB JavaScript bundle after minification; it did not fail the build.
- Runtime harness: N/A; this repository has no configured browser test harness, and no remote/deployed environment was authorized. The no-overlap contract is pinned structurally (nowrap/shrink-to-fit icon columns, non-shrinking icon rows, scroll container, ellipsis truncation) rather than by screenshot.
- Slice-authored size note: file-level `git diff --stat` for the two pages is mixed with prior pending slices in this worktree; this slice's own authored delta is the appended CSS contract block (+51/−1 in `app.css`), structural class swaps in both pages (~30 lines), header `scope` + search labels, and the two new test files (~190 lines).

## Admin catalog viewport containment (unplanned slice, pending parent commit)

- **Outcome:** `Servicios > Catálogo de servicios` no longer overflows horizontally past the dashboard viewport. The 8-column table (now with Satisfacción) stays contained: the scroll container absorbs overflow, grid/flex ancestors allow shrinking, long content truncates. Sole writer; no commit, push, remote, migration, or `history/` change was performed.
- **Diagnosis (structural):** `.table-wrap` had only `overflow-x: auto` with no `max-width`/`min-width` constraint, and its ancestor chain (`.shell__body` flex column, `.card` grid, `SectionCard` inner `div`) had no `min-width: 0`. Grid/flex items default to `min-width: auto`, so the card grew with the table intrinsic width (`min-width: 780px` plus 8 columns) instead of letting the scroll container absorb it.
- **Fix (shared CSS only, no page logic change):** in `apps/web/src/styles/app.css` — `.table-wrap` gains `max-width: 100%; min-width: 0` alongside the existing `overflow-x: auto`; `.card` gains `min-width: 0; max-width: 100%`; new guard `.shell__body > *, .card > * { min-width: 0; }` lets flex/grid ancestors shrink below intrinsic table width. Long content already truncates (`cell--truncate` ellipsis on Servicio, inline ellipsis on Detalle); no column, filter, modal, RPC, copy, or state was changed.
- **TeamPage decision:** `TeamPage.tsx` shares the same `.table-wrap`/`.table`/`.table__actions` pattern but its 6-column roster is narrower and its avatar cell already carries `min-width: 0`; the identical viewport-growth defect was not confirmed there. The shared CSS guard benefits it automatically. `TeamPage.tsx` left untouched per scope.
- **Changed paths:** `apps/web/src/styles/app.css` (containment guard only), `tests/web/servicios-catalogo.test.ts` (new viewport-containment contract), and this feature record. No migration, backend, fixture, remote, commit, or `history/` operation was performed. Other dirty work in the worktree was left untouched.
- **Kept:** every column, filter, modal, RPC (`createService`/`updateService`/`removeService`, `fetchServicePerformance`), Spanish copy, real-data behavior, refresh/loading/error/empty states, and color-as-state-signal discipline.
- **Rollback boundary:** revert only the containment guard block in `app.css` (`.table-wrap` max/min-width, `.card` min/max-width, `.shell__body > *, .card > *` rule) and the new `viewport containment contract` describe block in `servicios-catalogo.test.ts`; no server contract, refresh lifecycle, authentication boundary, migration, or fixture rollback is needed.
- **Commit identity:** pending parent work-unit commit.
- **Engram mirror:** attempted with project `turnify`; exact failure: `gentle-engram could not confirm Engram session registration for engram_mem_save; verify that the Engram server is available and retry`.

## Verification evidence (catalog viewport containment slice)

- RED observed: `npx vitest run tests/web/servicios-catalogo.test.ts` failed: 1 test file, 2 tests failed of 10. The new viewport-containment assertions failed (no `.table-wrap` max/min-width, no `.card` min/max-width shrink guard); the 8 pre-existing no-overlap/behavior pins passed.
- GREEN observed: same command passed: 1 test file, 10 tests.
- Regression sweep observed: `npx vitest run tests/web/` passed: 15 test files, 50 tests.
- Typecheck observed: `npm --workspace turnify-web run typecheck` passed (`tsc --noEmit`).
- Build observed: `npm --workspace turnify-web run build` passed (`vite build`; 780 modules transformed). Vite emitted its existing chunk-size warning for a 1,104.63 kB JavaScript bundle after minification; it did not fail the build.
- Runtime harness: N/A; this repository has no configured browser test harness, and no remote/deployed environment was authorized. The no-horizontal-overflow contract is pinned structurally (constrained scroll container, shrinkable grid/flex ancestors, ellipsis truncation) rather than by screenshot.
- Slice-authored size note: `git diff --stat` for the two touched tracked files shows 98 insertions/1 deletion, but that file-level stat is mixed with the prior pending no-overlap CSS block in this worktree; this slice's own authored delta is the ~12-line containment guard in `app.css` plus the ~32-line viewport-containment contract in `servicios-catalogo.test.ts`. `ServicesPage.tsx` required zero changes.
