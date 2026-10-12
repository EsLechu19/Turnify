# Turnify animated splash

## Objective
Implement the Stitch-inspired Turnify startup splash: mascot centered on the existing light canvas, Turnify wordmark below it, and a subtle left-to-right shine over the wordmark before the QR entry screen.

## Problem and rationale
The current native Expo splash hands off directly to the QR flow. A short branded React Native transition will make startup feel intentional while preserving the existing Turnify palette and route behavior.

## Scope
- Add a reusable mobile startup splash component.
- Gate the root navigation until the short animation completes.
- Reuse the existing `BrandMark` and theme tokens; do not add a new brand asset.
- Keep the native Expo splash configuration unchanged in this task.

## Constraints
- Preserve direct QR/public routing after the splash.
- Keep the animation short and non-blocking.
- Respect reduced-motion behavior.
- No new runtime dependency unless the implementation requires it.

## Authorized scope
- `apps/mobile/src/app/_layout.tsx`
- `apps/mobile/src/components/`
- `apps/mobile/package.json` and lockfile only if required
- `tests/mobile/` for focused coverage

## Tasks
- [x] SPLASH-1 Create the animated Turnify splash component using existing branding and a reduced-motion-safe shine.
- [x] SPLASH-2 Integrate the splash gate into the root startup flow without changing route destinations.
- [x] SPLASH-3 Run typecheck and focused mobile-flow checks; record evidence.

## Acceptance criteria
- The mascot remains centered and uses the existing Turnify mark.
- “Turnify” appears below it with existing brand colors.
- Only the wordmark receives a subtle left-to-right highlight.
- The QR/public entry remains reachable after the animation.
- Reduced-motion users receive a static equivalent.
- Typecheck and applicable tests pass, or failures are recorded honestly.

## Route and verification
- Route: delegated direct writer after startup-flow mapping.
- TDD: standard mode; no strict-TDD capability has been established for this organic task.
- Checks: `npm run typecheck` from `apps/mobile`; focused public guest-flow test if the repository test runner supports it.

## Progress
- Mapping completed; native splash is configured in `apps/mobile/app.json` and is not manually controlled.
- Completed in work unit commit `feat(mobile): add animated startup splash`.

## Verification evidence

- `npm run typecheck` from `apps/mobile`: passed (`tsc --noEmit`, exit code 0).
- Focused mobile guest-flow check: passed (`npm exec vitest run tests/mobile/public-guest-flow.test.ts`; 1 file, 9 tests, exit code 0).
- Runtime harness: `N/A` — no mobile device/emulator harness is configured in this repository; static typecheck and guest-flow contract coverage were run.
- Rollback boundary: revert the splash component, root-layout gate, and this task-document update; route destinations and native splash configuration remain unchanged.
