# Tree Activity Feed UI - Implementation Guide

## Overview

The Tree Activity Feed is a read-only UI component that displays chronological audit activity for a family tree. It integrates with the backend audit API endpoints to show all actions performed on the tree (person additions, relationships, deletions, etc.) along with actor information and timestamps.

**Status**: Complete and integrated into TreeViewer sidebar

## Architecture

### Component Hierarchy

```
TreeViewer
├── TreeActivityFeed (NEW)
│   ├── Loading skeleton
│   ├── Error state
│   ├── Empty state
│   ├── Activity entries (chronological)
│   └── Load more pagination
└── [Other sidebar components: HelpSidebar, StatisticsSidebar]
```

### Data Flow

```
TreeViewer (treeId, selectedPersonId)
    ↓
TreeActivityFeed (reads treeId, optional personId)
    ↓
API (getTreeActivityLog or getPersonChangeHistory)
    ↓
Backend (/api/trees/:treeId/activity or /persons/:personId/history)
    ↓
AuditLogRepository (MongoDB append-only collection)
    ↓
Activity entries → Transform → Display chronologically
```

## Component Implementation

### File Location

- **Component**: `frontend/src/components/TreeActivityFeed.tsx` (320 lines)
- **Types**: `frontend/src/types/audit.ts` (110 lines)
- **API Wiring**: `frontend/src/api.ts` (getTreeActivityLog, getPersonChangeHistory)

### Key Features

#### 1. Read-Only Display
- Zero mutation capabilities
- No edit/delete buttons
- Actor information readonly (username, role)
- Timestamp immutable

#### 2. Chronological Ordering
- Backend returns entries in chronological order
- Newest first on display
- Uses ISO8601 timestamps
- Relative time formatting ("2h ago", "yesterday", etc.)

#### 3. Actor Information
- Username (clickable → navigates to person)
- Role (OWNER, EDITOR, VIEWER, UNKNOWN)
- User ID (preserved but truncated in heuristic display)

#### 4. Action Display
- Human-readable action labels
- Color-coded by action type (green for add, red for remove, blue for edit)
- Emoji icons for quick visual scanning
- Raw action string preserved

#### 5. Entity Links
- Clickable actor names (navigate to person)
- Extracted person IDs from action strings (clickable)
- Uses existing tree routing (`/tree/:treeId/person/:personId`)
- Respects app navigation context

#### 6. Pagination
- Limit: 50 entries per page (configurable)
- Offset-based pagination
- "Load more" button with count display
- Loading state on fetch
- `hasMore` metadata from backend

#### 7. Loading States
- Skeleton loader on initial load (3 placeholder rows)
- Spinner on "Load more"
- Error message with context
- Empty state messaging

#### 8. Error Handling
- Network errors caught and displayed
- Graceful fallback (shows existing entries even if load fails)
- User-friendly error messages
- Retry possible via "Load more" button

## API Integration

### getTreeActivityLog(treeId, options?)

**Endpoint**: `GET /api/trees/:treeId/activity?limit=50&offset=0`

**Request**:
```typescript
getTreeActivityLog(treeId: string, options?: { 
  limit?: number;    // 1-1000, defaults 50
  offset?: number;   // ≥0, defaults 0
}): Promise<TreeActivityResponse>
```

**Response**:
```typescript
{
  treeId: string;
  entries: AuditLogEntry[];
  total: number;
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  }
}
```

**Error Handling**:
- 403 FORBIDDEN: User not authenticated
- 404 NOT_FOUND: Tree doesn't exist
- 400 BAD_REQUEST: Invalid pagination params
- 500 INTERNAL_SERVER_ERROR: Backend error

### getPersonChangeHistory(treeId, personId, options?)

**Endpoint**: `GET /api/trees/:treeId/persons/:personId/history?limit=50&offset=0`

**Request**:
```typescript
getPersonChangeHistory(treeId: string, personId: string, options?: {
  limit?: number;    // 1-1000, defaults 50
  offset?: number;   // ≥0, defaults 0
}): Promise<PersonHistoryResponse>
```

**Response**: Same structure as tree activity (filtered to person-relevant entries)

**Error Handling**: Same as above, plus:
- 404 NOT_FOUND: Person doesn't exist in tree

## Type Definitions

### AuditLogEntry

```typescript
interface AuditLogEntry {
  id: string;                    // Unique identifier
  treeId: string;                // Tree this action affected
  action: string;                // Action code (CREATE_PERSON, etc.)
  actor: {
    userId: string;              // User who performed action
    username: string;            // User's display name
    role: 'OWNER' | 'EDITOR' | 'VIEWER' | 'UNKNOWN';
  };
  timestamp: string;             // ISO8601 UTC timestamp
}
```

