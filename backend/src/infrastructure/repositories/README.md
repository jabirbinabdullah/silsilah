# Repository Layer

## MongoDB Snapshot Model

The `MongoGenealogyGraphRepository` persists the genealogy aggregate using a snapshot pattern:

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
      "birthDate": "1950-01-01T00:00:00.000Z",
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
  "createdAt": "2025-12-20T00:00:00.000Z",
  "updatedAt": "2025-12-20T00:00:00.000Z"
}
```

### Hydration (Load)

1. Query document by `_id` (treeId)
2. Create empty `GenealogyGraph` aggregate
3. Add persons using `addPerson()` (validates person props)
4. Add parent-child relationships using `addParentChildRelationship()` (enforces DAG, <=2 parents, age consistency)
5. Add spouse relationships using `addSpouseRelationship()` (enforces canonical ordering, no duplicates)

**Fail-fast:** Invalid data in database causes domain errors during hydration. No partial aggregates returned.

### Persistence (Save)

1. Extract snapshots from aggregate:
   - `getPersonsSnapshot()`
   - `getParentChildEdgesSnapshot()`
   - `getSpouseEdgesSnapshot()`
2. Check if document exists (for versioning)
3. If exists: `replaceOne()` with optimistic lock check (`version` field)
4. If new: `insertOne()`

**Optimistic Locking:** Update fails if another process modified the tree (version mismatch). Caller must reload and retry.

**Atomicity:** MongoDB document updates are atomic. All snapshots written together or none.

### Configuration

Set environment variables:
```
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=silsilah
```

### Usage

```typescript
import { MongoClient } from 'mongodb';
import { MongoGenealogyGraphRepository } from './genealogy-graph.mongo.repository';

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();

const repo = new MongoGenealogyGraphRepository(client, process.env.MONGODB_DB_NAME);

// Load
const aggregate = await repo.findById('tree-123');

// Save
await repo.save(aggregate);
```

### Design Rationale

- **Snapshot model:** Simpler than relational normalization; aggregate stored as single document
- **No partial updates:** Replace entire document on save (simpler, more predictable)
- **Domain methods for hydration:** Enforces invariants even on corrupted data
- **Optimistic locking:** Prevents lost updates in concurrent scenarios
- **Version field:** Incremented on each save; used for conflict detection
