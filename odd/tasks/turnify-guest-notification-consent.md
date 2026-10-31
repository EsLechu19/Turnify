# Turnify guest notification consent

## Objective

Capture an optional customer phone number and explicit consent for a barber-initiated WhatsApp notification when the ticket is called.

## Authorized scope

- Current mobile guest confirmation flow.
- Guest details normalization and ticket RPC payload.
- Contract tests for validation and persistence in the guest draft.
- No automatic WhatsApp sending, no unofficial automation, and no database migration until the public web guest flow is implemented.

## Tasks

- [x] Add optional phone and explicit notification consent to guest details.
- [x] Validate that consent requires a valid phone number.
- [x] Show the choice in the customer confirmation screen with honest copy.
- [x] Preserve the data through ticket creation and the guest flow draft.
- [x] Run focused mobile tests and typecheck.

## Acceptance criteria

- A customer can continue without providing a phone number or consent.
- A customer can opt into WhatsApp notifications only after entering a valid phone number.
- The UI never claims that a message was sent automatically.
- The current ticket flow and existing demographic fields remain functional.
- Existing tests remain green.

## Route

Delegated direct writer after exploration; one coherent work unit because the change crosses the detail screen, guest detail contract, RPC payload, and tests.

## Verification

- `npx vitest run tests/mobile/guest-ticket-details.test.ts tests/mobile/public-guest-flow.test.ts`
- `npm --workspace turnify-mobile run typecheck`

## Progress

- Completed in the current work unit.
- Focused tests: 14/14 passed.
- Mobile typecheck: passed.
- Backend phone persistence and the manual WhatsApp action remain separate follow-up work units.
