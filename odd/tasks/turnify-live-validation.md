# Turnify Live Validation — Feature Document (ODD)

## Objective
Probar contra turnify-dev lo que quedó escrito pero no probado: RLS con usuarios reales, concurrencia, pg_cron y recálculo de promedio. Recién después, Fase 3.

## Problem
La base se aplicó en vivo pero los invariantes 1/2/4/6 solo están verificados offline. Construir UI encima sin validarlos es construir sobre una suposición.

## Why
Fallar ahora es barato; fallar con pantallas encima es caro. La validación viva es el gate de entrada a Fase 3.

## Scope
- Incluye: V1 RLS con usuarios reales, V2 concurrencia, V3 pg_cron + ausentes/cierre en vivo, V4 promedio + publication check + reporte.
- No incluye: UI, Realtime wiring en app, push, dashboard. Solo scripts de validación + datos de prueba en turnify-dev (proyecto dev, se limpian al cerrar).

## Constraints
- Target: turnify-dev únicamente. Sin tocar otro proyecto.
- Secrets: NUNCA en git ni en Engram. Los scripts leen SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_ACCESS_TOKEN de env (archivo temporal fuera del repo, se borra tras usar). service_role no existe en este flujo y nunca se pide.
- Datos de prueba con prefijo `turnify-test-` (emails, empresa `Turnify Test`). Limpieza al cerrar V4.
- Email confirmation puede bloquear sign-in de prueba: si pasa, se confirma vía SQL (update auth.users) o se pide desactivarla en Auth settings; queda registrado.
- Scripts con comentarios en inglés; este documento y reporte en español.

## Decisions
- Delivery strategy: `ask-on-risk` (heredada). Scripts chicos, sin slice.
- TDD: N/A (validación, no lógica de dominio). Evidencia = salidas reales de comandos/scripts, no RED/GREEN.
- Cada validación cierra con work-unit commit del script + evidencia en este doc. Sin push/PR (repo local por ahora).

## Tasks
- [x] V1 — RLS con usuarios reales (11/11 PASS en vivo). Hallazgos: faltaba pgcrypto (0003) y calificar extensions.gen_random_bytes bajo search_path='' (0004).
- [x] V2 — Concurrencia (4/4 PASS): A-003/004/005 únicos en paralelo; self-race 1+1 con índice parcial.
- [x] V3 — pg_cron en vivo: 2 schedules activos; ausente auto (A-002) y cierre (A-005) verificados. Hallazgo: borrar empresa con staff viola rol_empresa_ck (documentado, sin feature de borrado en MVP).
- [x] V4 — Promedio (300→300→365 con muestras 360/120/600s) + publication (tickets, filas vía 0006) + limpieza total (0 empresas, 0 usuarios test). tsc + 56/56 verdes.

## Authorized scope
Local en `C:\Users\esa\Desktop\Turnify` + datos de prueba en turnify-dev (crear, verificar, borrar). No remote fuera de turnify-dev, no push de git, no PR. Credencial: Access Token de un solo uso ya provisto (no persistir).

## Acceptance criteria
- [ ] Cliente B recibe 0 filas al leer el ticket de A; staff ve tickets de su empresa; admin de otra empresa no ve nada.
- [ ] Turnos paralelos sin número repetido (unique fila/fecha/numero) y sin doble activo (índice parcial).
- [ ] `cron.job` con los 2 schedules; marcar_ausentes y cierre cambian estados en vivo como especifica §6/§15.
- [ ] Promedio recalculado con muestras conocidas; publication incluye tickets y filas.
- [ ] Datos `turnify-test-*` eliminados; repo sin secrets (git status limpio salvo opencode.json).

## Applicable checks
- Scripts `node scripts/live-validation/*.mjs` → exit 0 + tabla PASS/FAIL impresa.
- `npx vitest run` 56/56 y `npx tsc --noEmit` siguen verdes tras cada cambio.
- `git status --short` sin secrets ni .env (solo `?? opencode.json` preexistente).

## Progress
- 2026-09-29: creado este documento (4 tareas). Base 8/8 en main (eddc79e) + apply vivo OK.
- 2026-09-29: V1 done — 11/11 PASS (aislamiento total). Commits 8b5dbd9 (0003+0004) + 994858e (scripts).
- 2026-09-29: V2 done — 4/4 PASS (A-003/004/005 únicos; self-race 1+1).
- 2026-09-29: V3 done — 0005 aplicada, schedules activos, ausente (A-002) + cierre (A-005) live. Commit dc99290 (0005+0006).
- 2026-09-29: V4 done — promedio 300→300→365, publication OK, limpieza 0/0. Commit e7d1c37 (scripts). tsc + 56/56 verdes. Temp env con secrets borrado.

## Verification evidence
- V1: 11 PASS (2 empresas códigos únicos, invite, turnos, owner-read, cross-read denegado, select propio=1, staff=2/0, foreign admin=0, doble activo rechazado, preview sin datos personales).
- V2: cancel live OK; paralelo 3/3; números A-003, A-004, A-005; self-race 1 ganado + 1 'Ya tienes un turno activo'.
- V3: cron.job 2 activos; marcar_ausentes→A-002 ausente; cerrar→1 fila, A-005 cancelado.
- V4: llamar/iniciar/finalizar x3 live; promedios 300, 300, 365 (≈(360+120+600)/3+overhead CLI); publication filas+tickets; cleanup empresas=0 usuarios=0.
- Hallazgos vivos (3): pgcrypto faltante; search_path='' exige calificar extensions.*; borrar empresa con staff viola rol_empresa_ck (SET NULL vs check).

## Next step
- Mergear feature/turnify-live-validation a main y arrancar Fase 3 (app cliente).
