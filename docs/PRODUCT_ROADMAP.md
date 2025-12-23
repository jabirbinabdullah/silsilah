# PRODUCT_ROADMAP.md

## Genealogy System — Product Roadmap

### Purpose & Vision

This application exists to preserve, maintain, and responsibly share family genealogy as a long-lived digital asset.

Core principles:
- Genealogy represents identity and heritage
- Correctness and traceability outweigh convenience
- Ownership and consent are mandatory
- The system must remain trustworthy for decades

---

## Phase 1 — Core Genealogy Management (COMPLETED)

**Status:** ✅ Production-ready

### Delivered Features
- Family tree creation and ownership
- Person lifecycle management with safety guarantees
- Parent–child and spouse relationships
- Invariant enforcement (no cycles, max two parents, age consistency)
- Role-based access control (OWNER / EDITOR / VIEWER)
- Full audit trail for mutations
- Export (JSON snapshot, GEDCOM)
- Authentication (JWT)
- Production deployment support (Docker)

### User Value
- Safe lineage recording
- Explicit authority and responsibility
- Portable and future-proof data

---

## Phase 2 — Visualization & Exploration (Planned)

Goals:
- Interactive SVG-based family tree
- Expand/collapse branches
- Generation highlighting
- Relationship inspection

Constraints:
- No client-side business rule enforcement
- Read-only visualization first

---

## Phase 3 — Collaboration & Governance (Planned)

- Invitation-based membership
- Ownership transfer UI
- Activity visibility
- Optional public read-only sharing

---

## Phase 4 — Preservation & Continuity (Long-term)

- Scheduled backups
- Immutable snapshots
- Offline archival packages
- Long-term migration tooling

---

## Product Success Criteria
- Zero silent data corruption
- All changes attributable to users
- Data readable without original system
