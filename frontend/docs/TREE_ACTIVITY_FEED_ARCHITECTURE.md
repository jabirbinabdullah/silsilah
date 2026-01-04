# Tree Activity Feed - Architecture & Data Flow

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        TreeViewer Component                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │  Main Canvas     │  │  Person Details  │  │   Sidebar    │  │
│  │  (D3 Network)    │  │    Drawer        │  │              │  │
│  │                  │  │                  │  │ ┌──────────┐ │  │
│  │                  │  │                  │  │ │Stats Tab │ │  │
│  │                  │  │                  │  │ ├──────────┤ │  │
│  │                  │  │                  │  │ │Activity  │◄┼──┼─→ Person Click
│  │                  │  │                  │  │ │  Tab NEW │ │  │     setSelectedPersonId
│  │                  │  │                  │  │ ├──────────┤ │  │
│  │                  │  │                  │  │ │Help Tab  │ │  │
│  │                  │  │                  │  │ └──────────┘ │  │
│  │                  │  │                  │  │              │  │
│  └──────────────────┘  └──────────────────┘  └──────────────┘  │
│          ▲                                            │          │
│          │                                            │          │
│          │ setSelectedPersonId(id)                   │          │
│          └────────────────────────────────────────────┘          │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
         │
         │ mounts TreeActivityFeed
         ▼
┌─────────────────────────────────────────────────────────────────┐
│          TreeActivityFeed Component (NEW)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ State Management                                        │   │
│  │ ┌──────────────────────────────────────────────────┐   │   │
│  │ │ entries: AuditLogEntry[]                        │   │   │
│  │ │ total: number                                   │   │   │
│  │ │ offset: number, limit: number, hasMore: bool   │   │   │
│  │ │ isLoading, isLoadingMore: bool                 │   │   │
│  │ │ error: string | null                           │   │   │
│  │ └──────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           ▲                                      │
│                           │ updates state                        │
│                           │                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Hooks & Handlers                                        │   │
│  │ ┌──────────────────────────────────────────────────┐   │   │
│  │ │ useEffect() → loadActivity(0) on mount          │   │   │
│  │ │ useCallback(loadActivity) → API call            │   │   │
│  │ │ useCallback(handleLoadMore) → pagination        │   │   │
│  │ │ useCallback(handlePersonClick) → navigate       │   │   │
│  │ └──────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Rendering (Conditional)                                 │   │
│  │ ├─ isLoading && entries.length === 0                   │   │
│  │ │   → Skeleton Loader (3 placeholder rows)            │   │
│  │ ├─ error && entries.length === 0                       │   │
│  │ │   → Error Alert (red box with message)              │   │
│  │ ├─ entries.length === 0                               │   │
│  │ │   → Empty State ("No activity yet")                 │   │
│  │ └─ entries.length > 0                                 │   │
│  │     → List (chronological, colored by action)         │   │
│  │        + Load More Button (if hasMore)                │   │
│  │        + Error Footer (if error)                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
         │
         │ calls API
         ▼
┌─────────────────────────────────────────────────────────────────┐
│          Frontend API Layer (api.ts)                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  getTreeActivityLog(treeId, {limit, offset}?)                   │
│  ├─ GET /api/trees/:treeId/activity?limit=50&offset=0          │
│  └─ return { treeId, entries[], total, pagination }            │
│                                                                   │
│  getPersonChangeHistory(treeId, personId, {limit, offset}?)     │
│  ├─ GET /api/trees/:treeId/persons/:personId/history...        │
│  └─ return { treeId, personId, entries[], total, pagination }  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
         │
         │ HTTP calls
         ▼
┌─────────────────────────────────────────────────────────────────┐
│          Backend API Endpoints                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  GET /api/trees/:treeId/activity (controller: GenealogyController)
│  └─→ Authorization: requireAuthenticated                        │
│      └─→ Handler: GetTreeActivityHandler.execute()             │
│          └─→ Query: GenealogyApplicationService.getTreeActivity│
│              └─→ Repository: AuditLogRepository.queryByTreeId() │
│                  └─→ MongoDB: db.audit_logs.find()             │
│                      Returns: entries[] (chronological)         │
│                      + pagination metadata                      │
│                                                                   │
│  GET /api/trees/:treeId/persons/:personId/history              │
│  └─→ Authorization: requireAuthenticated                        │
│      └─→ Handler: GetPersonHistoryHandler.execute()            │
│          └─→ Query: GenealogyApplicationService.getPersonHistory
│              └─→ Repository: AuditLogRepository.queryByPersonId()
│                  └─→ MongoDB: db.audit_logs.find()             │
│                      Filters: contains personId in action      │
│                      Returns: entries[] (chronological)         │
│                      + pagination metadata                      │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
         │
         │ reads from
         ▼
