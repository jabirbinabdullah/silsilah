# Audit Collection Indexes

**Status:** Required  
**Updated:** January 2, 2026

---

## Overview

The `audit_logs` collection in MongoDB requires specific indexes to support efficient query patterns on the activity and history endpoints.

---

## Required Indexes

### 1. Tree Activity Queries
```json
{
  "key": { "treeId": 1, "timestamp": -1 },
  "name": "idx_treeId_timestamp"
}
```

**Purpose:** Supports `GET /api/trees/:treeId/activity`  
**Access Pattern:** Filter by treeId, sort by timestamp (descending)  
**Impact:** Critical for tree-level activity feeds

### 2. Person History Queries
```json
{
  "key": { "personId": 1, "timestamp": -1 },
  "name": "idx_personId_timestamp"
}
```

**Purpose:** Supports `GET /api/trees/:treeId/persons/:personId/history`  
**Access Pattern:** Filter by personId, sort by timestamp (descending)  
**Impact:** Critical for person-level change history

---

## Optional Indexes (Future)

### 3. Action Filtering
```json
{
  "key": { "action": 1, "timestamp": -1 },
  "name": "idx_action_timestamp"
}
```

**Purpose:** Support filtering by action type (e.g., "CREATE_PERSON", "ESTABLISH_SPOUSE")  
**Access Pattern:** Filter by action, sort by timestamp  
**Status:** Created on startup (non-critical)

---

## How Indexes Are Ensured

### 1. **Automatic Startup Check** (Recommended)
The `AppModule` runs `ensureAuditIndexes()` when initializing the audit repository:

```typescript
// backend/src/app.module.ts
async function ensureAuditIndexes(client: MongoClient, dbName: string): Promise<void>
```

- Runs once per application startup
- Creates indexes if missing
- Logs success/failure
- Non-blocking: errors logged but do not prevent app startup

### 2. **Migration Script** (Manual)
For explicit control or when initializing a database:

```bash
cd backend
npx ts-node scripts/create-audit-indexes.ts
```

**Script location:** `backend/scripts/create-audit-indexes.ts`

### 3. **Manual Creation** (Emergency)
If needed in production MongoDB:

```javascript
db.audit_logs.createIndex({ treeId: 1, timestamp: -1 }, { name: "idx_treeId_timestamp" });
db.audit_logs.createIndex({ personId: 1, timestamp: -1 }, { name: "idx_personId_timestamp" });
db.audit_logs.createIndex({ action: 1, timestamp: -1 }, { name: "idx_action_timestamp" });
```

---

## Verification

### Check Existing Indexes
```javascript
db.audit_logs.getIndexes();
```

Expected output (minimum):
```json
[
  { "key": { "_id": 1 }, "name": "_id_" },
  { "key": { "treeId": 1, "timestamp": -1 }, "name": "idx_treeId_timestamp" },
  { "key": { "personId": 1, "timestamp": -1 }, "name": "idx_personId_timestamp" }
]
```

### Check Index Performance
```javascript
db.audit_logs.aggregate([
  { $indexStats: {} }
]);
```

---

## Constraints & Non-Negotiable Rules

1. **Append-Only:** Never update or delete audit records, only indexes.
2. **Required:** The two core indexes (treeId, personId) are non-negotiable.
3. **Non-Blocking:** Index creation failures do not prevent app startup (intentional).
4. **Idempotent:** Creating an index that already exists is safe; MongoDB detects this.

---

## Performance Impact

### Without Indexes
- Tree activity: O(N) collection scan
- Person history: O(N) collection scan
- Estimated impact: 100ms–10s for trees with 10k+ audit entries

### With Indexes
- Tree activity: O(log N) seek + O(M) fetch (M = page size)
- Person history: O(log N) seek + O(M) fetch
- Estimated impact: 1–50ms regardless of collection size

---

## Maintenance

- **Growth:** Indexes automatically maintain as data grows
- **Monitoring:** Monitor index size with `db.audit_logs.totalIndexSize()`
- **Cleanup:** Remove unused indexes manually if needed
- **Rebuild:** Reindex only if corruption suspected (rare)

---

## Related Files

- `backend/src/app.module.ts` – Automatic startup check
- `backend/scripts/create-audit-indexes.ts` – Manual migration script
- `backend/src/infrastructure/repositories/audit-log.mongo.repository.ts` – Query implementation
