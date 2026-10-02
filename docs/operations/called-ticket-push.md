# Called-ticket Android push runbook

This runbook covers the called-ticket push path, its configuration boundaries,
recovery signals, and incident history. Required Phase 5 device validation has
been verified on an Android development build; the one optional follow-up is
recorded below. This is a maintenance reference, not
authorization for future deployments, secret changes, provider requests, or
device validation.

## Quick path

1. Verify the configuration checklist and the required migrations.
2. Obtain explicit authorization for every remote destination, operation, and
   credential/session.
3. Configure the server boundary, deploy only the scoped dispatcher, and apply
   the dedicated-token schedule within that authorization.
4. Build Android, register an authenticated customer device, then call that
   customer's ticket and inspect the safe checkpoints below.
5. Record only aggregate results and codes; never record credentials, tokens,
   personal data, or raw request bodies.

## What Turnify sends

Turnify sends one informational push for an eligible customer ticket that
transitions from `en_espera` or `notificado` to `llamado`. The notification has
Spanish display text and this server-owned navigation payload:

```json
{
  "type": "turnify.ticket-called",
  "ticketId": "UUID",
  "queueId": "UUID"
}
```

The client validates the type and both UUIDs before navigating; title and body
are display-only. This is not a delivery, attendance, or no-show signal.
`aviso_posiciones` ("notify every N positions") is business configuration for
position notices and does **not** enable, disable, delay, or filter a
called-ticket push.

## Lifecycle path

| Step | Local implementation | Safe checkpoint |
|---|---|---|
| Authenticated customer registration | The customer-only mobile lifecycle waits for an authenticated customer profile, prepares Android notifications, requests permission, obtains an Expo token, then calls `registrar_dispositivo`. | Development builds emit one token-free registration code; success is `registration_completed`. |
| Device row | Migration `0008_device_token_registration.sql` deduplicates the provider token and stores the current customer device through an owner-derived RPC. | A registered device exists without exposing its token to the client or operator record. |
| Called-ticket outbox | `llamar_siguiente` transitions an eligible ticket to `llamado`; migration `0009_called_ticket_delivery.sql` creates one `ticket_llamado` outbox item and one delivery per registered device. | The only enqueue trigger is the eligible transition; recipient uniqueness prevents duplicates. |
| Minute scheduler | Migration `0011_dispatch_ticket_calls_cron_token.sql` invokes the dispatcher every minute through `pg_cron` and `pg_net` using a dedicated Vault token. | The schedule calls the private Edge Function without using a service-role key as its caller credential. |
| Edge Function | `dispatch-ticket-calls` validates the internal token, claims `pendiente` deliveries, and sends each claimed delivery to Expo. | A retry cannot claim the same delivery twice; untrusted callers stop before outbox access. |
| Expo to Android | Expo accepts the provider request and routes it through FCM to the Android development/production build. | An Expo HTTP success is insufficient: the ticket receipt must have `status: "ok"`. |

Only a customer ticket that changes from `en_espera` or `notificado` to
`llamado` is eligible. Proximity, no-show warning, cancellation, completion,
unchanged status updates, and tickets without a customer do not enqueue a push.

## Verified outcome

After the final deployment of the function-scoped gateway repair, a newly
created customer ticket was called and its remote notification reached an
Android development build in the background. The confirmed chain was:

1. Authenticated customer registration completed and an Android device record
   existed.
2. The dedicated scheduler token and function-scoped gateway configuration
   allowed scheduler-to-function execution.
3. Expo/FCM delivered the called-ticket notification to the Android build.

This evidence also confirms foreground presentation and background
notification-tap navigation to the correct ticket detail. At the configured
proximity threshold, a `notificado` ticket produced no push. A disposable
called ticket automatically transitioned to `ausente` after the configured
no-show grace period, confirming the unchanged `marcar_ausentes` cron path.
Cold-start navigation was not tested. The `notificado` result is limited to
that state and does not claim every excluded event was physically tested.
No identifiers, tokens, credentials, or raw provider data are recorded.

