# turnify-dashboard-visual-polish — Orden visual del Inicio web

## Objective
Hacer que el dashboard web se perciba como un centro de control claro, consistente y fácil de escanear sin cambiar su comportamiento ni sus fuentes de datos.

## Problem
- El Inicio mezcla header, avisos, operación y overview sin un contenedor visual común.
- Hay demasiadas tarjetas con el mismo peso y una tarjeta de ingresos que contiene otras tarjetas dentro.
- Cola, alertas e ingresos usan estilos inline diferentes, por lo que las filas no se sienten parte del mismo sistema.
- Los avisos de error/carga también usan estilos inline y rompen la composición.

## Scope
- Reordenar y estilizar únicamente la pantalla web de Inicio.
- Unificar notices, cola, alertas, ingresos, métricas y overview administrativo.
- Dar prioridad explícita al header/estado, alertas y KPI antes de la cola; mantener el análisis administrativo en el mismo Inicio, debajo de la operación.
- Mantener datos, consultas, rutas, contratos y textos funcionales.
- No tocar mobile, Supabase, migraciones ni la pantalla SQL seleccionada por el usuario.

## Tasks
- [x] T1 — Envolver Inicio en un layout común y normalizar avisos.
- [x] T2 — Reemplazar estilos inline de cola y alertas por clases consistentes.
- [x] T3 — Aplanar RevenueCard para eliminar tarjetas anidadas.
- [x] T4 — Ajustar jerarquía visual, sombras, espacios y responsive del dashboard.
- [x] T5 — Ejecutar typecheck, build, tests web y diff check.
- [x] T6 — Separar el refresco operativo del refresco de reportes para evitar parpadeos.

## Constraints
- No agregar dependencias.
- No cambiar la carga ni las métricas del dashboard.
- Mantener el orden de `OperatingVerdict` antes de las tarjetas exigido por los tests existentes.
- Mantener estados vacíos y errores honestos.

## Acceptance
- Inicio tiene un contenedor y ritmo visual único.
- Cola, alertas e ingresos se leen como módulos relacionados, no como cajas improvisadas.
- RevenueCard ya no contiene `StatCard` anidadas.
- No quedan estilos inline de layout en las filas principales del dashboard.
- Escritorio y mobile mantienen overflow controlado.
- Typecheck, build, tests web y `git diff --check` pasan.

## Progress
- 2026-10-20: implementación completada y revisada. Se creó un layout común para Inicio, se normalizaron avisos, cola, alertas e ingresos, y se consolidó el responsive sin cambiar contratos funcionales.
- 2026-10-20: aclaración aplicada: Inicio es la pantalla primaria del administrador. El estado operativo abre la vista, alertas y KPI siguen inmediatamente, la cola domina la operación y el overview administrativo queda en la misma página como análisis secundario.
- 2026-10-20: corregido el refresco aparente de página: la cola conserva polling cada 15 segundos, mientras comparativas y reportes se actualizan cada 60 segundos sin borrar los datos visibles durante la carga.
- Verificación: `npm --workspace turnify-web run typecheck` OK; `npm --workspace turnify-web run build` OK con warning existente de chunk >500 kB; tests web dirigidos 14/14 OK; `git diff --check` OK.
- Revisión nativa: aprobada por `review-reliability`; autoridad consumida correctamente. Quedaron dos warnings informativos: posibles respuestas de reportes solapadas y actualización acoplada a `Promise.allSettled`, sin bloqueo ni corrección requerida. No se creó commit.

## Changed files
- `apps/web/src/features/dashboard/DashboardPage.tsx`
- `apps/web/src/features/dashboard/components/AlertsCard.tsx`
- `apps/web/src/features/dashboard/components/LiveQueueCard.tsx`
- `apps/web/src/features/dashboard/components/OperatingVerdict.tsx`
- `apps/web/src/features/dashboard/components/RevenueCard.tsx`
- `apps/web/src/features/dashboard/components/DashboardOverview.tsx`
- `apps/web/src/styles/app.css`
