# turnify-inicio-layout-p0 — Inicio: grilla real y sin duplicados

## Objective
Recomponer el Inicio del panel web (`apps/web`) como una grilla de dos columnas con separación real entre tarjetas, y eliminar la información que hoy aparece repetida en la misma pantalla.

## Problem
- `.shell__body` aplica `gap: 24px` solo a sus hijos directos. Las tarjetas viven dentro de un único `<section>`, y `.card` no tiene margen: Alertas, Cola en vivo e Ingresos quedan pegadas, borde contra borde.
- El contenido es una sola columna: en 1440px, tres tarjetas de ancho completo muestran una línea de texto cada una.
- Repetición: abierto/cerrado aparece en topbar, badge del header y botón; el nombre del negocio en sidebar, topbar y `h1`; `en cola / atendidos / ausentes` en el verdict y en las stat cards; "Ver equipo" en cuatro lugares.
- `OperatingVerdict` usa `--text-h2`, token que no existe en `tokens.css`.
- `role="status"` envuelve dos botones: el lector de pantalla anuncia la frase completa y los CTAs en cada refresco de 15s.

## Scope
- Solo `apps/web`: `DashboardPage.tsx`, `OperatingVerdict.tsx` y `styles/app.css`.
- Sin cambios de datos, rutas, backend ni mobile.
- Sin dependencias nuevas.

## Tasks
- [x] T1 — `DashboardPage`: header sin badge duplicado y título "Inicio"; composición en grilla (verdict + stats arriba, cola 1.6fr / riel de alertas + ingresos 1fr).
- [x] T2 — `OperatingVerdict`: barra fina de estado; quitar `completed`/`absent`, los botones y el `useNavigate`; conservar `role="status"` y el texto "Estado de hoy".
- [x] T3 — `app.css`: `.dashboard`, `.dashboard__split`, `.dashboard__rail`, `.operating-verdict*`, y colapso a una columna por debajo de 1080px.
- [x] T4 — Verificar: typecheck, build y tests web de dashboard.

## Constraints
- `tests/web/dashboard-scanability.test.ts` afirma que `<OperatingVerdict` aparece antes de `<StatCards`, `<AlertsCard`, `<LiveQueueCard` y `<RevenueCard`, que el verdict contiene `role="status"` y "Estado de hoy", y que el dashboard conserva `aria-label="Estado de hoy"` y `}, [refreshVersion]);`. No romper esas cadenas.
- Mantener el copy de UI en español.
- No tocar el manejo de errores ni el refresco.

## Acceptance
- Hay separación visual entre todas las tarjetas del Inicio.
- Cola en vivo e Ingresos comparten la misma fila en viewport de escritorio.
- Ningún dato ni CTA del Inicio se repite en la misma pantalla.
- El verdict ya no contiene controles interactivos dentro del live region.
- `typecheck`, `build` y los tests de dashboard pasan.

## Progress
- 2026-10-20: diagnóstico de layout y duplicados; implementación delegada en curso.
- 2026-10-20: T1-T3 implementadas. Inicio ahora usa `.dashboard` (grid, gap 20px), split cola/riel y verdict como barra fina sin botones.
- 2026-10-20: T4 verde — `typecheck` OK, `build` OK, 5 archivos de tests de dashboard (18 tests) OK. Re-verificado por el orquestador: typecheck OK y 11 tests OK en scanability + panel-profesional.
- 2026-10-20: Revisión nativa concedida por el usuario (riesgo medio, lente `review-reliability`). El revisor falló dos veces por restricción del proveedor del runtime ("free tier can only be used from within OpenCode"); no hay veredicto ni aprobación. La lineage `review-d1d426cd33770d14` queda pendiente.
- 2026-10-20: Sin commit; cambios en working tree sobre la rama `feat/reportes-historial-profesional`.

## Verification
- `npm --workspace turnify-web run typecheck`: passed.
- `npm --workspace turnify-web run build`: passed (786 modules; solo warning preexistente de chunk >500 kB).
- `npx vitest run` (dashboard-scanability, panel-profesional, dashboard-refresh, resumen-dia, demanda-card): 5 archivos, 18 tests, passed.
- Revisión nativa: unavailable (provider runtime restriction), sin veredicto.

## Changed files
- `apps/web/src/features/dashboard/DashboardPage.tsx`
- `apps/web/src/features/dashboard/components/OperatingVerdict.tsx`
- `apps/web/src/styles/app.css`
