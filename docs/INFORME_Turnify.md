# [Nombre de Facultad]

**Carrera de [denominación oficial de la carrera]**

## Turnify: gestión de colas para barberías mediante turnos autogestionados desde el móvil

**Autores**

Apellidos, Nombres (Código Estudiante) — *[COMPLETAR]*

Apellidos, Nombres (Código Estudiante) — *[COMPLETAR]*

**Docentes**

Apellidos, Nombres [Docente 1] — *[COMPLETAR]*

Ciudad, Perú — *[COMPLETAR]*

Mes - Año — *[COMPLETAR]*

---

## Índice General

- Resumen
- 1. Problemática y/o necesidad
- 2. Objetivo general y específicos
- 3. Área Geográfica del Estudio
- 4. Marco Teórico
- 5. Estado del Arte
- 6. Descripción de la Innovación Propuesta
  - 6.1. Comercialización Colectiva
  - 6.2. Impacto de la tecnología
- 7. Plan de trabajo
  - 7.1. Actividades del Proyecto
  - 7.2. Riesgos del proyecto
  - 7.3. Factores Económicos y Comerciales
- 8. Metodología y Estrategias
- 9. Resultado de Análisis con Machine Learning
- 10. Presupuesto
- 11. Conclusiones y recomendaciones
- 12. Bibliografía
- ANEXO 1 · ANEXO 2

---

## Resumen

Turnify es una plataforma de gestión de colas para barberías compuesta por una aplicación móvil (Expo/React Native, Android) y un panel web de administración. El cliente genera su turno por sí mismo escaneando el código QR del local o ingresando el código del negocio, sin crear cuenta ni instalar nada adicional: elige servicio y barbero, recibe un código visible y sigue su posición y espera estimada en tiempo real, con aviso al ser llamado. El trabajador opera la cola (llamar, iniciar, finalizar, ausencias, reasignaciones y tickets manuales de excepción) y el administrador gestiona catálogo, equipo, historial, configuración del local y notificaciones push ante el llamado. El desarrollo siguió un flujo mobile-first con backend en Supabase (PostgreSQL, Row Level Security y funciones `SECURITY DEFINER`) y tableros de verificación automatizada (más de 360 pruebas). Los resultados muestran un flujo completo invitado-QR-ticket-llamado-atención-calificación operativo de extremo a extremo, con tiempos de espera estimados a partir de duraciones medidas y una tasa objetivo de autoservicio ≥95% como criterio de validación en pilotos. Se concluye que el autoservicio móvil es viable como flujo normal en barberías urbanas de Lima, reservando el ticket manual del trabajador como mecanismo de excepción medible.

**Palabras Clave:** gestión de colas, computación móvil, autoservicio, barberías, notificaciones push, aceptación tecnológica.

---

## 1. Problemática y/o necesidad

¿Como reducir el tiempo perdido en esperas presenciales y los turnos ausentes en barberías urbanas sin cargar trabajo administrativo al personal?

En barberías de alta demanda de Lima, la cola se gestiona de forma verbal o en papel: el cliente espera físicamente sin conocer su posición, el barbero interrumpe su trabajo para anotar llegadas y los ausentes desordenan la fila. Esto genera espera percibida alta, inequidad (quien reclama avanza) y pérdida de ingresos por sillas vacías. La pregunta de investigación es: ¿en qué condiciones un sistema de cola virtual autogestionada desde el smartphone reduce la fricción de espera y mejora el cumplimiento de turnos frente a la gestión manual?

---

## 2. Objetivo general y específicos

### 2.1. Objetivo general

Implementar una plataforma mobile-first que permita a los clientes de barberías autogestionar su turno desde su smartphone y al personal operar la cola en tiempo real, validando en pilotos una tasa de autoservicio exitoso ≥95%.

### 2.2. Objetivos específicos

