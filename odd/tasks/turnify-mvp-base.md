# Turnify MVP Base — Feature Document (ODD)

## Objective
Arrancar Turnify desde el documento del usuario como fuente de verdad: scaffolding + dominio puro + base Supabase con RLS, listo para Fases 2-3 (apps).

## Problem
Carpeta vacía (solo `opencode.json`, sin git ni src). Memoria previa T1–T8 usaba modelo en inglés (`businesses/queues/turns`); el documento actual usa `empresas/filas/tickets`. Se decidió empezar desde el doc.

## Why
Sin esta base no se puede implementar toma de turno, tiempo real ni dashboard. El aislamiento (tenant + cliente) debe vivir en Postgres RLS, no en el cliente.

## Scope
- Incluye: git init, estructura §18, dominio puro (máquina estados §7.1, ETA §6.8, preferenciales §6.6, gracia/ausente §6.2), migración 0001 (tablas §10.1, índices, RLS §12), RPCs §11.4 + triggers §11.6, repos/ports, ADR, tests dominio.
- No incluye: UI cliente/personal/admin, Realtime wiring, push (§14), pg_cron apply, dashboard web (§16), publicación.

## Constraints
- Stack: Expo SDK 57 + Supabase + React web. Costo $0.
- `src/domain/**` cero imports de expo/react-native/@supabase. Verificado por test de pureza.
- Anon key solo en cliente; service_role nunca en bundle.
- No aplicar migración a DB viva sin credenciales del usuario. No inventar credenciales. No `.env` con secretos.
- Español en esquema: empresas, perfiles, filas, tickets, invitaciones, dispositivos (según §10).