## Authorization and rollout gates

| Gate | Required before proceeding | Current status |
|---|---|---|
| Local source review | Review migrations `0008` and `0009`, the Edge Function, and mobile lifecycle source. | Completed locally. |
| Remote database and function work | Explicit authorization naming the Supabase project, deployment or migration operation, and approved credential/session. | Completed for the validated deployment; future remote changes need separate authorization. |
| Server-secret configuration | Explicit authorization for the secret-store destination, mutation, and credential/session. | Configuration supported the validated path; values are not recorded. Future changes need separate authorization. |
| Scheduled invocation | Explicit authorization to apply migration `0011`, enable `pg_net`, and configure the named Vault entries. | Dedicated-token scheduler-to-function execution was confirmed in the validated path. |
| Android development build | Explicit authorization naming the Expo/EAS destination, build/configuration operation, and credential/session. | Completed; an Android development build was used for the confirmed receipt. |
| Physical-device walkthrough | A deployed path and Android development build. | F5-T05 is complete: foreground/background receipt, background notification-tap routing, `notificado` non-delivery, and no-show enforcement were confirmed. Cold-start routing remains optional and untested. |

Remote work must not be inferred from local implementation approval. Do not run
dependency downloads, package installation, Expo/EAS configuration or builds,
Supabase migration/function deployment, secret changes, or provider requests
without the corresponding explicit authorization.

## Configuration checklist (names only)

Configure these categories only through an authorized provider, EAS, Firebase,
or Supabase operation. Do not place their values in this document, git, chat,
or command output.

| Category | Required setting | Purpose |
|---|---|---|
| Expo provider access | `EXPO_ACCESS_TOKEN` Edge Function secret | Lets the dispatcher submit to Expo. |
| Android FCM V1 provider credentials | Firebase service-account key uploaded to EAS | Lets Expo/EAS use the Firebase V1 provider configuration; the key JSON is never tracked. |
| Firebase Android client | Firebase app package `com.esau01s.turnify` | Must match the Android application identity. |
| Firebase client file | `apps/mobile/google-services.json`, referenced by `android.googleServicesFile` as `./google-services.json` | Native Android build input; requires a new build after change. |
| Supabase function secrets | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `EXPO_ACCESS_TOKEN`, `DISPATCH_TICKET_CALLS_CRON_TOKEN` | Server-only runtime configuration. |
| Supabase Vault | `turnify_project_url`, `turnify_dispatch_ticket_calls_cron_token` | Supplies the minute scheduler endpoint and its dedicated caller token. |
| Dispatcher authorization | Dedicated `DISPATCH_TICKET_CALLS_CRON_TOKEN` | The scheduler and function must share this token; it is not the service-role key. |
| Gateway scope | `[functions.dispatch-ticket-calls] verify_jwt = false` in [`supabase/config.toml`](../../supabase/config.toml) | Bypasses gateway JWT only for this function so its mandatory internal token validation can run. |

## Security boundaries

| Boundary | Enforced behavior |
|---|---|
| Customer token registration | Only an authenticated `cliente` can call `registrar_dispositivo` or `revocar_dispositivo`; ownership is derived from `auth.uid()`. |
| Token storage | Provider tokens are globally unique, write-only to the mobile client, and direct `dispositivos` access is revoked from browser roles. |
| Outbox access | `notificaciones_salientes` and `notificacion_entregas` are unavailable to `anon` and `authenticated`; the dispatcher uses `service_role`. |
| Dispatcher invocation | Gateway JWT verification is disabled only for `dispatch-ticket-calls`, because the dedicated cron token is not a Supabase JWT. The function still rejects every request unless its authorization header matches `DISPATCH_TICKET_CALLS_CRON_TOKEN` through a fixed-length digest comparison. This internal validation is mandatory and runs before outbox access. |
| Required server-only settings | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `EXPO_ACCESS_TOKEN`, and `DISPATCH_TICKET_CALLS_CRON_TOKEN` are read only from the Edge Function environment. `SUPABASE_SERVICE_ROLE_KEY` is used only for the function's server-side Supabase REST access. |
| Scheduled invoker | `pg_cron` calls the function once per minute through `pg_net`. Migration `0011` reads only `turnify_project_url` and `turnify_dispatch_ticket_calls_cron_token` from Supabase Vault; neither value is in source or cron text. |
| Client boundary | Mobile source contains no provider credential, service-role key, concrete token, or secret configuration. |