- Implementar el flujo invitado (QR/código → servicio → barbero → confirmación → ticket con posición y espera en vivo).
- Implementar la operación del trabajador (disponibilidad, llamado con tolerancia configurable, atención, ausencias, reasignaciones y ticket manual de excepción).
- Implementar el panel del administrador (catálogo, equipo e invitaciones, historial y reportes, configuración del local, alertas operativas e ingresos estimados).
- Implementar notificaciones push ante el llamado, atadas a la sesión del ticket y revocables al terminar.
- Medir en pilotos la tasa de autoservicio y los casos que requieren intervención del trabajador.

---

## 3. Área Geográfica del Estudio

El estudio se circunscribe a barberías urbanas de Lima Metropolitana, Perú. Según la Encuesta Residencial de Servicios de Telecomunicaciones (ERESTEL 2025) de OSIPTEL, el 95,4% de hogares peruanos posee al menos un smartphone, cifra que en Lima Metropolitana alcanza el 99,2%, y el 97,2% de hogares cuenta con al menos un equipo móvil para conectarse a internet [1], [2]. El segmento objetivo —hombres jóvenes y adultos clientes de barberías— coincide con los grupos de mayor tenencia (91% entre 18–23 años y 94,9% entre 30–35 años). Se reconoce como límite que la tenencia en el hogar no equivale a disponibilidad individual en el momento de la visita (batería, datos, habilidad digital), por lo que el diseño conserva un mecanismo manual de excepción medible.

---

## 4. Marco Teórico

**Aceptación tecnológica (TAM).** Davis [3] establece que la adopción de un sistema depende de la utilidad percibida y la facilidad de uso percibida. Turnify se diseña sobre ambas: utilidad (ver posición y espera real, aviso al llamado) y facilidad (sin cuenta, sin instalación, tres pasos). La decisión de eliminar el registro manual como flujo normal se justifica en que añadir fricción administrativa reduce la facilidad percibida del conjunto.

**Teoría de colas y costo de espera.** La espera percibida supera al tiempo real cuando hay incertidumbre e inequidad. La cola virtual con posición visible, espera estimada y llamado nominal reduce el costo percibido frente a la cola física [4].

**Sistemas de información operativos en tiempo real.** Arquitectura de tres capas desacopladas (presentación móvil/web, lógica en funciones de servidor con control de acceso por roles, persistencia relacional con políticas a nivel de fila), con eventos de dominio (llamado, atención, finalización, ausencia) como única fuente de verdad del estado de la cola.

**Notificaciones push como canal finito.** Cada envío no esencial entrena el silencio del usuario; el canal se reserva a eventos críticos (llamado), siguiendo el principio de señal sobre ruido.

---

## 5. Estado del Arte

Milla y Salcedio [5] evidenciaron en el Perú que trasladar la interacción cliente–barbería al móvil elevó el cumplimiento de citas de 85,64% a 91,93% con diferencia significativa (Wilcoxon). Un proyecto de la Universidad de Lima orientado a barberías limeñas identificó a hombres jóvenes como cliente principal y reportó 35% de reducción del tiempo de búsqueda y reserva en su piloto [6]. A nivel internacional, estudios de 2024–2026 confirman que la gestión de servicios desde el móvil organiza el proceso [7] y que las colas virtuales reducen el costo percibido y mejoran la equidad frente a las físicas [4], con transparencia y justicia percibida asociadas a satisfacción y recomendación [8]. Como contrapeso, la implementación real de Babe Barbershop (2026) conservó un ingreso manual (“walk-in input”) [9], y la literatura sobre autoservicio advierte que el acceso no garantiza adopción, con mayor exclusión a mayor edad [10]. **Vacío identificado:** falta evidencia de un modelo mobile-first puro (sin registro manual como flujo normal) con tasa de autoservicio medida en barberías peruanas; Turnify lo implementa con el ticket manual relegado a excepción instrumentada.

---

## 6. Descripción de la Innovación Propuesta

