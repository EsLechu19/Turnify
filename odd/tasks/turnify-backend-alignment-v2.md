# Turnify Backend Alignment V2 (Migraciones 0012 a 0022)

## Objetivo
Alinear el backend efectivo con el flujo operativo V2 implementado en el cliente móvil.

## Alcance
- **Migraciones revisadas:** `0012` a `0022` (incluye colas comerciales, ETA, asignaciones, reasignaciones de barberos, tickets de clientes invitados, setup de barberos y membresías de workers).
- **Validaciones:** Políticas RLS (Row Level Security), aislamiento entre negocios (Tenant Isolation), RPCs para operaciones comerciales, concurrencia en llamadas de tickets, control de capacidades por barbero y Realtime.
- **Roles validados:** `anon` (guest / cliente), `authenticated` (worker / admin).
- **Artefactos:** Registro de versión, evidencia de tests y procedimiento de rollback estructurado.

## 1. Registro de Versión Aplicada
- **Entorno:** `turnify-dev` (Authorized Environment)
- **Versión de la Base de Datos:** Último script aplicado `0022_worker_invitation_requests.sql`.
- **Estado de las dependencias locales:** `supabase-js` actualizado, pruebas de base de datos V2 con `vitest` completamente en verde.

## 2. Evidencia de Pruebas (Concurrencia, Aislamiento y Realtime)
Las políticas se han probado exhaustivamente en el entorno local antes del apply en `dev`. La ejecución de Vitest cubre todos los RPC y validaciones estáticas.

```text
> npx vitest run
✓ tests/supabase/commercial-queue-foundation.test.ts
✓ tests/supabase/commercial-assignment-and-eta.test.ts
✓ tests/supabase/public-guest-tickets.test.ts
✓ tests/supabase/worker-barber-operations.test.ts
✓ tests/supabase/called-ticket-customer-response.test.ts
✓ tests/supabase/worker-memberships.test.ts
✓ tests/supabase/independent-barber-roster.test.ts
✓ tests/supabase/called-ticket-delivery.test.ts
✓ tests/supabase/worker-invitation-barber-setup.test.ts
...
Test Files  33 passed (33)
Tests       163 passed (163)
```

**Verificaciones clave ejecutadas y aprobadas:**
1. **Aislamiento entre negocios (Tenant Isolation):** Un `worker` autenticado solo puede ver y operar sobre la cola (`tickets`) y los barberos (`barberos`) de la empresa en la cual tiene una membresía activa (`perfiles_empresas`).
2. **Rol Guest (Anon):** La lectura del catálogo (`catalogo_comercial`), creación de tickets y acceso de un cliente al estado de su ticket (`guest-ticket:ID`) opera solo bajo el capability del ticket. Un guest no puede leer o escribir fuera de su fila.
3. **Concurrencia y Capacidad (RPCs):** Los `RPC`s como `tomar_turno_comercial` y `asignar_barbero` impiden la sobreescritura paralela, comprobando la disponibilidad en tiempo de ejecución.
4. **Realtime:** Los triggers disparan correctamente sobre los channels específicos (p. ej., `guest-ticket:ID`) y no filtran información privada de la empresa a otros usuarios.

## 3. Procedimiento de Rollback (Plan de Contingencia)
En caso de identificar una falla crítica post-despliegue en `turnify-dev`, se define el siguiente protocolo de rollback descendente.

### Pasos de reversión:
Al no aplicar destructores (DROP CASCADE) prematuros y emplear código "additive-only", podemos deshacer las migraciones revirtiendo los cambios estructurales desde la `0022` hasta la `0012` si fuera necesario:

1. **Deshabilitar operaciones V2:** Apagar temporalmente el pool / pausar peticiones de la App V2 si existe una regresión de datos de cliente.
2. **Script de Rollback Estructural (`rollback_v2_to_v11.sql` - pseudo-código):**
   ```sql
   -- Revert 0022 a 0019 (Workers e invitaciones)
   DROP TABLE IF EXISTS public.invitaciones_personal;
   DROP TABLE IF EXISTS public.perfiles_empresas;
   DROP FUNCTION IF EXISTS public.responder_invitacion_personal;
   DROP FUNCTION IF EXISTS public.solicitar_invitacion_personal;

   -- Revert 0018 a 0014 (Barberos y reasignación)
   DROP FUNCTION IF EXISTS public.reasignar_barbero;
   DROP FUNCTION IF EXISTS public.iniciar_atencion;
   DROP FUNCTION IF EXISTS public.llamar_siguiente_comercial;
   DROP TABLE IF EXISTS public.barbero_operaciones;
   DROP TABLE IF EXISTS public.barberos;

   -- Revert 0013 a 0012 (Cola Comercial)
   DROP FUNCTION IF EXISTS public.tomar_turno_comercial;
   DROP FUNCTION IF EXISTS public.catalogo_comercial;
   DROP TABLE IF EXISTS public.servicios;
   ```
3. **Restaurar cliente V1:** Volver la rama productiva del frontend a la versión previa a V2.

## Criterios de Aceptación Cumplidos
- [x] **Documentación por entorno:** Queda registrada en este documento.
- [x] **Aislamiento y pruebas:** Validado mediante tests de integración (163 tests) de RLS y Supabase RPCs.
- [x] **Seguridad de roles:** Comprobada en el aislamiento de las políticas (Workers limitados a sus membresías, Guests limitados al JWT / Capability).
- [x] **Rollback:** Procedimiento claro de Drop de las tablas aditivas y RPCs definidos.
- [x] **Privacidad:** Ningún token de acceso, secret o cadena de conexión fue expuesto durante el análisis y validación.