`supabase/config.toml` scopes `verify_jwt = false` to
`[functions.dispatch-ticket-calls]`; it does not alter gateway JWT verification
for any other Edge Function. This is not public access: the function's mandatory
dedicated-token validation remains the sole invocation authorization boundary and
runs before it reads or processes the outbox.

Never place a secret or device token in source, app configuration, task records,
test fixtures, command history, issue text, or logs. When describing a remote
operation, name only the secret variable and its approved server-side store.

### Required remote configuration

Before applying migration `0011_dispatch_ticket_calls_cron_token.sql`, an
authorized Supabase operator must create these Vault entries without recording
their values in this repository:

| Vault name | Value | Purpose |
|---|---|---|
| `turnify_project_url` | Target Supabase project URL | Builds the private Edge Function endpoint. |
| `turnify_dispatch_ticket_calls_cron_token` | Dedicated random dispatcher token | Authenticates the cron request accepted by the dispatcher. |

The dedicated token must also be available to the Edge Function as
`DISPATCH_TICKET_CALLS_CRON_TOKEN`. `SUPABASE_SERVICE_ROLE_KEY` remains an
Edge Function-only secret for server-side Supabase REST access, while
`EXPO_ACCESS_TOKEN` remains the separate provider secret. Migration `0010`
was the original service-role schedule; migration `0011` overwrites that named
cron job with dedicated-token authorization. This dashboard/secret-store step
is a deployment prerequisite, not something source code can safely perform.

## End-to-end validation

Do not treat local checks, Expo Go, an HTTP response, or a notification screen
as proof of provider-to-device delivery. Use an authorized Android development
build for the following walkthrough.

1. Start with an authenticated customer, an Android development build that
   includes the notifications plugin and Firebase client file, and safe Metro
   diagnostics enabled for development.
2. Open the app and allow or inspect notification permission. Expect exactly one
   token-free code: `registration_completed` is the registration success path.
3. Confirm through approved server-side aggregate access that the customer has a
   device row. Do not copy or display a device token.
4. Have staff call the customer's next eligible ticket. Expect one outbox item
   and a delivery progressing from `pendiente` to a terminal state.
5. Check the minute dispatcher result. An accepted provider request must include
   an Expo ticket receipt with `status: "ok"` before delivery is recorded as
   delivered.
6. On the device, confirm foreground presentation and background
   notification-tap routing to the correct ticket detail. Confirm that a
   `notificado` ticket at the configured proximity threshold produces no push,
   and that a disposable called ticket becomes `ausente` after the configured
   grace period. Cold-start navigation is an optional separate walkthrough.

Expected checkpoints are limited to the deployed revision actually tested. This
repository does not claim a complete physical Android validation merely because
the code and configuration are present.

## Troubleshooting decision table

