# Turnify Barberos reales en catálogo — Feature Document (ODD)

## Objective

El catálogo que ve el cliente solo ofrece barberos vinculados a una cuenta real de
trabajador (perfil `personal` con membresía activa). Sin cuenta, no aparece.

## Problem

`catalogo_comercial` devuelve todo el roster activo en turno aunque no tenga
`perfil_id`: el cliente ve (y puede pedir a) "Luis Perez", que no es ningún
trabajador. Peor: el ruteo automático puede asignar turnos a barberos que ningún
trabajador puede atender (`llamar_mi_siguiente` exige vínculo).

## Why

El usuario lo pidió directo: solo barberos de verdad (trabajadores con cuenta).

## Scope

- Incluye: migración `0023` (filtro en `catalogo_comercial`, solicitado y
  auto-ruta de `tomar_turno_comercial`); aplicarla a `turnify-dev`; datos: Luis
  Perez a `activo=false` (5 tickets históricos `cancelado` lo referencian, el
  borrado duro rompería historial), alta de barbero Josue vinculado a josue con
  estado disponible y los 4 servicios de Chifa; contrato de test.
- No incluye: cambios en la app (la lista se achica sola), RLS, despacho push,
  historial.

## Constraints

- Rama `uwu`; repo como fuente de verdad (migración en archivo + aplicada a prod).
- `create or replace` en la migración (idempotente, re-ejecutable).
- Secretos solo en scripts temporales fuera del repo, eliminados después.
- No hard-delete de Luis Perez por historial referenciado (se desactiva).

## Decisions

- TDD: ON (Vitest). Rojo: contrato sobre `0023` exige filtro de vínculo.
- Delivery `ask-on-risk`; sin commit. Ruta inline. Aplicación vía pooler us-east-2
  (directo `db.*` sin IPv4 en esta máquina).

## Tasks

- [x] T1 — TDD rojo: `tests/supabase/worker-linked-catalog.test.ts`.
- [x] T2 — Migración `0023_worker_linked_catalog.sql` + aplicar a prod + verificar.
- [x] T3 — Datos: desactivar Luis Perez; alta Josue (operaciones + servicios).
- [x] T4 — vitest + tsc; catálogo anónimo verificado; suite sin regresión.

## Authorized scope

Repo local rama `uwu` + SQL aplicado a `turnify-dev` (autorizado por el usuario el
2026-10-08). Sin push, PR ni otros remotos.

## Acceptance criteria

- [ ] `catalogo_comercial` anónimo para `W6JZ37MZ` lista solo a Josue.
- [ ] Solicitar un barbero sin vínculo falla; la auto-ruta nunca elige uno.
- [ ] Luis Perez invisible para clientes, historial intacto.
- [ ] Contratos verdes; suite sin regresión.

## Progress

- T1–T2: contrato 3/3, migración 0023 en repo y aplicada a `turnify-dev`.
- T3: Luis Perez desactivado (historial intacto); Josue dado de alta con estado
  disponible y los 4 servicios de Chifa; catálogo anónimo verificado: `["Josue"]`.
- T4: `tsc` limpio; suite 170/175 con los mismos 5 preexistentes. Sin commit.
