# Experiencia Completa: Ticket Llamado y Extensión

## Objetivo
Completar la experiencia de "ticket llamado" (estado `llamado`): mostrar cuenta regresiva, confirmación de llegada en local, y una extensión automática única de dos minutos, cumpliendo estrictamente con la lógica autoritativa del backend.

## Alcance
- **Lógica de Extensión Única (Supabase Backend):** 
  - La migración `0024_called_ticket_extension.sql` permite éticamente y por única vez añadir `+ 2 minutes` a `llamado_vencimiento_en` cuando la respuesta del cliente cambia de nula a `llega_en_2_min`. 
  - Se modificó el trigger protector `proteger_vencimiento_llamado_ticket` permitiendo la alteración controlada.
- **Frontend App (Expo Mobile):**
  - La visualización en el cliente renderiza en tiempo real el código de ticket, la barbería, el servicio, barbero y un progreso decadente derivado de la hora de vencimiento autoritativa desde Supabase (`ticket.calledDeadlineAt`), y no desde un temporizador interno inseguro.
  - La acción `Ya estoy aquí` (presente) alerta al equipo sin modificar el deadline.
  - La acción `Llego en 2 minutos` (`llega_en_2_min`) dispara el RPC que solicita el tiempo extra, el servidor verifica que no haya superado el deadline, no lo haya usado antes y lo concede. A través del canal Realtime, esta fecha final es actualizada para todos los clientes (Worker y Guest) dinámicamente y la barra de progreso se reinicia o readapta su decay.
  - Se mejoró el copywriting a *"La tolerancia base es de 5 minutos"*, advirtiendo que ninguna acción de confirmar llegada recorta el tiempo y especificando que el personal es quien inicia la atención.
  
## Entregables
- [x] Migración `0024_called_ticket_extension.sql` implementada y aplicable local o remotamente.
- [x] Test de base de datos (`called-ticket-extension.test.ts`) creado y verificado.
- [x] Ajuste visual y textual en `called-guest-ticket.tsx` para reflejar el comportamiento.
- [x] Los Tests de frontend (`called-ticket-customer-response.test.ts`) actualizados para evaluar los nuevos textos.
- [x] La suite `Vitest` sigue impecable con **170 / 170 tests exitosos**, garantizando regresión segura sobre todas las políticas del servidor y la lógica móvil.
- [x] Las restricciones estructurales de `GuestFlowProvider` prohíben que el cliente intente tramitar otra fila mientras tiene este ticket efímero vivo en base a las cookies seguras habilitadas previamente.