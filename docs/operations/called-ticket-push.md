# Called-ticket push operational procedure

This procedure defines the operational boundary for the Turnify called-ticket
push path. It documents the locally implemented flow and its prerequisites; it
does not authorize deployment, secret configuration, provider delivery, or
physical-device validation.

## Quick path

1. Confirm the required database migrations and mobile source are reviewed and
   locally verified.
2. Obtain separate explicit authorization for each remote destination,
   operation, and credential/session before deploying or configuring anything.
3. Configure server-only secrets, deploy the function, and arrange a
   service-role-only invoker only within that authorization.
4. Create and use an Android development build to validate a real
   `llamado` transition on a physical device.
5. Record the authorized remote operation and validation evidence without
   recording secrets, device tokens, personal data, or server logs.

## Implemented local flow

| Step | Local implementation | Operational result |
|---|---|---|
| Staff calls next ticket | `llamar_siguiente` transitions an eligible ticket to `llamado`. | This database transition is the only enqueue trigger. |
| Database outbox | Migration `0009_called_ticket_delivery.sql` creates one `ticket_llamado` notification per ticket and one delivery per registered device. | Event and recipient uniqueness prevent duplicate enqueueing. |
| Server dispatcher | `dispatch-ticket-calls` claims only `pendiente` deliveries before calling Expo. | A dispatcher retry cannot claim the same delivery twice. |
| Provider request | The dispatcher sends the Spanish title and body to Expo using a server-held access token. | The mobile client never supplies provider credentials. |
| Mobile receipt | Customer-only lifecycle requests permission, registers its token when an EAS project ID is available, and installs foreground/background listeners. | Notification failures do not block the application. |

Only a customer ticket that changes from `en_espera` or `notificado` to
`llamado` is eligible. Proximity, no-show warning, cancellation, completion,
unchanged status updates, and tickets without a customer do not enqueue a push.

## Authorization and rollout gates

| Gate | Required before proceeding | Current status |
|---|---|---|
| Local source review | Review migrations `0008` and `0009`, the Edge Function, and mobile lifecycle source. | Completed locally. |
| Remote database and function work | Explicit authorization naming the Supabase project, deployment or migration operation, and approved credential/session. | Pending; not authorized by this work unit. |
| Server-secret configuration | Explicit authorization for the secret-store destination, mutation, and credential/session. | Pending; no secrets were configured. |
| Scheduled invocation | Explicit authorization for a service-role-only scheduler or invoker. | Pending; no invoker was configured. |
| Android development build | Explicit authorization naming the Expo/EAS destination, build/configuration operation, and credential/session. | Pending; no build was created. |
| Physical-device walkthrough | A deployed path and Android development build. | F5-T05 remains pending. |

Remote work must not be inferred from local implementation approval. Do not run
dependency downloads, package installation, Expo/EAS configuration or builds,
Supabase migration/function deployment, secret changes, or provider requests
without the corresponding explicit authorization.

## Authorization and secret boundaries

| Boundary | Enforced behavior |
|---|---|
| Customer token registration | Only an authenticated `cliente` can call `registrar_dispositivo` or `revocar_dispositivo`; ownership is derived from `auth.uid()`. |
| Token storage | Provider tokens are globally unique, write-only to the mobile client, and direct `dispositivos` access is revoked from browser roles. |
| Outbox access | `notificaciones_salientes` and `notificacion_entregas` are unavailable to `anon` and `authenticated`; the dispatcher uses `service_role`. |
| Dispatcher invocation | The function rejects requests unless their authorization header equals the server service-role key. |
| Required server-only settings | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `EXPO_ACCESS_TOKEN` are read only from the Edge Function environment. |
| Client boundary | Mobile source contains no provider credential, service-role key, concrete token, or secret configuration. |

Never place a secret or device token in source, app configuration, task records,
test fixtures, command history, issue text, or logs. When describing a remote
operation, name only the secret variable and its approved server-side store.

## Validation checklist

### Before remote rollout

- [ ] Confirm local checks for the reviewed revision: mobile typecheck, Vitest,
  Expo Doctor, `git diff --check`, and a focused credential/token scan.
- [ ] Confirm migrations `0008_device_token_registration.sql` and
  `0009_called_ticket_delivery.sql` are approved for the target database.
- [ ] Confirm an explicit remote authorization exists for each planned action.
- [ ] Confirm server-only secret values are available to the approved operator
  without revealing them in the repository or validation record.
- [ ] Confirm the service-role-only scheduler/invoker design is approved.

### Physical Android development-build walkthrough (F5-T05)

- [ ] Use an Android development build, not Expo Go, with an authenticated
  customer and a registered device token.
- [ ] Have staff call that customer's next ticket and verify one visible push.
- [ ] Check foreground presentation, background receipt, and cold-start
  behavior as applicable.
- [ ] Confirm excluded events produce no push.
- [ ] Confirm the ticket screen remains authoritative through live data.
- [ ] Record pass/fail results without device tokens, personal data, secrets,
  or raw server logs.

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
on receipt, permission, delivery, or a mobile timer.

## Known limitations

- No database migration, Edge Function deployment, secret configuration,
  scheduler/invoker configuration, provider request, or remote validation has
  been performed by Phase 5 local work.
- F5-T05 physical development-build validation is pending and is not replaced
  by Expo Go or by local source checks.
- The current server payload contains only `notificationId`. Mobile navigation
  accepts a future trusted payload with `type`, UUID `ticketId`, and UUID
  `queueId`; therefore notification taps do not navigate until separately
  authorized server payload-contract work adds those fields.
- The current dispatcher processes up to 50 pending deliveries per invocation;
  an approved scheduler/invoker and its cadence have not been selected.
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

## Ownership

The approved operator owns server deployment, server-secret configuration,
service-role scheduling, and production-like validation. The mobile team owns
customer-facing lifecycle behavior. The queue/no-show owner retains authority
over `marcar_ausentes`; push delivery must not alter that boundary.
