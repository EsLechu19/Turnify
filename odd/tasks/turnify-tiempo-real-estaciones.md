# Turnify Tiempo real + estaciones vivas — Feature Document (ODD)

## Objective

El trabajador ve los tickets al instante (la Cola también escucha Realtime, no
solo la Jornada) y las Estaciones activas muestran barberos, estados y turnos
reales en vez de sillas falsas. Más vida, datos de verdad.

## Problem

- `worker-queue` solo recarga al enfocar: un ticket recién creado no aparece
  hasta salir y volver. La Jornada sí escucha.
- `WorkerStations` tiene 2 de 3 sillas hardcodeadas ("Por asignar", estados
  falsos): se nota el juguete. No hay RPC de estaciones.

## Why

El usuario lo pidió: coordinación en tiempo real cliente→trabajador y estación
activa viva e interactiva.

## Scope

- Incluye: migración `0024` (`estaciones_de_mi_empresa`: barberos vinculados con
  membresía activa, estado operativo y turno activo); suscripción Realtime en
  `worker-queue`; `WorkerStations` real (props + detalle demo); `getShopStations`
  en `worker-barber-api`; contratos; aplicar a prod y verificar en vivo.
- No incluye: tabla de estaciones físicas, filtros por silla, push, cambios de
  reglas de cola o RLS.

## Constraints

- Rama `uwu`; UI español; código/comentarios/tests inglés.
- Solo personal con barbería actual (y admin de la empresa) leen estaciones;
  RPC `security definer`, grant a `authenticated`.
- Tocar una estación con turno → Cola (donde viven las acciones); sin turno no
  navega. Sin acciones nuevas en la tarjeta.
- Mismo canal Realtime existente (`tickets` + `barbero_operaciones` por empresa).

## Decisions

- TDD: ON (Vitest). Rojo: queue sin canal; stations sin datos reales; 0024.
- Delivery `ask-on-risk`; sin commit. Ruta inline. Aplicación vía pooler.
- Demo `SKIP_AUTH` conserva sillas de mentira marcadas como demo.

## Tasks

- [x] T1 — TDD rojo: contratos (queue escucha canal por empresa; stations recibe
  datos reales; 0024 existe con grants).
- [x] T2 — Migración `0024_estaciones_de_mi_empresa.sql` + aplicar + verificar.
- [x] T3 — `worker-queue` con suscripción Realtime por barbería actual.
- [x] T4 — `WorkerStations` real + `getShopStations` + cableado en jornada.
- [x] T5 — vitest + tsc; RPC en vivo verificado; suite sin regresión.

## Authorized scope

Repo local rama `uwu` + SQL en `turnify-dev` (autorizado 2026-10-08). Sin push, PR
ni otros remotos.

## Acceptance criteria

- [ ] Ticket creado por cliente aparece en Cola sin salir/volver.
- [ ] Estaciones listan barberos reales con estado y turno; cero sillas falsas.
- [ ] Contratos verdes; suite sin regresión.

## Progress

- T1: contratos en rojo (canal ausente, sillas falsas, 0024 inexistente).
- T2: migración 0024 en repo y aplicada a `turnify-dev` (verificada en vivo: exige
  sesión, como debe).
- T3–T4: canal por empresa en Cola; estaciones reales con tap a Cola; demo
  intacto. Una edición fantasma corrompió `worker.tsx` a mitad de camino y se
  restauró la declaración perdida antes de seguir.
- T5: `tsc` limpio; suite 178/183 con los mismos 5 preexistentes. Sin commit.
