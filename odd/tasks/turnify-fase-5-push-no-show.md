# Turnify Phase 5 — Called-Ticket Push (ODD)

## Objective

Deliver an Android development build that can receive a remote push notification when the authenticated customer's ticket transitions to `llamado`. Preserve the existing automatic no-show behavior without modification.

## Problem

The customer ticket screen reflects a `llamado` state through live updates, but a customer who has backgrounded the app has no remote alert that their ticket was called. Expo Go cannot validate production-like remote push delivery.

## Why

The notification closes the gap between queue activity and an absent customer while keeping the already-authoritative no-show automation intact.

## Scope

- Include Android development-build setup and real-device remote-push validation.
- Include authenticated device-token registration for the current customer.
- Include secure server-side delivery for exactly the `llamado` transition.
- Include mobile notification receipt, foreground/background handling, and Spanish user-facing copy when implemented.
- Keep `marcar_ausentes` as the sole authority for automatic absence.
- Exclude proximity, no-show-warning, cancellation, and completion notifications.
- Exclude changes to no-show rules, cron scheduling, or `marcar_ausentes`.

## Constraints

- An Android development build is required for real remote-push validation; Expo Go is insufficient.
- Push credentials and provider secrets remain server-side. They must never be placed in mobile code or committed to git.
- Dependency downloads from npm, Expo/EAS build or configuration activity, and Supabase Edge Function or secret deployment are remote operations. Each requires separate explicit user authorization for its destination, operation, and credential/session before execution.
- Local source and documentation work for F5-T01 through F5-T06 is authorized. This authorization excludes dependency downloads, package installation, remote operations, pushes, and PR creation.
- Existing user-facing UI remains Spanish when implementation begins; this technical record is English.

## Route and trigger evidence

| Evidence | Current route/trigger | Phase 5 implication |
|---|---|---|
| Staff call action | `apps/mobile/src/features/queue/staff-queue-api.ts` `callNextTicket` invokes the `llamar_siguiente` RPC. | This is the business transition that must cause one eligible push after a ticket becomes `llamado`. |
| Customer state | `apps/mobile/src/app/(app)/ticket.tsx` already renders the Spanish `Llamado` state from the live ticket data. | Push supplements the live screen; it does not replace it. |
| Notification seam | `src/data/repositories.ts` declares `NotificationPort.notifyTicketCalled`; `src/data/supabase/supabaseRepositories.ts` currently provides an intentionally unimplemented adapter. | Implement delivery behind a server-side boundary, not from the mobile client. |
| No-show authority | The existing `marcar_ausentes` cron enforces automatic absence. | Do not add mobile timers, push-dependent enforcement, or a second absence worker. |

## Delivery strategy

Implement in small, reviewable work units. Establish the Android development-build and configuration boundary first; then register tokens, deliver from a secure server-side trigger, handle receipt, validate on a physical device, and document the operational procedure. Do not proceed to any remote step without its explicit authorization.

## Tasks

- [x] F5-T01 — Foundation and configuration: define the Android development-build, notification configuration, environment boundaries, and secret-handling contract. Local planning only until remote build authorization is granted.
- [x] F5-T02 — Authenticated device-token registration: register, refresh, deduplicate, and revoke the current authenticated customer's device token with ownership enforcement.
- [x] F5-T03 — Secure server-side delivery: trigger one push only when a customer ticket becomes `llamado`; keep provider credentials in server secrets and add delivery observability without sensitive token leakage.
- [ ] F5-T04 — Mobile notification handling: request permission, handle foreground/background receipt and navigation, and use Spanish customer-facing text.
- [ ] F5-T05 — Real-device validation: create and use an Android development build to prove remote delivery for a called ticket; Expo Go is not acceptable evidence.
- [ ] F5-T06 — Documentation: record setup, secret boundaries, authorization gates, test evidence, failure handling, and operational ownership.

## Acceptance criteria

- [ ] A real Android development build, not Expo Go, receives a remote push for an authenticated customer's ticket after it becomes `llamado`.
- [ ] Exactly the `llamado` event is eligible for delivery; proximity, no-show warning, cancellation, and completion events do not send push notifications.
- [ ] Tokens are registered only for the authenticated owner, are not exposed in logs or UI, and can be safely refreshed or removed.
- [ ] Provider credentials and secrets exist only in approved server-side secret storage and are absent from mobile source, mobile configuration, and git history.
- [ ] The delivery path is server-side and cannot be invoked with client-supplied provider credentials.
- [ ] Foreground and background notification behavior is verified on a physical Android device, including the ticket destination where applicable.
- [ ] `marcar_ausentes` continues to be the authority for automatic absence, with no changes to its cron, rules, or enforcement path.
- [ ] Applicable local checks pass, and remote validation evidence identifies the separately authorized operation used.

