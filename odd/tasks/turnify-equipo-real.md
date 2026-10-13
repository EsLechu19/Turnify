# turnify-equipo-real — Plantilla con guardado real, sin email

## Objective
Lo que se edita en Equipo persiste en el backend; el email deja de ser obligatorio (desaparece: no existe en el servidor).

## Findings
- `barberos` no tiene email/turno/descanso/estación; `perfiles` solo nombra al dueño.
- Sin RPC admin para operar personal; `cambiar_mi_estado` es propio.
- `ocupado` es del sistema; `descanso` no existe en el backend.

## Scope
- `0039`: RPC `actualizar_barbero_personal` (nombre, disponibilidad sin ocupado, activo con guards de turno activo, pivot validado; desactiva revocando membresía).
- TeamPage: edición real (nombre, disponibilidad disponible/fuera, activo, servicios); fuera email, rol editable, estación, turnos, descansos, alta local y tarjeta de descansos.
- Tests + apply + verify en prod.

## Rules
- Sin turno activo para pasar a fuera/inactivo; `ocupado` rechazado.
- Desactivar conserva historial; reactivar restaura membresía.

## Tasks
- [x] T1 — Tests en RED.
- [x] T2 — Implementar + GREEN, suite sin regresiones, apply + verify.

## Authorized scope
Pedido explícito + standing en turnify-dev. Ruta inline.

## Acceptance
- Editar/desactivar/reamentar persiste y recarga; recargar la página lo conserva.

## Progress
- 2026-10-09: T1–T2 completadas. RED→GREEN; 0039 aplicada (grants + guard admin verificados sin mutar). Full 253/258 mismos 5 preexistentes. Credenciales limpiadas. Sin commit.
- 2026-10-09: fix guardado fantasma + ritmo medido por barbero (fuera 480 fijo). Suite 253/258 mismos 5 preexistentes. Sin commit.
- 2026-10-09: fix guardado fantasma: tras guardar se recargan equipo Y servicios (los checks mostraban datos viejos). Suite 253/258 mismos 5 preexistentes. Sin commit.
