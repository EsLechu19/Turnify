# ADR 0001: Supabase como backend integral

- Estado: aceptada
- Fecha: 2026-09-29

## Contexto

Turnify necesita un backend para el MVP que sostenga colas por empresa con
varias sucursales lógicas (filas), tickets con ciclo de vida de siete estados
(`en_espera`, `notificado`, `llamado`, `en_atencion`, `finalizado`,
`cancelado`, `ausente`), roles (`cliente`, `admin`, `personal`), métricas
diarias y notificaciones de cercanía al turno. El equipo es pequeño, no hay
capacidad de operar infraestructura propia y el cliente móvil y web deben
compartir las mismas reglas sin duplicar lógica. Las migraciones
`supabase/migrations/0001` (esquema y RLS) y `0002` (RPC y disparadores) ya
definen ese contrato y no se han aplicado a ninguna base en vivo.

## Decisión

Se adopta Supabase (Postgres + Auth + Realtime) como backend integral del
MVP. Toda escritura de tickets pasa por funciones RPC `SECURITY DEFINER`
(`tomar_turno`, `llamar_siguiente`, `iniciar_atencion`, `finalizar_atencion`,
`marcar_ausente`, `cancelar_ticket`, `crear_ticket_presencial`), la lectura
agregada pública usa `resumen_empresa`, y las métricas con derechos del
llamante (`metricas_resumen`, `metricas_horas_pico`) respetan RLS. La
aplicación solo usa la clave anónima; nunca la clave de servicio.

## Criterios ponderados

| Criterio (peso) | Supabase | Firestore | API propia en Node | Solo local |
|---|---|---|---|---|
| Reglas transaccionales en SQL (30 %) | Alta: RPC con bloqueo `FOR UPDATE`, unicidad parcial y disparadores | Baja: sin transacciones cruzadas comparables | Alta, pero exige construirlo todo | Nula |
| Seguridad por defecto (25 %) | Alta: RLS como mecanismo de cumplimiento, RPC con `search_path` vacío | Media: reglas por documento, sin SQL | Media: depende del equipo | Nula |
| Velocidad con equipo pequeño (25 %) | Alta: Auth, Realtime y cron incluidos | Alta | Baja: operar y mantener | Alta al inicio, deuda después |
| Tiempo real y tareas periódicas (20 %) | Alta: Realtime sobre el resumen de filas, `pg_cron` para `marcar_ausentes` y `cerrar_tickets_vencidos` | Alta en tiempo real, débil en lotes | Media: hay que cablearlo | Nula |

## Alternativas rechazadas

- **Firestore**: modelo de documento incómodo para contadores diarios por
  fila, orden con carril preferencial y promociones (`revisar_avisos`);
  las reglas por documento no sustituyen las garantías transaccionales de
  Postgres.
- **API propia en Node**: máxima flexibilidad, pero obliga a construir y
  operar autenticación, autorización, tiempo real y trabajos periódicos para
  un MVP con equipo reducido.
- **Solo local (sin backend)**: viable para un prototipo de interfaz, pero
  impide compartir colas entre dispositivos, roles y empresas.

## Consecuencias

- **RLS como cumplimiento, no como sugerencia**: las políticas de la
  migración 0001 son la defensa real; el cliente nunca escribe tablas de
  tickets directamente.
- **`pg_cron` para reglas de tiempo**: `marcar_ausentes` (ventana de gracia
  por empresa) y `cerrar_tickets_vencidos` (cierre por fecha operativa) se
  ejecutan en el servidor; el cliente no calcula ausencias.
- **Realtime mediante el resumen de filas**: los clientes se suscriben a los
  contadores de `filas` (`en_espera`, `ultimo_llamado`) en lugar de a cada
  ticket, lo que reduce tráfico y exposición de datos personales.
- **Tipos generados**: `packages/types/database.ts` es un marcador manual
  hasta contar con base en vivo; entonces se regenera con
  `supabase gen types` y no se editan credenciales en el repositorio.
- **Push fuera del alcance**: el puerto de notificaciones queda declarado
  pero sin implementar; el aviso en app (`notificado`) cubre el MVP.
