# turnify-servicios-crud — Crear/editar/borrar persisten de verdad

## Objective
El catálogo se gestiona contra el backend: alta, edición y baja persisten y recargan.

## Findings
- `servicios`/`barbero_servicios` solo tienen SELECT; sin policies de escritura (a diferencia de `filas`).
- Borrado seguro por schema: pivot en cascada, tickets a `servicio_id` null (conservan nombre snapshot).
- `UNIQUE(empresa_id, nombre)`: duplicados dan error honesto.

## Scope
- `0040`: policies admin all en `servicios` + `barbero_servicios` (patrón `filas_admin_write`).
- Puertos `create/update/remove` async + pivot; ServicesContext async con rechazo; ServicesPage async con errores visibles.
- Tests + apply + verify en prod.

## Tasks
- [x] T1 — Tests en RED.
- [x] T2 — Implementar + GREEN, suite sin regresiones, apply + verify.

## Authorized scope
Pedido explícito + standing en turnify-dev. Ruta inline.

## Acceptance
- Crear persiste y sobrevive reload; duplicado avisa; borrar conserva tickets.

## Progress
- 2026-10-09: T1–T2 completadas. RED→GREEN; policies aplicadas (anónimo rechazado 42501 verificado). Full 255/260 mismos 5 preexistentes. Credenciales limpiadas. Sin commit.
