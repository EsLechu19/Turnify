# Turnify Expo Go push safety — Bugfix (ODD)

## Objective

La app arranca en Expo Go: `expo-notifications` solo se carga en runtimes con push
(dev build); en Expo Go el ciclo de notificaciones se omite sin romper el arranque.

## Problem

`use-notification-lifecycle` y `lib/notifications` importan `expo-notifications`
estáticamente. Desde SDK 53 ese módulo ejecuta un side-effect al importarse que
revienta en Expo Go: error fatal antes del primer render (más el warning de
`_layout` y el crash de `ErrorBoundary` en cascada).

## Why

El usuario no puede abrir el proyecto en Expo Go. El dev build (APK) sigue siendo
el camino para push real; Expo Go debe servir para explorar sin push.

## Scope

- Incluye: `push-runtime` (detección + carga diferida + kill-switch
  `EXPO_PUBLIC_ENABLE_PUSH`), `lib/notifications` y `use-notification-lifecycle`
  sin import estático, diagnóstico `push_unsupported_runtime`, contrato de test
  anti-regresión.
- No incluye: cambios al flujo de registro/token (inyecta dependencias, intacto),
  RLS/RPC, dev build, EAS.

## Constraints

- Rama `uwu`; UI/español y código/comentarios/tests inglés como siempre.
- `Constants.appOwnership !== 'expo'` como señal (expo-constants es seguro).
- `import type` de expo-notifications permitido (se borra al compilar, no ejecuta).
- Sin `require` (tsconfig Expo sin tipos node): solo `await import(...)` diferido.

## Decisions

- TDD: ON (Vitest). Rojo: contrato que prohíbe el import estático en el boot path.
- Delivery `ask-on-risk`; slice único; sin commit. Ruta inline (sin delegación).
- Verificación local: vitest + tsc. El arranque real en Expo Go lo confirma el
  usuario en su máquina (yo no tengo el runtime Expo Go acá).

## Tasks

- [x] T1 — TDD rojo: `tests/notifications/expo-go-push-safety.test.ts` (sin import
  estático en `_layout`, `lib/notifications`, lifecycle; loader diferido existe).
- [x] T2 — `push-runtime.ts` + `lib/notifications.ts` sin import estático.
- [x] T3 — `use-notification-lifecycle` con guarda de runtime y módulo diferido.
- [x] T4 — vitest + tsc: contratos nuevos 3/3; `tsc` limpio tras aflojar `data?`;
  suite 164/169 — los mismos 5 rojos preexistentes, sin regresión.

## Authorized scope

Local en rama `uwu`. Sin push, PR, secretos ni operaciones remotas.

## Acceptance criteria

- [ ] Ningún módulo del arranque importa `expo-notifications` estáticamente.
- [ ] En dev build el registro push sigue el mismo camino (mismo RPC, mismos
  diagnósticos + uno nuevo para runtime sin soporte).
- [ ] La app abre en Expo Go (verifica el usuario).

## Progress

- T1–T3: contrato en rojo, `push-runtime` nuevo, fundación y lifecycle sin import
  estático, diagnóstico `push_unsupported_runtime`. Sin commit (no pedido).
- T4: `tsc` limpio; suite 164/169 con los mismos 5 preexistentes — sin regresión.
  Arranque real en Expo Go pendiente de verificación del usuario en su máquina.