Turnify sustituye la cola verbal/de papel por una cola virtual autogestionada: (i) app móvil Android con flujos de invitado (QR/código, catálogo, ticket en vivo con tolerancia y calificación), trabajador (Hoy, Cola, Historial, Cuenta, ticket manual) y notificaciones push ante el llamado; (ii) panel web con Inicio operativo (veredicto, cola viva, ingresos estimados, alertas), Servicios, Equipo, Historial y Configuración, además de Mi cuenta y auto-registro de nuevas barberías; (iii) backend Supabase con 50+ migraciones, RLS por roles y dispatcher de push con outbox de entrega garantizada. Indicadores: tasa de autoservicio, ausentes, espera promedio, satisfacción y cobertura de push en llamados.

### 6.1. Comercialización Colectiva

Modelo B2B2C: la barbería se registra y obtiene código QR de mostrador; sus clientes usan el servicio sin instalar nada. Escalamiento por local (código + QR propios), con el panel como herramienta de retención (reportes, ingresos estimados, configuración).

### 6.2. Impacto de la tecnología

Desplaza trabajo administrativo del barbero al bolsillo del cliente, transparenta la espera (posición y estimación en vivo), formaliza ausencias con tolerancia configurable y genera datos operativos (demanda por hora, mezcla de servicios, rendimiento por barbero) antes inexistentes en el local.

---

## 7. Plan de trabajo

### 7.1. Actividades del Proyecto

1. Flujo invitado y ticket en vivo (QR, catálogo, confirmación, tolerancia, calificación).
2. Operación del trabajador (jornada, cola, historial, cuenta, ticket manual).
3. Panel web (inicio operativo, servicios, equipo, historial, configuración, cuenta, registro).
4. Notificaciones push por capability y dispatcher con outbox.
5. Batería de verificación automatizada y pilotos con medición de autoservicio.

### 7.2. Riesgos del proyecto

| Riesgo | Mitigación |
|---|---|
| Clientes sin smartphone/disponibilidad | Ticket manual de excepción + medición de tasa |
| Migraciones no aplicadas en remoto | Procedimiento SQL documentado por archivo |
| Push sin entregar (secretos/entitlements) | Degradación a polling + haptics locales |
| Credenciales/demo en bundle | Variables por entorno, sin secretos en fuente |

### 7.3. Factores Económicos y Comerciales

Costos: infraestructura Supabase + Expo (escalables por uso), QR impreso por local (marginal), un dispositivo Android por barbería como mínimo operativo. Ingresos: suscripción por local y/o comisión; el ingreso estimado del panel sustenta la propuesta de valor.

---

## 8. Metodología y Estrategias

Enfoque cuantitativo aplicado con prototipado iterativo y verificación continua: cada incremento ( contrats de interfaz, RPC con pruebas de migración, pantallas con pruebas de contrato) se validó con suite automatizada (Vitest, 360+ pruebas) y revisión adversarial por apartados (distribución, honestidad de datos, accesibilidad). La medición en piloto sigue el protocolo: clientes totales vs. autogestionados vs. asistidos vs. imposibilitados, con umbral ≥95% de autoservicio para retirar el fallback. Estrategia de despliegue: APK por perfil `production` de EAS con versionado automático, panel web como SPA y base de datos migrada por archivos versionados.

---

## 9. Resultado de Analisis con Machine Learming

Con honestidad metodológica: el sistema implementa **estimación estadística operativa**, base para aprendizaje automático futuro, no modelos entrenados. Concretamente: (i) **duración sugerida por servicio** mediante mediana de las últimas 30 mediciones descartando valores atípicos superiores al doble de la mediana (robusto a interrupciones); (ii) **espera estimada** a partir de posición en cola y duración promedio por puesto; (iii) **línea base de demanda por hora** para el panel. Trabajo futuro: modelo predictivo de espera con regresión sobre hora/día/barbero y clasificación de riesgo de ausencia. Los resultados actuales son deterministas, auditables y sin caja negra, condición apropiada para un MVP operativo.

---

## 10. Presupuesto

| Rubro | Estimación |
|---|---|
| Infraestructura (Supabase + Expo/EAS, anual base) | S/ 0–400 (escala por uso) |
| Dispositivo Android operativo | S/ 600–1 200 (único) |
| Material QR por local | S/ 20–50 |
| Horas de desarrollo y pilotos | Valorizado por el equipo |
| **Total inicial estimado** | **S/ 620–1 650 + horas** |