┌─────────────────────────────────────────────────────────────────┐
│          MongoDB (Append-Only Collection)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  db.audit_logs (READ-ONLY from API perspective)                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Document Structure:                                     │   │
│  │ {                                                       │   │
│  │   _id: ObjectId,                                        │   │
│  │   treeId: "tree-123",                                   │   │
│  │   action: "CREATE_PERSON",                              │   │
│  │   userId: "user-456",                                   │   │
│  │   username: "john_doe",                                 │   │
│  │   role: "EDITOR",                                       │   │
│  │   timestamp: ISODate("2025-12-28T10:30:00Z")           │   │
│  │ }                                                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
│  Index: (treeId, timestamp) for query performance              │
│  Write Pattern: APPEND ONLY (no updates/deletes)               │
│  Populated By: GenealogyApplicationService.appendAudit()       │
│                (after successful mutations)                     │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow Sequence Diagram

```
User                TreeViewer          TreeActivityFeed         API            Backend         MongoDB
│                       │                     │                   │               │               │
├──Opens Tree────────────→                     │                   │               │               │
│                       │                     │                   │               │               │
│                       ├──Mounts Component───→                   │               │               │
│                       │                     │                   │               │               │
│                       │                     ├──useEffect()──────→               │               │
│                       │                     │   loadActivity()                  │               │
│                       │                     │                   │               │               │
│                       │                     │                   ├──GET /activity────────────────→
│                       │                     │                   │               │               │
│                       │                     │                   │               ├──Handler───────→
│                       │                     │                   │               │   GetTreeActivity
│                       │                     │                   │               │               │
│                       │                     │                   │               │               ├──Query
│                       │                     │                   │               │               │  audit_logs
│                       │                     │                   │               │               │
│                       │                     │                   │               │               ←── [] entries
│                       │                     │                   │               ←──Response────────
│                       │                     │                   ←─{entries,────────
│                       │                     │                      pagination}
│                       │                     │
│                       │                     ├──setState()
│                       │                     │  (render list)
│                       │    render──────────→│
│                       │                     │──Display────────────────────→
│                       │                     │  chronological
│                       │                     │  activity list
│                       │
│  Clicks Person Link   │                     │
├──────────────────────→                     │
│                       │                     │
│                       ├──setSelected───────→
│                       │  PersonId
│                       │
│                       ├──Re-render──────────→
│                       │  with person
│                       │  selected
│                       │
│                       │                     │
│  Clicks Load More     │                     │
├───────────────────────────────────────────→│
│                       │                     │
│                       │                     ├──handleLoadMore()
│                       │                     │   loadActivity(offset+50)
│                       │                     │
│                       │                     ├──GET /activity?offset=50──────→
│                       │                     │                   │               │
│                       │                     │                   │   (same flow)
│                       │                     │                   ←── next 50 entries
│                       │                     │                   │
│                       │                     ├──setState()
│                       │                     │  (append entries)
│                       │                     │
│                       │    render──────────→│
│                       │                     │──Append──────────→
│                       │                     │  next entries
│                       │                     │
└───────────────────────────────────────────────────────────────────────────────
```

## Component State Machine

```
                    ┌─────────────────┐
                    │   MOUNTING      │
                    └────────┬────────┘
                             │ useEffect()
                             ▼
                    ┌─────────────────┐
              ┌────→│   LOADING       │◄───┐
              │     │                 │    │
              │     └────────┬────────┘    │
              │              │             │
              │   API        ├─ Error──┐   │
              │   Success    │         │   │
              │              ▼         ▼   │
              │     ┌─────────────┐  ┌──────────┐
              │     │  READY      │  │  ERROR   │
              │     │             │  │          │
              │     │ (Display    │  │ (Show    │
              │     │  entries)   │  │  message)│
              │     └──────┬──────┘  └──────────┘
              │            │
              │            ├─ Click Load More
              │            │
              └────────────┘
                   └─→ loadActivity(offset+50)
                       LOADING_MORE
                       ↓
                       SUCCESS
                       ↓
                       Append entries to state
                       ↓
                       READY (with more entries)
```

## Component Hierarchy