### TreeActivityResponse

```typescript
interface TreeActivityResponse {
  treeId: string;
  entries: AuditLogEntry[];
  total: number;                 // Total entries (before pagination)
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;            // True if more entries exist
  }
}
```

### Action Types

| Action | Label | Icon | Color | Example |
|--------|-------|------|-------|---------|
| CREATE_PERSON | Added person | 👤 | Green | Creating a new person in tree |
| ESTABLISH_PARENT_CHILD | Established parent-child relationship | 👨‍👧‍👦 | Blue | Adding parent or child |
| ESTABLISH_SPOUSE | Established spouse relationship | 💑 | Cyan | Adding spouse relationship |
| REMOVE_RELATIONSHIP | Removed relationship | 💔 | Red | Deleting a relationship |
| REMOVE_PERSON | Removed person | 🗑️ | Red | Deleting a person |
| IMPORT_PERSONS | Imported persons | 📥 | Blue | Bulk importing persons |
| CREATE_FAMILY_TREE | Created family tree | 🌳 | Green | Initial tree creation |
| ADD_MEMBER | Added member | ➕ | Green | Adding collaborator |
| REMOVE_MEMBER | Removed member | ➖ | Red | Removing collaborator |
| CHANGE_MEMBER_ROLE | Changed member role | ⚙️ | Orange | Modifying user permissions |
| TRANSFER_OWNERSHIP | Transferred ownership | 👑 | Orange | Changing tree owner |

## Component Usage

### Basic Usage (Tree Activity)

```tsx
import TreeActivityFeed from './TreeActivityFeed';

export function MyComponent() {
  return (
    <TreeActivityFeed
      treeId="tree-123"
      limit={50}
      onPersonLinkClick={(personId) => {
        // Handle person link click
        navigateToPerson(personId);
      }}
    />
  );
}
```

### Person-Specific History

```tsx
<TreeActivityFeed
  treeId="tree-123"
  personId="person-456"  // Shows only changes related to this person
  limit={25}
  onPersonLinkClick={(personId) => navigate(`/person/${personId}`)}
/>
```

### Without Custom Navigation

```tsx
<TreeActivityFeed
  treeId="tree-123"
  // onPersonLinkClick not provided - uses default in-app navigation
/>
```

## Integration into TreeViewer

### Location
- **File**: `frontend/src/components/TreeViewer.tsx`
- **Section**: Right sidebar with Stats/Activity/Help tabs
- **State**: `sidebarTab` controls which tab is active

### Sidebar Tab Configuration

```tsx
// Three tabs in sidebar
<ul className="nav nav-tabs nav-fill">
  <li>📊 Stats → StatisticsSidebar</li>
  <li>⏱️ Activity → TreeActivityFeed (NEW)</li>
  <li>ℹ️ Help → HelpSidebar</li>
</ul>

// Person link clicks automatically select person in main view
<TreeActivityFeed
  treeId={treeId}
  onPersonLinkClick={(personId) => setSelectedPersonId(personId)}
/>
```

## States & UX

### 1. Loading State
```
Skeleton loader with 3 placeholder rows
- Shown on initial mount
- 50ms minimum delay (prevents flicker)
```

### 2. Empty State
```
"No activity in this tree yet" or "No changes for this person yet"
- Card header with icon
- Centered text message
- Clean, minimal design
```

### 3. Data State
```
Chronological list with:
- Icon (emoji for action type)
- Actor name (clickable, blue)
- Role badge (small, muted)
- Action description
- Extracted person IDs (if any)
- Timestamp (relative, e.g., "2h ago")
- Left border colored by action type
- Background tint for delete actions
```

### 4. Error State
```
Alert box with:
- "Failed to load activity" title
- Specific error message
- Does NOT hide existing entries
- User can retry with "Load more" button
```

### 5. Pagination State
```
When hasMore === true:
- "Load more (X/Y)" button appears
- Disabled during fetch
- Shows spinner + "Loading..." text
- Re-enables when complete
```

## Styling & Responsiveness

### Responsive Design
- Flex layout with max-height: 600px
- Overflow auto for scrolling
- Card-based Bootstrap styling
- Mobile-friendly (list-group)

