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
- Review budget: 400 authored changed lines per PR; binary assets are excluded from authored line counts.

## Authorized scope

- `apps/web/src/features/auth/LoginPage.tsx`
- `apps/web/src/styles/app.css`
- `apps/web/src/styles/tokens.css` only if existing tokens are insufficient
- T3 storage wiring in `apps/web/src/data/authStorage.ts`, `apps/web/src/data/supabase.ts`, `apps/web/src/data/repositories.ts`, `apps/web/src/state/AuthContext.tsx`, and `tests/web/auth-storage.test.ts`
- `apps/web/public/` for the original barber-shop visual asset
- `tests/web/login-redesign.test.ts`
- Sites hosting metadata and workflow files required for publication
- This task document and its Engram mirror

## Tasks

- [x] **T1 — Define the login contract and implement the branded layout**
  - Route: delegated direct.
  - Trigger evidence: implementation requires coordinated changes across JSX, CSS, a visual asset, and a new test.
  - The user reopened T1 after review to correct the palette and form language; the confirmed correction is applied.
  - Initial implementation RED: `npx vitest run tests/web/login-redesign.test.ts` failed with 2 failed / 1 passed before implementation.
  - Correction RED: the updated palette/Spanish-copy contract failed with 2 failed / 3 passed before changing the implementation.
  - Preserved Supabase email/password submission, pending/error/return/configuration states, and registration access; no OAuth or recovery controls were added.
  - Acceptance: focused contract test GREEN; typecheck and build pass; registration selectors stay isolated.
  - Slice A evidence: 3 focused tests passed; typecheck passed; build passed with Vite large-chunk advisory.
  - Slice B/C evidence: 5 focused tests passed; typecheck passed; build passed with the same advisory. User-requested palette and Spanish form-copy corrections are included.
  - Commits: A `95e021277713e0b3763c2701b56ea8b84455add4`; B `d3267c0629d557115a676f867a132fa7691eec4a`.

- [ ] **T2 — Match the reference and add local form states**
  - Route: delegated direct, split into two stacked-to-main work units after one honest slice plan.
  - [x] **T2a — Build the editorial responsive shell.** Desktop 60/40 layout, brand/value panel with three benefits, compact mobile brand header, project palette aliases, and locally bundled Manrope/Inter typography.
    - RED: `npx vitest run tests/web/login-redesign.test.ts` — 3 failed / 5 passed on the shell contract.
    - GREEN: focused test 8 passed; web typecheck passed; web build passed (Vite >500 kB JS chunk advisory).
    - Commit/boundary: `0347a64` (`codex/turnify-web-login-parity-shell`), 269 authored changed lines; stacked after T1, target `main` after the prior slice. Reviewed/acknowledged: `review-b22667178057dd66`. No remote push or PR.
    - Rollback removes only T2a brand shell, aliases/fonts, and its contract. `npm audit` reported two high-severity advisories; no audit fixes were applied.
  - [x] **T2b — Add accessible form states.** Password visibility, accessible field icons and credential errors, reserved alert slot, loading spinner/disabled state/`aria-busy`, and visible keyboard focus.
    - RED: `npx vitest run tests/web/login-redesign.test.ts` — 3 failed / 8 passed on the form-state contract.
    - GREEN: focused test 11 passed; web typecheck passed; web build passed (same Vite chunk-size advisory).
    - Functional commit: `62d4e1f752f2f998b2f68f4f0e4696b560bcad8f`; 213 authored changed lines (168 additions + 45 deletions). Local T2b boundary: `codex/turnify-web-login-parity`; reviewed/acknowledged: `review-5a6eaae0deee82f1`; documentation follow-up remains in this slice.
    - Advisory: the show/hide password toggle lacks an interactive behavior test; track it for T6.
    - Rollback removes the accessible form-state behavior and its tests; T2a remains independently usable.
  - Exclusions: Google OAuth, recovery, persistent Remember me, success delay, and demo. Demo remains deferred and must not be rendered.
  - Acceptance: each slice's focused contract, web typecheck, and build pass independently; preserve auth behavior and shared registration styling.
  - Evidence: reconstruction from the clean T1 baseline; the previous uncommitted draft was lost during its authorized restoration and is not used as equality evidence.

