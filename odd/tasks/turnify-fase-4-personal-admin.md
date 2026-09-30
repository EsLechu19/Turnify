# Turnify Fase 4 — Personal y Administrador (ODD)

## Objective
Permitir que un usuario registre su negocio, muestre código/QR y que personal/admin gestione la cola: llamar, iniciar/finalizar atención, ausentes, presenciales, invitaciones y configuración.

## Problem
La Fase 3 ya permite tomar turnos, pero ningún negocio puede registrarse ni atenderlos desde la app.

## Why
El MVP necesita cerrar el ciclo completo cliente → negocio. Push y dashboard dependen de los estados que genera esta fase.

## Scope
- Incluye: A1 registro negocio + código/QR; A2 cola en vivo + atención; A3 turno presencial; A4 invitaciones; A5 configuración; A6 walkthrough admin/personal.
- No incluye: push (Fase 5), dashboard web (Fase 6), pagos, publicación en tiendas.

## Constraints
- Parte de `feature/turnify-fase-3-cliente`; no mergea la Fase 3 a main (decisión del usuario).
- UI español; comentarios/identificadores/commits/tests en inglés.
- Solo anon key en móvil; RPCs, RLS y Realtime existentes son el backend.
- Personal solo ve códigos de ticket, no perfiles de clientes.
- Entornos/demo: datos de prueba solo en turnify-dev, sin secretos en git.

## Decisions
- Delivery `ask-on-risk`; forecast >400 líneas, dividir en 3 slices: A(A1), B(A2+A3), C(A4+A6).
- TDD N/A para UI; checks: typecheck, vitest de regresión, Expo Doctor, walkthrough Android.
- Fase 3 C6 mantiene la medición formal <30 s pendiente, no bloquea esta fase.

## Tasks
- [x] A1 — Registro negocio: formulario, `crear_empresa`, transición a admin, código de 8 caracteres + QR. Ruta delegated direct. Done 4d8f363; dispositivo real PASS.
- [x] A2 — Cola de negocio: tickets por código, Realtime, llamar/iniciar/finalizar/ausente. Ruta delegated direct. Done 37ea208; dispositivo real PASS.
- [x] A3 — Turno presencial: normal/preferencial, fila activa, feedback de código. Ruta delegated direct. Done 0f24e05; dispositivo real PASS.
- [x] A4 — Invitaciones: admin generó una invitación, una segunda cuenta la canjeó, pasó a ser personal y entró al panel de personal. Implementación verde (cb2a434). Ruta delegated direct (slice C).
- [x] A5 — Configuración: admin cambió `Avisar cada posición` a 5, guardó, volvió al panel sin error, reabrió configuración y confirmó persistencia. Implementación verde (0cff323). Ruta delegated direct (slice C).
- [x] A6 — Verificación: cuentas y dispositivos separados de admin/personal realizaron una acción de ticket y el panel admin se actualizó en vivo; la evidencia previa cubre presencial, llamado, inicio/finalización y ausente. Ruta delegated direct (slice C).

## Authorized scope
Local en `C:\Users\esa\Desktop\Turnify` y datos demo en turnify-dev. Sin push Git, PR, publicación o secretos.

## Acceptance criteria
- [x] Usuario registra negocio y recibe código + QR.
- [x] Personal/admin ve solo códigos de su empresa, con cambios en vivo.
- [x] Personal completa ciclo llamado → atención → finalizado y marca ausente.
- [ ] Presencial preferencial genera ticket y respeta orden. Fixed locally; pending deployment and device validation.
- [x] Invitación convierte cliente a personal de la empresa correcta.
- [x] Checks verdes y walkthrough real.

## Applicable checks
- `npm --workspace turnify-mobile run typecheck`
- `npx vitest run` 56/56 o más
- `npm --workspace turnify-mobile exec expo-doctor`
- Walkthrough Android: admin + personal + cliente

