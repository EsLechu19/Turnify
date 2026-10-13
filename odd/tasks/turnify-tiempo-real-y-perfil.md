# turnify-tiempo-real-y-perfil — Realtime en Mis barberías + foto del trabajador

## Objective
1. Mis barberías se entera sola (aprobación visible sin reabrir).
2. El trabajador tuneea su cuenta: foto + nombre visible.

## Findings
- worker-shops solo recarga al enfocar; sin realtime ni poll. Resto de pantallas ya tienen realtime/poll.
- `0037` no pisó nada (0019 ya traía el mismo worker_intent).
- Sin buckets de Storage; `barberos` sin foto.

## Scope
- T1/T2 Realtime: poll 10 s en worker-shops mientras no tenga barbería o tenga pendientes (patrón invitado) + focus intacto. Sin backend (sin policies de lectura para realtime).
- T3/T4 Avatar: `0038` (columna `barberos.foto_url`, bucket público `avatares-barberos` con policies, RPC `actualizar_mi_foto_barbero`, `foto_url` en catálogo) + `expo-image-picker` + subida + ver en perfil propio, picker cliente y Equipo admin. Nombre visible ya editable (grant existe).

## Tasks
- [x] T1 — Test realtime en RED.
- [x] T2 — Poll + GREEN y suite.
- [x] T3 — Tests avatar en RED.
- [x] T4 — Migración + UI + apply + verify + GREEN.

## Authorized scope
Pedido explícito + standing en turnify-dev. Ruta inline. Credenciales fuera de memoria/repo.

## Acceptance
- Aprobado el ingreso, Mis barberías lo muestra solo en ≤10 s.
- Foto subida visible en perfil, catálogo cliente y Equipo; solo el dueño la cambia.

## Progress
- 2026-10-09: T1–T4 completadas. RED→GREEN; 0038 aplicada y verificada (columna, bucket, 3 policies, RPC solo-authenticated, catálogo). Full 250/255 mismos 5 preexistentes. Hallazgo: Supabase da execute a anon por defecto (revoke public no alcanza); otras funciones solo-authenticated podrían compartirlo — auditar. Credenciales limpiadas. Sin commit.
