# turnify-cola-deadline-worker — mi_cola devuelve la deadline del llamado

## Objective
Que `mi_cola_barbero` vuelva a incluir `llamado_vencimiento_en` (+ respuesta del cliente) en cada ticket, para que el trabajador vea el tiempo en vivo sincronizado con el cliente.

## Problem
La `0025` reescribió `mi_cola_barbero` para personas/espera y perdió las claves `llamado_vencimiento_en`, `respuesta_cliente` que la `0021` sí devolvía. Verificado en prod con `pg_get_functiondef`: el payload del worker llega sin deadline → `calledDeadlineAt` null → "Tiempo no disponible" en En vivo y en la tarjeta nueva de Cola. El cliente no se afecta (usa `estado_ticket_invitado`, que sí la trae).

## Why
Pedido del usuario: el trabajador debe ver el tiempo pasando igual que el cliente.

## Scope
- `supabase/migrations/0028_mi_cola_con_deadline.sql` (nueva: redefine `mi_cola_barbero` = cuerpo `0025` + 3 claves)
- `tests/supabase/worker-cola-deadline.test.ts` (nuevo contrato por contenido)
- Aplicación en prod vía `db query` directa del mismo `CREATE OR REPLACE` (evita el bloqueo conocido de `db push` en `0012`; OR REPLACE idempotente, grants intactos).
- Sin tocar `0027` (sigue local pendiente de push) ni UI (ya consume `calledDeadlineAt`).

## Decision
Deadline **cruda** (`t.llamado_vencimiento_en`), no efectiva: prod no tiene la `0026`, y el cliente en prod ve la cruda. Sincronía = mismo valor en ambos. Cuando la `0026` aterrice, ambos migran juntos al efectivo.

## Tasks
- [x] T1 — Test en RED sobre `0028` (redefine mi_cola, trae llamado_vencimiento_en crudo + respuesta, conserva personas/espera).
- [x] T2 — Migración `0028` + GREEN y suite sin regresiones nuevas.
- [x] T3 — Aplicar en prod (turnify-dev, ya autorizado) y verificar con `pg_get_functiondef`.

## Authorized scope
Fix pedido explícitamente por el usuario + autorización standing para cambios en turnify-dev. Ruta inline (subagentes no disponibles).

## Acceptance
- `mi_cola_barbero` en prod incluye `llamado_vencimiento_en`.
- Josue llama → En vivo y Cola muestran el contador corriendo igual que el cliente.

## Progress
- 2026-10-09: T1–T3 completadas. RED (ENOENT) → GREEN; aplicada en prod vía db query directa (CREATE FUNCTION ok, verificado deadline_restored=true). Credenciales solo en env, limpiadas. Sin commit.
