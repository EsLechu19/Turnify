# turnify-liberar-silla-barridos — Los barridos liberan la silla del barbero

## Objective
Que un barbero vuelva a `disponible` cuando su turno sale de los estados activos por barrido automático (ausente por gracia vencida, cancelado por cierre del día), en vez de quedar trabado en `ocupado` sin turnos.

## Problem
`llamar_mi_siguiente` marca `barbero_operaciones.estado='ocupado'`, pero `marcar_ausentes()` y `cerrar_tickets_vencidos()` mueven tickets fuera de `llamado` sin resetear la silla. El barbero queda OCUPADO + "Sin turno asignado" en Estaciones activas y además no puede llamar al siguiente (ese RPC exige `disponible`). Caso real: Josue.
La cancelación del cliente no puede trabar sillas: `cancelar_ticket` / `cancelar_ticket_invitado` solo aceptan `en_espera`/`notificado`.

## Why
Pedido explícito del usuario el 2026-10-09: disponible cuando el cliente pasa a ausente o se cancela su ticket.

## Scope
- `supabase/migrations/0027_liberar_silla_en_barridos.sql` (nueva: repair + redefine ambos barridos con liberación)
- `tests/supabase/barbero-silla-barridos.test.ts` (nuevo: contrato por contenido, estilo del repo)
- No se tocan RPCs de flujo (llamar/iniciar/finalizar/reasignar), UI mobile ni grants (OR REPLACE los preserva).
- Sin `db push`: la migración queda local hasta autorización remota explícita.

## Tasks
- [x] T1 — Test en RED: contrato de contenido sobre `0027` (redefine ambos barridos, libera solo `ocupado` sin ticket activo, repair presente, no toca `fuera_de_turno`).
- [x] T2 — Migración `0027`: UPDATE de reparación + `marcar_ausentes` y `cerrar_tickets_vencidos` con bloque de liberación (`ocupado` sin `llamado`/`en_atencion` → `disponible`). Mismo contrato (returns integer, security definer, search_path '').
- [x] T3 — Verificación: test nuevo + tests supabase relacionados en verde; suite completa sin regresiones nuevas (5 fallos preexistentes documentados aparte).

## Authorized scope
Cambio autorizado por el usuario el 2026-10-09. Ruta: inline (runtime de subagentes no disponible en este entorno). TDD estricto del repo aplica al dominio; aquí se honra RED→GREEN con test de contrato previo a la migración.

## Acceptance
- Barbero con llamado barrido a `ausente` o cancelado por cierre vuelve a `disponible` si no le queda otro ticket activo.
- Barbero con `en_atencion` vigente sigue `ocupado`; `fuera_de_turno` intacto.
- Contratos de grants sin cambios (service_role sigue dueño de los barridos).

## Checks
- `npx vitest run tests/supabase/barbero-silla-barridos.test.ts` verde
- supabase suite relacionada verde; full suite sin fallos nuevos

## Progress
- 2026-10-09: T1–T3 completadas. RED (ENOENT) → GREEN: test nuevo 3/3 + relacionados 15/15; full suite 193/198 con los mismos 5 fallos preexistentes (sin regresión). Migración solo local, pendiente `db push` con autorización remota. Sin commit.
