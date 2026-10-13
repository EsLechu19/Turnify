# turnify-gracia-configurable — La gracia del panel mueve la app

## Objective
El `minutos_gracia` que edita el admin determina el deadline del llamado, la barra y el texto del cliente.

## Problem
El deadline se grababa fijo en 5 minutos al llamar (`llamar_siguiente`, `llamar_mi_siguiente`) y el cliente lo mostraba fijo (barra + "Tienes 5 minutos"). El barrido (efectivo) también colgaba del fijo. Cambiar la gracia no movía nada visible.

## Scope
- `0036`: ambos `llamar_*` graban `now() + minutos_gracia de la empresa`; `estado_ticket_invitado` sirve `gracia_min`.
- Mobile: `GuestTicketState.graciaMin` + barra y texto desde ese valor (fallback 5).
- Tests + apply + verify en prod.

## Tasks
- [x] T1 — Tests en RED.
- [x] T2 — Implementar + GREEN, suite sin regresiones, apply + verify.

## Authorized scope
Pedido explícito + standing en turnify-dev. Ruta inline.

## Acceptance
- Gracia 10 → llamado vence a 10 min en cliente y barrido; barra y texto dicen 10.

## Progress
- 2026-10-09: T1–T2 completadas. RED→GREEN; aplicada en prod (sello_ok=true). Full 237/242 mismos 5 preexistentes. Credenciales limpiadas. Sin commit.
