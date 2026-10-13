# turnify-invitacion-nominativa — Admin invita por correo (opción B)

## Objective
El admin invita a un email concreto y solo esa cuenta canjea; solicitudes pendientes se aprueban/deniegan desde Equipo.

## Problem
Los RPC (`generar/solicitar/mis/solicitudes/resolver`, `0022`) existen y son sólidos (hash, expiración 7 días, admin-only, email del JWT), pero ninguna UI de admin los usa. El alta local del Team es demo (S2b).

## Scope
- `live.ts`: `fetchShopWorkerRequests`, `generateWorkerInvitation`, `resolveWorkerRequest`.
- `TeamPage.tsx`: tarjeta "Invitar por email" (muestra el código una vez + copiar + vigencia) y "Solicitudes pendientes" (aprobar/denegar + recarga de plantilla).
- No se toca el modal de alta local (S2b lo reemplaza por invitar); no hay migración (RPC ya en prod).
- Tests web + verificación de RPC en prod + typecheck/build/suite.

## Rules
- El código se muestra una sola vez; solo sirve para el email invitado; vence en 7 días.
- Aprobar crea membresía + barbero fuera de turno (lo hace el RPC).

## Tasks
- [x] T1 — Tests en RED.
- [x] T2 — Implementar + GREEN, verificar RPC en prod, suite sin regresiones.

## Authorized scope
Opción B aprobada + standing en turnify-dev (solo lecturas de verificación). Ruta inline.

## Acceptance
- Admin genera código para un email y lo ve una vez; pendientes listan con aprobar/denegar; al aprobar el equipo se recarga.

## Progress
- 2026-10-09: T1–T2 completadas. RED→GREEN; RPC verificados en prod; typecheck+build verdes. Full 243/248 mismos 5 preexistentes. Sin commit.
