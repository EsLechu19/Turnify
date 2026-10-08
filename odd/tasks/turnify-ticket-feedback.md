# Resumen y Calificación de Turno

## Objetivo
Al finalizar un turno, mostrar un resumen claro de los datos y permitir una calificación opcional y segura del servicio recibido.

## Alcance
- **Backend (Supabase Migración `0025_ticket_feedback.sql`):** 
  - Se creó la tabla `ticket_calificaciones` que guarda la puntuación (1-5) y el comentario (opcional). 
  - Los comentarios poseen un estado de moderación (`pendiente`, `aprobado`, `rechazado`) y el Personal (Worker) sólo puede consultar comentarios de su autoría que ya hayan sido **aprobados**.
  - Los RPCs `calificar_ticket_invitado` y `calificar_mi_ticket` fueron implementados para recibir la valoración validando que el ticket se encuentre en estado `finalizado` y pertenezca al usuario (mediante validación por `auth.uid()` o el `capability` hash). Estas operaciones son **idempotentes** (un solo rating por ticket).
  - La función de lectura pública de guest `estado_ticket_invitado` fue extendida para exponer la fecha real de inicio y fin (`inicio_en`, `fin_en`), y las calificaciones preexistentes.
- **Frontend App (React Native):**
  - La pantalla de turno completado (`completed-guest-ticket.tsx`) ha sido actualizada. Muestra la duración en minutos calculada a partir de los timestamps del servidor.
  - Implementación visual de un componente de "5 Estrellas" (StarRating) donde el cliente invitado puede escoger su puntaje de forma interactiva y redactar comentarios que respeten el límite de 1000 caracteres, y que se oculta inteligentemente mostrando un mensaje de agradecimiento cuando la base de datos confirma el feedback.

## Entregables
- [x] Base de datos estructurada con la tabla `ticket_calificaciones` y migración 0025.
- [x] Restricciones de Row-Level Security y moderación predeterminada activas, protegiendo al negocio de spam o comentarios no moderados.
- [x] Lógica Frontend completa en React Native que expone la duración final real y acepta el input del cliente, consumiendo las nuevas API de la cola (`rateGuestTicket`).
- [x] Los Tests automatizados de base de datos (`ticket-feedback.test.ts`) han sido creados y validan los constraints y permisos (RLS).
- [x] El ecosistema se mantiene limpio de errores TypeScript (`typecheck` exitoso) y libre de secretos en el frontend.