```
TreeViewer (1108 lines)
├── Header
├── Toolbar
├── Main Content Area
│   ├── Network/Tree Canvas (70%)
│   ├── Person Details Drawer
│   ├── Add Person Drawer
│   └── Relationship Manager
│
└── Right Sidebar (30% width)
    ├── Tabs: [ Stats | Activity | Help ]
    │
    ├─ Tab: Stats
    │  └─ StatisticsSidebar (existing)
    │
    ├─ Tab: Activity (NEW)
    │  └─ TreeActivityFeed (320 lines)
    │     ├── State: entries, total, offset, limit, hasMore, isLoading, error
    │     ├── Effects: Load on mount
    │     ├── Callbacks: loadActivity, handleLoadMore, handlePersonClick
    │     └── UI:
    │        ├── Card Header (with icon/count)
    │        ├── Skeleton Loader (if loading)
    │        ├── Error Alert (if error)
    │        ├── Empty Message (if no entries)
    │        ├── List Group (entries)
    │        │   └── Each Entry:
    │        │       ├── Icon (emoji)
    │        │       ├── Actor (clickable)
    │        │       ├── Action Label
    │        │       ├── Person IDs (clickable)
    │        │       └── Timestamp (relative)
    │        └── Load More Button (if hasMore)
    │
    └─ Tab: Help
       └─ HelpSidebar (existing)
```

## API Response Structure

```javascript
// GET /api/trees/tree-123/activity?limit=50&offset=0

{
  "treeId": "tree-123",
  "entries": [
    {
      "id": "audit-1",
      "treeId": "tree-123",
      "action": "CREATE_PERSON",
      "actor": {
        "userId": "user-456",
        "username": "john_doe",
        "role": "EDITOR"
      },
      "timestamp": "2025-12-28T14:30:00.000Z"
    },
    {
      "id": "audit-2",
      "treeId": "tree-123",
      "action": "ESTABLISH_PARENT_CHILD",
      "actor": {
        "userId": "user-456",
        "username": "john_doe",
        "role": "EDITOR"
      },
      "timestamp": "2025-12-28T14:25:00.000Z"
    }
    // ... more entries
  ],
  "total": 150,
  "pagination": {
    "limit": 50,
    "offset": 0,
    "hasMore": true  ← More pages exist
  }
}
```

## Type System

```typescript
// audit.ts

interface AuditLogEntry {
  id: string;
  treeId: string;
  action: string;
  actor: {
    userId: string;
    username: string;
    role: 'OWNER' | 'EDITOR' | 'VIEWER' | 'UNKNOWN';
  };
  timestamp: string; // ISO8601
}

interface TreeActivityResponse {
  treeId: string;
  entries: AuditLogEntry[];
  total: number;
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  }
}

interface PersonHistoryResponse extends TreeActivityResponse {
  personId: string;
}

// Helpers
function getActionLabel(action: string): string
function getActionIcon(action: string): string
function getActionColor(action: string): string

const ACTION_LABELS: Record<string, string>
// ... 11 action types mapped
```

## Error Handling Flow

```
loadActivity() called
    ↓
fetch API
    ├─ 403 Forbidden
    │  → "Unauthorized: Please log in"
    │
    ├─ 404 Not Found
    │  → "Tree not found"
    │
    ├─ 400 Bad Request
    │  → "Invalid pagination parameters"
    │
    ├─ Network Error
    │  → "Network error: {message}"
    │
    └─ Success (200)
       ├─ Parse JSON
       ├─ Validate structure
       └─ setState(entries, pagination)

setState(error)
    ↓
Render error alert
    ├─ Title: "Failed to load activity"
    ├─ Message: {error text}
    ├─ Show existing entries (if any)
    └─ "Load more" button disabled
```

## Performance & Optimization

```
Initial Load Performance:
├─ Component Mount: <1ms
├─ useEffect Hook: <1ms
├─ API Call: ~100-200ms (network latency)
├─ JSON Parse: ~5-10ms
├─ setState: <1ms
├─ Re-render: ~10-20ms (50 entries)
├─ Paint/Layout: ~5-10ms
└─ Total: ~130-240ms

Pagination Load:
├─ Click "Load More": <1ms
├─ API Call: ~100-200ms
├─ Append to state: <1ms
├─ Re-render: ~10-20ms (100 total entries)
└─ Total: ~110-220ms

Memory Usage:
├─ 50 entries: ~100KB
├─ 500 entries: ~1MB
├─ 1000 entries: ~2MB
└─ (Small footprint - no heavy objects)

Optimization Techniques:
├─ useCallback prevents unnecessary re-renders
├─ Server-side filtering (no client work)
├─ Pagination prevents loading entire dataset
├─ No memoization needed (simple list)
└─ Lazy loading of next pages
```

---

**Version**: 1.0  
**Last Updated**: December 28, 2025  
**Phase**: Phase 6 Session 3
