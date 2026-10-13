# Historias de Usuario — Turnify (App móvil + Panel web)

Formato: **Como** [rol], **quiero** [acción], **para** [beneficio]. Criterio de aceptación resumido por HU.

---

## PARTE 1 — APP MÓVIL (Android)

### Invitado (sin cuenta)

| ID | Historia de usuario | Aceptación |
|---|---|---|
| HU-M01 | Como cliente, quiero escanear el QR del local para entrar a la fila sin cuenta. | Lee QR Turnify/URL/crudo, vibra al detectar, navega a la barbería; QR inválido muestra error + reintento. |
| HU-M02 | Como cliente, quiero ingresar el código del negocio si no tengo cámara. | Valida formato, normaliza a mayúsculas, navega; código inválido muestra error. |
| HU-M03 | Como cliente recurrente, quiero repetir mi último código sin tipearlo. | Botón “Repetir {código}” en la sesión; navega directo. |
| HU-M04 | Como cliente nuevo, quiero entender cómo funciona en 3 pasos. | Card con servicio + seguimiento, sin redundar con el hero. |
| HU-M05 | Como trabajador, quiero llegar al login desde el inicio. | Link mínimo “Soy trabajador” fuera del flujo del cliente. |
| HU-M06 | Como cliente, quiero permiso de cámara explicado y recuperable. | Pide permiso con motivo; denegado ofrece reintentar o código manual. |
| HU-M07 | Como cliente, quiero ver la barbería identificada y si recibe turnos. | Nombre + estado + barberos disponibles; CTA único “Elegir servicio”. |
| HU-M08 | Como cliente, quiero saber qué hacer si está cerrada. | Card única de cerrado + Volver; sin catálogo ni botones muertos. |
| HU-M09 | Como cliente, quiero cómo llegar al local. | Dirección/punto + distancia/tiempo cuando hay datos. |
| HU-M10 | Como cliente, quiero elegir servicio con duración y precio ref. | Opciones con `~min` medido y `ref.` explícito; vacío con salidas. |
| HU-M11 | Como cliente, quiero elegir barbero o dejarlo flexible. | Solo compatibles; ocupado dice “En atención” con costo; flexible por defecto. |
| HU-M12 | Como cliente, quiero confirmar con solo mi nombre. | Nombre obligatorio; edad/género opcionales colapsados; steps honestos 2/3. |
| HU-M13 | Como cliente, quiero ver mi posición y espera en vivo. | Código héroe + puesto exacto + `~min` aproximado (nunca “0 min” falso); timeline; hora de actualización. |
| HU-M14 | Como cliente, quiero cancelar mi turno con confirmación. | Solo en espera/notificado; sheet que avisa la pérdida del lugar. |
| HU-M15 | Como cliente llamado, quiero responder si estoy o tardo 2 min. | Countdown con deadline real; respuesta con confirmación (irreversible); tolerancia visible. |
| HU-M16 | Como cliente en atención, quiero saber quién me atiende. | Barbero protagonista + “permanece en tu lugar”; sin números muertos. |
| HU-M17 | Como cliente atendido, quiero puntuar con confirmación. | Estrellas legibles + confirmación + gracias; sin tildes rotas. |
| HU-M18 | Como cliente ausente/cancelado, quiero una salida clara. | Pantalla terminal propia + “Sacar otro turno”. |
| HU-M19 | Como cliente, quiero reintentar cuando la red falla. | Todo fetch con error + Reintentar; sin pantallas colgadas. |

### Autenticación móvil

| ID | Historia de usuario | Aceptación |
|---|---|---|
| HU-M20 | Como trabajador, quiero iniciar sesión y caer en Mis barberías. | Valida formato, deshabilita en carga, “Entrando…”, link a registro. |
| HU-M21 | Como trabajador nuevo, quiero crear cuenta y pedir código. | Nombre/correo/clave + intent; confirma correo si aplica. |

### Trabajador (rol personal)

| ID | Historia de usuario | Aceptación |
|---|---|---|
| HU-M22 | Como barbero, quiero mi día en Hoy: disponibilidad tocable, métricas, siguiente y CTA única. | Disponible/fuera con guardado real; llamar/iniciar/finalizar según estado; equipo colapsado. |
| HU-M23 | Como barbero, quiero la Cola pura para llamar. | Lista + llamar por turno honesto; banner compacto si hay llamado; vacíos con salida. |
| HU-M24 | Como barbero, quiero ticket manual solo para quien no tiene celular. | Sin tab; nombre+servicio real+barbero compatible; sin teléfono obligatorio; recap previo. |
| HU-M25 | Como barbero, quiero mi Historial por periodo con métricas honestas. | Hoy/semana/mes, atendidos+ausentes+promedio con N, agrupado por día, reintento. |
| HU-M26 | Como barbero dentro de un local, quiero volver a mi cuenta en un tap. | Tarjeta “Estás en X” + Hoy / Cuenta personal / Servicios. |
| HU-M27 | Como barbero multi-local, quiero ver servicios por barbería. | Selector de barberías + solo sus servicios; fallback al actual. |
| HU-M28 | Como trabajador, quiero elegir dónde operar y unirme por código. | Lista con actual navegable, loadings separados, pendientes, logout con confirmación. |
| HU-M29 | Como trabajador, quiero mi perfil con foto y datos globales. | Foto + nombre/teléfono iguales en todos los locales; skeleton mientras carga. |
| HU-M30 | Como trabajador, quiero cambiar mi foto. | Picker + subida + aviso; demo simulado. |
| HU-M31 | Como trabajador, quiero cerrar sesión con confirmación. | Alert previo; la guardia redirige a login. |

