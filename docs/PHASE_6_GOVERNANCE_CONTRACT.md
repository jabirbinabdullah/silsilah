# Phase 6: Audit Governance Contract

**Version:** 1.0  
**Status:** Active  
**Date:** January 2, 2026

---

## Purpose

This document establishes the **immutable principles** governing the audit system. All refactoring, feature development, and architectural changes **must obey** these constraints.

---

## Core Principles

### 1. Audit is Append-Only

**Rule:** Audit log entries **shall never** be modified, deleted, or overwritten after creation.

- **Implication:** Once an entry exists, it is permanent.
- **Consequence:** No UPDATE, DELETE, or TRUNCATE operations on audit records.
- **Exception:** None. Not even system admins or database operators may alter historical records.
- **Implementation Check:** Audit repository methods are `append()` only; no update/delete methods exist.

### 2. Audit is Read-Only via Public APIs

**Rule:** All public endpoints (`/api/trees/:treeId/activity`, `/api/trees/:treeId/persons/:personId/history`) are **read-only**. No mutations are exposed.

- **Implication:** Clients cannot create, modify, or delete audit entries directly.
- **Consequence:** Audit entries are **only created internally** by the application during command execution.
- **Implementation Check:** 
  - No POST/PUT/DELETE handlers exist for audit endpoints.
  - Audit repository is injected into query handlers, not command handlers.

### 3. UI Never Mutates Audit

**Rule:** Frontend components are **prohibited** from making mutating requests to audit endpoints.

- **Implication:** UI cannot call POST/PUT/DELETE on audit paths (which don't exist anyway).
- **Consequence:** All audit visualization is read-only; UI is a **passive observer**.
- **Implementation Check:** 
  - Audit service exports only `fetch*` and `load*` methods (query verbs).
  - No `create*`, `update*`, or `delete*` methods for audit.
  - Components use `useEffect` + `useState`, not form submissions or mutations.

### 4. Actors and Timestamps Are Mandatory

**Rule:** Every audit entry **must** include:
- `userId` — The user who performed the action (never null, defaults to 'system' for internal operations)
- `username` — Human-readable name (never null)
- `timestamp` — ISO 8601 UTC timestamp (never null, set at creation time)
- `role` — User role at time of action (OWNER, EDITOR, VIEWER, UNKNOWN)

- **Implication:** Audit entries without provenance are **invalid**.
- **Consequence:** Code that attempts to append an entry without these fields **must fail loudly**.
- **Implementation Check:** 
  - `AuditLogEntry` interface requires all four fields.
  - TypeScript enforces this at compile time.
  - Runtime validation rejects incomplete entries.

### 5. Missing Audit Entries Are Defects

**Rule:** If a mutation occurs but no audit entry is created, this is a **critical defect**.

- **Implication:** Audit coverage is not optional; it is part of the contract.
- **Consequence:** 
  - Every mutation handler **must** call `appendAudit()`.
  - Missing coverage is a bug, not a feature gap.
  - E2E tests **must** assert that audit entries exist after mutations.
- **Implementation Check:**
  - All command handlers in `genealogy-application.service.ts` include `await this.appendAudit()`.
  - E2E tests seed data and assert entry counts.
  - Code review blocks PRs with unaudit'd mutations.

---

## Compliance Checklist

Use this checklist for code review and refactoring:

- [ ] No UPDATE/DELETE operations on audit tables
- [ ] Audit repository has only `append()`, `findByTree()`, `findByPerson()` methods
- [ ] Public audit endpoints are GET-only
- [ ] Frontend audit service exports only query methods
- [ ] Every mutation handler calls `appendAudit()`
- [ ] `userId`, `username`, `timestamp`, `role` are required in audit entries
- [ ] E2E tests assert audit entries for each mutation
- [ ] No component-based audit mutations (no form submits to audit endpoints)

---

## Exceptions and Escalation

**There are no exceptions to these rules.** If a requirement conflicts with these principles:

1. **Raise an issue** with the architecture team
2. **Document the conflict** with business justification
3. **Update this contract** if approved (requires consensus)
4. **Never circumvent** the rules with workarounds

---

## Future Considerations

These principles are stable and long-term:

- **Audit Retention:** May implement archival, but append-only remains.
- **Distributed Tracing:** May add correlation IDs, but immutability remains.
- **Performance:** May add indexes or partitioning, but read-only APIs remain.
- **Compliance:** May add encryption or signature, but core rules remain.

---

## Enforcement

- **Compile Time:** TypeScript strict mode + required fields catch violations early.
- **Runtime:** Validation middleware rejects invalid entries.
- **E2E:** Tests assert audit coverage for all mutations.
- **Code Review:** PRs without audit entries are **blocked**.

---

**Approved By:** Architecture Review  
**Last Updated:** January 2, 2026
