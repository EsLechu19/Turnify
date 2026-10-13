# turnify-perfil-global-trabajador — Global worker profile (photo, name, phone)

One place to edit the worker's photo, name, and phone, shown identically in every barbershop.

## Objective

When a worker logs in and enters Mis barberías, a global profile section lets them edit photo, name, and phone once. Name/phone were already global (`perfiles`); the photo was per-shop (`barberos.foto_url`). Now the photo is global too.

## Problem

- `worker-avatar.ts` read/wrote `barberos.foto_url` keyed by `mi_barbero_actual_id()`: a different photo per shop.
- `worker-shops.tsx` had no entry point to profile editing.
- Catalog (`catalogo_comercial`) and admin Team (`fetchStaff`) served the per-shop photo only.

## Why this approach

- Single source of truth `perfiles.foto_url`, forward-only migration: `barberos.foto_url` stays as fallback, no signature or grant removed.
- Same `actualizar_mi_foto_barbero(text)` signature, so existing clients keep working; it now writes the global photo and mirrors it into the worker's per-shop rows.
- Storage slot keyed by profile id (`auth.uid()`), with the old barbero-id slots untouched.

## Scope

| Area | Change |
|------|--------|
| `apps/mobile/src/app/(app)/worker-shops.tsx` | Dedicated Mis barberías account screen; account navigation links to `/(app)/worker-profile`; join-by-code, pending list, shop selection intact |
| `apps/mobile/src/app/(app)/worker-profile.tsx` | Caption stating photo/name/phone show identically in every shop |
| `apps/mobile/src/features/worker/worker-avatar.ts` | Read/write the global `perfiles.foto_url` (auth user id); same RPC name and bucket |
| `supabase/migrations/0042_perfil_global_foto_trabajador.sql` | `perfiles.foto_url`, worker-only write grant, perfil-scoped storage policies, redefined RPC, catalog global-with-fallback, backfill |
| `apps/web/src/data/live.ts` | `fetchStaff` resolves global photo with per-shop fallback (admin Team unbroken) |
| Tests | `tests/mobile/worker-global-profile.test.ts`, `tests/supabase/perfil-global-foto-trabajador.test.ts` |

Out of scope: applying the migration remotely (parent owns that), `TeamPage.tsx` rendering (untouched), `catalogo_comercial` consumers (passthrough unchanged).

## Acceptance

- [x] Mis barberías and Mi perfil are separate account sections; account navigation links to profile editing while code join, pending, and shop selection still work.
- [x] Avatar read/write uses the global photo; identical in every shop.
- [x] Catalog and admin Team resolve the global photo with per-shop fallback; no `catalogo_comercial` revoke.
- [x] Spanish UI; auth/tenant boundaries preserved; no secrets client-side.
- [ ] Migration `0042` applied remotely by parent and verified.

## Progress

- 2026-10-11: Tests written first, RED observed, implementation done, GREEN confirmed. No commit (sole-writer working tree; parent commits).
- 2026-10-11: Account navigation split added with a reusable worker account container; shops no longer embeds a profile card and profile no longer duplicates the full shop list.
- 2026-10-11: Split RED: focused account-navigation contract failed because the new navigation/container did not exist. GREEN: focused worker access/global-profile/intent suite passed (20 tests), and mobile typecheck is clean. The requested four-file regression command passes 3 suites/26 tests; its one failure is the pre-existing admin `staffLanding` expectation in `customer-navigation.test.ts`.
- 2026-10-11: Engram mirror attempted (`mem_save`, project `turnify`) and failed: session registration not confirmed by the Engram server. Discovery recorded only in this file.

## Evidence

RED (`npx vitest run tests/mobile/worker-global-profile.test.ts tests/supabase/perfil-global-foto-trabajador.test.ts`):
- 3 failed + 1 suite error (`ENOENT` for `0042`, missing "Mi perfil", missing "todas tus barberías", missing `from('perfiles')`).

GREEN (same command): 2 files passed, 5 tests passed.

Regression (`npx vitest run tests/web/foto-barbero.test.ts tests/supabase/foto-barbero.test.ts tests/mobile/worker-access-flow.test.ts tests/mobile/commercial-booking.test.ts`): 4 files passed, 19 tests passed.

Typecheck: `npm --workspace turnify-mobile run typecheck` clean; `npm --workspace turnify-web run typecheck` clean (web touched via `live.ts`).

## Rollback boundary

Remove/revert exactly: `0042_perfil_global_foto_trabajador.sql` (not yet applied remotely), the account navigation/container and their worker screen wiring, the shared-photo caption in `worker-profile.tsx`, `worker-avatar.ts` global read/write, `live.ts` global-photo resolution, and the focused test updates. Nothing else is touched; unrelated dirty work in the tree was left alone.

## Next step

Parent: review this work unit, apply `0042` remotely, then commit (`feat(mobile): global worker profile with shared photo` or parent's preferred message).