### Cliente registrado (móvil)

| ID | Historia de usuario | Aceptación |
|---|---|---|
| HU-M32 | Como cliente registrado, quiero ver barberías, mi historial y mi perfil. | Rutas cliente separadas de personal por guardia de rol. |
| HU-M33 | Como dueño, quiero registrar mi negocio desde el móvil. | Formulario → `crear_empresa` → transición a admin con código + QR. |

---

## PARTE 2 — PANEL WEB (administrador)

### Acceso y cuenta

| ID | Historia de usuario | Aceptación |
|---|---|---|
| HU-W01 | Como admin, quiero entrar solo yo (barbero rebotado con mensaje neutro). | Login admin-only, icono de entrar, rebote sin rojo de error. |
| HU-W02 | Como dueño nuevo, quiero registrar mi cuenta y mi barbería solo. | `/register` → cuenta → local + código del mostrador en grande. |
| HU-W03 | Como admin, quiero mi foto, nombre y clave en Mi cuenta. | Foto vía RPC espejo del worker, nombre con refresh de header, clave con confirmación. |

### Inicio (hoy en vivo)

| ID | Historia de usuario | Aceptación |
|---|---|---|
| HU-W04 | Como admin, quiero el estado del día con su siguiente acción. | Veredicto + siguiente código + Ver equipo / Ver historial. |
| HU-W05 | Como admin, quiero métricas sin duplicar ni flechas mentirosas. | Atendidos, en atención, espera y ausentes con tendencia semántica. |
| HU-W06 | Como admin, quiero alertas que lleven donde se resuelven. | Silla trabada/llamado sin barbero/espera larga/pico ausentes, cada una con botón. |
| HU-W07 | Como admin, quiero ver la cola viva de lectura. | Espera/llamado/atención con siguiente marcado; sin acciones (operan en móvil). |
| HU-W08 | Como admin, quiero el dinero estimado del día. | Finalizados × precios ref., etiquetado estimado, con conteo. |
| HU-W09 | Como admin, quiero abrir/cerrar el local desde el header. | Toggle instantáneo con rollback; badge + sidebar reflejan estado real. |

### Servicios

| ID | Historia de usuario | Aceptación |
|---|---|---|
| HU-W10 | Como admin, quiero CRUD de servicios con duración y precio ref. | Crear/editar/eliminar con validación; precio siempre con `ref.`. |
| HU-W11 | Como admin, quiero asignar barberos por servicio. | Checklist por miembro; la ficha absorbe la lista viva. |
| HU-W12 | Como admin, quiero filtrar y detectar catálogo muerto. | Búsqueda/estado/barbero; “sin asignar: no genera turnos”. |

### Equipo

| ID | Historia de usuario | Aceptación |
|---|---|---|
| HU-W13 | Como admin, quiero invitar por correo con código nominativo. | Genera, muestra 7 días de vigencia, copiar; a miembros responde sin explotar. |
| HU-W14 | Como admin, quiero aprobar/denegar solicitudes con confirmación. | Denegar pide confirmación; errores visibles con reintento. |
| HU-W15 | Como admin, quiero editar sin pisar turnos en vivo. | Bloqueo honesto si está en atención; disponibilidad solo disponible/fuera. |
| HU-W16 | Como admin, quiero desactivar/reactivar con consecuencias claras. | Confirmación que explica revocación e historial conservado. |
| HU-W17 | Como admin, quiero ver turno actual y ritmo por miembro. | Columna turno actual; `min/servicio` (no “corte”). |

### Historial y Configuración + marco

| ID | Historia de usuario | Aceptación |
|---|---|---|
| HU-W18 | Como admin, quiero historial filtrable por barbero/servicio/estado/rango. | Filtros + paginación + conteos coherentes. |
| HU-W19 | Como admin, quiero demanda por hora, mix y rendimiento por barbero. | Gráficos propios (no duplicados de Inicio) + CSV + impresión. |
| HU-W20 | Como admin, quiero renombrar mi barbería con refresh vivo. | Campo validado + header/sidebar actualizados al guardar. |
| HU-W21 | Como admin, quiero abrir/cerrar, tolerancias, QR y ubicación. | Switch instantáneo; QR con copy honesto; picker + dirección canónica. |
| HU-W22 | Como admin, quiero guardar con estado honesto y descartar con confirmación. | Badge guardado/sin guardar + timestamp; descarte confirmado. |
| HU-W23 | Como admin, quiero campana viva e identidad real en el marco. | Badge con conteo → Inicio; avatar/rol de sesión; un solo logout; sin buscador falso. |

---

*Total: 33 HU móvil + 23 HU web = **56 historias**. Criterios resumidos; el detalle ejecutable vive en el código y su suite (360+ pruebas).*
