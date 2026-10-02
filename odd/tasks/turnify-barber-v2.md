# Turnify V2 Barber Shop UX/UI — Feature Record (ODD)

## Objective

Define, design, and implement the first V2 UX/UI base for Turnify as a commercial B2B2C queue product for Peruvian walk-in barbershops with two to six barbers. Customers must be able to select a named barber or choose **Any available barber** without adding operational friction to the queue.

## Problem

The existing product experience and data model were created for an earlier scope. They do not yet express the barber, service, and capacity choices required by a small walk-in barbershop, nor do they provide a coherent client, staff, and administrator V2 experience.

## Why

Turnify is now a real commercial product rather than a university-only project. The initial ICP needs a fast operational flow: customers join a queue quickly, staff can manage demand without manual workarounds, and business owners can configure the shop with confidence.

## Product and UX Decisions

| Topic | Decision |
| --- | --- |
| Product model | Commercial B2B2C product. |
| Initial ICP | Peruvian walk-in barbershops with 2–6 barbers. |
| Customer choice | The customer may select a specific barber or choose **Any available barber**. |
| Queue flow | Customer queue journeys must be fast, operationally simple, and suitable for walk-ins. |
| Design source | The V2 UX/UI base is designed first in the new Google Stitch project `turnifyV2.0`. |
| Implementation target | Approved base UI is then implemented in the existing Turnify application. |
| Existing wording | The current `notificado` UI wording is deferred until after MVP. |

## Authorized Scope

- Create and maintain the `turnifyV2.0` Google Stitch project and its V2 design system.
- Generate and review V2 screens for customer, barber/staff, and administrator roles.
- Make architecture and domain decisions required to support services, barbers, customer preference, and shop capacity.
- Implement the approved V2 base UI in the existing application after design review.
- Add the relevant service, barber, and capacity data-model work required by the approved flow.
- Verify design, implementation, accessibility, tests, type checks, and operational queue acceptance flows.
- Document decisions, implementation evidence, verification results, and deferred scope.

## Constraints

- No code is implemented by this documentation task.
- Preserve the B2B2C model and avoid adding customer-flow complexity that does not serve the walk-in queue.
- Treat a named-barber selection and **Any available barber** as first-class, explicit customer choices.
- Design for shops with 2–6 barbers before generalizing to larger operations.
- Use the Stitch design as the reviewed source before application UI writes begin.
- Do not access remote services, secrets, or credentials during this record-creation work.
- Keep all source code, generated artifacts, comments, UI copy, tests, and documentation in English unless a later approved task explicitly requires otherwise.

## Accepted Scope vs. Deferred Scope

### Accepted now

- Walk-in queue UX for customer, staff, and administrator roles.
- Service selection, barber preference, any-available assignment, and operational capacity foundations.
- Stitch-first V2 design and approved base-UI implementation.

### Deferred until later

- Payments, subscriptions, and billing.
- Inventory.
- ML features.
- Full future reservations.
- Geofencing.
- Advanced analytics.
- Public display.
- Countdown reminders.
- Existing `notificado` UI wording, until after MVP.

## Delivery Route and Evidence

| Item | Record |
| --- | --- |
| Work classification | Substantial work. Each implementation task closes with a focused Conventional Commit work unit; split review slices when the forecast exceeds 400 authored lines. |
| Route | Delegated direct route for focused task execution and review. |
| Required order | Gather product decisions, inspect current architecture/data evidence, create or update Stitch design and design system, complete design review, then write application source. |
| Sources before writes | Product decisions in this record; current repository architecture and data model; reviewed `turnifyV2.0` Stitch screens/design system. No base UI implementation begins before these sources are recorded and approved. |
| Verification | Run focused tests for changed behavior, TypeScript/type checks, relevant lint/build checks, `git diff --check`, and role-based operational walkthroughs. Record exact commands and results in this file. |
| Runtime evidence | Verify customer named-barber and any-available flows, staff queue operations, and administrator configuration against a safe approved environment before declaring implementation complete. |
| Rollback | Each work unit identifies the exact screens, domain/data changes, tests, and documentation that can be reverted without unrelated changes. |

