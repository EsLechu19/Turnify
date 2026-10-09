# turnify-horario-lima-app — App y día operativo en hora peruana

## Objective
Toda la app mobile en America/Lima y el día operativo del servidor cortado a medianoche Lima.

## Problem
- App: formatos es-PE sin zona explícita + periodos de historial en hora del dispositivo.
- Servidor: `fecha_operativa` usa `current_date` (UTC) y el cierre compara contra UTC: el "día" se parte a las 19:00 Lima. Verificado en `0001` y `0002`/`0027`.

## Scope
- App: `timeZone: 'America/Lima'` en formatos; periodos del historial anclados a Lima (instantes absolutos, válido en cualquier TZ del dispositivo); countdowns intactos (ya son instantes absolutos).
- Servidor `0034`: default de `fecha_operativa` en Lima + `cerrar_tickets_vencidos` compara contra día Lima (conserva liberación de sillas de `0027`). Crons sin cambios (ausentes por minuto y cierre horario son agnósticos).
- Tests: `limaDayStart` con instantes fijos (determinista en cualquier TZ) + contrato `0034`.

## Tasks
- [x] T1 — Tests en RED.
- [x] T2 — Implementar + GREEN, suite sin regresiones, apply + verify en prod.

## Authorized scope
Pedido explícito + standing en turnify-dev. Ruta inline.

## Acceptance
- Historial hoy/semana/mes corta a medianoche Lima aunque el dispositivo esté en otra zona.
- Tickets creados de noche llevan fecha operativa Lima; el cierre no los barre a las 19:00.

## Progress
- 2026-10-09: T1–T2 completadas. RED→GREEN; aplicada en prod (cierre_lima=true). Full 223/228 mismos 5 preexistentes. Credenciales limpiadas. Sin commit.
