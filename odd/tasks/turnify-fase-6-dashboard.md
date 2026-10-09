# turnify-fase-6-dashboard — Panel admin cableado a datos reales

## Objective
Convertir el panel web (hoy 100% mocks) en el panel del administrador con datos vivos de Supabase, incluyendo la tarjeta de puntuaciones.

## Problem
Evaluación 2026-10-09: shell, 6 vistas y kit UI listos (~70%); cableado real en 0%; auth falsa; 5 archivos importan mocks directo; sin tests web; sin rol admin; sin puntuaciones.

## Why
Pedido del usuario: el panel admin es el paso siguiente (Fase 6) y el destino de `metricas_puntuacion`.

## Scope (slices en orden)

### S1 — Auth admin real
- `RequireAuth` + `AuthContext` contra Supabase Auth; gate por rol `admin` (el mobile ya lo modela en `perfiles.rol`).
- `mockAccounts` jubilado tras flag env (mantener fixtures solo para dev sin backend).
- **Aceptación:** solo admin entra; no-admin rebota a `/login` con mensaje.

### S2 — Repositorios de lectura → Supabase (solo lectura; escrituras → S2b)

Decisión del usuario 2026-10-09: primero lectura viva. El Equipo del panel
(turnos, descansos, estaciones numeradas, alta por email) no existe así en el
backend y operar la cola como admin no tiene RPC equivalente; eso va en S2b
con decisiones de esquema/RPC.
- Cuerpos de `repositories.ts` (business, branch, queues, tickets, team, activity, serviceMix, services, history) contra tablas/RPC vigentes.
- Corregir los 5 imports directos a mocks (`TeamPage`, `QueuePage`, `StatusBadge`, `BarberStationsCard`, `HistoryPage`) a pasar por puertos.
- **Aceptación:** ninguna vista importa `data/mocks`; panel muestra datos del local seleccionado.

### S3 — Dashboard vivo + puntuaciones
- Cola en vivo, estaciones (`estaciones_de_mi_empresa`), resumen diario (`metricas_resumen`), demanda por hora con datos reales.
- Tarjeta de puntuaciones por barbero (`metricas_puntuacion`: votos + promedio).
- **Aceptación:** números = backend; estaciones y promedios coinciden con el mobile.

### S4 — Tests web
- Alta de Vitest en `apps/web` + contratos por contenido/puertos (frontera sin mocks directos, rutas, agregados).
- **Aceptación:** `npm --workspace turnify-web run typecheck`, `build` y tests en verde.

## Contratos servidor listos (no requieren migración nueva)
| Necesidad | RPC / tabla |
|---|---|
| Puntuaciones por barbero | `metricas_puntuacion()` |
| Estaciones en vivo | `estaciones_de_mi_empresa()` |
| Resumen y métricas | `metricas_resumen(uuid)`, `metricas_horas_pico(uuid)` |
| Catálogo/servicios/equipo | tablas `servicios`, `barberos`, `barbero_operaciones` (RLS mediante invoker) |
| Auth y rol | Supabase Auth + `perfiles.rol = 'admin'` |

## Fuera de alcance
- Cambios mobile; nuevos RPC (solo si aparece un gap contra los puertos); UI nueva más allá de la tarjeta de puntuaciones; `db push` ( innecesario: solo lecturas + auth).

## Checks por slice
- typecheck + build del workspace web; suite web nueva en verde; suite raíz sin regresiones; sin secretos en el repo (anon key vía `VITE_*` local, nunca commiteada).

## Progress
- 2026-10-09: brief creado.
- 2026-10-09: **S1 completada** (auth admin real + gate + login; fixtures tras flag env). typecheck + build web verdes. Sin commit. Para usarla hay que crear `apps/web/.env` (ver `.env.example`).
- 2026-10-09: fix loop de redirects: `RedirectIfAuthenticated` solo redirige a admin (no-admin se quedaba en blanco rebotando entre `/` y `/login`).
- 2026-10-09: **S2a completada** (lectura viva): labels fuera de mocks (0 imports directos en features), `data/live.ts` (empresa, filas, tickets, equipo, actividad, mix, servicios, historial, ratings), puertos async con fallback, contextos + 8 consumidores async. Escrituras siguen locales → S2b. typecheck + build verdes; suite raíz 212/217 mismos 5 preexistentes. Sin commit.
- 2026-10-09: **demanda estimada vinculada**: RPC `demanda_estimada()` (promedio por hora del mismo día de semana, 8 semanas) aplicada en prod; tarjeta sin números inventados + fallback solo-real. Suite 216/221 mismos 5 preexistentes. Sin commit.
- 2026-10-09: **hora Lima + resumen vivo**: `demanda_estimada` en America/Lima (`0033`, aplicada, lima_ok=true); web filtra y muestra horas en Lima; `Resumen del día` con datos vivos (atendidos, presentismo, ausentes, último cierre, tiempo prom., satisfacción; `—` sin datos). Suite 220/225 mismos 5 preexistentes. Sin commit. Nota: fecha operativa del servidor y sweeps siguen en reloj DB (UTC); cambiarlo es decisión aparte.
- 2026-10-09: **dashboard profesional**: tablero solo-lectura (fuera botones muertos, AVISAR, +5 y trends fijos); alertas operativas; ranking de satisfacción; comparativas reales vs ayer. Suite 228/233 mismos 5 preexistentes. Sin commit.
