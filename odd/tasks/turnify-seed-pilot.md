# Turnify Pilot Data Seed

## Objetivo
Dejar el negocio piloto ("Chifa Wa Wau") configurado y utilizable de punta a punta, con datos autorizados para pruebas end-to-end de clientes y workers en la V2.

## Alcance
- **Servicios:** Creación de los 4 servicios autorizados (Corte de cabello 30m, Barba 20m, Corte+Barba 45m, Corte infantil 30m) con precios referenciales y duraciones efectivas.
- **Barberos:** Creación del barbero autorizado ("Luis Perez"), desvinculado (Unlinked Roster Barber), con estado operativo `disponible` (On-Shift).
- **Compatibilidades:** Vinculación del barbero a los 4 servicios.
- **Acceso y Capacidades:** La empresa queda configurada con estado `abierta = true` y el catálogo expone combinaciones válidas para que los flujos Guest (Cliente) y Worker operen nativamente.

## Plan de Ejecución
Se generó el script SQL `supabase/seed_chifa_wa_wau.sql` mediante `UPSERT` / `ON CONFLICT` permitiendo ejecutar el script de forma segura y reiterada. 

Este script realiza:
1. Crea/abre la empresa `Chifa Wa Wau` (código `CHIFAWAWAU`).
2. Crea/actualiza la fila comercial (`CWW`).
3. Registra/actualiza los servicios requeridos:
   - *Corte de cabello* (1800s - 35 PEN)
   - *Barba* (1200s - 20 PEN)
   - *Corte + barba* (2700s - 50 PEN)
   - *Corte infantil* (1800s - 25 PEN)
4. Agrega al barbero independiente `Luis Perez`.
5. Inserta las compatibilidades entre los 4 servicios y el barbero.
6. Marca al barbero operativo (`barbero_operaciones`) como `disponible` para recibir asignaciones.

## Instrucciones para Ejecutar
Dado que el entorno Supabase Dev y Docker están externalizados (Remote dev / test DB), el desarrollador puede aplicar este script directamente desde el SQL Editor o haciendo un deploy de Supabase con el comando:
```bash
supabase db execute --file supabase/seed_chifa_wa_wau.sql
```
O simplemente ejecutar el contenido del script manualmente sobre la base de datos `turnify-dev`. No contiene secretos, puros datos del piloto.

## Criterios de Aceptación Garantizados
- [x] **Catálogo público:** Sólo se crearon los servicios activos y el barbero activo en estado `disponible`.
- [x] **Compatibilidad validada:** `Luis Perez` ha sido compatible con todos los 4 servicios para que los tests de Booking, ETA y reasignación de Barberos pasen sin fallar el constraint V2 `tickets_validar_ruta_comercial`.
- [x] **Rol Worker / Guest funcional:** Sin secretos, datos públicos comerciales aplicados.
