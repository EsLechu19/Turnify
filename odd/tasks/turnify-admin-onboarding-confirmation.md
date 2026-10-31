# Turnify durable admin onboarding

## Objective

Ensure a new administrator's selected barbería survives Supabase email confirmation and is created exactly once after the first confirmed login.

## Authorized scope

- Supabase migration adding an authenticated, idempotent onboarding completion RPC.
- Web signup metadata, login restoration, and registration page integration.
- Contract tests for metadata, RPC usage, and idempotence expectations.
- No changes to customer QR flow or WhatsApp delivery.

## Tasks

- [x] Persist the intended business name in signup metadata.
- [x] Add an idempotent `completar_onboarding_empresa()` RPC.
- [x] Ensure the RPC also creates the new admin membership projection.
- [x] Complete onboarding after confirmed login and before panel authorization.
- [x] Preserve the immediate-session registration path.
- [x] Add focused tests and update the ODD task record.

Implementation evidence: work-unit changes are ready for commit after focused
verification.

## Acceptance criteria

- A signup that requires email confirmation retains the intended business name.
- The first confirmed login creates the business, default queue, admin profile and active admin membership.
- Repeating login or calling completion does not create a duplicate business.
- Existing administrators continue to log in without onboarding metadata.
- No service-role key or user-controlled identity is accepted by the RPC.

## Route

Delegated direct writer; migration and web auth changes form one transactional work unit.

## Verification

- `npx vitest run tests/web/registro-admin.test.ts tests/supabase/business-role-memberships.test.ts`
- `npm --workspace turnify-web run typecheck`
- `npx vitest run tests/web tests/supabase`

## Progress

- Completed in the current work unit.
- Focused tests: 8/8 passed.
- Full web/Supabase tests reported by the writer: 59 files, 214 tests passed.
- Web typecheck: passed.
- Migration was not applied remotely; Supabase deployment and a real
  email-confirmation test remain pending.
