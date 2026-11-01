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
- Add OAuth and recovery only through functional Supabase-backed flows; this task implements Google OAuth, with external provider setup documented but not changed remotely.
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
- T4 recovery flow in auth pages, routes, repository/context, and `tests/web/password-recovery.test.ts`
- T5 Google OAuth callback, repository/context, public callback page, and `tests/web/google-oauth.test.ts`
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
  - Functional commit: `4a6f28d4ae1177f055c3f42b768e0060d013e986` (`feat(auth): implementa la sesión recordada`), 395 authored changed lines; local boundary `codex/turnify-web-login-remember`, stacked after T2. Reviewed/acknowledged: `review-ca4a0dc9168df75c`. Rollback removes the adapter/wiring, checkbox, and T3 tests; T2 remains intact.

- [x] **T4 — Implement password recovery** — split into two dependent request/reset slices to keep each review unit cohesive.
  - Operational prerequisite: allow the deployed `/reset-password` URL in Supabase Auth Redirect URLs; do not mutate Supabase remotely.
  - [x] **T4a — Request reset email.** Added a public request form, login link, generic non-enumerating confirmation, and a same-origin fixed callback with no open redirect.
    - RED: `npx vitest run tests/web/password-recovery.test.ts tests/web/login-redesign.test.ts` — 3 recovery-request tests failed / 12 login tests passed before implementation.
    - GREEN: same command — 15 tests passed; `npm --workspace turnify-web run typecheck` passed; `npm --workspace turnify-web run build` passed with the existing >500 kB JS chunk advisory.
    - Commit/boundary: `0a8d0cc` (`feat(auth): agrega solicitud de recuperación de contraseña`), 216 authored changed lines; local slice branch `codex/turnify-web-login-recovery-request`, target `main` after T3. T4b depends on this request boundary. No remote push or PR.
    - Rollback removes only request-email UI, login link, redirect helper, and request contract; the reset-update slice depends on these shared pieces.
  - [x] **T4b — Validate recovery session and update password.** Added a recovery-event gate for `updateUser`, password/confirmation validation, and persistent in-page success/expired-link states. A new `SIGNED_IN` or `SIGNED_OUT` event clears recovery authority.
    - RED: focused recovery/login test run — 3 reset-flow tests failed / 15 request/login tests passed before implementation.
    - GREEN: `npx vitest run tests/web/password-recovery.test.ts tests/web/login-redesign.test.ts` — 18 passed; `npm --workspace turnify-web run typecheck` passed; `npm --workspace turnify-web run build` passed with the existing >500 kB JS chunk advisory.
    - TDD follow-up RED: 2 new accessibility/recovery-restore contract failures / 16 passed; GREEN after change: 19 passed. Added field-error associations, handling for provider rate-limit codes, and prevented panel-role restore from discarding a valid recovery session. Latest focused test/typecheck/build all pass with the same chunk advisory.
    - Commits: `fcfd51d` (`feat(auth): habilita el restablecimiento de contraseña`) + `525df1c` (`fix(auth): refuerza la sesión de recuperación`), 261 authored changed lines total; local final boundary `codex/turnify-web-login-recovery` will point to the documented final commit. Target `main` after T4a. Rollback removes the update page, password-update/session gate, and reset contract; T4a request flow remains available.
  - Acceptance: both slice contracts, web typecheck, and build pass. No remote Supabase change.

- [x] **T5 — Implement Google OAuth and callback handling.**
  - Wired `signInWithOAuth({ provider: 'google' })` to a fixed same-origin callback, reused the existing session restore/profile/role policy, and preserved the Remember me persistence choice.
  - Callback and post-login paths are fixed/local; arbitrary redirect parameters are not accepted. The accessible Spanish button and callback provide loading/error states; no demo was added.
  - Operational prerequisite: enable Google as a Supabase Auth provider and add the deployed app callback (for example, `https://<deployed-host>/auth/callback`) to Supabase Auth Redirect URLs. In Google OAuth, authorize the deployed app origin and the Supabase project's `/auth/v1/callback` URI shown in its provider settings. Do not mutate either external project from this task.
  - RED: `npx vitest run tests/web/google-oauth.test.ts tests/web/login-redesign.test.ts tests/web/password-recovery.test.ts` — 3 OAuth tests failed / 20 existing tests passed.
  - GREEN: same command — 23 passed; `npm --workspace turnify-web run typecheck` passed; `npm --workspace turnify-web run build` passed with the existing >500 kB JS chunk advisory.
  - Follow-up TDD: a contract for the provider-specific pending state failed 1 test / 22 passed; final GREEN returned 23 passed. This prevents a password login from displaying a false Google spinner.
  - Runtime harness: N/A — live OAuth requires external Google/Supabase credentials and redirect allowlists, which this task is explicitly not authorized to change.
  - Commit/boundary: `52a62633853f58c618c3b4780297ed703325837d` (`feat(auth): habilita el acceso con Google`), 197 authored changed lines before this task-doc follow-up; local boundary `codex/turnify-web-login-google-oauth`, target `main` after T4b. Rollback removes the Google button, repository/context method, callback route/page, helper, and OAuth contract without reverting email/password or recovery.

