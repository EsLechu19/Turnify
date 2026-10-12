# Dashboard operativo dentro de barbería

## Objective
Reordenar el dashboard del trabajador dentro de una barbería con jerarquía honesta: Hoy manda, Cola solo lista, Clientes visible, Historial honesto, Cuenta separa lo personal de lo operativo.

## Why
El dashboard actual duplica En vivo/Cola, esconde Cliente presencial, miente en el header y mezcla cuenta personal con operación.

## Scope
- `apps/mobile/src/features/worker/worker-navigation.ts`
- `apps/mobile/src/components/worker/worker-screen-container.tsx`
- `apps/mobile/src/components/worker/worker-ui.tsx`
- `apps/mobile/src/app/(app)/worker.tsx` (Hoy)
- `apps/mobile/src/app/(app)/worker-queue.tsx` (Cola pura)
- `apps/mobile/src/app/(app)/worker-walk-in.tsx` (Clientes visible)
- `apps/mobile/src/app/(app)/worker-history.tsx` (título honesto)
- `apps/mobile/src/app/(app)/worker-profile.tsx` + profile-content (Cuenta)
- Tests en `tests/mobile/worker-*.test.ts`

## Constraints
- No romper auth ni RLS. Solo UI + navegación.
- Mantener rutas existentes funcionando; las huérfanas pasan a tabs visibles.
- Español en UI existente. Contraste accesible en botones.

## Tasks
- [ ] T1 Navegación de 5 tabs: Hoy, Cola, Clientes, Historial, Cuenta + iconos y permisos
- [ ] T2 Hoy (`worker.tsx`): resumen del día + CTA principal siempre visible + lifecycle contenido
- [ ] T3 Cola pura (`worker-queue.tsx`): solo lista + llamar, sin lifecycle duplicado
- [ ] T4 Clientes (`worker-walk-in.tsx`): colgar del tab Clientes, título y retorno claros
- [ ] T5 Historial honesto + Cuenta con retorno explícito a cuenta personal
- [ ] T6 Typecheck + tests enfocados + commit por unidad

## Acceptance
- Bottom nav muestra Hoy, Cola, Clientes, Historial, Cuenta.
- Hoy responde: dónde estoy, cómo viene el día, qué hago ahora.
- Cola no duplica acciones de atención.
- Cliente presencial accesible en un tap.
- Header no miente estado; muestra disponibilidad real.
- Typecheck verde y tests de worker en verde.

## Progress
- T1 done: 5 tabs Hoy/Cola/Clientes/Historial/Cuenta, iconos, permisos, walk-in colgado de Clientes.
- T2 done: Hoy con resumen + siguiente acción, sin lista completa duplicada.
- T3 done: Cola pura con enlace a Hoy.
- T4 done: Clientes visible en tab.
- T5 done: Historial honesto + Cuenta con retorno explícito.
- Typecheck verde. Tests worker en verde salvo fallo base preexistente (`/(app)/admin` en customer-navigation).
