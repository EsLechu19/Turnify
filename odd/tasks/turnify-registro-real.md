# turnify-registro-real — Crear cuenta crea la cuenta (y puede ser trabajador)

## Objective
"Cree" lo que promete: alta real en Supabase Auth + rol `personal` opt-in desde el registro, sin ayuda de nadie.

## Problem
`register.tsx` finge el éxito (`setIsRegistered(true)`) y `signUp` es un stub: ninguna cuenta se crea. Tampoco hay camino a `personal` sin SQL manual.

## Scope
- `use-auth.signUp` real (signup + metadata nombre/worker_intent + sesión inmediata).
- `register.tsx` cableado (validación, loading, errores, toggle "Soy trabajador").
- `0037`: `handle_new_user` honra `worker_intent` → `personal` (si no, `cliente` como hoy).
- Tests + apply + verify en prod. Sin tocar login ni guards.

## Rules
- Sin sesión (confirmación activada en otro proyecto) → pantalla de revisar correo, como hoy.
- El trigger no cambia nada para altas sin metadata.

## Tasks
- [x] T1 — Tests en RED.
- [x] T2 — Implementar + GREEN, suite sin regresiones, apply + verify.

## Authorized scope
Pedido explícito + standing en turnify-dev. Ruta inline.

## Acceptance
- Cuenta creada desde la app entra sola; con toggle trabajador queda `personal` y cae en Mis barberías.

## Progress
- 2026-10-09: T1–T2 completadas. RED→GREEN; trigger aplicado en prod (intent_ok=true). Full 245/250 mismos 5 preexistentes. Credenciales limpiadas. Sin commit.
- 2026-10-09: registro 100% trabajador (sin toggle): el cliente entra sin cuenta por QR; la pantalla crea personal directo.
