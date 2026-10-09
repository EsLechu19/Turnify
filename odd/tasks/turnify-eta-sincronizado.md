# Turnify ETA sincronizado worker-cliente — Feature Document (ODD)

## Objective

El trabajador ve el mismo tiempo estimado que el cliente: cada ticket del
`mi_cola_barbero` trae `personas_delante` y `espera_min` calculados igual que el
ETA del cliente. Cero tiempos inventados en la app.

## Problem

La jornada inventa tiempos: `~5 min de espera` fijo en el siguiente y
`~${index*5+5} min` por posición. El cliente ve `personas × promedio ÷ puestos`
del servidor. Nunca coinciden.

## Why

El usuario lo detectó probando ambos lados: los tiempos no están sincronizados.

## Scope

- Incluye: migración `0025` (`personas_delante` + `espera_min` en
  `mi_cola_barbero`, misma fórmula que `mi_ticket_estado`); `WorkerTicket` +
  mapeo; jornada (siguiente + pills) y tarjeta de cola con ETA real; demo data;
  contratos; aplicar a prod.
- No incluye: fórmula nueva (se reutiliza), tolerancia/countdown (derivan del
  mismo `llamado_en`; relojes de dispositivo aparte), push, RLS.

## Constraints

- Rama `uwu`; UI español; código/comentarios/tests inglés.
- Misma firma de RPC (el grant existente sigue válido; `create or replace`).
- `Próximo` cuando la espera es 0; jamás estimar en cliente.

## Decisions

- TDD: ON (Vitest). Rojo: ETA real ausente + literales inventados presentes.
- Delivery `ask-on-risk`; sin commit. Ruta inline. Aplicación vía pooler.

## Tasks

- [x] T1 — TDD rojo: contratos (0025 con campos; jornada/cola sin literales).
- [x] T2 — Migración `0025_mi_cola_con_espera.sql` + aplicar a prod.
- [x] T3 — `WorkerTicket` + jornada y cola con ETA real (+ demo data).
- [x] T4 — vitest + tsc: contratos 2/2; `tsc` limpio; suite 182/187 con los mismos
  5 preexistentes. Verificación en vivo pendiente del usuario.

## Authorized scope

Repo local rama `uwu` + SQL en `turnify-dev` (autorizado 2026-10-08). Sin push, PR
ni otros remotos.

## Acceptance criteria

- [ ] Worker y cliente muestran el mismo estimado para el mismo ticket.
- [ ] Ningún `~5 min` fijo ni `index * 5` en el panel worker.
- [ ] Contratos verdes; suite sin regresión.

## Progress

- T1–T2: contratos en rojo, migración 0025 en repo y aplicada a `turnify-dev`
  (misma fórmula que `mi_ticket_estado`; firma intacta, grant vigente).
- T3: `WorkerTicket` con `peopleAhead/waitMinutes`; jornada y cola con ETA real;
  demo data coherente. Sin commit.
- T4: `tsc` limpio; suite 182/187 con los mismos 5 preexistentes.
