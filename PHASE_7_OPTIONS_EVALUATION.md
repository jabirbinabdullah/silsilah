# Phase 7 Options Evaluation

## Current system state
- Audit logs are append-only, immutable, with actor/timestamp/action captured synchronously after mutations.
- Read-only audit APIs expose paginated entries; no mutations allowed.
- Frontend displays activity feeds and person history with action classification.
- Retention policy defined (indefinite, archival-first); no enforcement yet.
- Governance contract established: no UI editing of audit records.

---

## Option A: Audit Integrity & Tamper-Evidence

### Primary value delivered
- **Cryptographic proof of immutability**: hash chaining, Merkle tree roots, or HMAC signatures on audit entries.
- **Forensic confidence**: detect if audit logs were modified at rest (database tampering, backup restore errors).
- **Compliance readiness**: evidence for regulatory audits (SOC 2, HIPAA, GDPR) that audit logs are tamper-evident.

### Technical prerequisites
- Hash function selection (SHA-256 recommended).
- Chain/tree data structure: each entry hashes prior entries + its own content; can be embedded in entry or maintained separately.
- Verification endpoint: expose current Merkle root or latest chain hash for external audit/monitoring.
- Operational setup: secure key management if using HMAC; initialization of genesis entry.

### Risks if delayed
- **Vulnerability window**: production system has logs but no proof they're authentic—discovery during compliance audit is costly and damaging.
- **Forensic debt**: adding hashing retroactively to millions of existing entries is expensive; starting early keeps costs low.
- **Customer trust**: genealogy data is personal/sensitive; lack of tamper-evidence is a red flag for security-conscious users.

---

## Option B: Auditor/Admin Tooling

### Primary value delivered
- **Operational visibility**: admin dashboard exposing filtered activity (by tree, person, date range, action type, actor).
- **Export for compliance**: downloadable audit reports in standard formats (CSV, JSON, signed PDF).
- **Anomaly detection hooks**: e.g., bulk deletions, rapid re-entries, inactive account suddenly active.
- **User management audit**: see which users touched which trees, when, and what actions.

### Technical prerequisites
- Admin role/permission enforcement (separate from OWNER/EDITOR/VIEWER).
- Audit filtering service: indexes on treeId, action, userId, timestamp; query builder for multi-field filters.
- Export service: templating, signing (optional), format conversion.
- Admin UI: dashboard, table views, filter panels, export dialogs.
- Rate limiting on export to prevent log scraping.

### Risks if delayed
- **Operational blind spot**: teams cannot quickly investigate user issues or trace data changes—escalation time increases.
- **Compliance gaps**: inability to produce audit trails on demand (e.g., "who changed this person?") fails audit requirements.
- **Support burden**: users/admins manually query the database or request help; scales poorly.

---

## Option C: Authoring Governance (Review/Approval Workflows)

### Primary value delivered
- **Change gating**: sensitive mutations (e.g., deleting a person, bulk import) require review/approval before execution.
- **Audit trail of decisions**: who proposed, who approved/rejected, when, with notes.
- **Compliance confidence**: evidence of due care before high-impact changes.
- **Collaboration**: multiple editors can discuss and validate changes before committing.

### Technical prerequisites
- Workflow engine or state machine: proposal → pending → approved/rejected → committed.
- Persistence for proposals: store proposed mutation, approver list, decision notes.
- Notification system: notify approvers of pending decisions.
- UI for proposal submission, review, and approval.
- Optional: role-based approval requirements (e.g., only OWNER can approve deletes).

### Risks if delayed
- **Operational friction**: without governance, any EDITOR can make irreversible changes; mistakes (accidental person deletion) are costly and may require data recovery.
- **Regulatory exposure**: some use cases (legal genealogy, DNA-linked records) may require documented approval trails; missing this is a liability.
- **User trust erosion**: if early adopters experience accidental data loss without recourse, adoption stalls.

---

## Recommendation: **Option A** (Audit Integrity & Tamper-Evidence)

### Justification

**Why A over B and C:**

1. **Foundation first**: Integrity is foundational. Without tamper-evidence, B (tooling) may surface fake or altered logs, and C (governance) lacks confidence in its own audit trail. A unlocks credibility for both.

2. **Low implementation complexity, high ROI**: Hash chaining is straightforward cryptography; no complex workflows or UI required. Once added, it's passive—every append automatically chains, no ongoing maintenance burden.

3. **Irreversible window closing**: Retroactively adding hashing to existing logs is much harder than starting now. Every day of delay reduces the effective historical coverage.

4. **Compliance leverage**: Tamper-evidence is table-stakes for regulated use cases (genealogy with medical/legal implications). B and C are nice-to-have; A is must-have.

5. **Unblocks later phases**: Once A is solid, B becomes trustworthy (auditors know logs are authentic), and C gains credibility (governance decisions are permanently recorded and verifiable).

### Implementation roadmap
- Phase 7a: Add hash chaining to AuditLogEntry, implement append-time verification, expose verification endpoint.
- Phase 7b (later): B and C can follow without rework; A is immutable infrastructure.

### Risk profile
- **Technical risk**: low—hash chaining is well-understood; tested approaches exist.
- **Schedule risk**: low—can be implemented in isolation without blocking other work.
- **Operational risk**: low—read-only audit APIs unchanged; only append path gains hashing.
