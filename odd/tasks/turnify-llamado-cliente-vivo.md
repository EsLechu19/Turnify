# Turnify Llamado vivo en cliente — Feature Document (ODD)

## Objective

Cuando el trabajador llama, el cliente lo ve sin tocar nada: la pantalla del
turno invitado revalida por RPC cada 10s (el canal Realtime no entrega filas a
anónimos por RLS) y la tarjeta de llamado sigue el mockup adaptado al kit real.

## Problem

- El llamado sí cambia en el backend (A-004 `llamado` verificado), pero la
  pantalla del cliente no se entera: el canal `guest-ticket:*` no recibe nada
  para anónimos (RLS `tickets_select` exige dueño o personal) y solo revalida al
  enfocar o reactivar. Parece que "no cambia".
- La tarjeta de llamado existe pero sin la fuerza del mockup (héroe, cuenta
  regresiva visible, asignación clara).

## Why

El usuario lo reportó probando worker+cliente y pidió la pantalla del mockup con
estructura y colores actuales.

## Scope

- Incluye: polling `GUEST_TICKET_POLL_MS` en `(public)/ticket.tsx` (10s, solo con
  pantalla enfocada y ticket activo); rediseño `CalledGuestTicket` (héroe con
  pill LLAMANDO, código + cuenta regresiva + barra, asignación con iniciales,
  aviso de tolerancia real, CTAs intactos); contratos.
- No incluye: cambios RLS (el polling usa el RPC ya autorizado), extensión de
  tolerancia al responder (la regla real se mantiene), fotos, números de sillón,
  SMS, push.

## Constraints

- Rama `uwu`; UI español; código/comentarios/tests inglés.
- Labels fijados por contrato intactos (`¡ES TU TURNO!`, `Vence a las …`,
  `Ya estoy aquí`, `Llego en 2 minutos`, tolerancia 5 min).
- Polling solo activo con foco + ticket no terminal; limpieza al salir.

## Decisions

- TDD: ON (Vitest). Rojo: constante de polling ausente.
- Delivery `ask-on-risk`; sin commit. Ruta inline.
- Verificación en vivo con el usuario (dos dispositivos/cuentas).

## Tasks

- [x] T1 — TDD rojo: polling en ticket + estructura del rediseño.
- [x] T2 — Polling RPC en `(public)/ticket.tsx`.
- [x] T3 — Rediseño `CalledGuestTicket` según mockup adaptado.
- [x] T4 — vitest + tsc: contratos 2/2; `tsc` limpio; suite 180/185 con los mismos
  5 preexistentes. Prueba en vivo pendiente del usuario (dos dispositivos).

## Authorized scope

Local en rama `uwu`. Sin push, PR, secretos ni operaciones remotas.

## Acceptance criteria

- [ ] Llamado del worker aparece en el celu del cliente en ≤10s sin tocar nada.
- [ ] Pantalla de llamado con héroe, cuenta regresiva, asignación y tolerancia.
- [ ] Contratos verdes; suite sin regresión.

## Progress

- T1–T2: contrato en rojo, polling cada 10s con limpieza al salir.
- T3: héroe con pill LLAMANDO, código + cuenta regresiva + barra, asignación con
  avatar, aviso de tolerancia real, CTAs intactos. Sin sillón/fotos/SMS (no
  existen) y sin extender tolerancia (regla real).
- T4: `tsc` limpio; suite 180/185 con los mismos 5 preexistentes. Sin commit.
