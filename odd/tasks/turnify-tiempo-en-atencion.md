# turnify-tiempo-en-atencion — Cronómetro en vivo de la atención

## Objective
La tarjeta "En atención ahora" muestra el tiempo transcurrido de la atención corriendo cada segundo (desde `inicio_en` del servidor).

## Problem
`mi_cola_barbero` no devuelve `inicio_en`, así que el worker no tiene desde cuándo contar.

## Scope
- `supabase/migrations/0031_mi_cola_con_inicio.sql`: `mi_cola` + clave `inicio_en` (cuerpo igual a `0029`).
- `worker-barber-api.ts`: `inicioEn` en tipo + payload + mapper.
- `use-remaining-tolerance.ts`: nuevo `useElapsedSince` (mm:ss contando hacia arriba, tick 1 s).
- `worker.tsx`: línea de tiempo en la tarjeta En atención + test.
- Aplicar en prod (1 statement) y verificar.

## Tasks
- [x] T1 — Tests en RED.
- [x] T2 — Implementar + GREEN, suite sin regresiones, apply + verify en prod.

## Authorized scope
Pedido explícito + standing en turnify-dev. Ruta inline.

## Acceptance
- En atención muestra mm:ss corriendo desde el inicio real (manual o automático por presente).

## Progress
- 2026-10-09: T1–T2 completadas. RED→GREEN; aplicada en prod (inicio_ok=true). Full 212/217, mismos 5 preexistentes. Credenciales limpiadas. Sin commit.