### Color Scheme
- Green (#28a745): Create actions
- Blue (#0d6efd): Establish/create relationships
- Cyan (#17a2b8): Spouse relationships
- Orange (#fd7e14): Role/permission changes
- Red (#dc3545): Delete/remove actions
- Light red background (#fff5f5): Delete action rows

### Typography
- Main text: 12px
- Metadata: 11px
- Labels: 10px
- Actor name: Bold blue, cursor:pointer
- Relative time: Muted, right-aligned

## Performance Considerations

### Optimization Strategies
1. **Lazy Loading**: Pagination prevents loading 1000+ entries
2. **No Filtering**: Server-side filtering (backend handles all)
3. **Memoization**: useCallback prevents unnecessary re-renders
4. **Extraction Caching**: Person ID extraction happens once per render

### Query Performance
- Backend enforces limit cap at 1000
- Offset-based pagination (not cursor-based)
- Single index on (treeId, timestamp) recommended
- MongoDB aggregation pipeline optional

## Known Limitations & Future Enhancements

### Current Limitations
1. **Person IDs**: Extracted via heuristic UUID pattern (fragile)
   - **Future**: Backend should provide structured action metadata
   
2. **Entity Names**: Audit logs preserve IDs only, not names
   - **Future**: Could enrich with person name lookup (separate query)
   
3. **Deleted Entities**: Actions may reference deleted persons
   - **Future**: Add "deleted" indicator or strikethrough
   
4. **Real-time Updates**: No WebSocket/polling for live activity
   - **Future**: Could add refresh button or auto-poll

### Proposed Future Work
- [ ] Add real-time updates via WebSocket
- [ ] Implement activity filtering UI (by action type, actor)
- [ ] Add search within activity history
- [ ] Export activity log as CSV
- [ ] Show entity names (requires enrichment query)
- [ ] Timeline visualization (by day/week)

## Testing

### Unit Tests (Component Logic)
- [ ] Loading state renders skeleton
- [ ] Empty state displays correct message
- [ ] Person clicks navigate correctly
- [ ] "Load more" pagination works
- [ ] Error state displays message

### Integration Tests
- [ ] TreeActivityFeed loads in TreeViewer
- [ ] Tab switching shows/hides component
- [ ] Person link clicks update selected person
- [ ] API calls use correct endpoints

### E2E Tests (Backend included)
- [ ] Tree with activity shows entries
- [ ] Tree without activity shows empty state
- [ ] Pagination loads more entries
- [ ] Authorization enforced (403 for unauthenticated)
- [ ] Person history filters correctly

## Developer Guide

### Adding New Action Types

1. **Backend** (`backend/src/domain/genealogy-graph.ts`):
   ```typescript
   await this.appendAudit('MY_NEW_ACTION', treeId);
   ```

2. **Frontend** (`frontend/src/types/audit.ts`):
   ```typescript
   export const ACTION_LABELS: Record<string, string> = {
     'MY_NEW_ACTION': 'My new action label',
     // ...
   };
   
   const iconMap: Record<string, string> = {
     'MY_NEW_ACTION': '🆕',
     // ...
   };
   ```

3. **Component** automatically picks up the new action

### Debugging Activity Issues

```typescript
// In TreeActivityFeed or TreeViewer component:
console.log('Tree activity loaded:', {
  entries: state.entries,
  total: state.total,
  hasMore: state.hasMore,
  error: state.error,
});

// Check API response in Network tab
// GET /api/trees/tree-123/activity?limit=50&offset=0
```

### Common Issues

**Issue**: No activity showing
- **Check**: Are actions being logged? (See backend appendAudit)
- **Check**: Is MongoDB audit_logs collection populated?
- **Check**: Is treeId correct?

**Issue**: Person links not working
- **Check**: onPersonLinkClick callback provided?
- **Check**: Person IDs extracted correctly? (UUID pattern match)

**Issue**: Pagination not showing
- **Check**: Is `pagination.hasMore === true`?
- **Check**: Is `total > (offset + limit)`?

## API Contract

### Guarantees
✅ Entries chronologically ordered (newest first)
✅ Authorization enforced (requires authenticated user)
✅ Pagination metadata accurate
✅ Empty history returns valid DTO (not null)
✅ Total count correct before pagination

### Non-Guarantees
❌ Entity names not included (IDs only)
❌ No enrichment with current entity state
❌ Actions may reference deleted entities
❌ No real-time updates

## Deployment Notes

### Environment Variables
None required (uses default API_BASE_URL)

### Database Setup
- Ensure `audit_logs` MongoDB collection exists
- Index on `(treeId, timestamp)` for performance
- Collection is append-only (no updates/deletes)

### Breaking Changes
None yet (new component, doesn't modify existing code)

### Backwards Compatibility
- Works with existing audit data
- Gracefully handles missing audit entries
- No schema migration required

## Summary

The Tree Activity Feed provides a clean, read-only chronological view of all tree modifications. It's fully integrated into TreeViewer's sidebar, supports pagination, and makes person-related entries clickable for easy navigation. The implementation is performant, accessible, and extensible for future enhancements.
