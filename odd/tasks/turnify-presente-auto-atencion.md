# turnify-presente-auto-atencion — Presente inicia atención; ausente desde en_atencion

## Objective
1. `llega_en_2_min` extiende la tolerancia +2 min (llevar `0026` a prod, hoy inactiva).
2. `presente` inicia la atención automáticamente (pasa a `en_atencion`, `inicio_en=now()`), como si el cliente presionara iniciar atención.
3. El trabajador puede marcar ausente también desde `en_atencion` (si el cliente dijo presente pero no está), liberando la silla.

## Problem
Verificado en prod: no existe `vencimiento_efectivo_llamado` (el +2 no opera), el sweep usa deadline cruda, `responder` nunca transiciona, y `finalizar_mi_atencion` solo acepta `ausente` desde `llamado`. La tarjeta "En atención" del worker además no ofrece "Marcar ausente".

## Why
Pedido explícito del usuario el 2026-10-09 con las tres reglas juntas.

## Scope
- `supabase/migrations/0029_presente_auto_atencion.sql` (nueva):
  - `vencimiento_efectivo_llamado` (igual que `0026`)
  - `marcar_ausentes` = `0026` (efectivo) + liberación de sillas de `0027`
  - `responder_llamado_invitado` = `0026` + auto `en_atencion` en `presente` + re-entradas idempotentes
  - `estado_ticket_invitado` efectivo (igual que `0026`)
  - `mi_cola_barbero` = `0028` (deadline+respuesta+personas/espera) pero sirviendo deadline **efectiva**
  - `finalizar_mi_atencion`: `ausente` desde `llamado` o `en_atencion` (desde atención, `fin_en=now()`); `finalizado` solo desde `en_atencion`; siempre libera la silla
  - `cerrar_tickets_vencidos` no se toca (versión `0027` sigue vigente)
- `apps/mobile/src/app/(app)/worker.tsx`: botón "Marcar ausente" en la tarjeta En atención.
- Tests: `tests/supabase/presente-auto-atencion.test.ts` (nuevo) + `it` en `worker-live-operations.test.ts`.
- Aplicación en prod función por función vía `db query` (pooler solo admite 1 statement por llamada).

## Rules
- `presente` en `llamado` vigente → registra respuesta + `en_atencion` + `inicio_en`.
- `presente` repetido (mismo valor o ya en atención con respuesta presente) → no-op silencioso (evita error por doble tap).
- `presente` en `en_atencion` sin respuesta (el worker inició primero) → solo registra respuesta.
- `llega_en_2_min` en `en_atencion` → rechazado (sin deadline no hay extensión).
- Vencido el efectivo → ambas respuestas rechazadas (igual que `0026`); primera respuesta gana (igual que `0026`).

## Tasks
- [x] T1 — Tests en RED (contrato `0029` + botón en tarjeta de atención).
- [x] T2 — Migración `0029` + botón worker + GREEN y suite sin regresiones nuevas.
- [x] T3 — Aplicar en prod (6 statements) y verificar (efectivo existe, responder auto-inicia, finalizar admite ausente desde atención).

## Authorized scope
Pedido explícito + standing para cambios en turnify-dev. Ruta inline (subagentes no disponibles).

## Acceptance
- Cliente "Llego en 2 min" → countdown +2 y sweep respeta el efectivo.
- Cliente "Ya estoy aquí" → pasa a en_atencion solo; doble tap no da error.
- Worker puede marcar ausente en llamado y en atención; la silla se libera en ambos casos.
- Worker y cliente siguen viendo el mismo tiempo (efectivo en ambos).

## Progress
- 2026-10-09: T1–T3 completadas. RED→GREEN; 6 funciones aplicadas en prod (verificado 4/4 true). Full suite 202/207, mismos 5 preexistentes. Credenciales limpiadas. Sin commit.
