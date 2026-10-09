# Turnify Ticket invitado persistente — Feature Document (ODD)

## Objective

El invitado conserva su turno al cerrar y reabrir la app en el mismo celu: el
acceso se guarda cifrado en el dispositivo, se revalida al arrancar y se suelta
solo al terminar (ausente/finalizado/cancelado) o cancelar. La sección de turno
activo comunica cada estado.

## Problem

`ticketAccess` vive solo en memoria: al cerrar la app el turno se pierde aunque
siga activo en el servidor. El reclamo es explícito: mantenerlo salvo fin o
cancelación.

## Why

El usuario lo pidió como regla de producto para el flujo invitado.

## Scope

- Incluye: `guest-ticket-storage` (guardar/leer/borrar con adaptador inyectable,
  SecureStore en nativo); restore + revalidación en `GuestFlowProvider`;
  persistir en `setTicketAccess`, borrar en `endGuestTicketSession`; pulido de la
  tarjeta de turno activo en bienvenida por estado; contratos.
- No incluye: credencial opaca de recuperación del issue #17 (el secreto vive en
  keychain/keystore del dispositivo, ligado a él), multi-dispositivo, push,
  cambios de reglas de ausencia/cancelación.

## Constraints

- Rama `uwu`; UI español; código/comentarios/tests inglés.
- Nunca loguear ni exponer `capability`; clave versionada; JSON mínimo.
- Revalidar siempre contra `estado_ticket_invitado`: lo terminal o inválido se
  descarta en silencio.
- Sin bloqueo del arranque: restore asíncrono, la UI compone cuando llega.

## Decisions

- TDD: ON (Vitest). Rojo: storage + wiring ausentes.
- Delivery `ask-on-risk`; sin commit. Ruta inline.
- Supabase sin cambios (RPC existente).

## Tasks

- [x] T1 — TDD rojo: `guest-ticket-storage` + wiring en sesión.
- [x] T2 — Storage con adaptador + restore/revalidación + persist/clear.
- [x] T3 — Tarjeta de turno activo por estado en bienvenida.
- [x] T4 — vitest + tsc: storage 3/3, sesión 2/2; `tsc` limpio; suite 185/190 con
  los mismos 5 preexistentes. Prueba de cierre/apertura pendiente del usuario.

## Authorized scope

Local en rama `uwu`. Sin push, PR, secretos nuevos ni operaciones remotas.

## Acceptance criteria

- [ ] Cerrar y reabrir con turno activo → el turno sigue ahí.
- [ ] Turno terminado/cancelado → no se restaura; cancelar lo suelta.
- [ ] Contratos verdes; suite sin regresión.

## Progress

- T1–T2: storage con adaptador inyectable; sesión persiste/restaura/limpia. En el
  camino hizo falta alias `@` + stubs RN en vitest (los imports de tipo se
  borraban y nadie lo había notado) y un `useEffect` noop en el mock de react
  del test de sesión.
- T3: tarjeta con pill por estado (llamado dorado urgente) y mensajes por estado.
- T4: `tsc` limpio; suite 185/190 con los mismos 5 preexistentes. Sin commit.
