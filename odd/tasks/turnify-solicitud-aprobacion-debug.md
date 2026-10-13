# turnify-solicitud-aprobacion-debug — Diagnosticar aprobación de personal

## Objective
Hacer observable el error real al listar o aprobar solicitudes de personal y evitar que el panel esconda la causa detrás de mensajes genéricos.

## Findings
- `fetchShopWorkerRequests` y `resolveWorkerRequest` ya propagan `error.message` desde Supabase.
- `TeamPage` reemplaza ambos errores por mensajes fijos, impidiendo distinguir RPC ausente, permiso, solicitud vencida o conflicto de constraint.
- El RPC local de aprobación vive en `0022`, con ajustes de solicitudes en `0053–0055`; el estado remoto aún no está verificado.

## Scope
- Mostrar un mensaje seguro y útil derivado del error conocido, conservando fallback genérico.
- Agregar pruebas de contrato para no perder la causa del error.
- No modificar datos de Josue ni crear migración especulativa hasta conocer el error remoto exacto.

## Tasks
- [x] T1 — Preservar/traducir errores de solicitudes en TeamPage.
- [x] T2 — Tests y verificación web.
- [x] T3 — Corrección preparada localmente; queda aplicar la migración al Supabase remoto.

## Authorized scope
Pedido explícito del usuario sobre el fallo de aprobación; cambios locales del flujo de solicitudes.

## Acceptance
- El panel muestra la causa accionable cuando Supabase responde con un error conocido.
- La operación sigue recargando solicitudes/equipo tras éxito.
- No se mutan datos ni migraciones sin diagnóstico remoto.

## Progress
- 2026-10-13: diagnóstico inicial confirmado; implementación pendiente.
- 2026-10-13: `TeamPage` traduce localmente errores de RPC, permisos, solicitud ausente o resuelta, empresa faltante, conflicto y red; los detalles remotos desconocidos se acotan y filtran para no mostrar SQL o secretos.
- 2026-10-13: agregado `tests/web/solicitud-aprobacion-error.test.ts` para el contrato estático; aprobación/denegación exitosa conserva la recarga de solicitudes y equipo.
- 2026-10-13: evidencia local verde: `npx vitest run tests/web` (20 archivos, 79 tests), `npm --workspace turnify-web run typecheck` y `npm --workspace turnify-web run build` (build exitoso; solo warning preexistente de chunk >500 kB).
- 2026-10-13: causa raíz confirmada: `0018` exigía `perfiles.rol = 'personal'` y `perfiles.empresa_id = barberos.empresa_id`, pero `0019` hizo opcional `perfiles.empresa_id` para personal y trasladó la relación activa a `membresias_personal_empresa`; por eso `resolver_solicitud_invitacion_personal` crea primero la membresía y luego falla al insertar `barberos`.
- 2026-10-13: preparada localmente `supabase/migrations/0056_barbero_perfil_membresia.sql` con validación de membresía activa, sin modificar datos ni automatizar updates; agregado contrato en `tests/supabase/barbero-perfil-membresia.test.ts`.
- Limitación remota: la migración aún no fue aplicada al Supabase remoto; no se ejecutaron Supabase CLI, SQL remoto, migraciones, deploy ni push.
