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
- [ ] A4 — Invitaciones: implementación verde (cb2a434); walkthrough con segunda cuenta pendiente. Crear/canjear código de personal, refresh de rol. Ruta delegated direct (slice C).
- [ ] A5 — Configuración: implementación verde (0cff323); walkthrough pendiente. Abrir/cerrar, avisos, gracia, preferenciales, filas. Ruta delegated direct (slice C).
- [ ] A6 — Verificación: checks estáticos OK; walkthrough admin/personal con dos cuentas pendiente. Ruta delegated direct (slice C).

## Authorized scope
Local en `C:\Users\esa\Desktop\Turnify` y datos demo en turnify-dev. Sin push Git, PR, publicación o secretos.

## Acceptance criteria
- [ ] Usuario registra negocio y recibe código + QR.
- [ ] Personal/admin ve solo códigos de su empresa, con cambios en vivo.
- [ ] Personal completa ciclo llamado → atención → finalizado y marca ausente.
- [ ] Presencial preferencial genera ticket y respeta orden.
- [ ] Invitación convierte cliente a personal de la empresa correcta.
- [ ] Checks verdes y walkthrough real.

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

## Verification evidence
- A1 writer + parent spot-check: typecheck OK, vitest 56/56, Expo Doctor 21/21, diff-check OK. Sin datos personales en panel; rol cliente solo controla navegación (RPC/RLS son autoridad). Pending-device: crear negocio real y visualizar QR.
- A1 dispositivo real (usuario): PASS — panel admin + código visibles.
- Slice B writer + parent spot-check: typecheck OK, vitest 56/56, Expo Doctor 21/21, diff-check OK. Consulta/Realtime scoped a empresa; solo códigos/estado/origen/prioridad, sin referencia ni perfiles. Pending-device: acciones reales admin/personal.
- A2+A3 dispositivo real (usuario): PASS — los cinco pasos operativos completaron sin error.
- Slice C writer + parent spot-check: typecheck OK, vitest 56/56, Expo Doctor 21/21 y diff-check OK. Invitación usa RPC con rol personal fijo, canje refresca profile; config es admin-only y scope a empresa propia. Pending-device: invitación + config reales.
- Admin Realtime reconnect fix: `npm --workspace turnify-mobile run typecheck` PASS; `npx vitest run` PASS (6 files, 56 tests). The repository has domain-only Vitest coverage and no React Native renderer or Supabase Realtime mock, so the React passive-effect reconnect lifecycle requires device validation.
- Limitación real: schema actual no tiene `filas.activa`; tampoco permite puestos <1. La UI no finge un toggle de activación. Agregarlo requiere migración autorizada posterior.

## Next step
- A6: walkthrough con dos cuentas (admin crea invitación; segunda cuenta canjea; personal atiende; admin cambia config). Decidir luego si se autoriza migración `filas.activa`.
