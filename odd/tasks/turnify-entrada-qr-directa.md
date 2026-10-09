# turnify-entrada-qr-directa — Entrada QR directa + acceso trabajador

## Objective
Abrir la app directo en `/` (descubrimiento QR/código) sin login previo, y agregar abajo del apartado QR el link de iniciar sesión como trabajador (`/(auth)/login`).

## Problem
Al abrir, la app cae en el login previo (`(auth)`) porque el `Stack` raíz no declara `index` y arranca en el primer screen `(auth)`; hay que presionar "Entrar como invitado" para llegar a `/`. Además se había quitado el entry de personal del welcome y el usuario lo quiere de vuelta abajo del QR.

## Why
Pedido explícito del usuario: eliminar la pestaña previa y reponer el iniciar sesión de trabajador abajo del escaneo QR.

## Scope
- `apps/mobile/src/app/_layout.tsx` (declarar `index` como inicial)
- `apps/mobile/src/app/index.tsx` (footer trabajador con `workerSignInRoute`)
- `apps/mobile/src/app/(public)/scan.tsx` (returnHome a `/` + footer trabajador)
- `tests/mobile/public-guest-flow.test.ts` (actualizar contrato: footer vuelve, sin desvío staff)
- No se toca auth, guards por rol, booking, migraciones ni remote.

## Tasks
- [x] T1 — Root declara `index`: agregar `<Stack.Screen name="index" />` primero para que `/` sea la inicial. Route: inline (delegación `explore` no disponible en este entorno: "free tier only from within OpenCode"; trigger evidencia: mapping 6+ archivos requería 1 explorer, no disponible → inline documentado).
- [x] T2 — Footer trabajador en `/`: importar `workerSignInRoute`, agregar link "Iniciar sesión como trabajador" + caption personal abajo del trustRow.
- [x] T3 — Scan: `returnHome` a `/` (hoy `/(app)` rebota por el guard) + footer trabajador abajo del contenido.
- [x] T4 — Actualizar contrato `public-guest-flow`: `/` contiene `workerSignInRoute` y entry trabajador, sigue sin desvío staff ni re-export de login.
- [x] T5 — Verificación: `npm --workspace turnify-mobile run typecheck` + `npx vitest run tests/mobile/public-guest-flow.test.ts tests/mobile/worker-access-flow.test.ts tests/mobile/worker-intent-auth.test.ts` y luego suite completa si hay tiempo.

## Authorized scope
Cambio autorizado por el usuario el 2026-10-09: eliminar login previo + reponer acceso trabajador abajo del QR. Ruta: delegated-direct degradado a inline por indisponibilidad del runtime de subagentes.

## Acceptance
- Abrir la app cae en `/` con Escanear QR + código, sin pasar por login ni "Entrar como invitado".
- `/` y `/(public)/scan` muestran abajo el acceso trabajador que lleva a `/(auth)/login`.
- Login sigue único para staff; sign-out sigue a `/`; guards intactos.
- Tests de contratos actualizados en verde.

## Checks
- typecheck mobile limpio (o solo fallos preexistentes documentados)
- contratos mobile en verde
- sin nuevas rutas ni pantallas

## Progress
- 2026-10-09: T1–T4 implementadas. T5 verificación: typecheck mobile limpio; contratos tocados 23/23 verde; suite completa 190/195 con 5 fallos preexistentes verificados en árbol limpio vía stash (called-ticket ×2, customer-navigation ×1, worker-invitation-ui ×2), fuera del alcance. Cambios sin commitear en worktree.