## Stable Task IDs

- [ ] **TV2-ARCH-01 — Architecture and domain decisions.** Inspect the current domain, queue, and role boundaries; define the bounded concepts and invariants for service, barber preference, any-available assignment, capacity, and walk-in queue ordering. Record compatibility and migration decisions before implementation.
- [ ] **TV2-DES-02 — Stitch project and design system.** Create/configure Google Stitch project `turnifyV2.0`; establish the V2 design system, responsive foundations, accessibility baseline, and reusable role-aware components.
- [ ] **TV2-CLIENT-03 — Customer screen generation.** Generate the customer journey in Stitch: discovery/entry, service choice, named-barber or any-available choice, queue confirmation, live ticket state, and recovery/error states.
- [ ] **TV2-STAFF-04 — Staff/barber screen generation.** Generate staff screens in Stitch for availability, assigned and any-available queue work, calling/serving customers, capacity visibility, and exception states.
- [ ] **TV2-ADMIN-05 — Administrator screen generation.** Generate administrator screens in Stitch for shop setup, barber roster, service catalog, capacity/availability configuration, and operational overview appropriate to the initial ICP.
- [ ] **TV2-REVIEW-06 — Design review.** Review the Stitch flows against product decisions, accessibility, role boundaries, walk-in speed, and operational simplicity. Capture accepted screens, defects, and explicit implementation-ready decisions.
- [ ] **TV2-UI-07 — Base UI implementation.** Implement only the approved V2 base UI in the existing application, preserving existing architecture boundaries and keeping customer flows fast.
- [ ] **TV2-DATA-08 — Service, barber, and capacity data model.** Implement the approved domain, persistence, authorization, migration, and adapter changes for services, barbers, capacity, named-barber preference, and any-available assignment; include focused tests.
- [ ] **TV2-VERIFY-09 — Verification.** Execute focused automated checks and role-based walkthroughs for customer, staff, and administrator flows; verify queue behavior for named barber and any available barber, type safety, accessibility baseline, and regressions.
- [ ] **TV2-DOC-10 — Documentation and closure.** Update product/technical documentation, this record, verification evidence, deferred-scope status, and work-unit commit references; preserve rollback boundaries.

## Acceptance Criteria

- [ ] The reviewed V2 design covers customer, staff/barber, and administrator roles in `turnifyV2.0`.
- [ ] A customer can explicitly select a barber or **Any available barber** without ambiguity.
- [ ] The customer walk-in path is operationally simple and optimized for a small barbershop.
- [ ] Staff can understand availability, queue responsibility, and capacity from the approved flow.
- [ ] Administrator setup supports the initial ICP without introducing deferred commercial modules.
- [ ] Base UI implementation follows the accepted Stitch design review.
- [ ] Data-model changes preserve queue, authorization, and capacity invariants with focused automated coverage.
- [ ] Verification evidence records exact commands, results, walkthrough scenario, and rollback boundary for every implementation work unit.
- [ ] Deferred features are not implemented accidentally.

## Verification Record

- This record creation: `git diff --check` must pass before commit.
- Implementation tasks: record the exact focused test, type-check, lint/build, runtime walkthrough, and `git diff --check` results here.
- This documentation task has no runtime boundary; runtime verification is N/A because it writes no application code or configuration.

## Progress

- 2026-10-02: Feature record created. No source code, remote service, secret, or credential access is authorized or performed by this task.

## Engram Mirror

- Topic: `odd/turnify-barber-v2/tasks`.
- Status: pending. The attempted full-document mirror with `capture_prompt: false` could not be saved because Engram session registration was unavailable; retry it before starting implementation.

## Next Step

Complete **TV2-ARCH-01** and **TV2-DES-02** before any V2 application source changes.