---

## 11. Conclusiones y recomendaciones

Se implementó la plataforma completa: flujo invitado end-to-end, operación del trabajador, panel administrador y push ante el llamado, todo verificado automáticamente. El hallazgo central es de diseño: el autoservicio puede ser el flujo normal y el registro manual una excepción instrumentada y medible, en lugar de un módulo paralelo. Se recomienda pilotar con el protocolo de tasa de autoservicio, aplicar las migraciones pendientes en remoto antes de producción, configurar los secretos de push y no persistir capabilities fuera de memoria. Como trabajo futuro: predicción de espera con regresión, descubrimiento de barberías cercanas y panel limitado para barberos.

---

## 12. Bibliografía

[1] OSIPTEL, “Erestel 2025: cada vez más hogares peruanos cuentan con un smartphone,” 2025. [En línea]. Disponible en: https://www.osiptel.gob.pe/portal-del-usuario/noticias/erestel-2025-cada-vez-m%C3%A1s-hogares-peruanos-cuentan-con-un-smartphone-cu%C3%A1ntos-tienen/

[2] OSIPTEL, “Erestel 2025: aumenta a 96% los hogares peruanos que tienen acceso a internet fijo o móvil,” 2025.

[3] F. D. Davis, “Perceived usefulness, perceived ease of use, and user acceptance of information technology,” *MIS Quarterly*, vol. 13, n.º 3, pp. 319–340, 1989. https://doi.org/10.2307/249008

[4] “Virtual vs. physical queues,” *ScienceDirect*, 2025. https://www.sciencedirect.com/science/article/pii/S1447677025000427

[5] O. A. Milla y B. J. Salcedio, Tesis, Universidad César Vallejo, 2020. [En línea]. Disponible en: https://repositorio.ucv.edu.pe/bitstream/20.500.12692/55171/1/Milla_OAM-Salcedio_BJA-SD.pdf

[6] Proyecto CorteYA, Repositorio Universidad de Lima, 2025. [En línea]. Disponible en: https://repositorio.ulima.edu.pe/item/907a8e02-1a2f-4c0d-9687-09df3216e468

[7] “Barber Booking Mobile Application,” *Periodicals UTHM*, 2024. [En línea]. Disponible en: https://periodical.uthm.edu.my/index.php/aitcs/article/view/12005

[8] “Digital queues,” *Taylor & Francis Online*, 2026. [En línea]. Disponible en: https://www.tandfonline.com/doi/full/10.1080/02642069.2026.2727031

[9] “Babe Barbershop – Queue Management Study,” 2026. [En línea]. Disponible en: https://jurnal.unived.ac.id/index.php/jmcs/article/view/10153

[10] “Self-service technologies adoption,” *ScienceDirect*, 2016. [En línea]. Disponible en: https://www.sciencedirect.com/science/article/pii/S095905521600036X

---

## ANEXO 1

**EVIDENCIAS DE FUNCIONAMIENTO**

Capturas sugeridas: QR de mostrador, ticket en espera con posición, aviso de llamado con tolerancia, pantalla Hoy del trabajador, panel Inicio con cola viva. Flujos verificados por suite automatizada (bitácora de commits en el repositorio).

## ANEXO 2

**MATRIZ DE TRAZABILIDAD OBJETIVOS–EVIDENCIA**

| Objetivo específico | Evidencia |
|---|---|
| Flujo invitado | App móvil + pruebas `public-guest-flow`, `called-ticket-live` |
| Operación trabajador | Pantallas Hoy/Cola/Historial/Cuenta + ticket manual + pruebas worker |
| Panel administrador | Secciones Inicio/Servicios/Equipo/Historial/Configuración/Cuenta + pruebas web |
| Push ante llamado | Migración `0046`, dispatcher, `guest-call-push.test` |
| Medición en pilotos | Protocolo §8 + criterio ≥95% |