- [x] **T6 — Verify accessibility and responsive behavior** — completed; no reproduced product defect required a fix.
  - T5 parent verification: confirmed 23/23 focused OAuth/login/recovery tests on `dcaba86`.
  - Browser QA (parent-observed in local IAB, no screenshots retained): desktop showed the 60/40 shell and barber panel; 390×844 mobile showed the single-column layout while retaining the brand, benefits, and form hierarchy; Spanish copy and accessible labels/links/checkboxes were present.
  - Interactions observed: password visibility changed input type and dynamic accessible label in both directions; Remember me changed to unchecked; `/forgot-password` exposed an accessible email form with submit disabled while empty; `/reset-password` without recovery showed an invalid/expired-link state; `/auth/callback` without a session showed an error and return link. No OAuth was started and no form was submitted.
  - Keyboard traversal, an authenticated error alert, and live pending/loading state were not exercised interactively to avoid submitting credentials or triggering external auth. Existing login contracts cover focus-visible, reserved alert slot, busy/spinner and disabled conditions. No screenshots were captured.
  - Added an observable password-toggle state regression (not source-string-only): RED was observed because the new `passwordVisibility` module did not yet exist; after extracting the state transition and rendered input/ARIA/icon props, the test passed. A first integration-harness attempt also exposed that root Vitest aliases `@` to the mobile app; the final focused regression avoids changing global test alias behavior.
  - GREEN: `npx vitest run tests/web/login-password-toggle.test.ts tests/web/login-redesign.test.ts tests/web/google-oauth.test.ts tests/web/password-recovery.test.ts` — 4 files / 24 tests passed; `npm --workspace turnify-web run typecheck` passed; `npm --workspace turnify-web run build` passed with the existing >500 kB JS chunk advisory.
  - Runtime boundary: local browser QA only; no credentials, form submissions, OAuth, or external-service changes. Rollback removes the extracted password-visibility helper and focused regression and restores inline toggle props; no auth flow behavior changes.
  - Commit/boundary: `eb25d74673fcf24498cb2b69adecaf58f5474a27` (`test(auth): cubre el toggle accesible de contraseña`), 78 authored changed lines; branch `codex/turnify-web-login-qa` at this local T6 boundary; no push/PR. Demo remains deferred.

- [ ] **T7 — Package and publish with Sites** — in progress; local preparation only.
  - Route: delegated direct preparation; all Sites registration, source synchronization, versioning, and deployment remain parent-owned.
  - Strategy: buildless static Site containing only a copy of the verified `apps/web/dist` output; do not upload the full repository or include source maps, `.env`, credentials, or source files.
  - Build: `npm --workspace turnify-web run build` passed; Vite emitted its existing advisory for the 1.3 MB minified JS chunk.
  - Prepared isolated source: `C:\Users\esa\.codex\visualizations\2026\11\01\01a19829-9292-7952-9742-d1f6e4908455\turnify-web-login-site` — 68 dist files (64 in `dist/assets`), 4,160,055 bytes total. SHA-256 checks matched every copied dist file to the build output; `dist/index.html` is present.
  - Configuration: `.openai/hosting.json` contains only `{"static":{"directory":"dist"}}`; no `project_id` was invented. The Site package has no source maps, `.env*` files, or nested Git directory; its only configuration file is the hosting manifest, and its configuration contains no secret-like keys. Public client configuration embedded by Vite was not printed.
  - Boundary: local branch `codex/turnify-web-login-sites`; no Git remote, Sites tool, `create_site`, credential, source sync, deployment, or PR was used. Waiting for parent-owned Site registration/project ID and publication.
  - Acceptance remains pending until Sites confirms deployment and returns a live URL.

## Delivery slices — stacked-to-main

No push or PR has been created. Each PR targets `main`; PR 2 follows PR 1 after PR 1 merges.

```text
main (7d886839)
  └── PR 1: Slice A (95e0212, 371 authored changed lines) ── merge first
  └── PR 2: T1 slices B + C (265 authored changed lines) ── merge second
        └── PR 3: T2a shell (`0347a64`, 269 authored lines; branch `codex/turnify-web-login-parity-shell`) ── merge after PR 2
              └── PR 4: T2b accessible form states (`62d4e1f` + task-doc follow-up; 213+ authored lines; local branch `codex/turnify-web-login-parity`) ── merge after T2a
            └── PR 5: T4a reset request (`0a8d0cc`, 216 authored lines; local branch `codex/turnify-web-login-recovery-request`) ── merge after T2b and T3
                  └── PR 6: T4b password update (`fcfd51d` + `525df1c` + slice documentation, 261+ authored lines; local branch `codex/turnify-web-login-recovery`) ── merge after T4a
                        └── PR 7: T5 Google OAuth (`52a6263` + task-doc follow-up, 197+ authored lines; local branch `codex/turnify-web-login-google-oauth`) ── merge after T4b
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

- Current task: T7 (next).
- Completed: T1, T2a/T2b, T3, T4a/T4b, T5, and T6. Parent spot-check confirmed T4 recovery contract at 19/19. T1 prior boundary `e2b97c7`; review A acknowledged under lineage `review-9fecb982b07fbb26`.
- T2 is being reconstructed from the clean T1 baseline after authorized restoration; no equality claim against the lost draft.
- Delivery: `stacked-to-main`, no remote push or PR authorization. T4a and T4b are local commits only; no Supabase remote configuration was changed.

## Next step

T7 package is prepared locally. Await parent-owned Sites registration/project ID and publication; keep demo deferred.
