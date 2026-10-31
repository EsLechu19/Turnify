# turnify-dashboard-admin-overview — Dashboard administrativo de primera vista

## Objective
Ampliar el Inicio web para que el administrador entienda el estado operativo, la capacidad del equipo y las tendencias principales sin entrar primero a Historial.

## Problem
- El Inicio actual muestra operación en vivo, pero no demanda, rendimiento, satisfacción ni capacidad resumida.
- Historial ya tiene gráficos Recharts y el proyecto ya depende de `recharts`; no hace falta instalar otra librería.
- Hay fuentes existentes (`fetchDailySummary`, `fetchDemandEstimate`, `fetchRatings`, `computeServiceMix`) que todavía no se consumen desde Inicio.
- Los ingresos actuales son estimados cruzando tickets con el precio actual del catálogo por nombre; no deben presentarse como facturación definitiva.

## Scope
- Mantener la grilla P0 de Inicio y agregar un resumen administrativo debajo de la operación primaria.
- Agregar KPIs de resumen diario, capacidad visible del equipo, satisfacción con tamaño de muestra, demanda real vs estimada por hora y mezcla de servicios.
- Cargar cada bloque de forma tolerante: si falla una métrica secundaria, no debe desaparecer la cola ni romper todo el dashboard.
- Reutilizar Recharts; no agregar dependencias.
- No modificar mobile, backend, migraciones, pagos ni el significado de los ingresos estimados.

## Tasks
- [x] T1 — Crear `DashboardOverview` con carga coordinada y tolerante de resumen, demanda y puntuaciones.
- [x] T2 — Agregar KPIs administrativos y capacidad del equipo sin duplicar la cola principal.
- [x] T3 — Agregar gráficos de demanda real vs estimada y mezcla de servicios.
- [x] T4 — Integrar el overview en `DashboardPage` y mantener el refresco operativo existente.
- [x] T5 — Añadir estilos responsive y estados vacíos/error por bloque.
- [x] T6 — Ejecutar typecheck, build y tests web relacionados; documentar limitaciones.

## Constraints
- Reutilizar `recharts` ya presente en `apps/web/package.json`.
- Mantener los contratos actuales de `QueueContext`, `DashboardPage`, alertas y errores.
- Los gráficos deben detenerse en datos observables: no inventar ingresos, utilización ni tendencias que la fuente no pueda demostrar.
- El dashboard inicial debe seguir priorizando cola, alertas y estado del local por encima de los gráficos.

## Acceptance
- Al entrar a Inicio se ven operación en vivo, capacidad del equipo, resumen diario y al menos dos tendencias útiles.
- Una falla de demanda, ratings o resumen no oculta la cola ni las alertas.
- La demanda horaria distingue claramente datos reales de baseline estimado.
- La satisfacción muestra cantidad de votos o deja claro que no hay muestra.
- El layout funciona en escritorio y colapsa sin overflow en pantallas pequeñas.
- Typecheck, build y tests web aplicables pasan.

## Progress
- 2026-10-20: análisis aprobado por el usuario; implementación iniciada sobre el P0 existente.
- 2026-10-20: `DashboardOverview` integrado con resumen diario, capacidad, satisfacción, demanda real vs baseline y mezcla de servicios.
- 2026-10-20: Carga secundaria aislada con `Promise.allSettled`; una falla de resumen, demanda o ratings no derriba cola ni alertas.
- 2026-10-20: Agregado indicador de última actualización del overview y estados vacíos/error honestos.
- 2026-10-20: typecheck, build y 14 tests web existentes pasan. Build conserva warning preexistente de chunk >500 kB.
- 2026-10-20: Limitación: no se agregó utilización real ni ingresos definitivos; las fuentes actuales no los garantizan.
- 2026-10-20: Revisión nativa de reliability aprobada sin hallazgos; autoridad reconocida y consumida. `git diff --check` OK.
- 2026-10-20: Sin commit; cambios permanecen en working tree junto con el P0 y sus documentos ODD.

## Changed files
- `apps/web/src/features/dashboard/DashboardPage.tsx`
- `apps/web/src/features/dashboard/components/DashboardOverview.tsx`
- `apps/web/src/styles/app.css`
