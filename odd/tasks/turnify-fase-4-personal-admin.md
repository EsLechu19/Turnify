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
- [ ] A1 — Registro negocio: implementación verde (4d8f363); prueba real en dispositivo pendiente. Formulario, `crear_empresa`, transición a admin, código de 8 caracteres + QR. Ruta delegated direct (slice A).
- [ ] A2 — Cola de negocio: pantalla admin/personal, tickets por código, Realtime, llamar/iniciar/finalizar/ausente. Ruta delegated direct (slice B).
- [ ] A3 — Turno presencial: normal/preferencial, fila activa, feedback de código. Ruta delegated direct (slice B).
- [ ] A4 — Invitaciones: crear/canjear código de personal, refresh de rol. Ruta delegated direct (slice C).
- [ ] A5 — Configuración: abrir/cerrar, avisos, gracia, preferenciales, filas. Ruta delegated direct (slice C).
- [ ] A6 — Verificación: typecheck, vitest, Expo Doctor, walkthrough admin/personal con dos cuentas. Ruta delegated direct (slice C).

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

## Verification evidence
- A1 writer + parent spot-check: typecheck OK, vitest 56/56, Expo Doctor 21/21, diff-check OK. Sin datos personales en panel; rol cliente solo controla navegación (RPC/RLS son autoridad). Pending-device: crear negocio real y visualizar QR.

## Next step
- Slice A (A1): registro negocio y código/QR.
