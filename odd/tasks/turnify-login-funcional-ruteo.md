# Turnify Login funcional + ruteo — Feature Document (ODD)

## Objective

El login deja de ser un stub: autentica contra Supabase y el ruteo por rol ya
existente hace el resto (personal → pantallas worker, cliente → bienvenida única,
invitado QR/código → pantallas cliente). Un solo tipo de usuario en la entrada.

## Problem

`signIn`/`signUp` en `use-auth` son stubs y el botón Ingresar es `() => {}`: nadie
puede entrar como trabajador. Los guards (`(auth)` → `staffLanding`, `(app)` →
`roleCanAccessAppRoute`) ya están y esperan una sesión real.

## Why

El usuario fijó el alcance "login funcional + ruteo": el trabajador ingresa y ve su
propia pantalla; el cliente (QR/código) ve las suyas. Cuentas de cliente intactas.

## Scope

- Incluye: `signIn` real (password auth + perfil `perfiles` + errores en español);
  login cableado (validación, loading, error, aviso sin Supabase); contratos de test.
- No incluye: `signUp` real (register sigue su flujo actual), cambios de guards o
  política (ya correctos), persistencia guest cross-restart, unificación de cuentas.

## Constraints

- Rama `uwu`; UI español; código/comentarios/tests inglés.
- Interfaz `signIn(email, password): Promise<AuthError>` intacta (nadie más la usa).
- Sin navegación manual por rol en el login: el `(auth)` guard redirige vía
  `staffLanding`. Así no hay carrera sesión→perfil→ruta.
- `service_role` jamás en el bundle (solo anon key vía `.env`, ya configurado).

## Decisions

- TDD: ON (Vitest). Rojo primero en el contrato de login, verde con el cableado.
- Delivery `ask-on-risk`; slice único (contexto + pantalla + test); sin commit.
- Ruta: inline (delegación no disponible en este runtime); triggers mapping/writer
  registrados como evidencia.

## Tasks

- [x] T1 — TDD rojo: el contrato `worker-access-flow` exige login cableado
  (`signIn(`, `validateWorkerCredentials`, `AuthErrorMessage`).
- [x] T2 — `use-auth`: `signIn` real con `signInWithPassword`, fetch de perfil
  compartido con `reloadProfile`, errores traducidos, casos demo/sin-config.
- [x] T3 — Login: validación, loading, error visible, aviso sin Supabase; éxito sin
  navegar (el guard redirige por rol).
- [x] T4 — Verificación: contratos 21/21 en los 3 archivos tocados; `tsc` limpio;
  suite 161/166 — los mismos 5 rojos preexistentes (base 160/165), sin regresión.

## Authorized scope

Local en rama `uwu`. Sin push, PR, secretos nuevos ni operaciones remotas (los
checks corren local; `node_modules` ya instalado).

## Acceptance criteria

- [ ] Credenciales válidas de personal → pantallas worker; inválidas → error español.
- [ ] Cliente con cuenta → bienvenida única (mismo tipo de usuario en la entrada).
- [ ] Invitado QR/código sin cambios; guards y política intactos.
- [ ] Contratos verdes; suite sin regresiones vs 160/165 base.

## Progress

- T1–T3: contrato en rojo, `signIn` real + perfil compartido, login cableado con
  validación y error visible. Sin commit (no pedido).
- T4: contratos 21/21; `tsc --noEmit` limpio; suite 161/166 con los mismos 5 fallos
  preexistentes de la base (160/165) — sin regresión, fuera de alcance.
