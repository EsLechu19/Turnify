# 💈 Turnify

### Plataforma de gestión de turnos y colas en tiempo real para barberías

**Turnify** es una plataforma de gestión operativa que permite a las barberías organizar sus colas de atención, coordinar al personal y ofrecer a sus clientes una experiencia de espera más transparente.

Los clientes pueden solicitar un turno mediante un código QR o un código de establecimiento, consultar su posición y recibir actualizaciones sin necesidad de permanecer físicamente en una fila.

La solución integra una **aplicación móvil, un panel administrativo web y un backend basado en Supabase**, con sincronización en tiempo real, control de acceso por roles y reglas de negocio ejecutadas en el servidor.

**Estado:** En desarrollo y validación · **Enfoque:** Mobile-first · **Mercado inicial:** Barberías

**Tecnologías principales:** React Native · Expo · React · TypeScript · PostgreSQL · Supabase · Realtime

---

## 📱 Demostración visual

### Aplicación móvil — Bienvenida

Pantalla de entrada a Turnify, desde la cual los clientes pueden comenzar el proceso para obtener un turno.

![Pantalla de bienvenida de Turnify](https://github.com/user-attachments/assets/c345ad91-5ed1-45a9-8415-aeb9155ce1d5)

### Aplicación móvil — Seguimiento del turno

Interfaz orientada a informar al cliente sobre el estado de su turno y el avance de la atención.

![Seguimiento de turno en Turnify](https://github.com/user-attachments/assets/842908ab-d7ff-43e3-a3d1-cab04b418788)

### Panel web — Administración del establecimiento

Herramienta para consultar la actividad del negocio, supervisar la cola y acceder a las funciones administrativas.

![Dashboard administrativo de Turnify](https://github.com/user-attachments/assets/6ba54647-c417-4439-bd4c-4a828daad3e1)

> Las capturas son referencias visuales del desarrollo. Algunas pantallas pueden diferir de la interfaz más reciente.

---

## 🎯 Problema que resuelve

En muchas barberías, los turnos todavía se organizan verbalmente o mediante listas manuales.

Esto genera dificultades tanto para los clientes como para los trabajadores:

- Los clientes desconocen cuántas personas tienen delante.
- Los tiempos de espera son difíciles de estimar.
- Los trabajadores deben interrumpir la atención para administrar la fila.
- Las ausencias pueden afectar el orden y la disponibilidad del personal.
- Los administradores carecen de información centralizada sobre la operación diaria.

**Turnify busca reducir esta fricción mediante una cola digital que conecta a clientes, trabajadores y administradores.**

El objetivo no es implementar un sistema de reservas anticipadas, sino mejorar la gestión de los turnos de atención durante la jornada.

---

## ⚙️ ¿Cómo funciona Turnify?

1. **Acceso:** el cliente escanea el código QR de la barbería o introduce su código.
2. **Selección:** elige un servicio y, cuando corresponde, un profesional disponible o compatible.
3. **Turno:** confirma su solicitud y recibe un identificador.
4. **Seguimiento:** consulta su posición, el estado de la cola y una estimación de espera.
5. **Llamado:** el trabajador llama al siguiente cliente y el sistema actualiza el estado del turno.
6. **Atención:** el turno avanza hasta finalizar, cancelarse o marcarse como ausente, según las reglas del negocio.

Los cambios se sincronizan mediante los servicios de Supabase y mecanismos de actualización de estado.

---

## ✨ Funcionalidades principales

### 👤 Cliente

La experiencia del cliente está diseñada para reducir los pasos necesarios para obtener y consultar un turno.

- Acceso mediante código QR o código del establecimiento.
- Solicitud de turnos sin necesidad de crear una cuenta.
- Selección de servicio y profesional compatible.
- Visualización de posición en la fila.
- Consulta del tiempo estimado de espera.
- Actualización del estado del turno.
- Respuesta al llamado y visualización de la tolerancia disponible.
- Cancelación del turno cuando su estado lo permite.
- Notificaciones de llamado en entornos compatibles.
- Consulta pública de establecimientos mediante el flujo web disponible.

### ✂️ Trabajador

El personal utiliza la aplicación móvil para operar la cola de atención.

- Acceso mediante autenticación.
- Consulta de establecimientos asociados.
- Gestión de disponibilidad.
- Visualización de turnos pendientes.
- Llamado al siguiente cliente compatible.
- Inicio y finalización de atenciones.
- Registro de ausencias.
- Creación de turnos presenciales cuando el cliente no utiliza la aplicación.
- Consulta de servicios e historial operativo.
- Gestión de información del perfil.

### 🖥️ Administrador

El panel web está orientado al control operativo de la barbería.

- Registro y configuración del establecimiento.
- Dashboard con indicadores de la jornada.
- Consulta del estado de la cola.
- Gestión del catálogo de servicios.
- Administración e invitación de trabajadores.
- Consulta de disponibilidad y actividad del equipo.
- Historial de turnos y reportes.
- Configuración de tolerancias y parámetros operativos.
- Control del estado de apertura del establecimiento.
- Gestión de información de la cuenta.

Las funcionalidades se encuentran en diferentes etapas de desarrollo y validación. Su presencia en el código no implica que todas estén disponibles en una versión pública estable.

---

## 🏗️ Arquitectura del sistema

Turnify utiliza una arquitectura basada en servicios de Supabase, con aplicaciones cliente independientes y reglas críticas gestionadas desde PostgreSQL.

### Vista general

```text
                   TURNIFY
                      |
          +-----------+-----------+
          |                       |
          v                       v
    APLICACIÓN MÓVIL          PANEL WEB
    React Native / Expo       React / Vite
          |                       |
          +-----------+-----------+
                      |
                      v
                SUPABASE JS
                      |
            +---------+---------+
            |         |         |
            v         v         v
           Auth     Realtime    RPC
                                |
                                v
                          PostgreSQL
                         + RLS + SQL
                                |
                       Reglas de negocio
                       y operaciones de
                            turnos

       Edge Functions + cron + Expo Push API
                    |
                    v
              Notificaciones
```

### Aplicación móvil

Desarrollada con React Native, Expo y TypeScript.

Se encarga de la experiencia del cliente y de las operaciones del trabajador.

Utiliza Expo Router para la navegación, integración con cámara para códigos QR y servicios nativos para funcionalidades como notificaciones, ubicación y almacenamiento seguro.

### Panel administrativo web

Desarrollado con React, TypeScript y Vite.

Permite visualizar información operativa del establecimiento, administrar servicios y trabajadores, consultar reportes y modificar configuraciones.

El panel utiliza React Router y componentes de visualización para organizar la información.

### Backend — Supabase

Supabase proporciona la infraestructura principal del backend mediante:

- **PostgreSQL:** almacenamiento de información y reglas transaccionales.
- **Supabase Auth:** autenticación y gestión de sesiones.
- **Row Level Security (RLS):** políticas de acceso a datos.
- **Funciones RPC:** operaciones de negocio ejecutadas en PostgreSQL.
- **Supabase Realtime:** sincronización de información.
- **Edge Functions:** procesamiento de tareas específicas del servidor.
- **Tareas programadas:** ejecución de procesos temporales y operativos.

La elección de Supabase responde a la necesidad de centralizar las reglas de negocio y reducir la infraestructura propia que debe mantenerse durante el desarrollo del producto.

[📄 Consultar la decisión de arquitectura](docs/adr/0001-supabase-as-backend.md)

---

## 🔐 Seguridad e integridad de datos

Turnify incorpora mecanismos de control para proteger la información de los establecimientos y mantener la consistencia de las operaciones.

### Control de acceso

El modelo contempla diferentes perfiles de acceso, principalmente cliente, trabajador y administrador.

Las políticas RLS restringen las operaciones según el contexto y los permisos correspondientes.

### Operaciones mediante RPC

Las mutaciones críticas de los turnos se gestionan mediante funciones PostgreSQL, incluyendo funciones con `SECURITY DEFINER` y contexto de ejecución controlado.

Este enfoque permite centralizar operaciones como:

- Crear turnos.
- Llamar al siguiente cliente.
- Iniciar y finalizar atenciones.
- Registrar ausencias.
- Cancelar turnos.
- Validar condiciones de operación.

### Consistencia transaccional

Las operaciones que modifican el estado de la cola utilizan reglas del servidor y mecanismos transaccionales de PostgreSQL.

El objetivo es evitar inconsistencias cuando diferentes usuarios interactúan con una misma cola.

### Acceso de invitados

El flujo de invitados utiliza mecanismos de acceso específicos para consultar y administrar el turno autorizado, sin requerir una cuenta tradicional.

La validación sensible permanece en el backend.

---

## 🔄 Ciclo de vida de un turno

El sistema utiliza una máquina de estados para representar la evolución de cada turno.

```text
      EN_ESPERA
          |
          v
      NOTIFICADO
          |
          v
        LLAMADO
          |
          v
     EN_ATENCION
          |
          v
      FINALIZADO

 Estados alternativos:
 - AUSENTE
 - CANCELADO
```

El diagrama representa el recorrido principal. Algunas transiciones pueden omitir estados intermedios o terminar anticipadamente, según las condiciones de negocio.

La validez de las transiciones se controla desde el servidor.

### Gestión de ausencias

El establecimiento puede definir una ventana de tolerancia para los clientes llamados.

Cuando se supera el plazo correspondiente, las reglas del backend permiten procesar la ausencia.

El cálculo del vencimiento utiliza la configuración del negocio y el tiempo del servidor, evitando depender únicamente del dispositivo del cliente.

### Estimación de espera

Turnify incorpora cálculos de espera basados en información de los servicios y duraciones de atención.

Las estimaciones se presentan como valores aproximados, diferenciándolas de datos verificables como el estado o la posición del turno.

---

## 🔔 Actualizaciones en tiempo real y notificaciones

Turnify utiliza Supabase Realtime junto con mecanismos de actualización para mantener sincronizadas las vistas de clientes, trabajadores y administradores.

Los eventos y cambios relevantes incluyen:

- Creación de turnos.
- Cambios de posición.
- Llamados.
- Inicio y finalización de atención.
- Cancelaciones y ausencias.
- Cambios operativos del establecimiento.

### Notificaciones push

El repositorio incluye una Edge Function denominada `dispatch-ticket-calls`, encargada del procesamiento de notificaciones relacionadas con los llamados.

El flujo integra:

1. Registro de dispositivos compatibles.
2. Generación de entregas cuando un turno cumple las condiciones.
3. Procesamiento programado de entregas pendientes.
4. Comunicación con Expo Push API.
5. Seguimiento de los resultados de entrega.

El flujo de notificaciones ha sido validado en una compilación de desarrollo Android. Esto no supone que todas las condiciones de entrega o plataformas estén verificadas.

[📄 Documentación operativa de notificaciones](docs/operations/called-ticket-push.md)

---

## 🛠️ Tecnologías utilizadas

| Área | Tecnologías |
|---|---|
| Aplicación móvil | React Native, Expo SDK 57, TypeScript |
| Navegación móvil | Expo Router |
| Aplicación web | React 19, TypeScript, Vite, React Router |
| Visualización | Recharts |
| Backend | Supabase, PostgreSQL, funciones RPC |
| Autenticación | Supabase Auth |
| Seguridad | PostgreSQL RLS |
| Tiempo real | Supabase Realtime |
| Notificaciones | Expo Notifications, Edge Functions |
| Pruebas | Vitest, TypeScript |
| Organización | npm Workspaces, Git, ODD |

---

## 📂 Estructura del repositorio

Turnify está organizado como un monorepo para mantener las aplicaciones y los recursos compartidos dentro de un mismo proyecto.

```text
Turnify/
|
├── apps/
│   ├── mobile/              # App React Native + Expo
│   └── web/                 # Panel administrativo React
│
├── packages/
│   └── types/               # Tipos compartidos
│
├── supabase/
│   ├── migrations/          # Esquema y lógica SQL
│   ├── functions/           # Edge Functions
│   └── config.toml
│
├── src/
│   ├── domain/              # Reglas y modelos de dominio
│   └── data/                # Acceso y repositorios de datos
│
├── tests/
│   ├── domain/
│   ├── mobile/
│   ├── web/
│   ├── supabase/
│   ├── notifications/
│   └── stubs/
│
├── docs/
│   ├── adr/                 # Decisiones de arquitectura
│   └── operations/          # Documentación operativa
│
├── odd/
│   └── tasks/               # Tareas y especificaciones
│
├── scripts/
│   └── live-validation/     # Verificaciones de integración
│
├── package.json
├── vitest.config.ts
└── README.md
```

Esta estructura separa las interfaces, la lógica de dominio, la infraestructura de datos, las pruebas y la documentación del proceso de desarrollo.

---

## 🧪 Pruebas y calidad del software

La calidad del software es uno de los aspectos centrales del desarrollo de Turnify.

El proyecto utiliza Vitest y TypeScript para comprobar reglas funcionales y contratos de integración.

### Áreas cubiertas

- Reglas del dominio y transiciones de estado.
- Comportamiento de las colas.
- Operaciones de clientes y trabajadores.
- Contratos de acceso a datos.
- Reglas y migraciones de Supabase.
- Comportamiento de componentes y flujos web.
- Integración de notificaciones.
- Validación de tipos TypeScript.

La documentación técnica registra **más de 360 pruebas automatizadas de contrato** durante el desarrollo. La cantidad de pruebas y sus resultados deben verificarse nuevamente al actualizar el proyecto.

### Ejecutar pruebas

Desde la raíz del repositorio:

```bash
npx vitest run
```

### Verificar TypeScript

Aplicación móvil:

```bash
npm --workspace turnify-mobile run typecheck
```

Panel web:

```bash
npm --workspace turnify-web run typecheck
```

Estas verificaciones ayudan a detectar regresiones y errores antes de integrar cambios.

---

## 💻 Instalación y ejecución local

### Requisitos

- Node.js y npm compatibles con las dependencias del proyecto.
- Un proyecto Supabase configurado.
- Variables de entorno de las aplicaciones.
- Android Studio o un dispositivo compatible para ejecutar la aplicación móvil.

Para utilizar las funciones reales de Turnify, el proyecto de Supabase debe contar con el esquema, las políticas y las funciones correspondientes.

### 1. Clonar el repositorio

```bash
git clone https://github.com/EsLechu19/Turnify.git
cd Turnify
```

### 2. Instalar dependencias

```bash
npm ci
```

### 3. Configurar variables de entorno

Crear `apps/mobile/.env` a partir de `apps/mobile/.env.example`.

```dotenv
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_ROUTING_PROVIDER=
EXPO_PUBLIC_OPENROUTESERVICE_KEY=
```

Crear `apps/web/.env` a partir de `apps/web/.env.example`.

```dotenv
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Completar los valores con la configuración del entorno correspondiente.

**Importante:** no publicar claves privadas, tokens de servicio ni archivos `.env` que contengan información sensible. Las claves públicas utilizadas por los clientes deben estar protegidas por las políticas y permisos adecuados del backend.

### 4. Ejecutar la aplicación móvil

```bash
npm run mobile
```

Esto inicia el servidor de desarrollo de Expo.

Algunas funcionalidades nativas, especialmente las notificaciones push, requieren una compilación de desarrollo compatible y no pueden validarse completamente en Expo Go.

### 5. Ejecutar el panel web

```bash
npm run web
```

Esto inicia el entorno de desarrollo web mediante Vite.

### 6. Configurar el backend

La infraestructura de datos se encuentra en:

```text
supabase/migrations/
supabase/functions/
```

El entorno de Supabase debe configurarse con las migraciones y funciones aplicables antes de realizar pruebas funcionales contra el backend.

La instalación de dependencias y la ejecución de las interfaces no despliegan automáticamente la infraestructura remota.

---

## 🧠 Metodología de desarrollo

Turnify se desarrolla mediante un enfoque de ingeniería orientado a requisitos, reglas de negocio y validación.

Utilizo **ODD de Gentle-AI**, junto con prácticas de desarrollo guiado por especificaciones (SDD) y pruebas (TDD), para organizar el trabajo técnico.

### Flujo de trabajo

1. **Análisis:** identificación del problema y definición de requisitos.
2. **Especificación:** documentación del comportamiento esperado y criterios de aceptación.
3. **Arquitectura:** diseño de componentes, datos y responsabilidades.
4. **Planificación:** división del trabajo en tareas pequeñas y verificables.
5. **Implementación:** construcción incremental de funcionalidades.
6. **Pruebas:** validación de reglas, contratos y comportamientos.
7. **Revisión:** evaluación de resultados, corrección de problemas y documentación.

Durante el desarrollo utilizo agentes de inteligencia artificial como herramientas de apoyo para implementación, pruebas y refactorización.

Las decisiones técnicas, la revisión del código y la validación de los resultados forman parte de mi responsabilidad dentro del proceso.

Las especificaciones y tareas se documentan en el directorio [`odd/tasks/`](odd/tasks/).

---

## 📚 Documentación técnica

El repositorio incluye documentos que permiten profundizar en las decisiones y el funcionamiento de Turnify.

| Documento | Contenido |
|---|---|
| [Decisión de arquitectura](docs/adr/0001-supabase-as-backend.md) | Justificación del backend basado en Supabase |
| [Arquitectura y stack](docs/PROMPT_Arquitectura_Stack.md) | Componentes y tecnologías del proyecto |
| [Historias de usuario](docs/HU_Turnify.md) | Requisitos y criterios de aceptación |
| [Operación de notificaciones](docs/operations/called-ticket-push.md) | Flujo y validación de notificaciones Android |
| [Tareas ODD](odd/tasks/) | Especificaciones, cambios y seguimiento técnico |
| [Migraciones SQL](supabase/migrations/) | Evolución de la base de datos y reglas del backend |

---

## 🚧 Estado del proyecto y próximos pasos

Turnify continúa en desarrollo, con funcionalidades implementadas y procesos de validación técnica en curso.

El objetivo actual es consolidar una experiencia operativa confiable para establecimientos reales.

### Prioridades de evolución

- Estabilizar los flujos críticos de clientes, trabajadores y administradores.
- Seguir mejorando la experiencia de usuario de las aplicaciones.
- Ampliar la validación de integraciones y comportamiento en dispositivos reales.
- Mantener actualizadas las pruebas y la documentación técnica.
- Preparar pruebas piloto de operación en barberías.
- Evaluar los requisitos necesarios para un lanzamiento comercial.

La presencia de una funcionalidad en el repositorio no implica que esté terminada, desplegada públicamente o validada en producción.

---

## 👨‍💻 Desarrollo

**Esaú Lechuga Monge**

Estudiante de Ingeniería de Software, con enfoque en desarrollo backend y full stack.

Turnify forma parte de mi experiencia desarrollando productos de software, aplicando conocimientos de arquitectura, persistencia de datos, interfaces, seguridad, pruebas automatizadas y diseño de soluciones orientadas a problemas reales.

**Contacto**

[GitHub](https://github.com/EsLechu19) · [LinkedIn](https://www.linkedin.com/in/esau-lechuga-monge-12b720362/) · [Correo electrónico](mailto:esaulechuga1@gmail.com)

---

## 📄 Licencia

El repositorio no incluye actualmente una licencia de software abierta publicada. El acceso público al código no implica autorización automática para su reutilización, redistribución o uso comercial.
