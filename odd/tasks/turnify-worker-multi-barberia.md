# Turnify Worker multi-barbería — Feature Document (ODD)

## Objective

Todo personal pasa por `worker-shops` tras el login y puede volver desde el panel
(tocando la barbería actual en el encabezado) para cambiar entre sus barberías
aprobadas. Un barbero opera en más de una barbería.

## Problem

`staffLanding` manda al personal con barbería directo a `worker` (salta el panel)
y no hay camino de vuelta: quien trabaja en dos barberías no puede cambiar.

## Why

El usuario quiere multi-barbería real: ver el panel siempre y retroceder a él.

## Scope

- Incluye: `staffLanding` personal → `worker-shops` siempre; guard de `worker.tsx`
  → `staffLanding(profile)`; nombre de barbería tocable en el encabezado worker →
  `worker-shops`; contratos.
- No incluye: lógica de selección/membresías (intacta), resto de pantallas worker,
  admin, guards `(app)`/`(auth)` (ya delegan en `staffLanding`).

## Constraints

- Rama `uwu`; UI español; código/comentarios/tests inglés.
- `workerIntentOutcome` intacto (resuelve destino operativo, no cambia).
- El personal sin barbería sigue sin entrar a rutas operativas (`roleCanAccess`
  intacto).

## Decisions

- TDD: ON (Vitest). Rojo: `staffLanding` personal, guard de worker, header.
- Delivery `ask-on-risk`; slice único; sin commit. Ruta inline.

## Tasks

- [x] T1 — TDD rojo: `customer-navigation` (personal → shops) + contratos (guard
  usa `staffLanding`, header enlaza a shops).
- [x] T2 — `staffLanding` + guard `worker.tsx` + encabezado tocable.
- [x] T3 — vitest + tsc: `tsc` limpio; suite 167/172 — los mismos 5 rojos
  preexistentes (la línea de admin del test tocado sigue en rojo previo), sin
  regresión.
- [x] T4 — TDD rojo: el perfil cambia de barbería **entrando** al panel operativo
  y ofrece **salida explícita** al panel de barberías.
- [x] T5 — Perfil: switch entra a `worker`; botón "Salir de la barbería" →
  `worker-shops`.
- [x] T6 — vitest + tsc: `tsc` limpio; suite 167/172 — los mismos 5 rojos
  preexistentes, sin regresión.

## Authorized scope

Local en rama `uwu`. Sin push, PR, secretos ni operaciones remotas.

## Acceptance criteria

- [ ] Login personal (con o sin barbería) → `worker-shops`.
- [ ] Desde cualquier pantalla worker se vuelve al panel tocando la barbería.
- [ ] Elegir barbería entra al panel operativo; multi-barbería conmutable.
- [ ] Contratos verdes; suite sin regresión.

## Progress

- T1–T2: contratos en rojo, `staffLanding` personal siempre a shops, guard de
  worker vía `staffLanding`, nombre de barbería tocable en el encabezado.
- T4–T5: contrato actualizado, switch del perfil entra a `worker`, botón de
  salida explícita al panel. Sin commit (no pedido).
- T3/T6: `tsc` limpio; suite 167/172 con los mismos 5 preexistentes.