## Progress
- 2026-09-29: creado este documento. Fase 3 sigue en feature/turnify-fase-3-cliente; walkthrough funcional PASS, timing <30s pendiente.
- 2026-09-29: A1 implementado en feature/turnify-fase-4-personal-admin (4d8f363). Typecheck, vitest 56/56, Expo Doctor 21/21 y Metro `/status` OK; falta observación humana de crear negocio/QR.
- 2026-09-29: A1 dispositivo real PASS (usuario): panel admin y código visibles tras registrar negocio.
- 2026-09-29: Slice B (A2+A3) implementado: cola empresa en vivo + acciones de servicio (37ea208), presencial normal/preferencial (0f24e05). Typecheck, vitest 56/56 y Expo Doctor 21/21; pending-device.
- 2026-09-29: A2+A3 dispositivo real PASS (usuario): presencial normal, llamado, inicio/finalización y ausente funcionan correctamente.
- 2026-09-29: Slice C (A4+A5) implementado: invitación/canje de personal (cb2a434), configuración de empresa + filas propias (0cff323). Typecheck, vitest 56/56 y Expo Doctor 21/21; pending-device.
- 2026-09-29: Fixed the admin Realtime reconnect lifecycle. Each effect lifetime now uses a fresh channel topic, so React development cleanup/reconnect cannot add callbacks to an already subscribed channel. Typecheck and Vitest 56/56 PASS; pending-device validation.
- 2026-09-29: Corrección del fix anterior de Realtime admin: el contador en `useRef` se reiniciaba en cada remount y volvía a generar el tópico `:1` mientras el canal anterior podía seguir registrado. El contador ahora vive a nivel de módulo y aumenta durante todo el proceso de la app; se conserva el cleanup y los refresh de tickets/filas. Typecheck PASS y Vitest 56/56 PASS. Evidencia de work unit: `fix(mobile): keep admin realtime topics process-unique`.
- 2026-09-30: Realtime admin en dispositivo real PASS (usuario): tras reiniciar Expo con limpieza de caché, el admin cambió y guardó la configuración de la empresa y volvió al panel sin el Render Error `cannot add postgres_changes callbacks ... after subscribe()`.
- 2026-09-30: Validación Realtime admin/personal en dispositivos y cuentas separadas PASS (usuario): una acción de ticket desde el panel de personal actualizó el panel de administración en vivo.
- 2026-09-30: A4 dispositivo real PASS (usuario): admin generó invitación; una segunda cuenta la canjeó, se convirtió en personal y entró al panel de personal.
- 2026-09-30: A5 dispositivo real PASS (usuario): admin cambió `Avisar cada posición` a 5, guardó, regresó al panel sin error y confirmó la persistencia al reabrir configuración.
- 2026-09-30: A6 walkthrough PASS (usuario): con cuentas y dispositivos separados, una acción de ticket desde personal actualizó el panel admin en vivo; la evidencia anterior cubre presencial, llamado, inicio/finalización y ausente. La lista de tareas A1–A6 está completa; `filas.activa` sigue diferida como migración fuera de alcance.
- 2026-09-30: Preferential ordering corrected locally: `preferencial_cada = N` now serves a preferential ticket first, followed by N normal tickets. The forward migration is pending deployment and device validation, so the acceptance criterion remains open.

## Verification evidence
- A1 writer + parent spot-check: typecheck OK, vitest 56/56, Expo Doctor 21/21, diff-check OK. Sin datos personales en panel; rol cliente solo controla navegación (RPC/RLS son autoridad). Pending-device: crear negocio real y visualizar QR.
- A1 dispositivo real (usuario): PASS — panel admin + código visibles.
- Slice B writer + parent spot-check: typecheck OK, vitest 56/56, Expo Doctor 21/21, diff-check OK. Consulta/Realtime scoped a empresa; solo códigos/estado/origen/prioridad, sin referencia ni perfiles. Pending-device: acciones reales admin/personal.
- A2+A3 dispositivo real (usuario): PASS — los cinco pasos operativos completaron sin error.
- Slice C writer + parent spot-check: typecheck OK, vitest 56/56, Expo Doctor 21/21 y diff-check OK. Invitación usa RPC con rol personal fijo, canje refresca profile; config es admin-only y scope a empresa propia. Pending-device: invitación + config reales.
- Admin Realtime reconnect fix: `npm --workspace turnify-mobile run typecheck` PASS; `npx vitest run` PASS (6 files, 56 tests). The repository has domain-only Vitest coverage and no React Native renderer or Supabase Realtime mock, so the React passive-effect reconnect lifecycle requires device validation.
- Admin Realtime remount correction: `npm --workspace turnify-mobile run typecheck` PASS; `npx vitest run` PASS (6 files, 56 tests). La corrección mantiene un sufijo de tópico monotónico a nivel de módulo, por lo que cada mount usa un canal distinto incluso cuando el cleanup asíncrono del mount previo todavía no terminó. Work-unit commit: `fix(mobile): keep admin realtime topics process-unique`.
- Admin Realtime device validation (usuario): PASS — después de reiniciar Expo con limpieza de caché, el admin guardó cambios de configuración de empresa y regresó al panel sin el Render Error `cannot add postgres_changes callbacks ... after subscribe()`.
- Admin/personal Realtime device validation (usuario): PASS — con cuentas y dispositivos separados, una acción de ticket desde el panel de personal actualizó el panel de administración en vivo. Esto valida la propagación en vivo de la acción; el walkthrough completo de A6 sigue pendiente.
- A4 invitation device validation (usuario): PASS — una invitación creada por admin fue canjeada por una segunda cuenta, que recibió el rol de personal y accedió al panel de personal.
- A5 configuration device validation (usuario): PASS — el valor `Avisar cada posición` se cambió a 5, se guardó sin error, persistió al volver a abrir configuración y el usuario confirma que la configuración funciona correctamente.
- A6 walkthrough device validation (usuario): PASS — admin y personal, en cuentas y dispositivos separados, ejecutaron una acción de ticket y el panel admin se actualizó en vivo. Junto con A2+A3 dispositivo real PASS, cubre presencial, llamado, inicio/finalización y ausente.
- Limitación real: schema actual no tiene `filas.activa`; tampoco permite puestos <1. La UI no finge un toggle de activación. Agregarlo requiere migración autorizada posterior.

## Next step
- Realizar una prueba en dispositivo del orden preferencial: confirmar que un presencial preferencial genera ticket y respeta el orden. Fase 4 solo puede cerrarse por completo tras PASS; entonces sigue Fase 5 (push/no-show). `filas.activa` permanece como migración diferida y fuera del alcance de Fase 4.