## Decisions
- TDD: ON. Fuente: elección explícita previa del usuario 2026-09-29 (mem #29). Runner: Vitest.
- Backend real desde día uno (Supabase), no memoria (heredado mem #28).
- Delivery strategy: `ask-on-risk` (default). Forecast: ~1200 líneas autoría → supera 400, se trocea en slices/work-unit commits. Chain strategy pendiente si se elige chained-pr.

## Language
- Textos (conversación, docs, UI): español.
- Code comments, identifiers, commits, tests: English. Writers must keep all code comments in English.

## Tasks
- [x] T1 — Repo + scaffolding: `git init`, `apps/mobile` (Expo SDK 57), `apps/web` (Vite), `supabase/migrations`, `packages/types`, `.gitignore`, `.env.example` vacío. Ruta: delegated direct (writer trigger: 2+ ficheros). Done 1ab8aeb en feature/turnify-mvp-base.
- [x] T2 — Dominio estados: `turn.ts`, `transition.ts`, `errors.ts` (en_espera/notificado/llamado/en_atencion/finalizado/cancelado/ausente). TDD RED→GREEN. Ruta: delegated direct. Done 1374317 en feature/turnify-mvp-base (RED 9 failed/3 passed, GREEN 12/12).
- [x] T3 — Dominio cola+ETA: `eta.ts` (personas delante × promedio / puestos), `queue.ts` (cola_ordenada con preferencial_cada N). TDD. Ruta: delegated direct. Done 760481a (RED 24 failed/12 passed, GREEN 36/36).
- [x] T4 — Dominio no-show: `noShow.ts` (isPastGrace inclusivo, sweep puro). TDD. Ruta: delegated direct. Done 0610116 (RED 17 failed, GREEN 53/53).
- [x] T5 — Migración 0001 base: enums, empresas, perfiles, invitaciones, dispositivos, filas, tickets, índice único parcial ticket activo, RLS §12. Sin aplicar a vivo. Ruta: delegated direct. Done d62a886 (269 líneas, 6 tables/4 types/9 policies).
- [x] T6 — RPCs + triggers: tomar_turno, resumen_empresa, mi_ticket_estado, cancelar, crear_empresa, invitaciones, presencial, llamar/iniciar/finalizar/ausente, revisar_avisos, tickets_actualiza_fila. `revoke execute` funciones internas. Ruta: delegated direct. Done 7979b49 (0002, 19 functions + 1 trigger, sin apply).
- [x] T7 — Data ports + ADR + tipos: `repositories.ts` ports, `supabaseRepositories.ts` (único con @supabase), `docs/adr/0001-supabase-as-backend.md`. Ruta: delegated direct. Done 6936ae7 (ports + adapter + stub + ADR, sin apply).
- [x] T8 — Verificación: 30+ tests verdes, purity test, `tsc`, revisión invariantes 1/2/4/6 no verificados en vivo. Ruta: delegated direct (verifier per-action). Done 86b8305 (purity + 56/56, tsc clean, invariantes offline OK / live bloqueado).

## Authorized scope
Trabajo local en `C:\Users\esa\Desktop\Turnify` + archivos SQL/TS/docs. No remote, no push, no PR, no aplicar a Supabase cloud, no хөдөлгөөн.

## Acceptance criteria
- [ ] Cliente no ve tickets ajenos; personal solo códigos.
- [ ] Un cliente = un ticket activo por empresa (índice parcial).
- [ ] Sin números duplicados por concurrencia (`FOR UPDATE` + unique parcial).
- [ ] ETA = ceil(delante × promedio / puestos), default 300s si <3 muestras.
- [ ] Ausente no vuelve a fila; ticket nuevo va al final.

## Applicable checks
- `npx vitest run` (dominio, RED evidenciado antes de GREEN en T2-T4)
- `npx tsc --noEmit`
- Test pureza: falla si domain importa framework
- Migración: parse/SQL lint si disponible; apply solo con credenciales reales

## Progress
- 2026-09-29: creado este documento (8 tareas). Repo aún vacío salvo opencode.json. Sin commits.
- 2026-09-29: T1 done — commit 1ab8aeb `feat(scaffold): init repo structure for turnify mvp base` en feature/turnify-mvp-base.
- 2026-09-29: T2 done — commit 1374317 `feat(domain): add ticket state machine with strict TDD`. 12/12 tests, tsc clean.
- 2026-09-29: T3 done — commit 760481a `feat(domain): add queue ordering and ETA with strict TDD`. 36/36 tests, tsc clean.
- 2026-09-29: T4 done — commit 0610116 `feat(domain): add no-show grace sweep with strict TDD`. 53/53 tests, tsc clean. Riesgo: fecha inválida → NaN (nunca expira, no throw).
- 2026-09-29: T6 done — commit 7979b49 `feat(db): add queue RPCs and triggers without live apply`. 0002 (982 líneas, 19 functions + 1 trigger). Excepción honesta de tamaño.
- 2026-09-29: T7 done — commit 6936ae7 `feat(data): add repository ports with Supabase adapter and backend ADR`. Ports puros + adapter único con @supabase 2.117.2 + stub Database + ADR en español. Sin apply. Riesgo: stub sin verificar vs schema vivo; mapeo de errores por substrings.
- 2026-09-29: T8 done — commit 86b8305 `test(domain): enforce framework-free purity guard`. 56/56 tests, tsc clean. Invariantes 1/2/4/6 offline OK, live bloqueado (sin credenciales). Feature MVP base cerrada offline.

## Verification evidence
- T1 writer: `git status --short` → `?? odd/` + `?? opencode.json`; `git log --oneline -3` → `1ab8aeb`; 10 archivos presentes, feature doc intacto.
- Parent spot check: `git log --oneline -3` → `1ab8aeb feat(scaffold): init repo structure for turnify mvp base`; `git status --short` → `?? odd/` `?? opencode.json`. Coincide.
- T2 writer: RED 9 failed/3 passed; GREEN 12/12, tsc clean.
- Parent spot check T2: vitest 12 passed, log con 1374317. Coincide.
- T3 writer: RED 24 failed/12 passed; GREEN 36/36, tsc clean.
- Parent spot check T3: vitest 36 passed (280ms), log con 760481a. Coincide.
- T4 writer: RED 17 failed; GREEN 53/53, tsc clean.
- Parent spot check T4: vitest 53 passed (275ms), log con 0610116. Coincide.
- T5 writer: 6 tables/4 types/9 policies, vitest 53/53, tsc clean, sin apply.
- Parent spot check T5: log con d62a886, SQL existe, vitest 53 passed. Coincide.
- T6 writer: 19 functions + 1 trigger + revokes, vitest 53/53, tsc clean, sin apply.
- Parent spot check T6: log con 7979b49, 0002 existe, vitest 53 passed. Coincide.
- T7 writer: ports + adapter único, stub Database, ADR, vitest 53/53, tsc clean, sin apply.
- Parent spot check T7: log con 6936ae7, @supabase solo en adapter (2 matches), vitest 53 passed. Coincide.
- T8 writer: purity 3 tests nuevos, 56/56, tsc clean, review estructural OK, sin apply.
- Parent spot check T8: log con 86b8305, vitest 56 passed. Coincide.

## Next step
- Siguiente feature (Fase 3 app cliente o apply vivo a turnify-dev con `supabase link --project-ref qrcvnzoauclkwnkqmwwv` + `db push` + `gen types`). Sin push/PR por ahora; rama feature/turnify-mvp-base con 8/8 tareas.
