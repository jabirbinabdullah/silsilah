# Audit & Activity Log Integration Guide

## Overview

The genealogy system now has a complete read-only audit subsystem for transparency and change tracking. This guide covers the architecture, data flow, and how to integrate audit views into your UI.

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│  UI Components (React)                                      │
│  - ActivityFeed.tsx (displays tree activity)                │
│  - PersonChangeHistory.tsx (displays person-level changes)  │
└──────────────────────┬──────────────────────────────────────┘
                       │ consumes
┌──────────────────────▼──────────────────────────────────────┐
│  Service Layer (auditService.ts)                            │
│  - fetchTreeActivityFeed()                                  │
│  - fetchPersonChangeHistory()                               │
│  - loadMoreActivityFeedEntries()                            │
│  - loadMorePersonChangeHistoryEntries()                     │
└──────────────────────┬──────────────────────────────────────┘
                       │ transforms
┌──────────────────────▼──────────────────────────────────────┐
│  Transformer Layer (auditTransformer.ts)                    │
│  - transformActivityFeed()                                  │
│  - transformPersonChangeHistory()                           │
│  - parseAction() [internal heuristic parser]                │
└──────────────────────┬──────────────────────────────────────┘
                       │ fetches
┌──────────────────────▼──────────────────────────────────────┐
│  API Layer (api.ts)                                         │
│  - getTreeActivityLog()                                     │
│  - getPersonChangeHistory()                                 │
└──────────────────────┬──────────────────────────────────────┘
                       │ communicates with
┌──────────────────────▼──────────────────────────────────────┐
│  Backend: GET /api/trees/:treeId/activity?limit=50&offset=0│
│  Response: {entries: AuditLogEntry[], total: number}        │
└─────────────────────────────────────────────────────────────┘
```

## Data Models

### Core DTOs

**AuditLogEntryDTO** (backend raw data)
```typescript
{
  id: string;
  treeId: string;
  action: string;  // Raw backend action string
  actor: {
    userId: string;
    username: string;
    role: 'OWNER' | 'EDITOR' | 'VIEWER' | 'UNKNOWN';
  };
  timestamp: string;  // ISO 8601
}
```

**ActivityFeedEntry** (tree-level view)
```typescript
{
  id: string;
  timestamp: string;
  actor: AuditActor;
  actionType: AuditActionType;  // Enum: PERSON_CREATED, TREE_UPDATED, etc.
  actionLabel: string;            // Human-readable: "Created person", "Updated tree"
  entity: AuditEntityRef;         // Primary subject
  relatedEntity?: AuditEntityRef; // Secondary (for relationships)
  treeId: string;
  rawAction: string;              // Preserve original
}
```

**PersonChangeHistoryEntry** (person-level view)
```typescript
{
  id: string;
  timestamp: string;
  actor: AuditActor;
  changeType: PersonChangeType;  // Enum: CREATED, NAME_CHANGED, PARENT_ADDED, etc.
  changeLabel: string;             // Human-readable: "Created", "Added parent"
  personId: string;
  personDisplayName?: string;      // Must be populated by consumer
  relatedPersonId?: string;
  relatedPersonDisplayName?: string;
  relatedRole?: 'PARENT' | 'CHILD' | 'SPOUSE';
  treeId: string;
  rawAction: string;
}
```

### Collections

**TreeActivityFeed**
```typescript
{
  treeId: string;
  entries: ActivityFeedEntry[];
  total: number;  // Total in backend
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}
```

**PersonChangeHistory**
```typescript
{
  treeId: string;
  personId: string;
  personDisplayName?: string;  // Optional, consumer can populate
  entries: PersonChangeHistoryEntry[];
  total: number;  // Total for this person
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}
```

## Usage Examples

### Fetch Tree Activity Feed

```typescript
import { fetchTreeActivityFeed } from '@/services/auditService';

// In component or hook
const [feed, setFeed] = useState<TreeActivityFeed | null>(null);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

const loadActivityFeed = async (treeId: string) => {
  setLoading(true);
  try {
    const result = await fetchTreeActivityFeed(treeId, {
      limit: 50,
      offset: 0,
    });
    setFeed(result);
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to load activity');
  } finally {
    setLoading(false);
  }
};
```

### Fetch Person Change History

```typescript
import { fetchPersonChangeHistory } from '@/services/auditService';

const loadChangeHistory = async (treeId: string, personId: string) => {
  setLoading(true);
  try {
    const result = await fetchPersonChangeHistory(treeId, personId, {
      limit: 50,
      offset: 0,
    });
    setHistory(result);
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to load history');
  } finally {
    setLoading(false);
  }
};
```

### Handle Pagination

```typescript
import { loadMoreActivityFeedEntries } from '@/services/auditService';

const handleLoadMore = async () => {
  if (!feed || !feed.pagination.hasMore) return;
  
  try {
    const nextPage = await loadMoreActivityFeedEntries(treeId, feed);
    setFeed({
      ...feed,
      entries: [...feed.entries, ...nextPage.entries],
      pagination: nextPage.pagination,
    });
  } catch (err) {
    console.error('Failed to load more entries:', err);
  }
};
```

### Enrich with Entity Names

```typescript
// Transformer provides raw personId/treeId
// Consumer must resolve to display names

