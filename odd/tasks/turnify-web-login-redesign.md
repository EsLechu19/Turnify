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

No push or PR has been created. Each PR targets `main`; PR 2 follows PR 1 after PR 1 merges.

```text
main (7d886839)
  └── PR 1: Slice A (95e0212, 371 authored changed lines) ── merge first
        └── PR 2: Slices B + C (265 authored changed lines) ── merge second
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

- Current task: T2.
- Completed: T1, including the user-requested palette and Spanish-copy correction.
- Verification: both slices pass focused tests, web typecheck, and web build; visual/browser verification remains for T2.

## Next step

Validate the responsive layout and accessibility behavior (T2).
