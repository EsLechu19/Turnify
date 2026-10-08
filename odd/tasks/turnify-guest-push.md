# Notificaciones Remotas a Invitados (Guest Push Notifications)

## Objetivo
Enviar una notificación remota al cliente invitado cuando su ticket pase a llamado, después de resolver su identidad y recuperación por dispositivo.

## Alcance
- **Recuperación Segura:** Persistencia segura del ticket invitado (`GuestTicketAccess`) mediante `expo-secure-store` para conservar la capability de manera encriptada y recuperarlo entre reinicios sin crear cuenta.
- **Asociación de Dispositivo:** Refactorización de la tabla `dispositivos` y `notificaciones_salientes` para permitir vincular un Push Token con un `ticket_id` en lugar de un `cliente_id` (autenticado).
- **Entrega de Eventos:** El trigger `encolar_entrega_ticket_llamado` encola automáticamente la entrega hacia el dispositivo registrado del invitado al momento de transicionar al estado `llamado`.
- **Revocación Automática:** Implementación del trigger `trg_tickets_limpiar_dispositivos_invitado` que elimina el dispositivo registrado apenas el ticket transiciona a estado terminal (`cancelado`, `finalizado`, `ausente`).
- **Seguridad:** Los tokens y capabilities sensibles se mantienen en la capa segura (Secure Store y Hashes de Backend), fuera de la UI y logs.

## Entregables
- [x] Migración `0023_guest_ticket_push_notifications.sql` aplicada y cubierta con pruebas de regresión en Supabase.
- [x] Refactorización de la API de Expo Router `use-notification-lifecycle` para soportar registro e idempotencia del invitado basándose en el estado de `GuestFlowProvider`.
- [x] Actualización de `GuestFlowProvider` para persistir la capability efímera y recuperar de manera segura tras reiniciar la app.
- [x] Criterios de Aceptación verificados: 100% Typecheck y 163/163 Vitest en verde.