const enrichActivityFeedEntry = (
  entry: ActivityFeedEntry,
  personMap: Map<string, { name: string }>
) => {
  if (entry.entity.id && personMap.has(entry.entity.id)) {
    entry.entity.displayName = personMap.get(entry.entity.id)?.name;
  }
  if (entry.relatedEntity?.id && personMap.has(entry.relatedEntity.id)) {
    entry.relatedEntity.displayName = personMap.get(entry.relatedEntity.id)?.name;
  }
  return entry;
};
```

## Action Type Reference

### AuditActionType Enum

- **PERSON_CREATED** — Person added to tree
- **PERSON_UPDATED** — Person details modified
- **PERSON_DELETED** — Person removed from tree
- **PARENT_CHILD_CREATED** — Parent-child relationship added
- **PARENT_CHILD_DELETED** — Parent-child relationship removed
- **SPOUSE_RELATIONSHIP_CREATED** — Spouse relationship added
- **SPOUSE_RELATIONSHIP_DELETED** — Spouse relationship removed
- **TREE_CREATED** — Family tree created
- **TREE_UPDATED** — Tree details (name, description) updated
- **TREE_DELETED** — Tree deleted
- **TREE_SHARED** — Tree access granted to user
- **TREE_UNSHARED** — Tree access revoked
- **PERMISSION_CHANGED** — User role modified
- **DATA_IMPORTED** — Persons/relationships imported (bulk)
- **DATA_EXPORTED** — Tree exported to external format
- **UNKNOWN** — Unrecognized action

### PersonChangeType Enum

- **CREATED** — Person created
- **DELETED** — Person deleted
- **NAME_CHANGED** — Name updated
- **GENDER_CHANGED** — Gender updated
- **BIRTH_DATE_CHANGED** — Birth date updated
- **BIRTH_PLACE_CHANGED** — Birth place updated
- **DEATH_DATE_CHANGED** — Death date updated
- **DESCRIPTION_CHANGED** — Description/notes updated
- **PARENT_ADDED** — Parent relationship created
- **PARENT_REMOVED** — Parent relationship deleted
- **CHILD_ADDED** — Child relationship created
- **CHILD_REMOVED** — Child relationship deleted
- **SPOUSE_ADDED** — Spouse relationship created
- **SPOUSE_REMOVED** — Spouse relationship deleted
- **UNKNOWN** — Unknown change type

## Guarantees vs. Non-Guarantees

### ✅ GUARANTEED

- ✓ Entries are in chronological order (sorted by timestamp)
- ✓ Each entry preserves actor info (userId, username, role)
- ✓ No data loss or modification during transformation
- ✓ All backend audit entries included (within pagination limit)
- ✓ Timestamps accurate to backend logging time
- ✓ Transformation is idempotent (same input → same output)
- ✓ Action type classification consistent (heuristic parser)

### ❌ NOT GUARANTEED

- ✗ **Entity name enrichment** — Backend audit logs don't include current entity names. Consumer must look up names separately.
- ✗ **Entity existence** — Referenced entities may have been deleted. No orphan detection.
- ✗ **Related entity population** — For relationships, related person ID/name must be populated by consumer.
- ✗ **User existence** — Actor's user account may be deleted. No user enrichment.
- ✗ **Semantic grouping** — Action classification is heuristic (string parsing). Consumer must verify and group.
- ✗ **Complete history** — Backend may not log all changes (depends on implementation).
- ✗ **Merge conflict detection** — Cannot infer from logs alone. Needs separate audit trail merge analysis.
- ✗ **Before/after values** — Audit logs don't include property deltas. Cannot reconstruct previous state.

## Integration Points

### 1. Activity Feed Tab in TreeViewer

```typescript
// components/TreeViewer.tsx
import { ActivityFeedPanel } from './ActivityFeedPanel';

export function TreeViewer({ treeId }: { treeId: string }) {
  return (
    <div className="tree-viewer">
      <Tabs>
        <Tab label="Tree" panel={<TreeCanvas />} />
        <Tab label="Activity" panel={<ActivityFeedPanel treeId={treeId} />} />
      </Tabs>
    </div>
  );
}
```

### 2. Change History Tab in PersonDetails

```typescript
// components/PersonDetailsDrawer.tsx
import { PersonChangeHistoryPanel } from './PersonChangeHistoryPanel';

export function PersonDetailsDrawer({
  treeId,
  personId,
}: {
  treeId: string;
  personId: string;
}) {
  return (
    <Drawer>
      <Tabs>
        <Tab label="Details" panel={<PersonForm />} />
        <Tab label="Change History" panel={<PersonChangeHistoryPanel treeId={treeId} personId={personId} />} />
      </Tabs>
    </Drawer>
  );
}
```

### 3. Recent Activity Widget in Dashboard

```typescript
// components/RecentActivityWidget.tsx
import { fetchTreeActivityFeed } from '@/services/auditService';

