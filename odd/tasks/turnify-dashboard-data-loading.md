# turnify-dashboard-data-loading — Stabilize authenticated data loading

## Objective
Evitar que el dashboard web y el flujo QR presenten datos vacíos cuando la sesión, el backend o el payload no están disponibles.

## Findings
- Shop, Services y Queue providers consultan mientras AuthProvider todavía restaura Supabase.
- Shop y Services convierten fallos en estado vacío/default; el usuario no ve la causa real.
- El parser QR acepta hosts que solo contienen `turnify.app` como substring.
- Web y QR tienen circuitos Supabase independientes; no se modifican datos remotos en esta tarea.

## Scope
- Esperar estado autenticado antes de cargar datos protegidos del dashboard.
- Limpiar estado al cerrar sesión y conservar errores visibles/reintentables.
- Fortalecer validación de QR para aceptar solo el host y path contractuales.
- Agregar pruebas de regresión; no tocar migraciones ni producción.

## Tasks
- [x] T1 — Auth readiness y providers protegidos.
- [x] T2 — Errores visibles y retry sin falsos estados vacíos.
- [x] T3 — Parser QR estricto y pruebas.
- [x] T4 — Suite, build y revisión del diff.

## Authorized scope
Pedido explícito del usuario: “vamos”. Solo cambios locales en web/mobile/tests/docs; sin operaciones remotas.

## Acceptance
- Ningún provider protegido consulta antes de sesión autenticada.
- Error de backend no se representa como catálogo vacío sin explicación.
- Cerrar sesión limpia datos protegidos.
- QR válido sigue resolviendo; host parecido o path incorrecto se rechaza.
- Typecheck, build y tests aplicables pasan.

## Progress
- 2026-10-13: diagnóstico completo confirmado; implementación pendiente.
- 2026-10-13: AuthProvider now catches restore rejection and protected providers mount only for authenticated sessions.
- 2026-10-13: Shop and Services preserve readable backend errors and expose existing retry callbacks; failures no longer become empty catalogs.
- 2026-10-13: QR URLs require exact case-insensitive `turnify.app` hostname, `/t/<code>` path, and no query/hash/additional path.

## Changed files

- `apps/web/src/state/AppProviders.tsx`
- `apps/web/src/state/AuthContext.tsx`
- `apps/web/src/state/ShopContext.tsx`
- `apps/web/src/state/ServicesContext.tsx`
- `apps/mobile/src/features/queue/queue-api.ts`
- `tests/mobile/qr-parse.test.ts`
- `tests/web/dashboard-data-loading.test.ts`
