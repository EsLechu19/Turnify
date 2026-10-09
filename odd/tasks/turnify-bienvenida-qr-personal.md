# Turnify Bienvenida QR/Personal — Feature Document (ODD)

## Objective

La entrada de la app (`/`) vuelve a ser la bienvenida pública: opción de escanear QR o
ingresar código para cualquier cliente, y abajo la entrada para personal — con el
lenguaje visual actual (tokens de `constants/theme`, ui kit, `BrandMark`).

## Problem

En `uwu` la ruta `/` es un alias del login con atajos ciegos Cliente/Empleado
(`router.replace('/(app)')` y `router.replace('/(app)/worker')` sin sesión), lo que
produce el bounce-loop y patea al login. El flujo guest existe pero no tiene puerta.

## Why

El usuario pidió esta pantalla como puerta principal, con el mockup de referencia,
respetando estructura, colores e iconos actuales. También elimina la causa del
bounce-loop de Empleado.

## Scope

- Incluye: bienvenida en `/` (hero, tarjeta scanner, CTA QR, drawer de código,
  tarjeta de turno activo, footer personal → `workerSignInRoute`); login sin atajos
  ciegos (el formulario es el acceso de personal + link de invitado a `/`);
  actualización de los tests de contrato que fijaban el mapeo viejo.
- No incluye: cambios al flujo de reserva, escáner, shop, auth real (stubs intactos),
  push, dashboard, iOS.

## Constraints

- Rama `uwu`; UI en español; comentarios/identificadores/commits/tests en inglés.
- Solo ui kit (`Screen, Button, Card, Icon, TextField, BrandMark`) y tokens
  (`Palette, TypeScale, Radius, space, Shadows`). Nada de HTML/Tailwind del mockup.
- Rutas existentes intactas: `publicLaunchRoute='/'`, `publicShopRoute`, scan con
  parámentro `code`, `workerSignInRoute='/(auth)/login'`, `activeGuestTicketRoute`.
- Sin persistir capability (in-memory); Realtime solo con pantalla visible.

## Decisions

- TDD: ON (elección explícita del usuario 2026-09-29; runner Vitest). Rojo primero en
  los tests de contrato, verde con las pantallas.
- Delivery `ask-on-risk`; slice único (~2 pantallas + 2 tests); work-unit commit.
- Ruta: delegated direct no disponible en este runtime (Task tool: free tier);
  ejecución inline con evidencia. Triggers: mapping (10+ archivos) y writer
  (2 pantallas no triviales) habrían delegado si el runtime lo permitiera.

## Tasks

- [x] T1 — TDD rojo: `public-guest-flow` (root deja de ser alias del login) y
  `worker-access-flow` (login sin atajos ciegos, con link de invitado).
- [x] T2 — Bienvenida en `apps/mobile/src/app/index.tsx`: QR → `/(public)/scan`,
  código → `publicShopRoute` con `normalizeBusinessCode`, turno activo con
  `getGuestTicketState` + canal home, footer personal → `workerSignInRoute`.
- [x] T3 — Login: fuera atajos Cliente/Empleado; el formulario queda como acceso de
  personal; link "Entrar como invitado" → `/`; registro intacto.
- [x] T4 — Verificación: contratos tocados 15/15 verdes; `tsc --noEmit` limpio en
  mobile; suite total 160/165 — los 5 rojos son preexistentes en `uwu` limpio
  (verificado con stash: deriva de `called-guest-ticket`, `customer-navigation`
  staffLanding admin y `admin.tsx` faltante), fuera del alcance de este slice.

## Authorized scope

Local en rama `uwu` + datos de prueba. Sin push, PR, secretos ni operaciones remotas
más allá del `npm install` si el usuario lo autoriza.

## Acceptance criteria

- [ ] `/` muestra QR, código y entrada de personal con el tema actual.
- [ ] Código válido navega a shop; QR abre el escáner; personal abre el login.
- [ ] Sin sesión, nada navega a `/(app)` sin pasar por el guard (no hay bounce).
- [ ] Tests de contrato verdes con el mapeo nuevo; suite sin regresiones.

## Progress

- T1–T3: tests de contrato actualizados (rojo), bienvenida reconstruida en `/` con ui
  kit + tokens, login sin atajos ciegos con link de invitado. Sin commit (no pedido).
- T4: `npm install` autorizado y ejecutado (740 paquetes); contratos 15/15;
  `tsc --noEmit` limpio; suite 160/165 con 5 fallos preexistentes verificados en árbol
  limpio vía stash (fuera de alcance).
