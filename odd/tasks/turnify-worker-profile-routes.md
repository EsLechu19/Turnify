# Separate worker profile destinations

## Objective
Keep the worker's operational profile inside the four-tab barber workspace while preserving a separate account profile destination inside the two-tab barber-selection area.

## Problem
`worker-profile` is currently rendered by `WorkerAccountContainer`, so tapping Perfil from En vivo/Cola/Historial opens the account shell with only Mis barberías and Mi perfil.

## Scope
- Make `worker-profile` the operational profile route using `WorkerScreenContainer` and its four tabs.
- Add a separate account-profile route for the two-tab account shell.
- Point account navigation to the new account-profile route while keeping operational navigation on `worker-profile`.
- Preserve the existing profile data, avatar, services, and save/logout behavior.
- Update focused navigation tests.

## Tasks
- [x] PROFILE-1 Split the profile route/container responsibilities without duplicating business logic unnecessarily.
- [x] PROFILE-2 Update account and operational navigation destinations.
- [x] PROFILE-3 Run focused worker navigation tests and typecheck.

## Acceptance criteria
- From En vivo, Cola, or Historial, Perfil opens a screen with four operational tabs: En vivo, Cola, Historial, Perfil.
- Mis barberías remains in the separate two-tab account shell.
- The account profile remains reachable from the account shell as its own route.
- Existing profile editing, avatar, services, and logout behavior remain intact.
- No customer navigation or route access regressions.

## Route and verification
- Route: delegated direct writer; implementation touches multiple non-trivial source/test files.
- Checks: focused worker navigation tests and `npm run typecheck` from `apps/mobile`.

## Progress
- Existing flow mapped; next is implementation.

## Completion evidence

- Implemented shared profile content in `apps/mobile/src/components/worker/worker-profile-content.tsx`.
- `worker-profile` now renders `WorkerScreenContainer activeNavigation="profile"`.
- Added `worker-account-profile` for the two-tab account shell and updated `accountNavigationItems`.
- Focused verification: `npx vitest run tests/mobile/worker-access-flow.test.ts tests/mobile/worker-global-profile.test.ts tests/mobile/worker-panel-design.test.ts tests/mobile/worker-avatar.test.ts tests/mobile/auth-logout.test.ts` — 5 files passed, 26 tests passed.
- Typecheck: `npm run typecheck` from `apps/mobile` — passed (`tsc --noEmit`).
- Commit: `feat(mobile): separate worker profile route shells`.