| Observable state or code | Meaning | Safe next action |
|---|---|---|
| `registration_completed` | Permission, token acquisition, and customer-scoped registration completed. | Continue with the ticket-call and outbox checks. |
| `expo_token_acquisition_failed` | Expo token retrieval failed after permission/foundation preparation. | Check the development build and configured EAS identity; do not log the error payload or token. |
| `android_foundation_failed` | Android channel/foundation preparation failed. | Rebuild if native notification configuration changed; otherwise investigate the build/runtime without exposing diagnostics beyond the stable code. |
| `permission_denied` | The customer did not grant notifications. | Keep the app usable; guide the customer through device settings. |
| No device / `sin_destinatarios` | No registered recipient existed when the ticket was called. | Return to authenticated registration and confirm the device row through approved aggregate access. |
| `pendiente` delivery | The outbox has not yet been claimed. | Check the minute scheduler and authorized dispatcher deployment/configuration. |
| HTTP `401` from scheduler path | Authorization failed before or in the dispatcher. | Verify the dedicated-token contract and the function's scoped gateway setting; never substitute the service-role key or disclose either token. |
| Expo ticket `status: "ok"` | Expo semantically accepted the notification. | Record provider acceptance; device delivery still needs the physical walkthrough. |
| Expo ticket `status: "error"`, malformed response, or missing ticket | Provider response is not an accepted delivery. | Keep the delivery indeterminate and investigate with approved server-side access; do not auto-retry uncertain sends. |

## Incident history and corrections

| Observed failure | Correction and lasting lesson |
|---|---|
| Metro could not resolve an `expo-notifications` module in the local development setup. | The lockfile-compatible package extraction was incomplete; `npm ci` repaired it without changing the dependency version. Treat this as a local install integrity issue, not an Android or FCM configuration fix. |
| The dispatcher marked any HTTP-successful Expo response as delivered. | It now validates the response schema and requires the first Expo receipt to report `status: "ok"`; semantic errors and malformed responses become indeterminate. |
| Android token registration raced notification channel/foundation setup. | Registration now awaits the idempotent Android foundation before permission and Expo token acquisition. |
| Registration failures were intentionally quiet but opaque. | Development builds emit one stable, token-free diagnostic code per attempt. These diagnostics are development-only and must not be treated as production telemetry or a place for user data. |
| Called-ticket deliveries became `sin_destinatarios`. | The condition means no device was registered for the customer at call time; recover registration before debugging the provider path. |
| Android FCM client configuration was absent. | The Firebase Android app/package and trackable `google-services.json` reference were added; a new Android development build is required because this is native configuration. |
| The minute scheduler returned `401` after the service-role credential changed independently. | The scheduler now uses a dedicated dispatcher token, while `SUPABASE_SERVICE_ROLE_KEY` is limited to server-side data access. |
| The gateway returned `401` before internal cron-token validation. | JWT bypass is scoped to `dispatch-ticket-calls` only, allowing the function to validate its mandatory dedicated internal token before it reads the outbox. |

## Validation checklist

### Before remote rollout

- [ ] Confirm local checks for the reviewed revision: mobile typecheck, Vitest,
  Expo Doctor, `git diff --check`, and a focused credential/token scan.
- [ ] Confirm migrations `0008_device_token_registration.sql` and
  `0009_called_ticket_delivery.sql` and
   `0010_dispatch_ticket_calls_schedule.sql`, and
   `0011_dispatch_ticket_calls_cron_token.sql` are approved for the target database.
- [ ] Confirm an explicit remote authorization exists for each planned action.
- [ ] Confirm server-only secret values are available to the approved operator
  without revealing them in the repository or validation record.
- [ ] Confirm the two named Vault entries exist, `pg_net` is available, and the
  dedicated-token cron invocation is approved.
- [ ] Confirm `supabase/config.toml` scopes `verify_jwt = false` only to
  `dispatch-ticket-calls`; do not add a global function setting or disable JWT
  verification for another function.

### Physical Android development-build walkthrough (F5-T05)

- [x] Use an Android development build, not Expo Go, with an authenticated
  customer and a registered device token.
- [x] Have staff call a newly created customer's ticket and verify remote push
  receipt.
- [x] Verify background receipt.
- [x] Confirm foreground presentation.
- [x] Verify background notification-tap navigation to the correct ticket detail.
- [x] Confirm that `notificado` at the configured proximity threshold produces no push.
- [x] Confirm `marcar_ausentes` automatically transitions a disposable called ticket to `ausente` after the configured grace period.
- [ ] Optional, non-blocking: confirm cold-start navigation to the ticket destination. This has not been tested.
- [x] Record pass/fail results without device tokens, personal data, secrets, or raw server logs.

