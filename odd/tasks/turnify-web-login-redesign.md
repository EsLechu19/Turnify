# Turnify Web Login Redesign

## Objective

Redesign the existing Turnify web login to match the supplied premium barber-shop reference while preserving the current Supabase authentication behavior and publishing the result with Sites.

## Problem

The current login is visually generic and does not communicate Turnify's barber-focused value proposition. The reference establishes a stronger two-panel desktop composition, clear hierarchy, responsive mobile behavior, and explicit form states.

## Why

A focused, trustworthy login is the first product touchpoint for barbershop staff. The redesign should improve brand recognition and usability without inventing unsupported authentication features.

## Scope

- Redesign only the web login experience.
- Preserve email/password authentication, role validation, return messages, loading, errors, and registration access.
- Do not add Google OAuth or password recovery until functional backend flows exist.
- Use responsive, accessible markup and styles.
- Publish the completed result as a new private Sites project because no existing Turnify Site was found.

## Constraints

- The shared registration styles must remain unchanged in behavior and appearance.
- The login palette must use the reference colors: navy `#0D1B4C`, action blue `#2563EB`, soft background `#F7F9FC`, neutral border `#D7DEEA`, success `#16A34A`, error `#DC2626`, and accent `#E8B14C`; white and alpha variants may provide contrast.
- Form copy must be professional Spanish; visual-panel copy may remain in English.
- Strict TDD is enabled by project instructions.
- TDD runner: `npx vitest run tests/web/login-redesign.test.ts`.
- Full checks: `npx vitest run tests/web/login-redesign.test.ts`, `npm --workspace turnify-web run typecheck`, `npm --workspace turnify-web run build`.
- Delivery strategy: `stacked-to-main`.
- Forecast for the initial implementation was approximately 350 authored changed lines. The actual baseline commit is 448 changed lines including the 77-line task-document addition (371 source/test lines, binary asset excluded); it exceeds the 400-line PR budget and must be re-sliced or receive an explicit size exception before any PR is created. No exception is authorized.

## Authorized scope

- `apps/web/src/features/auth/LoginPage.tsx`
- `apps/web/src/styles/app.css`
- `apps/web/src/styles/tokens.css` only if existing tokens are insufficient
- `apps/web/public/` for the original barber-shop visual asset
- `tests/web/login-redesign.test.ts`
- Sites hosting metadata and workflow files required for publication
- This task document and its Engram mirror

## Tasks

- [x] **T1 — Define the login contract and implement the branded layout**
  - Route: delegated direct.
  - Trigger evidence: implementation requires coordinated changes across JSX, CSS, a visual asset, and a new test.
  - The user reopened T1 after review to correct the palette and form language; the confirmed correction is now applied.
  - Initial implementation RED: `npx vitest run tests/web/login-redesign.test.ts` failed with 2 failed / 1 passed before implementation.
  - Correction RED: the updated palette/Spanish-copy contract failed with 2 failed / 3 passed before changing the implementation.
  - Implemented a split desktop login using the supplied barber-shop image, compact mobile layout, and Spanish form copy. Login-only styles use the specified reference palette; shared `.auth` styles remain unchanged for registration.
  - Preserved Supabase email/password submission, pending/error/return/configuration states, and registration access; no OAuth or recovery controls were added.
  - Acceptance: focused contract test GREEN; typecheck and build pass; registration selectors stay isolated.
  - Evidence: correction contract 5 passed; `npm --workspace turnify-web run typecheck` passed; `npm --workspace turnify-web run build` passed (Vite large-chunk advisory); baseline commit `5dae003b26cad253d9a99adb6662123a2a8350cc`; correction work-unit commit recorded in the handoff.

- [ ] **T2 — Validate responsive presentation and accessibility**
  - Route: delegated direct verification/refinement.
  - Trigger evidence: browser-facing QA and build execution are delegated actions under project rules.
  - Verify form labels, focus visibility, pending/disabled state, alert semantics, and responsive behavior.
  - Acceptance: focused test, typecheck, build, and visual inspection pass; any limitation is recorded.
  - Evidence: pending.

- [ ] **T3 — Package and publish with Sites**
  - Route: delegated direct preparation plus parent-owned Sites calls.
  - Trigger evidence: Sites source preparation/build/package spans hosting metadata and generated output.
  - Create a new private Turnify Site, synchronize source, save a version, and deploy it.
  - Acceptance: Sites reports a successful deployment and returns the live URL.
  - Evidence: pending.

## Delivery slices — stacked-to-main

No branch push or PR has been created or authorized.

1. **PR 1 — Initial T1 branded login**: commit `5dae003b26cad253d9a99adb6662123a2a8350cc`, from the feature branch base to `main`; includes the layout, image asset, contract test, and initial task document. Actual baseline is 448 changed lines including the task document (binary asset excluded), so this slice is over the 400-line budget and MUST be split into cohesive PR slices or receive a maintainer-approved `size:exception` before publication.
2. **PR 2 — Palette and Spanish form-copy correction**: the new T1 correction work-unit commit on this feature branch, targeting `main` after PR 1 is merged; estimated at approximately 190 changed lines including task-document updates. This PR depends on PR 1. Its exact commit SHA is reported in the handoff.
3. **Later Site publication**: only after the local slices are reviewed and accepted; no remote operation is part of this task.

## Progress

- Current task: T2.
- Completed: T1, including the user-requested palette and Spanish-copy correction.
- Verification: focused test, web typecheck, and web build pass; visual/browser verification remains for T2.

## Next step

Validate the responsive layout and accessibility behavior (T2).
