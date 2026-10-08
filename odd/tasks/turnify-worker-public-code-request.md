# Incorporación de Personal mediante Código Público de Barbería

## Objetivo
Permitir que un usuario que ha creado una cuenta de Personal (`personal`) sin barberías asociadas solicite acceso utilizando el mismo código público que los clientes usan para formarse en la fila, transfiriendo al administrador la autoridad para aprobar o rechazar dicha solicitud.

## Alcance
- **Migración Backend (`0026_worker_public_code_request.sql`):** 
  - Se implementó la nueva RPC `solicitar_acceso_codigo_publico`, la cual evalúa el código proporcionado (`p_codigo`) e inserta una solicitud directamente en el estado `'requested'`, omitiendo la fase `'issued'` que usaban las invitaciones generadas internamente.
  - Para combatir el spam pero no romper la UI, el RPC se diseñó de manera idempotente (`ON CONFLICT DO NOTHING`) apoyado en un nuevo índice único modificado (`solicitudes_invitacion_personal_pendientes_idx`), el cual garantiza que no haya más de una solicitud de la misma persona activa (`issued` o `requested`) hacia la misma empresa, pero sin bloquear intentos futuros si la solicitud es rechazada (`rejected`).
  - Hay reglas estrictas (RLS y validaciones) que rechazan el intento si la persona ya posee una membresía activa con dicho establecimiento, asegurando el aislamiento del contexto operativo.
- **Frontend App (React Native):**
  - Se modificó la pantalla `worker-shops.tsx` para solicitar y explicar claramente que ahora deben "Ingresar el código público de la barbería".
  - Al no encontrar tiendas vinculadas, un trabajador es redirigido acá y visualiza las solicitudes pendientes (Ej: `Turnify · Esperando aprobación`), además de poder realizar nuevas solicitudes mediante la invocación a la API (`requestWorkerInvitation`).
- **Validaciones:**
  - El administrador (en la pantalla `/admin`) no ve cambios en su experiencia ya que la tabla subyacente y la visualización (`Mis solicitudes` / `Aprobar` / `Rechazar`) es transparente para solicitudes originadas por código público o por token efímero.

## Entregables
- [x] Base de datos actualizada con la migración `0026_worker_public_code_request.sql`.
- [x] Lógica de API en el cliente (`worker-membership-api.ts`) actualizada a consumir el nuevo RPC.
- [x] Interfaz `worker-shops.tsx` adaptada a la nueva realidad operativa.
- [x] Test de Backend automatizado en `worker-public-code-request.test.ts` con cobertura de mitigación de spam.
- [x] Toda la regresión completa superada: Typecheck impecable y 177 / 177 tests de `Vitest` pasando.