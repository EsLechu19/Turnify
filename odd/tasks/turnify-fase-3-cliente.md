# Turnify Fase 3 Cliente — Feature Document (ODD)

## Objective
Flujo completo del cliente en la app Expo: registro/login, entrada por QR/código, vista previa, tomar turno, Mi turno en vivo, historial. Base y validación viva ya cerradas en main (6a29f44).

## Problem
El backend está probado pero no existe UI: hoy solo se puede operar con scripts. Sin el flujo cliente no hay demo posible.

## Why
Es el camino demostrable del MVP (aceptación: turno en <30s, posición en vivo sin recargar). Personal/admin (Fase 4) y push (Fase 5) dependen de que este flujo exista.

## Scope
- Incluye: C1 scaffold Expo real + cliente Supabase; C2 auth; C3 entrada QR/código + vista previa + tomar turno; C4 Mi turno en vivo (Realtime) + cancelar; C5 historial + perfil; C6 verificación del slice.
- No incluye: pantallas personal/admin (Fase 4), push delivery (Fase 5, solo se deja el punto de registro de token), dashboard web (Fase 6), iOS (demo en Android).

## Constraints
- Expo SDK 57 + Expo Router (según §8/§18), TypeScript estricto, Android-first.
- Solo anon key vía `.env` (untracked, ya en .gitignore). service_role jamás en el bundle.
- UI en español; code comments/identifiers/commits/tests en inglés.
- Reutilizar ports del adapter solo donde aplique; las pantallas hablan vía supabase-js (RPC + Realtime a filas + ticket propio).
- Suscripciones solo con pantalla visible; re-consultar al reconectar (buenas prácticas §13).
- `npx create-expo-app` reemplaza el placeholder de apps/mobile; node_modules nunca en git.

## Decisions
- Delivery: `ask-on-risk`. Forecast >400 líneas → 3 slices con work-unit commits (A: C1+C2, B: C3+C4, C: C5+C6). Sin PRs (repo local).
- TDD: N/A en UI (dominio ya cubierto, 56 tests). Checks: tsc + regresión vitest + walkthrough de aceptación.
- Push: fuera; se deja NotImplementedNotificationPort y un TODO marcado para Fase 5.

## Tasks
- [x] C1 — Scaffold Expo real: create-expo-app SDK 57 (Router) en apps/mobile, @supabase/supabase-js, cliente con anon key por env, tsc verde. Ruta: delegated direct (1 writer, slice A). Done e9970a3.
- [x] C2 — Auth cliente: registro/login, sesión persistente, guards de ruta, rol cliente. Commit work-unit. Ruta: delegated direct (slice A). Done b6473aa.
- [x] C3 — Entrada y turno: escáner QR (expo-camera) + código manual, resumen_empresa, tomar_turno. Commit. Ruta: delegated direct (slice B). Done 4efedd2.
- [x] C4 — Mi turno en vivo: canal a fila + ticket, mi_ticket_estado, posición/tiempo/estado, cancelar_ticket. Commit. Ruta: delegated direct (slice B). Done 29887d9.
- [x] C5 — Historial y perfil: lista de tickets propios, perfil/ajustes. Commit. Ruta: delegated direct (slice C). Done 063d79b.
- [ ] C6 — Verificación slice: checks estáticos OK; walkthrough interactivo pendiente de dispositivo/emulador. Ruta: delegated direct (slice C).

## Authorized scope
Local en `C:\Users\esa\Desktop\Turnify` + datos de prueba en turnify-dev. No push de git, no PR, no publicación en tiendas. Sin secrets en repo.

## Acceptance criteria
- [ ] Cliente toma turno en <30s desde que abre la app (dos toques tras login).
- [ ] Vista previa muestra personas + espera antes de confirmar.
- [ ] Posición y tiempo cambian sin recargar (Realtime).
- [ ] Cliente jamás ve datos de otros (verificado en V1 a nivel API; walkthrough a nivel UI).
- [ ] tsc limpio + vitest 56/56 sin regresión.

## Applicable checks
- `npx tsc --noEmit` (mobile).
- `npx vitest run` 56/56 (raíz, regresión).
- Walkthrough manual en Expo (web o dev build) con evidencias anotadas.

## Progress
- 2026-09-29: creado este documento (6 tareas, 3 slices).
- 2026-09-29: Slice A done (C1+C2) en feature/turnify-fase-3-cliente. `default@sdk-57` → expo-template-default@57.0.28, sin desvío. tsc móvil limpio, vitest 56/56.
- 2026-09-29: React alineado en 19.2.3 exacto para root/mobile/web (965df01); expo-doctor 21/21, tsc móvil limpio, vitest 56/56. `.env` local creado y ignorado.
- 2026-09-29: Slice B done (C3+C4): entrada QR/código, preview, tomar turno y ticket vivo. Commits 4efedd2 + 29887d9; typecheck, vitest 56/56 y expo-doctor 21/21.
- 2026-09-29: C5 done (063d79b): historial propio + perfil editable (solo nombre/teléfono). C6 parcial: checks estáticos verdes; walkthrough pending-device.

## Decisions log (hallazgos Slice A)
- Generar el template en temp y copiar dentro de apps/mobile: scaffold in-place renombra el workspace `turnify-mobile` y rompe el script raíz.
- `expo-env.d.ts` se trackea aunque el template lo gitignore: sin él, un checkout limpio rompe tsc (TS2882 en `import '@/global.css'`).
- Cliente Supabase lazy (`getSupabase()`), no a nivel de módulo: un `createClient` en scope de módulo lanza sin .env y crashea el arranque en vez de mostrar el aviso de configuración.
- React 19.2.3 se fijó en root/mobile/web con npm overrides: Expo SDK 57 exige esa versión; 19.3.0 hoisteado provocaba el único fallo de expo-doctor.
- Root typescript ^7.0.2 vs SDK ~6.0.3: resuelto con `expo.install.exclude: ["typescript"]` en apps/mobile. No correr `expo install --fix` sin ese exclude.

## Verification evidence
- C1+C2 writer: `npx tsc --noEmit` (mobile) exit 0; `npx vitest run` raíz 56/56; secret scan sin credenciales en archivos trackeados.
- Parent spot check: `git log --oneline -4` → b6473aa, e9970a3 sobre 6a29f44; `git status --short` → solo untracked preexistente (.atl/, odd/, opencode.json); `npx vitest run` → 56 passed. Coincide.
- PENDIENTE: walkthrough runtime del login contra turnify-dev (apps/mobile/.env local ya creado y gitignored).
- Slice B writer: typecheck verde, vitest 56/56, expo-doctor 21/21, `git diff --check` verde. Metro llegó a http://localhost:8081, sin interacción de dispositivo.
- Parent spot check Slice B: log con 29887d9/4efedd2, typecheck verde, vitest 56/56, expo-doctor 21/21. Coincide.
- Slice C writer: historial query `.eq('cliente_id', customerId)`; perfil lee solo id/nombre/teléfono y actualiza solo nombre/teléfono; Realtime continúa filtrado a ticket propio + fila propia. Typecheck, 56/56, expo-doctor 21/21 y diff-check verdes. Metro en 8082 inició, sin interacción.
- Parent spot check Slice C: log con 063d79b; typecheck verde, vitest 56/56, expo-doctor 21/21. Coincide.

## Next step
- C6: walkthrough interactivo contra turnify-dev en Android/emulador (login, tomar turno <30s, actualización viva, historial/perfil).
