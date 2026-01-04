# Audit System Quick Reference

> **TL;DR**: Type-safe, read-only audit DTOs for genealogy changes. No enrichment. No inference. Raw data + classification.

## 1-Minute Overview

**What it does**: Shows "who changed what, when" for a family tree

**Three view contexts**:
- **Tree Activity** — All changes to the tree (new persons, relationships, etc.)
- **Person History** — All changes involving a specific person
- **User-centric** — Filter by actor (what did alice do?)

**Data flow**:
```
Backend Audit Logs → Transform → Enum Classification → UI DTOs → React Components
```

---

## Core Types

```typescript
// What it looks like in the database
AuditLogEntry {
  id: string;
  treeId: string;
  action: "create-person";  // Raw backend string
  actor: {userId, username, role};
  timestamp: ISO8601;
}

// What UI gets
ActivityFeedEntry {
  actionType: AuditActionType.PERSON_CREATED;  // Enum
  actionLabel: "Created person";  // Human-readable
  actor: {userId, username, role};
  entity: {type: "PERSON", id: ""};  // Consumer populates name
  timestamp: ISO8601;
}
```

---

## API (3 Main Functions)

```typescript
// Service layer (use these)
import { fetchTreeActivityFeed, fetchPersonChangeHistory } from '@/services/auditService';

// Fetch tree activity
const feed = await fetchTreeActivityFeed(treeId, {limit: 50, offset: 0});
console.log(feed.entries);  // ActivityFeedEntry[]
console.log(feed.pagination.hasMore);  // boolean

// Fetch person changes
const history = await fetchPersonChangeHistory(treeId, personId, {limit: 30});
console.log(history.entries);  // PersonChangeHistoryEntry[]

// Or call API layer directly
import { getTreeActivityLog } from '@/api';
const raw = await getTreeActivityLog(treeId, {limit: 50});
console.log(raw.entries);  // AuditLogEntryDTO[] (not transformed)
```

---

## Action Types (Reference)

### Tree-level Actions
```
TREE_CREATED        — New tree
TREE_UPDATED        — Tree name/description changed
TREE_DELETED        — Tree deleted
TREE_SHARED         — Access granted to user
TREE_UNSHARED       — Access revoked
```

### Person Actions
```
PERSON_CREATED      — New person
PERSON_UPDATED      — Person details changed (any field)
PERSON_DELETED      — Person deleted
```

### Relationship Actions
```
PARENT_CHILD_CREATED        — Parent-child link added
PARENT_CHILD_DELETED        — Parent-child link removed
SPOUSE_RELATIONSHIP_CREATED — Marriage link added
SPOUSE_RELATIONSHIP_DELETED — Marriage link removed
```

### Data Management
```
DATA_IMPORTED  — Bulk import (persons/relationships)
DATA_EXPORTED  — Export to file
UNKNOWN        — Couldn't classify action
```

### Permission
```
PERMISSION_CHANGED  — User role changed (EDITOR → VIEWER)
```

---

## Using in Components

### Basic Setup

```typescript
import { useEffect, useState } from 'react';
import { TreeActivityFeed } from '@/models/auditModels';
import { fetchTreeActivityFeed } from '@/services/auditService';

export function ActivityTab({ treeId }: { treeId: string }) {
  const [feed, setFeed] = useState<TreeActivityFeed | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTreeActivityFeed(treeId).then(setFeed).finally(() => setLoading(false));
  }, [treeId]);

  if (loading) return <div>Loading...</div>;
  if (!feed?.entries.length) return <div>No activity yet</div>;

  return (
    <div>
      {feed.entries.map(entry => (
        <div key={entry.id} className="entry">
          <span>{entry.actor.username}</span>
          <span>{entry.actionLabel}</span>
          <span>{new Date(entry.timestamp).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}
```

### With Enrichment (Person Names)

```typescript
const [personMap, setPersonMap] = useState<Map<string, {name: string}>>(new Map());

// Populate personMap from your existing data
const enrichEntry = (entry: ActivityFeedEntry) => {
  if (entry.entity.id && personMap.has(entry.entity.id)) {
    entry.entity.displayName = personMap.get(entry.entity.id)!.name;
  }
  return entry;
};

// In render:
{feed.entries.map(entry => {
  const enriched = enrichEntry(entry);
  return (
    <div key={entry.id}>
      <strong>{enriched.actor.username}</strong>
      <span>{enriched.actionLabel}</span>
      {enriched.entity.displayName && (
        <span>{enriched.entity.displayName}</span>
      )}
    </div>
  );
})}
```

### Pagination

```typescript
import { loadMoreActivityFeedEntries } from '@/services/auditService';

const [feed, setFeed] = useState<TreeActivityFeed | null>(null);

const handleLoadMore = async () => {
  if (!feed?.pagination.hasMore) return;
  const nextFeed = await loadMoreActivityFeedEntries(treeId, feed);
  setFeed({
    ...feed,
    entries: [...feed.entries, ...nextFeed.entries],
    pagination: nextFeed.pagination,
  });
};
```

---

