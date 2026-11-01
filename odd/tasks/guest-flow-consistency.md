# Guest flow consistency across web and mobile

## Objective and problem

Make the anonymous customer journey truthful, recoverable, and understandable across the public web and mobile app. The current web can show fabricated wait metrics, stale states, late responses and a booking form during ticket recovery. Both clients lose the rating capability on restart.

## Authorized scope

- Public guest web and mobile customer flow, corresponding RPC contract, additive Supabase migration and focused tests.
- A guest may recover a finished ticket and submit one rating within 24 hours of actual service completion; server enforces expiry.
- End with a consistent, accessible customer UX/UI pass in both clients after the lifecycle behavior is stable.
- No admin dashboard redesign, unofficial WhatsApp automation, remote deployment, migration application or push without separate authorization.

## Constraints and approach

- Keep ticket UUID and secret capability scoped to the same device; do not place the capability in a URL or expose a visible-code lookup.
- Preserve existing migrated SQL history; add a new forward-only migration after 0060.
- Standard functional testing; no project-wide TDD setting was established (the existing strict TDD note is scoped to another feature). Runner: Vitest via `npx vitest run`.
- Use delegated direct writers for multi-file work and a work-unit Conventional Commit per completed task on this feature branch. ~400 authored changed lines per task is advisory only.
- Delivery strategy: ask-on-risk; user chose `stacked-to-main` (PRs merge to main in order). Do not create or push PRs without user approval. Initial forecast: 500–900 authored changed lines overall, subject to actual diff.

## Tasks

- [x] G1: Document and test guest lifecycle/response/rating invariants, implement 24-hour server-enforced rating eligibility from `fin_en`, preserving existing guest projection fields.
- [x] G2: Web ticket restoration, request identity/order safety, accurate wait/position and effective called-deadline behavior; add behavior-driven regression checks.
- [x] G3: Mobile guest refresh and persisted active-session ordering, accurate call/queue display, and async-ordering regression checks. Finished-ticket recovery and rating expiry remain G4.
- [x] G4: Recoverable finished-ticket rating across both clients with bounded capability retention, one vote and clear expired/completed states; verify server/client boundaries.
- [x] G5: Final UX/UI pass for the customer journey in both web and app: hierarchy, instructions, waiting/called/finished/error states, responsive touch targets and accessibility; validate against the same state contract.
- [ ] G6: Full local verification, documented manual browser/device and database acceptance steps, plus honest report of any unavailable external checks.

## Acceptance criteria

- No duplicate ticket affordance while restoring an existing capability; no old response overwrites a newer state or ticket.
- No fabricated queue metrics; response actions are disabled once their effective deadline passes, while the server remains authoritative.
- A finished guest can recover on the same browser/device and rate once within 24 hours of `fin_en`; server rejects ratings after expiry and handles missing completion timestamps safely.
- Both clients present coherent states and failures without presenting unavailable actions; tests cover timing/race behavior rather than source-text presence alone.

## Verification

- `npx vitest run` and focused Vitest commands per unit.
- `npm --workspace turnify-web run typecheck`
- `npm --workspace turnify-mobile run typecheck`
- `npm --workspace turnify-web run build`
- `git diff --check`
- Manual deployed Supabase/browser and physical device checks are pending until authorized and available; no production claim from local tests.

## Progress

- Branch: `feat/guest-flow-consistency` (from `main` at `0e384c7`).
- Route: delegated direct for G1–G5: each crosses 2+ non-trivial files and source inspection is required; G6 can be delegated verification. Review candidate is each work-unit commit/PR slice, not this checklist.
- G1: migration 0061 requires capability-matched finalized ticket, valid `fin_en`, and wall time strictly before completion +24h; status RPC adds `puede_puntuar` and `puntuacion_vencimiento_en`. Focused SQL contract tests: 7/7 passed; Supabase suite: 134 passed, 1 failed in unchanged `guest-whatsapp-consent.test.ts` due to a CRLF-sensitive string expectation on unchanged migration 0060. Database runtime execution not available; production migration remains unapplied. `git diff --check` passed. Rollback boundary: migration 0061 and its rating contract tests only; migration must not be rolled back if already applied externally.
- G1 commit: `e4e53c5`; RDD assessed `medium`, `review_due=false` (`under_budget`), pending in current PR slice from `0e384c7`.
- G2: controller tests cover async request ordering and web tests 95/95 passed; web typecheck/build and `git diff --check` passed. No browser or remote DB run. Rollback boundary: web guest-session controller, public page integration and their tests. Rating persistence remains G4.
- G2 commit: `12e81fc`; accumulated committed-only RDD review against `0e384c7` was approved and acknowledged (lineage `review-089a664f33d7e9f9`). Non-blocking reliability follow-ups: React Strict Mode effect replay can dispose the web controller in development (address in G4 integration); finished-ticket capability is still cleared (address in G4). Reviewed boundary is `12e81fc`.
- G3: mobile guest request and storage ordering implemented, focused 12/12 tests passed and mobile typecheck passed. Full mobile suite: 141 passed, 8 failed in 4 unchanged legacy test files (stale source-copy assertions, absent historical admin route, ticket-presentation expectation); `git diff --check` passed. Native-device runtime remains untested. Finished-ticket persistence is deferred to G4. Rollback boundary: mobile guest request/storage/display modules, guest routes and their tests.
- G3 commit: `0e099c7`; RDD assessed `medium`, `review_due=false` (`under_budget`) from reviewed boundary `12e81fc`.
- G4: web and mobile now retain same-device capability only while server-derived rating remains eligible, discard rated/expired/cancelled/absent access, and present clear expiry; web controller survives Strict Mode effect replay. Focused worker tests: 27 files/116 tests passed; parent spot check: 5 files/28 tests passed and mobile typecheck passed. Web/mobile typechecks, web build and `git diff --check` passed in worker. Runtime DB, physical device and browser remain unverified. Rollback boundary: guest rating/session storage helpers, web/mobile public flow integration and paired tests.
- G4 commit: `ffde827`; accumulated committed-only RDD review from `12e81fc` was approved and acknowledged (lineage `review-8b8d57d1ae1e8d90`). Non-blocking follow-up for G5: ending mobile guest session during pending restore can leave `restoring` true indefinitely.
- G5: web displays real service duration/reference price, explains booking/recovery/stale states and last successful update; mobile has clearer ticket state/update guidance, safe action disabling and accessible rating targets. Fixed the reviewed pending-restore/end-session deadlock and added regression tests. Worker results: web 23 files/102 tests and focused mobile 5 files/18 tests passed; both typechecks, web build and diff check passed. Parent spot check: guest tests 20 passed and web typecheck passed. Browser/device visual inspection remains pending. Rollback boundary: guest-only web/mobile screens, styling, controller timestamp and regression tests.
- Delivery slices: first reviewed slice `e4e53c5..12e81fc` against `0e384c7`; next slice begins after `12e81fc` and includes `0e099c7` onward. No PR created or pushed.
- Next: G6. Engram mirror write pending (session registration error).
