# Turnify manual WhatsApp notification

## Objective

Let a barber manually open WhatsApp for a guest who explicitly provided a valid phone number and opted into a notification when called.

## Authorized scope

- Persist normalized guest phone and WhatsApp consent on account-less tickets.
- Expose only the minimum notification fields to the authorized barber queue.
- Add a manual `Abrir WhatsApp` action after calling a ticket.
- Use the device's normal WhatsApp deep link; no unofficial automation and no automatic sending.
- Update mobile/web RPC adapters and contract tests.

## Tasks

- [x] Add ticket phone/consent fields and update the guest ticket RPC safely.
- [x] Add notification fields to the authorized worker queue projection.
- [x] Pass consent details from mobile and public web guest creation.
- [x] Add a manual WhatsApp deep-link action after calling.
- [x] Handle missing consent/phone honestly.
- [x] Add migration, adapter, UI and contract tests.

## Acceptance criteria

- A guest without consent can still join the queue normally.
- Consent requires a normalized international phone number.
- The phone is available only to the authorized worker queue and never to anonymous guest state.
- Pressing the action opens WhatsApp with a prefilled message but never sends automatically.
- The action is absent or disabled when consent/phone is unavailable.
- Existing six-argument RPC callers are migrated without leaving an ambiguous overload.

## Route

Delegated direct writer; this is one backend-to-worker notification work unit.

## Verification

- `npx vitest run tests/mobile tests/web tests/supabase`
- `npm --workspace turnify-mobile run typecheck`
- `npm --workspace turnify-web run typecheck`
- `git diff --check`

## Verification results

- `npx vitest run tests/mobile tests/web tests/supabase`: **FAIL** — 84 test files passed, 4 failed; 350 tests passed, 8 failed. Failures are in existing worker-panel/customer-response/ticket-presentation contracts and missing `apps/mobile/src/app/(app)/admin.tsx`; the focused feature tests passed.
- Focused feature tests (`guest-ticket-details`, `public-guest-flow`, `worker-live-operations`, `public-customer`, `guest-whatsapp-consent`): **PASS** — 5 files, 30 tests.
- `npm --workspace turnify-mobile run typecheck`: **PASS** — `tsc --noEmit`.
- `npm --workspace turnify-web run typecheck`: **PASS** — `tsc --noEmit`.
- `git diff --check`: **PASS**.
