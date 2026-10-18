# Turnify — Role capabilities and admin/worker context

## Objective

Keep the existing mutually exclusive admin/worker roles, but make their mobile/web routing explicit and safe. Keep advanced administration on web and prepare a small owner-mobile surface only as a future separate admin experience, without duplicating the full dashboard.

## Problem

The current mobile auth model resolves one global `cliente | admin | personal` role. An admin account such as `luis@gmail.com` can authenticate through the worker entry point, but the mobile app has no admin landing surface and can redirect repeatedly. Admin and worker remain different account roles; an admin must not enter worker operations.

## Authorized scope

- Mobile authentication and route guards.
- Supabase-backed membership/capability model and compatibility migration.
- Explicit admin-only and worker-only routing.
- Small mobile owner overview only after the authorization model is stable.
- Keep advanced services, assignments, history, reports, CSV, and settings in the web panel.

## Constraints

- Preserve existing customer, worker, and web-admin behavior.
- Enforce authorization in Supabase RLS/RPCs; UI guards are not security boundaries.
- Migrate additively before removing legacy role fields.
- Do not duplicate the 23 web admin stories in mobile.
- Demo scope may stop after role/capability foundations and a minimal owner landing.

## Tasks

- [x] T1. Map current profile, membership, barber, RLS, RPC, auth-provider, and route contracts; define the additive capability contract.
- [x] T2. Add/backfill business-scoped memberships for existing admins and workers without breaking legacy reads.
- [x] T3. Make admin and worker destinations explicit in mobile and web auth state without merging their roles.
- [x] T4. Replace ambiguous role redirects with explicit owner/web and worker/mobile handling; prevent admin login loops.
- [x] T5. Add focused tests for admin-only, worker-only, unassigned worker, and customer route boundaries.
- [x] T6. Add only the minimal owner mobile overview: local status, queue summary, team state, critical alerts, QR/code, and quick metrics.
- [ ] T7. Verify migrations, RLS/RPC behavior, mobile navigation, web regression checks, and document rollout/rollback.

## Acceptance criteria

- An admin-only account never enters worker operations or loops; it receives a clear owner/web destination.
- A worker-only account reaches worker operations and cannot access owner administration.
- Admin and worker accounts remain distinct and cannot enter each other's operational surface.
- Worker memberships may span barberías, while admin ownership remains scoped by the existing admin/company contract.
- Backend authorization rejects cross-business and cross-capability access even if the UI is bypassed.
- Advanced administration remains available on web.
- Existing customer and worker flows remain green under focused tests.

## Applicable checks

- Focused mobile auth/navigation tests.
- Supabase migration and RLS/RPC tests.
- Web auth/role regression tests.
- Typecheck/build for affected workspaces.
- Manual APK scenarios for admin-only, worker-only, and combined accounts.

## Progress

- Current state: contracts mapped; additive business role membership foundation, authenticated membership RPC, and explicit mobile admin landing implemented; the full owner overview remains pending.
- Existing bounded fix: admin accounts now resolve to `/admin` instead of the worker flow or a redirect loop.
- Key discovery: existing `membresias_personal_empresa` already models worker memberships, while admin ownership still comes from `perfiles.rol`/`empresa_id`. The additive design must not overload `empresa_personal_actual_id` for admin context.
- Product decision resolved: `membresias_empresa` represents ADMIN and WORKER independently, so a future ADMIN+WORKER account can hold both rows without changing legacy role or worker-selection fields.
- Implemented foundation: migrations `0057_business_role_memberships.sql` and `0058_mis_membresias_empresa.sql`, with 20 focused Supabase tests passing.
- Implemented routing: mobile auth loads the membership RPC with legacy fallback; admin accounts have a stable `/admin` landing with optional web-panel link, while worker/customer routes remain unchanged.
- Implemented T6: `/admin` now loads a server-scoped owner overview, exposes objective queue/team/today metrics, verified business QR/code, and an RLS-backed open/close action. The worker action is shown only for active WORKER memberships and remains disabled because safe context switching is not implemented yet.
- Deferred: a dedicated native clipboard API and worker-context switching remain outside the current account contract; the prototype uses the existing QR dependency and the native share sheet, which exposes the verified code for copying.
- Verification note: focused owner/auth/mobile checks and mobile typecheck pass. The full Vitest suite currently reports 8 failures in existing contract-drift areas (called-ticket wording, ticket presentation, stale worker-admin fixture path, and worker panel copy); these are not caused by the owner overview changes and remain outside this bounded work unit.
