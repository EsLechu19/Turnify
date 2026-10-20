# Turnify

> Gestión de turnos virtuales para establecimientos de servicios.

Turnify permite que los clientes soliciten un turno virtual, consulten su posición en tiempo real y reciban actualizaciones sin permanecer físicamente en una fila.

## Demo

Agregar aquí capturas o un video:

- Pantalla de bienvenida
  
  <img width="542" height="906" alt="image" src="https://github.com/user-attachments/assets/c345ad91-5ed1-45a9-8415-aeb9155ce1d5" />

- Pantalla del turno del cliente
- Panel de gestión del establecimiento

## Problema

Los clientes pierden tiempo esperando en filas físicas sin conocer:

- Cuántas personas tienen delante
- Cuánto deberán esperar
- Cuándo deberían regresar al establecimiento

Los establecimientos también necesitan una herramienta simple para administrar sus colas y consultar sus tiempos de atención.

## Funcionalidades principales

### Cliente

- Solicitar un turno mediante código o código QR
- Recibir un número de turno
- Consultar las personas que tiene delante
- Consultar el tiempo estimado de espera
- Recibir actualizaciones en tiempo real
- Ver el turno actualmente atendido

### Establecimiento

- Registrar un establecimiento
- Administrar una cola
- Llamar al siguiente cliente
- Marcar turnos como atendidos
- Marcar clientes como ausentes
- Consultar estadísticas básicas:
  - Turnos atendidos por hora
  - Tiempo promedio de espera
  - Porcentaje de ausencias

## Arquitectura

```text
Aplicación móvil React Native
            │
            ▼
API REST NestJS
            │
            ├── Prisma ORM
            │       │
            │       ▼
            │   PostgreSQL en Supabase
            │
            └── Socket.IO
                    │
                    ▼
          Actualizaciones en tiempo real
La aplicación móvil se comunica con el backend mediante una API REST.
Socket.IO permite transmitir eventos en tiempo real, como:
- Turno emitido
- Avance de la cola
- Turno llamado
- Turno actualizado
Modelo de dominio
Establecimiento
        └── Cola
                └── Turno
En la versión 1.0 cada establecimiento administra una única cola.
Ciclo de vida de un turno:
EN_ESPERA
    │
    ▼
LLAMADO
    │
    ├── EN_ATENCION ──► FINALIZADO
    │
    ├── AUSENTE
    │
    └── CANCELADO
Desafíos técnicos
Numeración atómica de turnos
Los números deben ser únicos y secuenciales incluso cuando varios clientes solicitan un turno simultáneamente.
Turnify utiliza una transacción de PostgreSQL con bloqueo de fila:
SELECT ... FOR UPDATE
El contador de la cola y la creación del turno se ejecutan dentro de la misma transacción. Si la creación falla, el contador también se revierte.
Sincronización en tiempo real
Los cambios de cada cola se publican mediante salas de Socket.IO:
cola:{idDeLaCola}
Los eventos se emiten solamente después de confirmar correctamente la transacción de base de datos.
Gestión de ausencias
Un turno puede marcarse como ausente después de:
- Dos minutos de tolerancia
- Dos llamados sin respuesta
La cola continúa avanzando y el cliente puede volver a ingresar una vez al final de la cola.
Cálculo del tiempo estimado
El tiempo estimado utiliza un promedio móvil ponderado. Los tiempos de atención más recientes tienen mayor influencia que los antiguos.
Tecnologías utilizadas
Aplicación móvil
- React Native
- Expo SDK 57
- TypeScript
- Expo Router
- NativeWind
- React Native Reanimated
- React Native Gesture Handler
- TanStack Query
- Socket.IO Client
- Expo Camera
Backend
- Node.js
- NestJS
- TypeScript
- Prisma
- Socket.IO
- API REST
Base de datos
- PostgreSQL
- Supabase
- Prisma
- Transacciones y bloqueos de fila
Estructura del proyecto
turnify/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── scripts/
│   │   └── seed.mjs
│   └── src/
│       ├── queue/
│       ├── registration/
│       ├── turno/
│       └── main.ts
│
├── mobile/
│   ├── app/
│   │   ├── index.tsx
│   │   ├── (client)/
│   │   └── (business)/
│   ├── components/
│   ├── lib/
│   ├── theme/
│   └── app.json
│
├── src/
│   ├── domain/
│   └── shared/
│
└── odd/
    └── tasks/
        └── turnify-v10.md
Pruebas
El proyecto incluye pruebas para:
- Reglas del dominio
- Transiciones de estados
- Numeración concurrente de turnos
- Rollback de transacciones
- Servicios del backend
- Cálculo de estadísticas
- Registro automático
- Gestión de ausencias
- TypeScript en la aplicación móvil
- Inicio de NestJS
- Verificación real contra Supabase
Resultados verificados:
Pruebas de dominio: 30 exitosas
Pruebas de backend: 57 exitosas
Typecheck móvil: exitoso
Typecheck backend: exitoso
Cómo ejecutar el proyecto
Requisitos
- Node.js 20 o superior
- npm
- Android Studio o Expo Go
- Proyecto PostgreSQL en Supabase
Backend
cd backend
npm install
Crear backend/.env:
DATABASE_URL="tu-url-de-postgresql-de-supabase"
Nunca subas este archivo al repositorio.
Ejecutar el backend:
npm run build
npm start
Ejecutar las pruebas:
npm test
Cargar datos de demostración:
npm run seed
El backend se ejecuta en:
http://localhost:3000
Aplicación móvil
cd mobile
npm install
Para el emulador Android, crear mobile/.env:
EXPO_PUBLIC_API_URL="http://10.0.2.2:3000"
Iniciar Expo:
npx expo start
Abrir el proyecto utilizando una versión de Expo Go compatible con SDK 57.
Variables de entorno
Nunca subas secretos al repositorio.
backend/.env
mobile/.env
Utiliza los archivos .env.example como referencia.
Principios de desarrollo
Turnify utiliza:
- Arquitectura hexagonal
- Modelado orientado al dominio
- Organic Driven Development
- Commits organizados por unidades de trabajo
- Pruebas junto al comportamiento
- Reglas de negocio explícitas
- Verificación basada en evidencia
Documentación técnica
Las decisiones, reglas, criterios de aceptación y progreso del proyecto se encuentran en:
odd/tasks/turnify-v10.md
Documentación futura:
docs/
├── arquitectura.md
├── reglas-del-dominio.md
├── api.md
├── eventos-realtime.md
├── despliegue.md
└── pruebas.md
Roadmap
v1.0
- Colas virtuales
- Turnos para clientes
- Gestión de colas
- Actualizaciones en tiempo real
- Gestión de ausencias
- Estadísticas básicas
- Acceso mediante código y QR
v1.1
- Autenticación y roles
- Múltiples servicios por establecimiento
- Notificaciones push
- Historial de turnos
- Compartir turnos
- Migraciones formales de Prisma
- Despliegue en producción
Licencia
Este proyecto se desarrolla actualmente como proyecto universitario.
