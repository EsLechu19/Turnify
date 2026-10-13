# turnify-dashboard-shell-ux — Simplify dashboard navigation and hierarchy

## Objective
Rediseñar el shell del dashboard web para reducir repetición visual, priorizar el estado operativo de la barbería y mejorar la navegación responsive.

## Problem
- La identidad de la barbería se repite en sidebar, topbar y PageHeader.
- El sidebar concentra demasiada información y el estado del local parece una acción pero solo navega.
- La campana no abre alertas; solo navega a Inicio.
- PageHeader está contenido en una tarjeta que se suma a otras tarjetas.
- En móvil el sidebar se convierte en una barra horizontal con textos largos.
- Hay estilos antiguos del topbar sin consumidores actuales.

## Scope
- Sidebar enfocado en logo y navegación: Inicio, Servicios, Equipo, Reportes, Configuración.
- Topbar con contexto de barbería/sucursal, estado operativo accionable y menú de usuario.
- PageHeader plano, con jerarquía clara y acción primaria.
- Responsive móvil con header compacto y navegación horizontal contenida, sin duplicar identidad ni footer pesado.
- Eliminar estilos muertos del shell y mantener accesibilidad/estado activo.

## Non-goals
- No cambiar lógica de negocio, permisos, consultas Supabase ni rutas.
- No crear un sistema de notificaciones falso; la campana se reemplaza por un control honesto.
- No modificar el dashboard operativo interno más allá del contexto del header.

## Tasks
- [x] T1 — Reestructurar Sidebar/Topbar/AppShell y etiquetas de navegación.
- [x] T2 — Simplificar PageHeader y pulir estilos desktop/mobile.
- [x] T3 — Limpiar CSS muerto y agregar contratos estructurales.
- [x] T4 — Verificar tests, typecheck y build.

## Acceptance
- La barbería/sucursal aparece una sola vez como contexto principal del shell.
- El estado abierto/cerrado está visible y lleva a la acción correcta sin texto engañoso.
- La navegación usa nombres cortos y comprensibles.
- PageHeader no se renderiza como tarjeta anidada.
- Mobile no requiere desplazar una lista horizontal extensa para entender el contexto.
- No se rompen rutas, auth, accesibilidad básica ni compilación.

## Authorized scope
Pedido explícito del usuario: implementar la crítica UX/UI. Solo archivos del shell, layout, estilos y tests relacionados.

## Progress
- 2026-10-13: alcance aprobado por pedido del usuario; implementación pendiente.
- 2026-10-13: shell implementado y verificado con tests web, typecheck y build.
