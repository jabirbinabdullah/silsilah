# Tree Activity Feed - Quick Reference

## Component Location
- `frontend/src/components/TreeActivityFeed.tsx` — Main component
- `frontend/src/types/audit.ts` — Type definitions
- `frontend/src/api.ts` — API functions (getTreeActivityLog, getPersonChangeHistory)

## Basic Import & Usage

```tsx
import TreeActivityFeed from './TreeActivityFeed';

<TreeActivityFeed
  treeId="tree-123"
  personId="person-456"  // Optional: for person-specific history
  limit={50}             // Optional: entries per page (default 50)
  onPersonLinkClick={(id) => navigateToPerson(id)}  // Optional callback
/>
```

## Integration in TreeViewer

Already integrated! Access via:
1. Open tree in TreeViewer
2. Click **⏱️ Activity** tab in right sidebar
3. Browse chronological activity
4. Click actor names or person IDs to navigate

## Component Features

| Feature | Status | Details |
|---------|--------|---------|
| Read-only | ✅ | No edit/delete capabilities |
| Chronological | ✅ | Newest first, sorted by timestamp |
| Actor info | ✅ | Username, role, relative time |
| Entity links | ✅ | Click to navigate to person |
| Pagination | ✅ | "Load more" button, 50 entries/page |
| Loading state | ✅ | Skeleton loader on initial fetch |
| Empty state | ✅ | "No activity yet" message |
| Error handling | ✅ | User-friendly error messages |

## API Endpoints

### Tree Activity
```
GET /api/trees/:treeId/activity?limit=50&offset=0
Authorization: Bearer <token>

Response:
{
  treeId: string
  entries: AuditLogEntry[]
  total: number
  pagination: { limit, offset, hasMore }
}
```

### Person History
```
GET /api/trees/:treeId/persons/:personId/history?limit=50&offset=0
Authorization: Bearer <token>

Response: Same as tree activity (filtered to person-relevant entries)
```

## Action Types & Icons

| Action | Label | Icon |
|--------|-------|------|
| CREATE_PERSON | Added person | 👤 |
| ESTABLISH_PARENT_CHILD | Parent-child relationship | 👨‍👧‍👦 |
| ESTABLISH_SPOUSE | Spouse relationship | 💑 |
| REMOVE_RELATIONSHIP | Removed relationship | 💔 |
| REMOVE_PERSON | Removed person | 🗑️ |
| IMPORT_PERSONS | Imported persons | 📥 |
| CREATE_FAMILY_TREE | Created family tree | 🌳 |
| ADD_MEMBER | Added collaborator | ➕ |
| REMOVE_MEMBER | Removed collaborator | ➖ |
| CHANGE_MEMBER_ROLE | Changed role | ⚙️ |
| TRANSFER_OWNERSHIP | Transferred ownership | 👑 |

## State Management

```typescript
interface ActivityState {
  entries: AuditLogEntry[];      // Current page of entries
  total: number;                  // Total entries (all pages)
  limit: number;                  // Page size
  offset: number;                 // Current offset
  hasMore: boolean;               // True if more pages exist
  isLoading: boolean;             // Initial load
  isLoadingMore: boolean;         // Pagination load
  error: string | null;           // Error message
}
```

## Styling Classes

- `.card` — Main container
- `.card-header` — Title bar with icon count
- `.card-body` — Content area
- `.list-group` — Entry list
- `.list-group-item` — Individual entry row
- `.card-footer` — Load more button area
- `.alert` — Error messages
- `.placeholder-glow` — Skeleton loader

## Color Codes

| Action Type | Color | Hex |
|-------------|-------|-----|
| Create/Add | Green | #28a745 |
| Edit/Establish | Blue | #0d6efd |
| Relationships | Cyan | #17a2b8 |
| Role changes | Orange | #fd7e14 |
| Delete/Remove | Red | #dc3545 |
| Delete background | Light red | #fff5f5 |

## Common Tasks

### Show tree activity
```tsx
<TreeActivityFeed treeId={treeId} />
```

### Show person-specific history
```tsx
<TreeActivityFeed treeId={treeId} personId={personId} />
```

### Navigate to person when clicked
```tsx
<TreeActivityFeed
  treeId={treeId}
  onPersonLinkClick={(id) => setSelectedPersonId(id)}
/>
```

### Custom page size
```tsx
<TreeActivityFeed treeId={treeId} limit={25} />
```

## Constraints (Enforced)

❌ **Not Supported**:
- Filtering activity (server filters all)
- Searching entries (no search UI)
- Editing/deleting entries (append-only)
- Real-time updates (polling only)
- Exporting activity (no export button)

✅ **Supported**:
- Pagination with "Load more"
- Actor link navigation
- Person ID extraction and linking
- Responsive mobile design
- Error recovery and retry

## Empty/Loading States

### Loading (Initial)
```
[████████████]  Skeleton loader
[████████]      (3 placeholder rows)
[██████████████]
```

### Empty
```
┌─────────────────────┐
│ ⏱️ Activity         │
├─────────────────────┤
│ No activity yet     │
└─────────────────────┘
```

### Error
```
⚠️ Failed to load activity
Reason: Network error (details)
```

### Data with "Load more"
```
Entry 1 (actor, action, time)
Entry 2 (actor, action, time)
...
Entry 50 (actor, action, time)
───────────────────────────────
Load more (50/250)  ← Shows current/total
```

## Debugging Tips

### Check if activity is loading
```typescript
// Open browser DevTools → Network tab
// GET /api/trees/:treeId/activity?limit=50&offset=0
// Should return 200 with entry array
```

### Check component state
```typescript
// Add console.log in TreeActivityFeed
console.log({ entries, total, hasMore, error });
```

### Verify backend is populating audit logs
```
// MongoDB shell
use silsilah
db.audit_logs.find({ treeId: "tree-123" }).limit(5)
```

### Check person ID extraction
```typescript
// TreeActivityFeed extracts UUIDs from action strings
// Example: "action: 550e8400-e29b-41d4-a716-446655440000"
// Should find all UUID patterns in the action string
```

## Related Files

| File | Purpose |
|------|---------|
| `TreeActivityFeed.tsx` | Main component (320 lines) |
| `audit.ts` | Types + action helpers |
| `api.ts` | API consumer functions |
| `TreeViewer.tsx` | Integration point |
| `TREE_ACTIVITY_FEED_IMPLEMENTATION.md` | Full documentation |
| `PHASE_6_QUERY_HANDLERS_IMPLEMENTATION.md` | Backend implementation |

## Version Info
- **Status**: Production ready
- **Last Updated**: December 2025
- **Phase**: Phase 6 Session 3 (Frontend Activity UI)

## Next Steps

- [ ] Test with real audit data
- [ ] Add filtering UI (optional enhancement)
- [ ] Implement real-time updates (optional enhancement)
- [ ] Add export to CSV (optional enhancement)
