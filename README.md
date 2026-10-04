# Turnify — estado de implementación

Turnify es un MVP de gestión de filas: las personas toman un turno desde la aplicación móvil y los negocios administran la atención en tiempo real. El producto cuenta con una aplicación móvil Expo, un workspace web preparado con Vite + React y una base de datos Supabase.

## Estado actual

| Área | Estado | Evidencia principal |
|---|---|---|
| Base del MVP | Completada | Aplicación móvil, workspace web preparado, tipos compartidos y migraciones Supabase disponibles. |
| Fase 3 — Cliente | Completada con una medición pendiente | C1–C5 completadas; el walkthrough funcional fue satisfactorio. |
| Fase 4 — Personal y administrador | Completada | A1–A6 completadas y validadas en dispositivos/cuentas separadas cuando corresponde. |
| Fase 5 — Push y no-show | Completada | F5-T01–F5-T07 completadas; validación física en Android development build. |
| Fase 6 — Dashboard | Pendiente | El siguiente trabajo es elaborar el brief del dashboard. |

## Producto

- **Cliente:** registro e inicio de sesión, ingreso por QR o código, vista previa de la fila, toma de turno, seguimiento en vivo, cancelación, historial y perfil.
- **Personal y administrador:** registro de negocio, código/QR, cola en vivo, atención de turnos, turnos presenciales, invitaciones y configuración.
- **Notificaciones:** aviso remoto cuando el turno pasa a `llamado`, sin reemplazar la automatización de ausencias.

## Trabajo completado

### Fundación

La base se cerró antes de la Fase 3 mediante las tareas **T1–T8** de `turnify-mvp-base` y las validaciones vivas **V1–V4** de `turnify-live-validation`.

- **Decisiones de producto y plataforma:** aplicación móvil Android-first con Expo SDK 57 y Expo Router; workspace web con Vite, React y TypeScript preparado, pero sin dashboard implementado. Supabase (Postgres, Auth y Realtime) es el backend integral del MVP; la aplicación móvil usa solo la anon key y los secretos de proveedores permanecen en el servidor.
- **Dominio puro de filas:** la máquina de estados cubre `en_espera`, `notificado`, `llamado`, `en_atencion`, `finalizado`, `cancelado` y `ausente`; la cola ordena por llegada dentro de cada prioridad e intercala preferenciales según `preferencial_cada`. El ETA se deriva de las personas delante, el promedio y los puestos; el barrido de ausencias respeta la ventana de gracia. El dominio no importa Expo, React Native ni Supabase.
- **Contrato Supabase:** las migraciones base definieron el esquema en español, índices y RLS; las RPC y triggers concentran las escrituras de turnos y las transiciones. RLS protege el aislamiento por empresa y cliente, mientras que las reglas temporales —ausencias y cierre— se ejecutan en el servidor mediante `pg_cron`, no en el cliente.
- **Validación en vivo:** V1 comprobó RLS con usuarios reales; V2, concurrencia y la restricción de un turno activo; V3, los dos schedules de `pg_cron`, ausencias y cierre; V4, el recálculo del promedio, la publicación de Realtime y la limpieza de datos de prueba. Los hallazgos de extensiones y `search_path` quedaron corregidos en migraciones posteriores.

### Fase 3 — Cliente

| Entregable | Estado |
|---|---|
| C1 — Base Expo y cliente Supabase | Completado |
| C2 — Autenticación de cliente | Completado |
| C3 — Ingreso y toma de turno | Completado |
| C4 — Mi turno en vivo y cancelación | Completado |
| C5 — Historial y perfil | Completado |
| C6 — Verificación | Walkthrough funcional completado; pendiente únicamente la medición formal del flujo de toma de turno en menos de 30 segundos. |

La actualización de posición y estado se validó en vivo sin recargar. La medición formal de menos de 30 segundos sigue pendiente, pero no bloqueó las fases posteriores.

### Fase 4 — Personal y administrador

Todos los entregables A1–A6 están completados:

- A1: registro de negocio, código y QR.
- A2: cola en vivo y acciones de atención.
- A3: turno presencial normal y preferencial.
- A4: invitaciones y canje para personal.
- A5: configuración del negocio.
- A6: walkthrough de administración y personal con actualización en vivo.

### Fase 5 — Push y no-show

Todos los entregables F5-T01–F5-T07 están completados:

- Configuración del development build Android y límites de secretos.
- Registro, actualización y revocación segura de tokens del dispositivo autenticado.
- Entrega del aviso de turno `llamado` desde el servidor, con validación de la respuesta del proveedor.
- Manejo de notificaciones en la aplicación y navegación al turno desde una notificación en segundo plano.
- Validación física: recepción en primer plano y segundo plano, navegación al tocar la notificación, ausencia de aviso para `notificado` y preservación de la automatización de ausencias.
- Documentación operativa y correcciones de entrega/registro realizadas durante la validación.

**Seguimiento no bloqueante:** falta probar la navegación al turno cuando la aplicación se inicia desde cero al tocar una notificación. No se probó y requiere autorización separada para trabajo en dispositivo.

## Pendiente y fuera de bloqueo

| Trabajo | Estado | Alcance |
|---|---|---|
| Medición formal de toma de turno menor a 30 segundos | Pendiente | Fase 3; no bloquea el trabajo posterior. |
| Navegación desde notificación con inicio en frío | Seguimiento opcional no bloqueante | Fase 5; requiere validación en dispositivo. |
| Dashboard web | Pendiente | Fase 6; próximo brief. |

## Flujo de trabajo

El seguimiento vigente se organiza en **GitHub Project** e **issues**. Cada fase se desglosa en issues con alcance, evidencia y estado; el Project permite ver el avance de la fase y priorizar el siguiente bloque de trabajo.

1. Crear o actualizar el issue con el brief y los criterios de aceptación.
2. Vincularlo al GitHub Project y mantener su estado según la evidencia disponible.
3. Registrar pendientes y seguimientos no bloqueantes de forma explícita, sin presentarlos como trabajo completado.
4. Cerrar el issue cuando los criterios aplicables estén verificados y conservar los seguimientos opcionales como trabajo separado.

**Siguiente paso:** preparar el brief de la **Fase 6 — Dashboard** y abrir su issue en el GitHub Project.

## Estructura del repositorio

- `apps/mobile`: aplicación móvil Expo.
- `apps/web`: aplicación web Vite + React.
- `packages/types`: tipos compartidos.
- `supabase/migrations`: migraciones de base de datos.
- `docs/adr`: decisiones de arquitectura.
- `docs/operations/called-ticket-push.md`: procedimiento operativo para notificaciones de turno llamado.
- `odd/tasks`: registros de alcance, evidencia y estado por fase.

## Referencias de estado

- `odd/tasks/turnify-fase-3-cliente.md`
- `odd/tasks/turnify-fase-4-personal-admin.md`
- `odd/tasks/turnify-fase-5-push-no-show.md`