## Observability and safe failure handling

The dispatcher emits one structured batch event,
`called_ticket_delivery_batch`, with aggregate `delivered` and
`indeterminate` counts only. It must not log provider tokens, authorization
headers, provider bodies, or secret values.

| Condition | Stored state or client behavior | Operator response |
|---|---|---|
| No registered device | Notification becomes `sin_destinatarios`. | Investigate only aggregate delivery state; do not expose token data. |
| Provider rejects or outcome is uncertain | Delivery and notification become `indeterminada`. | Investigate through approved server-side access. Do not automatically retry, because the provider may have delivered the alert. |
| Dispatcher cannot claim a delivery | It is skipped by that invocation. | Investigate the pending queue through approved operational access. |
| Permission, token, or registration fails on mobile | The lifecycle quietly leaves notification registration unavailable. | The app continues; guide the customer through approved device troubleshooting. |
| Invalid notification navigation payload | Mobile routing ignores it. | Do not navigate based on notification title or body. |

The at-most-once policy deliberately favors avoiding duplicate alerts over
automatic recovery from uncertain provider outcomes. Any manual remediation
procedure requires a separately authorized operational decision.

## No-show preservation

`marcar_ausentes` remains the sole authority for automatic absence. This push
path does not change its cron schedule, grace rules, enforcement path, or
ticket-state semantics. A push is informational only: absence must never depend
on receipt, permission, delivery, or a mobile timer. Physical validation
confirmed that a disposable called ticket automatically became `ausente` after
the configured grace period; no push-path change was involved.

## Development builds and production behavior

Android development builds are required to exercise the native notifications
plugin and Firebase client configuration; Expo Go is not equivalent evidence.
The token-free registration diagnostics are deliberately development-only.
Production behavior keeps registration failures quiet so notifications never
block the app, while server-side aggregate observability remains the recovery
surface. A JavaScript-only registration repair can be reloaded in an existing
development build that already contains the native plugin; a change to the
notifications plugin, Firebase client file, or other native input requires a
new Android build.

## Known limitations

- The validated deployment confirmed remote called-ticket delivery,
  foreground/background receipt, and background notification-tap navigation to
  the correct ticket detail. It also confirmed no push for `notificado` at the
  configured proximity threshold and automatic no-show enforcement after the
  configured grace period. Cold-start navigation is the only optional,
  non-blocking follow-up and was not tested.
- The deployed server payload contains the strict trusted route (`type`, UUID
  `ticketId`, UUID `queueId`).
- The dispatcher processes up to 50 pending deliveries per invocation; its
  scheduler-to-function path was confirmed during the validated delivery.
- `indeterminada` deliveries are intentionally not automatically retried.
- Local tests assert source-level contracts; they do not prove a deployed
  database, deployed function, Expo provider delivery, Android permission flow,
  foreground/background behavior, or cold-start behavior.

## Local evidence

F5-T02 local checks recorded: mobile typecheck passed; Vitest passed (7 files,
59 tests); Expo Doctor passed (21/21 checks). F5-T03 recorded: typecheck
passed; Vitest passed (8 files, 62 tests); Expo Doctor passed (21/21 checks).
F5-T04 recorded: typecheck passed; Vitest passed (9 files, 64 tests); Expo
Doctor passed (21/21 checks). Each recorded work unit also passed `git diff
--check` and a focused source inspection for provider credentials and concrete
device tokens. The bounded local correction recorded here passed
`npm --workspace turnify-mobile run typecheck`; `npx vitest run` (9 files, 66
tests); and `npm --workspace turnify-mobile exec expo-doctor` (21/21 checks).
`git diff --check` passed. A focused scan of the changed tracked files found no
concrete credential, device token, or user-data payload leak.

## Ownership

The approved operator owns server deployment, server-secret configuration,
service-role scheduling, and production-like validation. The mobile team owns
customer-facing lifecycle behavior. The queue/no-show owner retains authority
over `marcar_ausentes`; push delivery must not alter that boundary.