## Guarantees vs. Non-Guarantees

### ✅ You Can Rely On
- Entries are chronologically ordered
- Actor info is accurate at time of action
- No data loss in transformation
- Transformation is deterministic (same input → same output)

### ❌ Don't Assume
- Entity names are present (backend doesn't include them)
- Entities still exist (they might be deleted)
- Complete audit trail (depends on backend logging)
- Semantic correctness of action classification (heuristic)
- Related persons are populated (you must look them up)

---

## Common Patterns

### Filter by Action Type

```typescript
const personCreations = feed.entries.filter(
  e => e.actionType === AuditActionType.PERSON_CREATED
);
```

### Group by Date

```typescript
const grouped = feed.entries.reduce((acc, entry) => {
  const date = new Date(entry.timestamp).toLocaleDateString();
  if (!acc[date]) acc[date] = [];
  acc[date].push(entry);
  return acc;
}, {} as Record<string, ActivityFeedEntry[]>);

Object.entries(grouped).map(([date, entries]) => (
  <div key={date}>
    <h4>{date}</h4>
    {entries.map(e => <Entry key={e.id} entry={e} />)}
  </div>
));
```

### Show "Who Did What"

```typescript
{feed.entries.map(entry => (
  <span key={entry.id}>
    <strong>{entry.actor.username}</strong>
    {" "}{entry.actionLabel} {entry.entity.displayName || entry.entity.id}
    {" "}<em>{formatDistance(new Date(entry.timestamp), new Date(), { addSuffix: true })}</em>
  </span>
))}
// Output: "alice Created person Jane Doe 2 hours ago"
```

---

## Testing

### Mock the Service

```typescript
jest.mock('@/services/auditService', () => ({
  fetchTreeActivityFeed: jest.fn().mockResolvedValue({
    treeId: 'test-tree',
    entries: [
      {
        id: 'e1',
        actionType: 'PERSON_CREATED',
        actionLabel: 'Created person',
        actor: { userId: 'u1', username: 'alice', role: 'OWNER' },
        entity: { type: 'PERSON', id: 'p1' },
        timestamp: '2024-01-01T00:00:00Z',
      },
    ],
    total: 1,
    pagination: { limit: 50, offset: 0, hasMore: false },
  }),
}));
```

### Test the Transformer

```typescript
import { transformToActivityFeedEntry } from '@/adapters/auditTransformer';

it('classifies create-person action', () => {
  const result = transformToActivityFeedEntry({
    id: 'a1',
    treeId: 't1',
    action: 'create-person',
    actor: { userId: 'u1', username: 'alice', role: 'OWNER' },
    timestamp: '2024-01-01T00:00:00Z',
  });
  
  expect(result.actionType).toBe('PERSON_CREATED');
  expect(result.actionLabel).toBe('Created person');
});
```

---

## File Map

| File | Purpose |
|------|---------|
| `frontend/src/models/auditModels.ts` | DTOs, enums, mappings |
| `frontend/src/adapters/auditTransformer.ts` | Raw → DTO transformation |
| `frontend/src/api.ts` | HTTP layer (getTreeActivityLog, getPersonChangeHistory) |
| `frontend/src/services/auditService.ts` | Business logic (use this!) |
| `docs/AUDIT_INTEGRATION_GUIDE.md` | Full reference |

---

## Troubleshooting

### "Action type is UNKNOWN"
→ Backend sent unexpected action string. Check `rawAction` field.  
→ Add pattern to `parseAction()` in auditTransformer.ts

### "Entity displayName is empty"
→ Backend doesn't include entity names. You must populate.  
→ Look up person by `entry.entity.id` in your data, set `entry.entity.displayName`

### "Person change history is empty but activity feed has entries"
→ Backend endpoint doesn't filter by person yet.  
→ Filtering happens client-side (by `personId` and `relatedPersonId`).  
→ Service limits to entries relevant to the person.

### "Timestamps are in UTC, I need local time"
→ `entry.timestamp` is ISO 8601 UTC. Use `new Date(entry.timestamp)` for local conversion.  
→ Use `date-fns` or `dayjs` for formatting.

---

## Next Steps (UI Components)

1. **Create ActivityFeed.tsx** — Display tree activity
2. **Create PersonChangeHistory.tsx** — Display person changes
3. **Add "Activity" tab to TreeViewer**
4. **Add "History" tab to PersonDetailsDrawer**
5. **Add enrichment logic** (person name lookup)
6. **Test & polish**

---

## Related Documentation

- [AUDIT_INTEGRATION_GUIDE.md](./AUDIT_INTEGRATION_GUIDE.md) — Full reference with examples
- [PHASE_6_SESSION_1_SUMMARY.md](./PHASE_6_SESSION_1_SUMMARY.md) — Architecture & decisions
- Backend: `/api/trees/:treeId/activity` endpoint

---

**Quick Start**: Import `fetchTreeActivityFeed` from `auditService`, call with treeId, render `entries`  
**Key Insight**: Service layer does transformation; consumer does enrichment  
**Remember**: No enrichment means you must handle entity names, existence checks, etc.