## Applicable checks

- `npm --workspace turnify-mobile run typecheck`
- `npx vitest run`
- `npm --workspace turnify-mobile exec expo-doctor`
- Secret scan and diff review: no provider credential, device token, or secret committed or exposed to mobile code.
- Unit/integration coverage for token ownership, deduplication, `llamado`-only eligibility, and no duplicate delivery on retried server processing.
- Physical Android development-build walkthrough: staff calls a customer ticket; the authenticated customer receives the remote push; excluded ticket events produce no push.
- Regression verification that `marcar_ausentes` remains unchanged and continues automatic absence enforcement.

## Authorized scope

This record authorizes local source and documentation work for F5-T01 through F5-T06, including the selected Android development-build approach. It does not authorize dependency downloads from npm, package installation, Expo/EAS build or configuration activity, Supabase Edge Function or secret deployment, remote validation, pushes, or PR creation. Each remote operation still requires explicit destination, operation, and credential/session authorization before execution.

## Progress

- 2026-09-30: Task record created. Status: planned. No implementation or remote operation has started.
- 2026-09-30: F5-T01 completed locally. The mobile app config includes the `expo-notifications` plugin, and the app root initializes an idempotent notification foundation that configures the Android high-importance `ticket-updates` channel and foreground presentation behavior. No EAS project ID or Android development build was created; no permission request, device-token registration, or push delivery was implemented.
- 2026-09-30: F5-T02 completed locally. Migration `0008_device_token_registration.sql` makes provider tokens globally unique, keeps the latest registration per token, and exposes only customer-scoped `registrar_dispositivo` and `revocar_dispositivo` RPCs. Both derive the owner from `auth.uid()` and validate the caller role; direct `dispositivos` access is revoked from mobile roles while the existing RLS owner policy remains active as defence in depth. `apps/mobile/src/features/notifications/device-token-api.ts` invokes only these RPCs and never logs, returns, or configures provider tokens. Exact local checks: `npm --workspace turnify-mobile run typecheck` passed; `npx vitest run` passed (7 files, 59 tests); `npm --workspace turnify-mobile exec expo-doctor` passed (21/21 checks); `git diff --check` passed; the changed tracked files were inspected for token/secret exposure and contain no provider credential, concrete device token, or client configuration addition. Commit evidence: `feat(notifications): register authenticated device tokens` (one local F5-T02 work-unit commit; revision is recorded in local Git history).
- 2026-09-30: F5-T03 completed locally. Migration `0009_called_ticket_delivery.sql` adds a private outbox that is populated only by a customer ticket transition from `en_espera` or `notificado` to `llamado`; database uniqueness prevents a duplicate event or recipient delivery. The local Edge Function source `supabase/functions/dispatch-ticket-calls/index.ts` accepts only a service-role request, reads the provider token and service key exclusively from server environment contracts, atomically claims pending deliveries before contacting the provider, and marks uncertain outcomes `indeterminada` instead of retrying them automatically. Its observable batch log contains counts only, never device tokens, headers, or provider bodies. `marcar_ausentes`, its cron schedule, and no-show semantics are unchanged. Verification: typecheck passed; Vitest passed (8 files, 62 tests); Expo Doctor passed (21/21); `git diff --check` passed; focused inspection found no provider credential or concrete device token. Work-unit commit: `feat(notifications): add server-side called-ticket delivery` (local Git history).
- Engram mirror: pending until the project memory service accepts the Phase 5 task record at `odd/turnify-fase-5-push-no-show/tasks`.

## Next step

Remote delivery remains blocked pending separate explicit authorization for the Supabase project, Edge Function deployment, server-secret configuration (`SUPABASE_SERVICE_ROLE_KEY` and `EXPO_ACCESS_TOKEN`), and a service-role-only scheduler or invoker. No provider request, deployment, secret mutation, or device validation was performed locally. Immediately before each remote action, request separate explicit authorization for dependency downloads from npm, Expo/EAS Android development-build or configuration activity, and Supabase Edge Function or secret deployment, naming the destination, operation, and credential/session.
