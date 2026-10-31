# Turnify public customer web flow

## Objective

Let a customer scan a business QR code with the normal phone camera and join the queue from a responsive web page without installing the Turnify app or creating an account.

## Authorized scope

- Public `/t/:businessCode` route in `apps/web`.
- Anonymous catalog, service, barber, customer details, ticket confirmation and live ticket status.
- Reuse existing public Supabase RPC contracts; no new database migration unless the current contracts cannot support the flow.
- Keep admin routes protected and unchanged.
- No WhatsApp automation; the current manual notification consent stays a later action.

## Tasks

- [x] Add a public QR entry route outside the admin shell.
- [x] Load the live commercial catalog by business code.
- [x] Implement service/barber/details selection and guest ticket creation.
- [x] Implement active ticket polling, refresh, cancellation and terminal states.
- [x] Use honest copy when the business is closed, unavailable or the ticket request fails.
- [x] Add route and public-flow tests.

## Acceptance criteria

- Opening `/t/:code` from a normal mobile browser does not require the app.
- Invalid or unknown codes show a recoverable error.
- A valid open business can create a guest ticket through existing public RPCs.
- The customer sees position and estimated wait and can refresh/cancel when allowed.
- Admin routes continue to require authentication and admin role.
- No capability, service-role key or secret is exposed in the URL or UI.

## Route

Delegated direct writer; this is one coherent public customer work unit spanning route composition, public API adapters, UI and tests.

## Verification

- `npm --workspace turnify-web run typecheck`
- `npm --workspace turnify-web run build`
- `npx vitest run tests/web`

## Progress

- Completed in the current work unit.
- Web typecheck: passed.
- Production build: passed with the existing large JavaScript chunk warning.
- Web tests: 21 files, 84 tests passed.
- Manual browser validation against configured Supabase remains required before public deployment.
