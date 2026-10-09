# Turnify Panel worker diseño — Feature Document (ODD)

## Objective

Las 4 pantallas del panel worker (jornada, cola, historial, perfil) quedan
legibles y con mejor jerarquía, manteniendo secciones, textos, colores y
componentes worker-ui. Sin cambios de lógica ni rutas.

## Problem

`worker.tsx` y `worker-queue.tsx` están minificados en líneas de miles de
caracteres: ilegibles y frágiles. Historial y perfil están bien pero con
jerarquía dispar.

## Why

El usuario pidió rediseñar todo el panel worker manteniendo estructura y colores.

## Scope

- Incluye: reescritura formateada de `worker.tsx` y `worker-queue.tsx` (misma
  lógica, mismos labels, mejor jerarquía); pulido de `worker-history.tsx` y
  `worker-profile.tsx`; contrato de línea máxima + kit.
- No incluye: lógica, rutas, RPC, textos de producto, worker-ui kit, guards,
  colores nuevos.

## Constraints

- Rama `uwu`; UI español; código/comentarios/tests inglés.
- Labels y strings de contrato intactos (`Mi jornada`, `Llamar al cliente`,
  `Iniciar atención`, ausencias de `Tu estación`/`EN COLA`, etc.).
- Línea máxima 240 caracteres en los 4 archivos.

## Decisions

- TDD: ON (Vitest). Rojo: líneas >240 hoy; verde tras reescribir.
- Delivery `ask-on-risk`; sin commit. Ruta inline (4 archivos, 1 escritor).

## Tasks

- [x] T1 — TDD rojo: `worker-panel-design.test.ts` (línea ≤240 + kit worker-ui en
  las 4 pantallas).
- [x] T2 — Reescritura `worker-queue.tsx` (misma lógica/labels, jerarquía mejor).
- [x] T3 — Reescritura `worker.tsx` (idem: jornada + ciclo de vida + modal).
- [x] T4 — Pulido `worker-history.tsx` + `worker-profile.tsx` (fixtures
  multilínea; ya cumplían kit y labels).
- [x] T5 — vitest + tsc: `tsc` limpio; suite 173/178 — los mismos 5 rojos
  preexistentes, sin regresión.

## Authorized scope

Local en rama `uwu`. Sin push, PR, secretos ni operaciones remotas.

## Acceptance criteria

- [ ] Las 4 pantallas compilan igual y muestran lo mismo con mejor jerarquía.
- [ ] Ninguna línea >240 chars en esos archivos; solo worker-ui kit.
- [ ] Contratos verdes; suite sin regresión.

## Progress

- T1: contrato en rojo (línea máxima 4828 encoladas).
- T2–T3: `worker-queue` y `worker` reescritas formateadas, misma lógica y textos;
  modal con helpers con parámetro (exigido por `tsc strict`).
- T4: history/profile ya cumplían; fixtures multilínea.
- T5: `tsc` limpio; suite 173/178 con los mismos 5 preexistentes. Sin commit.
