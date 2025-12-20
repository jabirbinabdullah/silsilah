# Database Schema (V1, MongoDB)

Aligns with DOMAIN_MODEL.md: **GenealogyGraph is the sole aggregate root**, persisted as a single MongoDB document using the snapshot pattern. All invariants are validated at the application layer during hydration; MongoDB provides atomic document writes and no partial updates.

## Collection: family_trees

### Document Structure

```json
{
  "_id": "tree-123",
  "treeId": "tree-123",
  "persons": [
    {
      "personId": "person-1",
      "name": "John Doe",
      "gender": "MALE",
      "birthDate": ISODate("1950-01-01T00:00:00Z"),
      "birthPlace": "New York",
      "deathDate": null
    }
  ],
  "parentChildEdges": [
    { "parentId": "person-1", "childId": "person-2" }
  ],
  "spouseEdges": [
    { "spouse1Id": "person-1", "spouse2Id": "person-3" }
  ],
  "version": 1,
  "createdAt": ISODate("2025-12-20T00:00:00Z"),
  "updatedAt": ISODate("2025-12-20T00:00:00Z")
}
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `_id` | string | MongoDB document ID (same as treeId for convenience). |
| `treeId` | string | Genealogy tree identifier (unique). |
| `persons` | array | Array of person objects within the tree. |
| `persons[].personId` | string | Unique person identifier within the tree. |
| `persons[].name` | string | Person's name (non-empty, ≤255 chars). |
| `persons[].gender` | enum | 'MALE' \| 'FEMALE' \| 'UNKNOWN'. |
| `persons[].birthDate` | date or null | Birth date (ISO8601 format). |
| `persons[].birthPlace` | string or null | Location of birth. |
| `persons[].deathDate` | date or null | Death date (ISO8601 format). |
| `parentChildEdges` | array | Array of parent-child relationships. |
| `parentChildEdges[].parentId` | string | Parent person ID. |
| `parentChildEdges[].childId` | string | Child person ID. |
| `spouseEdges` | array | Array of spouse relationships. |
| `spouseEdges[].spouse1Id` | string | First spouse (canonical ordering: min(ID)). |
| `spouseEdges[].spouse2Id` | string | Second spouse (canonical ordering: max(ID)). |
| `version` | number | Optimistic lock version. Incremented on each save. |
| `createdAt` | date | Document creation timestamp. |
| `updatedAt` | date | Last modification timestamp. |

## Indexes

```javascript
// Primary index: fast document lookup by tree ID
db.family_trees.createIndex({ _id: 1 });

