# Turnify Finalizar atención — Feature Document (ODD)

## Objective

El trabajador puede finalizar el turno que está atendiendo desde la Jornada:
tarjeta de atención en curso con botón Finalizar atención. Sin callejones.

## Problem

`finishMyService` se importa pero ninguna pantalla lo usa: un ticket en
`en_atencion` no tiene ninguna acción (ni finalizar ni ausente). El ciclo de
atención queda trunco.

## Why

El usuario lo reportó operando: llama, atiende y no puede terminar.

## Scope

- Incluye: tarjeta de atención en `LiveQueue` (código, servicio, pill
  EN ATENCIÓN, botón Finalizar atención → `finishMyService` + notice);
  contrato.
- No incluye: ausente en atención (ya existe `finalizar_mi_atencion` con
  `p_ausente`, fuera de alcance), reasignación, reglas, push.

## Constraints

- Rama `uwu`; UI español; código/comentarios/tests inglés.
- Mismo kit worker-ui, mismos patrones (`act` + notice). Sin rutas nuevas.

## Decisions

- TDD: ON (Vitest). Rojo: botón ausente.
- Delivery `ask-on-risk`; sin commit. Ruta inline.

## Tasks

- [x] T1 — TDD rojo: la jornada ofrece finalizar la atención en curso.
- [x] T2 — Tarjeta de atención + acción en `LiveQueue`.
- [x] T3 — vitest + tsc: contrato 9/9; `tsc` limpio; suite 185/190 con los mismos
  5 preexistentes. Prueba en vivo pendiente del usuario.

## Authorized scope

Local en rama `uwu`. Sin push, PR, secretos ni operaciones remotas (RPC ya
desplegado en `turnify-dev`).

## Acceptance criteria

- [ ] Turno en atención muestra Finalizar atención y lo cierra.
- [ ] Contratos verdes; suite sin regresión.

## Progress

- T1–T2: contrato en rojo, tarjeta "En atención ahora" con código, detalle y
  botón Finalizar atención (`finishMyService` + notice). Sin commit.
- T3: `tsc` limpio; suite 185/190 con los mismos 5 preexistentes.
