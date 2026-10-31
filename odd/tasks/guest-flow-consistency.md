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
- Delivery strategy: ask-on-risk; do not create or push PRs without user approval. Initial forecast: 500–900 authored changed lines overall, subject to actual diff.

## Tasks

- [x] G1: Document and test guest lifecycle/response/rating invariants, implement 24-hour server-enforced rating eligibility from `fin_en`, preserving existing guest projection fields.
- [ ] G2: Web ticket restoration, request identity/order safety, accurate wait/position and effective called-deadline behavior; add behavior-driven regression checks.
- [ ] G3: Mobile guest refresh and persisted-session ordering, safe recovery of completed ticket for rating, and expiry handling; add behavior-driven regression checks.
- [ ] G4: Recoverable finished-ticket rating across both clients with bounded capability retention, one vote and clear expired/completed states; verify server/client boundaries.
- [ ] G5: Final UX/UI pass for the customer journey in both web and app: hierarchy, instructions, waiting/called/finished/error states, responsive touch targets and accessibility; validate against the same state contract.
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
- Next: G2. Engram mirror write pending (session registration error).
