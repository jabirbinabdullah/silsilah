# Genealogy System — Product Roadmap

## 1. Vision

This system exists to preserve, manage, and pass down family genealogy as a living identity and shared value. It is designed for real families with long-term continuity needs, not as a social network or data-mining platform.

The guiding principles are:
- **Correctness over convenience** — genealogy data must remain consistent and trustworthy.
- **Clear ownership and responsibility** — family trees have owners and governed access.
- **Longevity** — data and architecture must remain usable for decades.
- **Educational value** — the system serves as a reference implementation of production-grade software engineering practices.

---

## 2. Current Status — v1 (Stable Core)

The system has reached architectural and production readiness.

### Completed Capabilities

**Domain & Architecture**
- Domain-driven aggregate for genealogy graph (persons, relationships)
- Enforced invariants (no cycles, parent limits, age consistency)
- Safe deletion semantics
- Framework-agnostic domain layer

**Persistence**
- MongoDB snapshot-based persistence
- Atomic document writes
- Optimistic locking (versioned aggregates)
- Hydration with full invariant re-validation

**Security**
- JWT-based authentication
- Role-based authorization (OWNER, EDITOR, VIEWER)
- Ownership and membership management
- Guard-based enforcement (toggleable for testing)

**Auditability**
- Append-only audit logging for all mutations
- Captures user, role, action, treeId, timestamp

**API & Integration**
- REST controllers with thin DTO projection
- Full application-service coverage
- Export support:
  - JSON snapshot
  - GEDCOM format

**Quality & Operations**
- End-to-end test coverage (domain → persistence → HTTP)
- Production-ready Docker image
- Environment-based configuration
- Deployment documentation
- Conventional commits enforced

This version is considered **stable, deployable, and supported**.

---

## 3. Short-Term Roadmap — v1.x (Hardening & Usability)

Focus: operational safety, performance hygiene, and admin visibility.

### Planned Enhancements

- Health and readiness endpoints
- API rate limiting (especially authentication endpoints)
- Pagination for ancestor/descendant queries
- Read-only audit log viewer (admin/owner)
- Optional read-model optimization for large trees

### Non-Disruptive Improvements

- Additional audit metadata (requestId, IP, user agent)
- Structured logging integration
- Backup automation scripts

No domain model changes expected in this phase.

---

## 4. Medium-Term Roadmap — v2 (User-Facing Value)

Focus: real-world usability for families.

### Features Under Consideration

- Web-based user interface
- Tree sharing via read-only links
- GEDCOM import
- Media attachments (photos, documents)
- Localization (names, calendars, cultural formats)
- Fine-grained visibility rules (per branch or person)

These features will reuse the existing domain and authorization model.

---

## 5. Long-Term Roadmap — v3+ (Exploration)

Focus: optional or research-oriented capabilities.

### Exploratory Ideas

- Tree merging with conflict resolution
- Historical uncertainty modeling (approximate dates)
- Event-sourced genealogy history
- Analytics on family structure evolution
- Advanced visualization techniques

These are not committed deliverables and will only be explored if they align with core principles.

---

## 6. Explicit Non-Goals

To protect focus and integrity, the system will **not** attempt to become:

- A social network
- A public genealogy search engine
- A DNA analysis platform
- An AI-generated ancestry system
- A marketing or advertising platform

Automation will never override explicit, user-authored genealogy data.

---

## 7. Roadmap Governance

- This roadmap is intentionally conservative
- No timelines are promised
- Scope expansion requires architectural review
- Stability and data integrity take priority over feature velocity

The roadmap will evolve, but the core principles will not.