- [x] **T3 — Implement persistent Remember me**
  - Checked by default selects `localStorage` for Supabase and panel session; unchecked selects `sessionStorage`. Mode changes migrate and remove the alternate copy; restore uses the selected store with safe legacy fallback; sign-out clears session keys in both stores.
  - RED: requested Vitest command failed 6 tests (5 storage behaviors + login checkbox contract) before implementation.
  - GREEN: 18 tests passed; web typecheck passed; web build passed with the existing >500 kB JS chunk advisory. No interactive checkbox test was added without a UI test harness; defer it to T6.
  - Boundary: commit and line count will be recorded after commit; target local boundary `codex/turnify-web-login-remember`, stacked after T2. Rollback removes the adapter/wiring, checkbox, and T3 tests; T2 remains intact.

- [ ] **T4 — Implement password recovery**
  - Route: delegated direct. Add only a functional recovery and return flow. Evidence: pending.

- [ ] **T5 — Implement Google OAuth and callback handling**
  - Route: delegated direct. Wire the provider, callback, role handling, and failure states. Evidence: pending.

- [ ] **T6 — Verify accessibility and responsive behavior**
  - Route: delegated direct verification/refinement. Verify semantics, keyboard/focus order, reduced motion, and representative mobile/tablet/desktop layouts. Evidence: pending.

- [ ] **T7 — Package and publish with Sites**
  - Route: delegated direct preparation plus parent-owned Sites calls.
  - Trigger evidence: Sites source preparation/build/package spans hosting metadata and generated output.
  - Create a new private Turnify Site, synchronize source, save a version, and deploy it.
  - Acceptance: Sites reports a successful deployment and returns the live URL.
  - Evidence: pending.

## Delivery slices — stacked-to-main

No push or PR has been created. Each PR targets `main`; PR 2 follows PR 1 after PR 1 merges.

```text
main (7d886839)
  └── PR 1: Slice A (95e0212, 371 authored changed lines) ── merge first
  └── PR 2: T1 slices B + C (265 authored changed lines) ── merge second
        └── PR 3: T2a shell (`0347a64`, 269 authored lines; branch `codex/turnify-web-login-parity-shell`) ── merge after PR 2
              └── PR 4: T2b accessible form states (`62d4e1f` + task-doc follow-up; 213+ authored lines; local branch `codex/turnify-web-login-parity`) ── merge after T2a
```

1. **PR 1 — Initial branded login, A**
   - Base/start: `main` at `7d8868390c1370018db0fb6823ae43e2e14b2d3f`.
   - End: A `95e021277713e0b3763c2701b56ea8b84455add4` on local branch `codex/turnify-web-login-layout`; target `main`; no dependency.
   - Contents: initial split composition, hero asset, login-only CSS, and initial contract tests; excludes the task document.
   - Budget: 371 changed authored lines (336 additions + 35 deletions; binary asset excluded).
   - Follow-up: merge before PR 2. Out of scope: final palette/copy correction and task-document tracking metadata.
   - Rollback boundary: remove the login-page implementation, its isolated CSS, hero asset, and contract test.

2. **PR 2 — Reference palette, Spanish form copy, and tracking, B + C**
   - Base/start: A `95e021277713e0b3763c2701b56ea8b84455add4`, after PR 1 merges to `main`.
   - B: `d3267c0`, final palette and Spanish form copy plus the task doc; C records the exact A/B SHAs and chain metadata.
   - End/target: final C on `codex/turnify-web-login-redesign`, then `main` after PR 1 merges. No additional dependencies.
   - Budget: 265 authored changed lines for B + C relative to A (212 additions + 53 deletions).
   - Follow-up: T2 responsive/accessibility verification, then T3 Sites preparation/publication. Out of scope: pushing, PR creation, and publication in this task.
   - Rollback boundary: revert B + C to restore A's original copy/palette and remove the task document; retain PR 1's layout.

## Progress

- Current task: T4.
- Completed: T1 and T2a/T2b. T1 prior boundary `e2b97c7`; review A acknowledged under lineage `review-9fecb982b07fbb26`.
- T2 is being reconstructed from the clean T1 baseline after authorized restoration; no equality claim against the lost draft.
- Delivery: `stacked-to-main`, no remote push or PR authorization.

## Next step

Implement password recovery (T4), only once the backend flow is functional.
