# turnify-tiempo-coordinado-y-nuevo-ticket — Sync +2 en worker y volver permite otro ticket

## Objective
1. Cuando el cliente presiona "Llego en 2 minutos", el tiempo de Josue se actualiza coordinado (aunque falle el realtime).
2. "Volver al inicio" del "Gracias por visitarnos" deja sacar un ticket nuevo (mismo u otro local).

## Problem
1. El countdown del worker depende del `refresh` por realtime; si el evento no llega (fondo, micro-corte), la deadline extendida no entra y el worker sigue con el tiempo viejo.
2. `CompletedGuestTicket` (finalizado) manda `onReturn={returnHome}` → `/(app)` sin cerrar la sesión de invitado: si el acceso persiste, `/` muestra "turno activo" y no deja sacar otro.

## Why
Pedido explícito del usuario el 2026-10-09 (dos frentes juntos).

## Scope
- `apps/mobile/src/app/(app)/worker.tsx` + `worker-queue.tsx`: poll de `refresh()` cada 10 s solo mientras haya ticket en `llamado` (mismo patrón que el invitado con `GUEST_TICKET_POLL_MS`).
- `apps/mobile/src/app/(public)/ticket.tsx`: completado usa `onReturn={startNewTicket}` (cierra sesión + `/`).
- Tests: `it` en `called-ticket-customer-response.test.ts` + `worker-live-operations.test.ts`.
- Sin cambios de servidor (0029 ya sirve el efectivo en ambos lados).

## Tasks
- [x] T1 — Tests en RED (poll coordinado en ambas pantallas worker; volver cierra sesión).
- [x] T2 — Implementar + GREEN y suite sin regresiones nuevas.

## Authorized scope
Pedido explícito. Ruta inline (subagentes no disponibles). Solo código local, nada remoto.

## Acceptance
- Cliente llega_en_2_min → tiempo de Josue salta +2 en ≤10 s aun sin realtime.
- Finalizado → "Volver al inicio" → `/` listo para escanear otro código (mismo u otro local).

## Progress
- 2026-10-09: T1–T2 completadas. RED→GREEN; full 204/209, mismos 5 preexistentes. En el camino se detectó y reparó corrupción de tildes en el test (a nivel bytes). Sin commit, nada remoto.
