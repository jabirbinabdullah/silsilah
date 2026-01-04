# Phase 6 Governance Contract

This document defines non-negotiable governance constraints that all current and future refactors must respect. It focuses on audit data, interfaces, and UI responsibilities.

## Scope
- Applies to all services, CLIs, background jobs, and UIs that mutate genealogical data.
- Covers storage, transport, and presentation of audit records.

## Core Constraints
1. **Append-only & immutable audit log**
   - No updates or deletes of audit entries after write. Corrections use compensating entries.
   - Storage must enforce immutability (e.g., write-once buckets, append-only tables, or DB-level constraints).

2. **Read-only audit APIs**
   - All audit endpoints expose `GET` (and optionally `LIST/STREAM`) only; no `POST/PUT/PATCH/DELETE` for audit resources.
   - Any attempt to mutate audit data via API is a defect.

3. **Mandatory evidence for every mutation**
   - Each domain mutation must emit an audit record synchronously or within a guaranteed, durable queue before acknowledging success.
   - The absence of corresponding audit evidence for a committed mutation is treated as a production defect.

4. **Actor attribution and timestamps**
   - Every audit entry must include: authenticated actor identifier, role/tenant (if multi-tenant), precise timestamp (with timezone/UTC), action type, target entity, and correlation/request IDs.
   - Anonymous actions are not permitted; system-initiated actions must identify the service principal.

5. **UI non-mutation of history**
   - UI may only read and display audit history; it must never edit, reorder, redact, or "correct" audit records.
   - UI corrections are modeled as new domain mutations that generate new audit entries, not edits to prior history.

## Implementation Notes (guidance, not alternatives)
- Prefer append-only storage primitives (event stores, append-only tables, object storage with versioning/WORM) for audit data.
- Protect audit write paths with idempotency keys to avoid duplicate evidence without enabling mutation.
- Enforce schema fields for actor/timestamp at persistence and validation layers.
- Log ingestion and streaming should preserve ordering metadata and be tamper-evident (signatures/hashes) when feasible.

## Verification & Monitoring
- Automated checks: ensure every domain command/event handler emits an audit write; block merges when audit emission is absent.
- Runtime alarms: alert on mutation successes without matching audit entries, and on any attempted audit-log mutation.
- Periodic integrity scans: verify append-only properties (no tombstones/updates) and validate hash chains or checksums if used.

## Change Management
- Any change impacting audit schema, storage, or API shape must be reviewed for compliance with the above constraints.
- Exceptions are not permitted; deviations must be treated as defects and remediated immediately.
