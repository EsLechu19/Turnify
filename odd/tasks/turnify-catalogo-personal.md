# turnify-catalogo-personal — Catálogo vacío para personal con empresa_id NULL

## Objective
El catálogo de servicios vuelve a mostrarse para cuentas `personal` (maximo@gmail.com, luis@gmail.com) sin romper `admin`.

## Problem
`companyId()` en `apps/web/src/data/live.ts:23` lee solo `perfiles.empresa_id`. Desde `0019_worker_memberships` el `personal` lleva `empresa_id = NULL` por diseño (su barbería vive en `empresa_personal_actual_id` + `membresias_personal_empresa`). Resultado: busca `servicios` con `''` → `[]` → badge `0 en catálogo`. El `catch` de `ServicesContext` lo esconde como vacío en vez de error.

## Why
Reporte usuario: catálogo muestra "Ningún servicio coincide" aunque `servicios` sí tiene filas. `perfiles` con `empresa_id NULL` confirmado por usuario.

## Scope
- `apps/web/src/data/live.ts`: `companyId()` rol-aware (`personal` → `empresa_personal_actual_id`, resto → `empresa_id`).
- Test vitest que cubra personal/admin sin sesión real (mock supabase).
- Diagnóstico remoto de los 2 emails (lectura) + corrección de membresía (escritura) — BLOQUEADO hasta autorización remota explícita.

## Constraints
- No tocar RLS ni crear migración en esta tarea.
- No usar RPC `mi_empresa_id()` directo (sin grant a `authenticated`); resolver en cliente con columnas legibles por `perfiles_select` (propio perfil sí legible).
- Mensaje honesto cuando personal no tiene barbería seleccionada.

## Tasks
- [x] T1 — Fix `companyId()` rol-aware + error honesto si personal sin barbería.
- [x] T2 — Test vitest RED→GREEN + suite sin regresiones.
- [ ] T3 — Diagnóstico remoto (lectura) de maximo/luis + fix membresía (escritura). BLOQUEADO: requiere autorización remota explícita (destino/operación/credencial).

## Authorized scope
Pedido explícito "Resuelve ese problema" + emails aportados. Ruta delegada-directa (subagente no disponible en este runtime, se hace inline y se declara). Sin prod hasta autorización explícita.

## Acceptance
- Lecturas compartidas con `personal` usan `empresa_personal_actual_id`; admin sigue usando `empresa_id`; personal sin barbería recibe "Sin barbería seleccionada" en vez de vacío silencioso.
- T3 solo se cierra con evidencia remota (SELECTs + UPDATE membresía) y autorización registrada.

## Applicable checks
- `npx vitest run tests/web/servicios-crud.test.ts` + nuevo test catalogo-personal.
- `npx tsc --noEmit` si disponible en workspace web (solo lectura de tipos, sin mutar).

## TDD
- Modo: disabled. Fuente: sin config `sdd-init`/strict_tdd en sesión; presencia de vitest no habilita TDD. Runner: `npx vitest run`. Se exigen checks funcionales ordinarios, no ciclo RED previo obligatorio (igual se escribe test primero por disciplina).

## Progress
- 2026-10-13: T1 aplicada: `companyId()` lee rol + ambas columnas y usa `empresa_personal_actual_id` para `personal`; ya no consulta `servicios` con `empresa_id=''`. T2 GREEN: `npx vitest run tests/web/servicios-crud.test.ts tests/web/servicios-profesional.test.ts` → 2 archivos, 4 tests. Ruta: inline (Task `explore` falló: "free tier can only be used from within OpenCode" — se continuó con CodeGraph + lecturas acotadas).
- Descubrimiento de alcance: `/servicios` está protegido por `RequireAdmin`; una cuenta `personal` se redirige a login. T3 sigue siendo necesario para confirmar el rol y membresía de maximo@gmail.com y luis@gmail.com en producción.
