# Turnify Extra tolerance and new ticket after no-show — Feature Document (ODD)

## Objective

“Llego en 2 minutos” adds two minutes to the tolerance exactly once (the first
response wins), and an absent guest can create a new ticket from the terminal
screen.

## Problem

- The immutable base deadline meant the two-minute response was only an
  acknowledgement.
- An absent guest had no honest terminal state or way to create another ticket.

## Why

The requested product behavior is one two-minute extension and a new-ticket
route after no-show.

## Scope

- Includes migration `0026` (the `vencimiento_efectivo_llamado` helper and the
  effective deadline in guest state, no-show sweep, response guard, and worker
  queue while retaining the fields added in `0025`); the tolerance copy; an
  absent branch in `CompletedGuestTicket`; and focused contracts.
- Excludes a second extension, changing the five-minute base grace, cron
  scheduling, and remote migration execution.

## Constraints

- Branch `uwu`; Spanish UI; English code, comments, tests, and documentation.
- The base deadline remains immutable (the trigger is untouched); the effective
  deadline is calculated rather than stored.
- RPC signatures and grants remain unchanged.

## Decisions

- TDD: active. Initial focused contract result: 3 passed / 1 failed because the
  completed guest component lacked “Sacar otro turno”.
- Delivery: one ODD work-unit commit, if verification is satisfactory.

## Tasks

- [x] T1 — Observed RED: focused contract found the missing no-show CTA.
- [x] T2 — Added the effective-deadline helper to guest state, no-show sweep,
  response guard, and worker queue without changing the base-deadline trigger.
- [x] T3 — Added honest absent state and “Sacar otro turno”; the normal
  completed-ticket state remains distinct.
- [x] T4 — Focused contracts: 4/4 passed. Typecheck passed. Full suite: 189
  passed / 5 known base failures, with no new failures.

## Authorized scope

Local repository only on branch `uwu`. No remote migration, push, PR, or other
remote operation.

## Acceptance criteria

- [x] “Llego en 2 minutos” yields one two-minute effective extension; a later
  different response still fails under the first-response guard.
- [x] A ticket becomes `ausente` at its effective deadline; the guest sees
  “Sacar otro turno”.
- [x] Focused contracts and typecheck pass; the full suite has exactly the five
  accepted known base failures and no new failures.

## Progress

- Implementation and verification are complete locally. A safe work-unit commit
  is blocked by unrelated, pre-existing edits in the required ticket UI files;
  no foreign UI work was staged.
