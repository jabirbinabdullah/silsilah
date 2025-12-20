# Genealogy System Development — End‑to‑End Recap

This document summarizes the complete journey from initial problem realization to a production‑ready backend API for a genealogy (family tree) system. It captures **decisions, steps, validations, and key architectural lessons** learned throughout the process.

---

## 1. Initial Problem

The original genealogy application suffered from:

* Confusing data flow
* Unclear separation between data storage, logic, and presentation
* Weak data integrity guarantees
* Difficulty reasoning about correctness after reload

This triggered the decision to **start from scratch** with correctness as the primary goal.

---

## 2. Requirements First (SRS)

### Key Decision

A **formal Software Requirements Specification (SRS)** was written before any code.

### Clarification Process

Requirements were refined using structured **YES/NO and multiple‑choice questions**, covering:

* User roles and permissions
* Relationship types (parent–child, spouse)
* Ancestry constraints
* Deletion rules
* Scalability expectations
* Enforcement strictness

### Outcome

A clear, locked problem definition that:

* Eliminated ambiguity
* Prevented premature tech decisions
* Enabled Copilot to act as a precise engineering assistant

---

## 3. Architecture Selection

A **Domain‑Driven Design (DDD)** approach was chosen.

### High‑Level Layers

* **Domain Layer** — genealogy rules and invariants
* **Application Layer** — commands and queries
* **Persistence Layer** — storage only
* **Presentation Layer** — controllers and DTOs

### Core Concept

> The genealogy system is modeled as **one aggregate root**: `GenealogyGraph`.

All persons and relationships exist *inside* this aggregate.

---

## 4. Domain Model Design

### Aggregate Root

**GenealogyGraph**

Responsibilities:

* Maintain a Directed Acyclic Graph (DAG)
* Enforce all invariants
* Provide mutation and query operations

### Entities

* **Person**
* **Relationship** (parent–child, spouse)

### Enforced Invariants (Examples)

* No circular ancestry
* Max 2 biological parents
* Parent older than child
* No self‑relationships
* Canonical spouse ordering
* Safe deletion (no orphaned relationships)

### Error Modeling

Typed domain errors:

* `CycleDetectedError`
* `ParentLimitExceededError`
* `PersonHasRelationshipsError`
* `DuplicateRelationshipError`
* `AgeInconsistencyError`

The domain is:

* Framework‑agnostic
* Persistence‑agnostic
* HTTP‑agnostic

---

## 5. Persistence Strategy (MongoDB)

### Key Change

System uses **MongoDB**, not PostgreSQL.

### Correct MongoDB Model

**One document per aggregate** (`FamilyTree`).

Snapshot contains:

* Persons
* Parent–child edges
* Spouse edges
* Version (optimistic locking)

### Benefits

* Atomic writes
* No partial persistence
* Natural aggregate boundary
* Easy hydration

### Repository Rules

* Load → hydrate via domain methods
* Save → replace entire document
* No validation in repository
* Fail fast on corrupted data

---

## 6. Application Layer

### Pattern

* **Commands** for mutations
* **Queries** for reads

### Responsibilities

* Load aggregate
* Call domain methods
* Save aggregate
* Propagate domain errors

No business logic exists here — only orchestration.

---

## 7. Critical Milestone: End‑to‑End Smoke Test

### Purpose

Validate:

* Domain ↔ Repository ↔ Application integration
* Persistence correctness
* Hydration fidelity
* Deletion safety

### Smoke Test Scenario

1. Create tree
2. Add persons A, B, C
3. A ↔ B spouses
4. A → C parent‑child
5. Save
6. Reload
7. Assert counts
8. Remove relationship
9. Save & reload
10. Illegal delete → expect failure
11. Valid delete → succeed

### Result

🎉 **All tests passed**

This confirmed the system is **correct before any controllers exist**.

---

## 8. Controllers & DTOs

### Design Rules

Controllers:

* Parse input
* Call application services
* Map domain errors → HTTP

They must NOT:

* Import domain entities
* Call repositories
* Enforce business rules

### Endpoint Coverage

All application service APIs were exposed:

* Create tree
* Create person
* Add/remove relationships
* Delete person
* Render tree
* Get person
* Get ancestors
* Get descendants

DTOs are:

* Projection‑only
* Serializable
* Behavior‑free

---

## 9. HTTP Layer Validation

Controllers compile and expose the full API surface.

Next recommended step:

* HTTP end‑to‑end tests (Supertest + real MongoDB)

This will validate:

* Serialization
* Routing
* Error mapping
* No accidental domain bypass

---

## 10. Key Lessons Learned

### Technical

* Aggregate‑first design simplifies persistence
* MongoDB excels with snapshot‑based aggregates
* Domain purity prevents long‑term decay
* Fail‑fast hydration is critical for integrity

### Process

* Writing SRS early saves massive rework
* Smoke testing before controllers prevents false confidence
* Correctness before UI is non‑negotiable
* Copilot works best with **clear constraints and phased instructions**

---

## 11. Current Status

✅ Domain complete and enforced
✅ MongoDB persistence validated
✅ Application service stable
✅ Controllers and DTOs complete
✅ Build passing

The system is now **safe to expose, test via HTTP, and build a frontend on top of**.

---

## 12. Recommended Next Steps

1. HTTP E2E tests (lock correctness)
2. API documentation (Swagger)
3. Frontend visualization
4. Performance tuning (later)
5. Imports, access control, and UX (phase 2)

---

## Final Note

This project demonstrates a **disciplined, correctness‑first software engineering process** rarely seen in early‑stage systems. The architecture is maintainable, extensible, and resilient by design.

The knowledge and practices gained here transfer directly to any complex, rule‑heavy system beyond genealogy.
