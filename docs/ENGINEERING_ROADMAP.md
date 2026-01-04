# ENGINEERING_ROADMAP.md

## Genealogy System — Engineering Roadmap

### Engineering Philosophy
- Domain correctness first
- Explicit boundaries
- Fail-fast behavior
- Auditability over convenience
- Teaching-grade architecture

---

## Phase 1 — Domain & Persistence Foundation (COMPLETED)

- Pure domain model (framework-agnostic)
- Single aggregate root (GenealogyGraph)
- Explicit invariants with typed errors
- Snapshot-based persistence
- MongoDB atomic document storage
- Optimistic locking
- Domain-only hydration
- No infrastructure leakage

---

## Phase 2 — Application & Security Layer (COMPLETED)

- Application service orchestration
- Authorization (roles)
- Authentication (JWT)
- Ownership and membership enforcement
- Append-only audit logging
- Thin controllers, DTO-only projections

---

## Phase 3 — Production Hardening (COMPLETED)

- Docker multi-stage builds
- Health/readiness endpoints
- Environment separation
- Optional read-only MongoDB client
- Conventional commits enforced
- Deployment documentation
- **Tree render read model implemented and contract-tested**

---

## Phase 4 — Frontend & Visualization (IN PROGRESS)

- React + TypeScript
- SVG rendering with D3 utilities
- Read-only queries first
- Server-enforced mutations only

---

## Phase 5 — Scalability & Longevity (Long-term)

- Read-optimized projections
- Cached render snapshots
- Background exports
- Versioned domain snapshots

---

## Explicit Non-Goals
- Graph databases unless required
- Soft deletes
- Client-side business rules
- Auto-merging concurrent edits

---

## Teaching Value
This codebase serves as:
- A DDD-lite reference
- Aggregate consistency example
- Long-term system design case study