export function RecentActivityWidget() {
  const trees = useFetchTrees();
  
  return (
    <div className="recent-activity">
      {trees.map(tree => (
        <ActivityPreview key={tree.treeId} treeId={tree.treeId} limit={5} />
      ))}
    </div>
  );
}
```

## Component Implementation Tips

### Activity Feed Component

```typescript
/**
 * Renders chronological activity feed for tree
 * 
 * Features:
 * - Infinite scroll / "Load More" button for pagination
 * - Human-readable action labels
 * - Avatar + username for actor
 * - Entity links (if enriched with names)
 * - Relative timestamps ("2 hours ago")
 * - Grouping by date (optional, consumer adds)
 */
export function ActivityFeed({
  treeId,
  limit = 50,
}: {
  treeId: string;
  limit?: number;
}) {
  const [feed, setFeed] = useState<TreeActivityFeed | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchTreeActivityFeed(treeId, { limit }).then(setFeed);
  }, [treeId, limit]);
  
  if (loading) return <LoadingSpinner />;
  if (!feed?.entries.length) return <EmptyState />;
  
  return (
    <div className="activity-feed">
      {feed.entries.map(entry => (
        <ActivityEntry key={entry.id} entry={entry} />
      ))}
      {feed.pagination.hasMore && (
        <LoadMoreButton onLoad={handleLoadMore} />
      )}
    </div>
  );
}
```

### Person Change History Component

```typescript
/**
 * Renders change history specific to a person
 * 
 * Features:
 * - Shows changes to this person directly
 * - Shows when person was involved in relationships
 * - Filters to relevant entries only
 * - Enriched with person names (consumer must populate)
 */
export function PersonChangeHistory({
  treeId,
  personId,
  personName,
  limit = 30,
}: {
  treeId: string;
  personId: string;
  personName?: string;
  limit?: number;
}) {
  const [history, setHistory] = useState<PersonChangeHistory | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchPersonChangeHistory(treeId, personId, { limit }).then(setHistory);
  }, [treeId, personId, limit]);
  
  if (loading) return <LoadingSpinner />;
  if (!history?.entries.length) return <p>No changes recorded</p>;
  
  return (
    <div className="change-history">
      <h3>History of {personName}</h3>
      <Timeline entries={history.entries} />
    </div>
  );
}
```

## Performance Considerations

1. **Pagination**: Always use limit/offset to avoid fetching entire history
2. **Caching**: Consider caching with stale-while-revalidate strategy
3. **Real-time**: Audit entries are immutable—no need to poll continuously
4. **Entity Lookup**: Batch requests to resolve entity names (use Map to deduplicate)
5. **Rendering**: Virtualize long lists of entries for better performance

## Error Handling

The service layer provides detailed error messages:

```typescript
try {
  const feed = await fetchTreeActivityFeed(treeId);
} catch (error) {
  // error.message will be one of:
  // - "Failed to load activity feed: <API error>"
  // - "Invalid activity log response structure"
  // - "Invalid personId: must be non-empty string"
  console.error(error);
}
```

## Testing Considerations

### Mocking the Service

```typescript
// In tests, mock auditService.ts
jest.mock('@/services/auditService', () => ({
  fetchTreeActivityFeed: jest.fn().mockResolvedValue({
    treeId: 'test-tree',
    entries: [
      {
        id: 'entry-1',
        actionType: 'PERSON_CREATED',
        actionLabel: 'Created person',
        // ... other fields
      },
    ],
    total: 1,
    pagination: { limit: 50, offset: 0, hasMore: false },
  }),
}));
```

### Testing Transformer

```typescript
import { transformToActivityFeedEntry } from '@/adapters/auditTransformer';

it('transforms audit entry to activity feed entry', () => {
  const entry: AuditLogEntryDTO = {
    id: 'audit-1',
    treeId: 'tree-1',
    action: 'create-person',
    actor: { userId: 'user-1', username: 'alice', role: 'OWNER' },
    timestamp: '2024-01-01T00:00:00Z',
  };
  
  const result = transformToActivityFeedEntry(entry);
  
  expect(result.actionType).toBe('PERSON_CREATED');
  expect(result.actionLabel).toBe('Created person');
});
```

## Future Enhancements

1. **Backend Filter Support**: Add `?personId=<id>` to API to move filtering server-side
2. **Action Type Filter**: Allow filtering by action (PERSON_*, TREE_*, etc.)
3. **Date Range Filter**: Filter by timestamp range
4. **Search by Actor**: Find all changes by specific user
5. **Entity Reconstruction**: Combine audit logs with entity snapshots to show before/after
6. **Real-time Updates**: WebSocket subscription to new audit entries
7. **Audit Export**: Download full audit trail as CSV/JSON

---

**Files Created/Modified**:
- ✅ `frontend/src/models/auditModels.ts` — Core DTOs and enums
- ✅ `frontend/src/adapters/auditTransformer.ts` — Raw entry transformation
- ✅ `frontend/src/api.ts` — API consumer functions
- ✅ `frontend/src/services/auditService.ts` — High-level service
- 📄 `docs/AUDIT_INTEGRATION_GUIDE.md` — This document

**Status**: Ready for UI component implementation