// Version index: supports optimistic locking queries
db.family_trees.createIndex({ "_id": 1, "version": 1 });
```

Indexes are optional at small scale but recommended for production:
- **Document lookup by `_id`** is automatic (always indexed).
- **Version index** speeds up optimistic locking checks during save.

## Invariant Enforcement

| Invariant | Enforcement | Mechanism |
|-----------|------------|-----------|
| G1: DAG (no cycles) | Application (soft) | Validated during `addParentChildRelationship()` via `wouldCreateCycle()`. |
| G2: ≤2 parents per child | Application (soft) | Validated during `addParentChildRelationship()` via `countParents()`. |
| G3: Edge uniqueness | Application (soft) | Validated during add via Set membership; no duplicates in snapshots. |
| G4: Referenced persons exist | Application (soft) | Validated during `addParentChildRelationship()` and `addSpouseRelationship()` via `requirePerson()`. |
| G5: No isolated persons | Application (soft) | Checked during deletion; `removePerson()` throws if relationships exist. |
| G6: Root validity | Application (soft) | Not enforced; rootPersonId is informational only. |
| G7: Age consistency | Application (soft) | Validated during `addParentChildRelationship()` via `ensureAgeConsistency()`. |
| Person name validation | Application | Checked in `PersonProps` validation. |
| Gender enum | Application | Enforced via TypeScript enum. |
| Death after birth | Application | Checked in domain logic. |
| No self-relationships | Application | Checked in `addParentChildRelationship()` and `addSpouseRelationship()`. |
| Spouse canonical ordering | Application | Enforced during save; `spouse1Id <= spouse2Id` always. |

## Hydration (Load)

When loading a tree from MongoDB:

1. Query document by `_id` (tree ID).
2. Create empty `GenealogyGraph` aggregate.
3. **Add persons** using `addPerson()` for each person in the document.
4. **Add parent-child relationships** using `addParentChildRelationship()` for each parent-child edge.
5. **Add spouse relationships** using `addSpouseRelationship()` for each spouse edge.

**Fail-fast behavior:** If MongoDB document contains invalid data:
- Orphaned relationships (person IDs don't exist) → `NotFoundError`
- Cycles in persisted data → `CycleDetectedError`
- Age inconsistency → `AgeInconsistencyError`
- Parent count > 2 → `ParentLimitExceededError`

**No partial aggregates:** All validation occurs during hydration; invalid data causes entire load to fail.

## Persistence (Save)

When saving a tree to MongoDB:

1. Extract snapshots from aggregate: `getPersonsSnapshot()`, `getParentChildEdgesSnapshot()`, `getSpouseEdgesSnapshot()`.
2. Check if document exists (determine insert vs. update).
3. **If updating:** Use optimistic locking:
   - `replaceOne({ _id: treeId, version: currentVersion }, newDocument)`
   - Fails with version mismatch if another process updated the tree.
4. **If inserting:** `insertOne(newDocument)` with `version: 1`.
5. Increment version field on each successful update.

**Atomicity guarantee:** MongoDB document updates are atomic. All persons and edges written together or none at all.

## Optimistic Locking

The `version` field enables optimistic concurrency control:

- **Increment on save:** Each save increments the version.
- **Check on update:** Update query includes current version in filter.
- **Conflict detection:** If another process incremented the version, the update matches 0 documents → error.
- **Client action:** Caller must reload the tree and retry.

Example conflict scenario:
```
Process A loads tree (version: 5)
Process B loads tree (version: 5)
Process B saves tree (version: 6)
Process A attempts save with version: 5 → 0 documents match → error
Process A reloads tree (version: 6)
Process A retries save with version: 6 → succeeds
```

## Design Rationale

### Snapshot Model vs. Normalized
- **Snapshot model:** Single document per aggregate. Simpler than relational normalization; matches DDD principles.
- **No partial updates:** Replace entire document on save. Prevents edge cases of partial persistence.
- **Fail-fast hydration:** All invariants re-enforced during load, regardless of MongoDB data state.

### Why MongoDB Over PostgreSQL
- **Schemaless evolution:** Document structure can evolve without migrations.
- **Atomic document updates:** Multi-field writes are atomic at document level.
- **Simpler modeling:** No JOIN complexity; aggregate stored as single document.
- **Developer experience:** JSON/JavaScript-native representation aligns with application types.

## Performance Considerations (500–5,000 nodes)

- **Document size:** At 5,000 persons + 10,000 edges, JSON representation is ~1–2 MB. MongoDB handles comfortably.
- **Load time:** Entire document hydrated once; no traversal queries needed.
- **Save time:** Single atomic document write; no multi-table orchestration.
- **Memory:** Aggregate loaded into memory; suitable for interactive applications with reasonable tree sizes.

For larger genealogies (10,000+ nodes), consider:
- Lazy loading (persist only person metadata, edges in separate collection).
- Graph database (Neo4j) for traversal-heavy workloads.

## Migration & Deployment

### Development
```bash
# Start MongoDB locally
mongod

# Set environment
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=silsilah

# Run smoke test to verify
npm run test:smoke
```

### Production
- Use MongoDB Atlas or managed MongoDB service.
- Set `MONGODB_URI` to production cluster URI.
- Create indexes manually or via application startup script.
- Enable backups.

### Database Initialization
- Collection created automatically on first write.
- No schema migrations needed; documents evolve at application layer.
- If downgrading application version, ensure old documents are compatible with new code.

## Notes

- **No relational constraints:** All invariants live in application code, validated during hydration.
- **Eventual consistency:** If using MongoDB replicas, ensure write concern is set appropriately.
- **Versioning strategy:** Optimistic locking prevents lost updates in concurrent scenarios.
- **Snapshot audit trail:** Consider adding a `history` collection for immutable event log if audit is needed (future enhancement).
