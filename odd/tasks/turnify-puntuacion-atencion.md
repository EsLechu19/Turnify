# turnify-puntuacion-atencion — El invitado puntúa; el dashboard consume después

## Objective
El "Gracias por visitarnos" (solo `finalizado`) ofrece puntuar 1–5 estrellas; el voto queda guardado y un RPC agregado por barbero deja el contrato listo para el dashboard (Fase 6).

## Scope
- `supabase/migrations/0030_puntuacion_atencion.sql`:
  - `tickets.puntuacion smallint null check 1–5` + `puntuacion_en` (IF NOT EXISTS: idempotente ante el gap de historial)
  - `puntuar_atencion_invitado(uuid,text,smallint)`: capacidad como `responder`; solo `finalizado`; primera gana (mismo valor = no-op)
  - `estado_ticket_invitado`: suma clave `puntuacion`
  - `metricas_puntuacion()`: por barbero `{barbero_id, nombre, votos, promedio}` del local seleccionado (personal actual / admin propio); incluye barberos sin votos
  - Grants: puntuar → anon+authenticated (revoke public); métricas → authenticated
- Mobile: `GuestTicketState.puntuacion` + `rateFinishedGuestTicket` en `public-guest-ticket-api.ts`; estrellas en `CompletedGuestTicket` (solo finalizado; ya votado muestra gracias); `ticket.tsx` cablea estado + handler.
- Tests: `tests/supabase/puntuacion-atencion.test.ts` + `it` mobile.
- Aplicación en prod statement por statement vía `db query` (puntuar 1+2 grants, estado 1, métricas 1+2, alter 1).

## Rules
- Voto solo en `finalizado` (decisión del usuario); ausente sin voto.
- Sin comentario en v1 (seguimiento posible).
- UI con kit existente + labels accesibles "Puntuar N de 5".

## Tasks
- [x] T1 — Tests en RED.
- [x] T2 — Migración + mobile + GREEN y suite sin regresiones nuevas.
- [x] T3 — Aplicar en prod y verificar (columna, RPC vota una vez, métricas leen).

## Authorized scope
Decisión de producto tomada + standing en turnify-dev. Ruta inline.

## Acceptance
- Invitado finalizado vota 1–5 una vez; recarga muestra "gracias" sin revotar.
- `metricas_puntuacion` devuelve promedio/votos por barbero para Fase 6.

## Progress
- 2026-10-09: T1–T3 completadas. RED→GREEN; 8 statements aplicados en prod (verificado 4/4). Full 208/213, mismos 5 preexistentes. Credenciales limpiadas. Sin commit.
