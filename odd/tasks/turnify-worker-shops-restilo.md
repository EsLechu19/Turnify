# Turnify Worker shops restilo — Feature Document (ODD)

## Objective

La pantalla `worker-shops` (barberías aprobadas + unirse con código + pendientes)
habla el lenguaje visual actual: ui kit (`Screen, Card, Button, TextField, Icon`)
y tokens (`Palette, TypeScale`). Flujo y rutas intactos.

## Problem

Es la única pantalla del flujo worker aún escrita con el lenguaje viejo
(`ThemedText, AuthScreenContainer, AppCard` de `ui/surface`): rompe la consistencia
que el usuario pidió respetar.

## Why

El usuario pidió el panel post-login (aprobadas / solicitud con código previo
acuerdo del admin / pendientes) con colores y estructura actuales.

## Scope

- Incluye: restilo de `worker-shops.tsx` + contrato que fija kit nuevo y prohíbe
  el viejo en ese archivo.
- No incluye: lógica de membresías/RPC, rutas (`selectWorkerShop` →
  `/(app)/worker`, `requestWorkerInvitation`), guards, admin, resto del panel
  worker (jornada/cola/historial/perfil ya están).

## Constraints

- Rama `uwu`; UI español; código/comentarios/tests inglés.
- Strings de contrato intactos: `requestWorkerInvitation(code)`,
  `router.replace('/(app)/worker')`, `router.replace('/(auth)/login')`.
- Sin navegación nueva; el `staffLanding` existente ya manda acá al personal sin
  barbería actual.

## Decisions

- TDD: ON (Vitest). Rojo: contrato exige kit nuevo y prohíbe viejo en el archivo.
- Delivery `ask-on-risk`; slice de 1 pantalla + test; sin commit.
- Ruta inline (sin delegación disponible).

## Tasks

- [x] T1 — TDD rojo: contrato en `worker-access-flow` (kit nuevo presente, viejo
  ausente en `worker-shops.tsx`).
- [x] T2 — Restilo con `Screen, SectionHeader, Card, Button, TextField, Icon`.
- [x] T3 — vitest + tsc: contrato 9/9; `tsc` limpio; suite 165/170 — los mismos 5
  rojos preexistentes, sin regresión.
- [x] T4 — TDD rojo: el panel usa `OptionCard`/`Row` (mismo kit, mejor jerarquía).
- [x] T5 — Rediseño: hero de cuenta, aprobadas como opciones radio, pendientes
  como filas, misma estructura y colores.
- [x] T6 — vitest + tsc: `tsc` limpio; suite 170/175 — los mismos 5 rojos
  preexistentes, sin regresión.

## Authorized scope

Local en rama `uwu`. Sin push, PR, secretos ni operaciones remotas.

## Acceptance criteria

- [ ] Mismas 3 secciones (aprobadas / unirse / pendientes) + error + cerrar sesión.
- [ ] Cero `ThemedText/AuthScreenContainer/AppCard` en el archivo.
- [ ] Contratos verdes; suite sin regresión.

## Progress

- T1–T2: contrato en rojo, pantalla reescrita con kit actual, lógica y strings de
  contrato intactos. Sin commit (no pedido).
- T3: contrato 9/9; `tsc` limpio; suite 165/170 con los mismos 5 preexistentes.
- T4–T6: rediseño con hero, OptionCard y Row; suite 170/175, mismos 5 rojos.
