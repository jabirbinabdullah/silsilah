# Statistics Panel - Implementation Guide

## Architecture Overview

The statistics feature consists of three main components:

```
┌─────────────────────────────────────────────────────┐
│           TreeViewer (Main Component)              │
│                                                     │
│  ├─ State Management (statistics, loading)         │
│  ├─ Data Flow (tree data → statistics)             │
│  └─ Sidebar Integration (display control)          │
└─────────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────────┐
│       StatisticsSidebar (UI Component)             │
│                                                     │
│  ├─ Tab Navigation (5 tabs)                        │
│  ├─ Tab Content (Overview, Relations, etc.)        │
│  ├─ Pie Chart Visualization                        │
│  └─ CSV Export Button                              │
└─────────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────────┐
│   statisticsCalculator (Utility Functions)         │
│                                                     │
│  ├─ calculateBasicStats()                          │
│  ├─ calculateRelationshipStats()                   │
│  ├─ calculateGenderStats()                         │
│  ├─ calculateLifespanStats()                       │
│  ├─ generateTimelineEvents()                       │
│  ├─ calculateTreeStatistics()                      │
│  ├─ exportStatisticsAsCSV()                        │
│  └─ downloadStatisticsCSV()                        │
└─────────────────────────────────────────────────────┘
           ↓
         Data
```

## File Structure

```
src/
├── components/
│   ├── TreeViewer.tsx (modified)
│   └── StatisticsSidebar.tsx (new)
├── utils/
│   └── statisticsCalculator.ts (new)
└── docs/
    ├── STATISTICS_PANEL.md (new)
    └── STATISTICS_PANEL_QUICK_REFERENCE.md (new)
```

## Component Details

### 1. TreeViewer.tsx (Modified)

**Imports Added:**
```typescript
import StatisticsSidebar from './StatisticsSidebar';
import { calculateTreeStatistics, type TreeStatistics, type PersonStats } from '../utils/statisticsCalculator';
```

**State Added:**
```typescript
const [statistics, setStatistics] = useState<TreeStatistics | null>(null);
const [statisticsLoading, setStatisticsLoading] = useState(false);
const [showStatistics, setShowStatistics] = useState(true);
```

**Effect Added:**
```typescript
useEffect(() => {
  // Calculates statistics whenever data changes
  // Uses useCallback for performance
  // Handles loading state
}, [data]);
```

**Sidebar Updated:**
```typescript
// Tabbed interface with stats and help
<ul className="nav nav-tabs">
  <button onClick={() => setShowStatistics(true)}>📊 Stats</button>
  <button onClick={() => setShowStatistics(false)}>ℹ️ Help</button>
</ul>

{showStatistics ? <StatisticsSidebar /> : <HelpContent />}
```

### 2. StatisticsSidebar.tsx (New Component)

**Props:**
```typescript
interface StatisticsSidebarProps {
  statistics: TreeStatistics | null;
  treeName: string;
  isLoading?: boolean;
}
```

**Tab Components:**
- `OverviewTab` - Basic statistics display
- `RelationshipsTab` - Relationship counts with progress bars
- `GenderTab` - Gender distribution with pie chart
- `LifespanTab` - Age and lifespan metrics
- `TimelineTab` - Chronological event list

**Features:**
- Responsive tab navigation
- Loading state handling
- CSV export integration
- Color-coded visualizations

**Pie Chart Implementation:**
```typescript
// SVG-based pie chart (no external library)
// Calculates angles for each slice
// Renders as path elements with colors
// Supports any number of data points
```

### 3. statisticsCalculator.ts (New Utility)

**Type Definitions:**
```typescript
interface BasicStats { /* 5 properties */ }
interface RelationshipStats { /* 3 properties */ }
interface GenderStats { /* 3 properties */ }
interface LifespanStats { /* 6 properties */ }
interface FamilyEvent { /* 4 properties */ }
interface TreeStatistics { /* 5 + timestamp */ }
interface PersonStats { /* 6 properties */ }
```

**Main Functions:**

#### `calculateBasicStats(data, personStats)`
- Time Complexity: O(n) for generation BFS, O(n) for age calculations
- Returns: BasicStats object
- Handles: Missing dates, null values, age edge cases

#### `calculateRelationshipStats(data)`
- Time Complexity: O(e) where e = edges
- Returns: RelationshipStats object
- Filters: By edge type (spouse vs parent-child)

#### `calculateGenderStats(personStats)`
- Time Complexity: O(n)
- Returns: GenderStats object
- Handles: Case-insensitive gender values

#### `calculateLifespanStats(personStats)`
- Time Complexity: O(n log n) for sorting
- Returns: LifespanStats object
- Calculates: Range, average, year distributions

#### `generateTimelineEvents(personStats)`
- Time Complexity: O(n) with Map aggregation
- Returns: FamilyEvent[] sorted by year
- Groups: Events by year and type

#### `calculateTreeStatistics(data, personStats)`
- Time Complexity: O(n) overall
- Returns: Complete TreeStatistics object
- Orchestrates: All calculation functions

#### `exportStatisticsAsCSV(stats, treeName)`
- Time Complexity: O(1) relative to data
- Returns: CSV string
- Formats: Professional report style

#### `downloadStatisticsCSV(content, fileName)`
- Time Complexity: O(1)
- Side Effect: Triggers browser download
- Handles: Blob creation and cleanup

## Data Flow

### 1. Tree Data Arrives
```
getPublicRenderData() → TreeRenderV1 object
```

### 2. Component Mount
```
useEffect triggered → fetchRenderData() → setData()
```

### 3. Statistics Calculation
```
useEffect([data]) triggered →
  Creates personStatsMap from nodes →
  Calls calculateTreeStatistics() →
  setStatistics() → Re-render
```

### 4. UI Rendering
```
StatisticsSidebar receives statistics prop →
  Renders appropriate tab content →
  Displays visualizations
```

### 5. User Exports CSV
```
User clicks CSV button →
  exportStatisticsAsCSV() called →
  CSV string generated →
  downloadStatisticsCSV() called →
  Browser downloads file
```

## Type System

### Core Types

```typescript
type TreeStatistics = {
  basicStats: BasicStats;
  relationshipStats: RelationshipStats;
  genderStats: GenderStats;
  lifespanStats: LifespanStats;
  timelineEvents: FamilyEvent[];
  calculatedAt: Date;
};

type PersonStats = {
  id: string;
  displayName: string;
  birthDate?: string | null;
  deathDate?: string | null;
  gender: 'MALE' | 'FEMALE' | 'UNKNOWN';
};
```

### Benefits
- Full TypeScript type safety
- IDE autocomplete support
- Compile-time error checking
- Self-documenting code

## Performance Optimizations

### 1. Lazy Calculation
```typescript
useEffect(() => {
  if (!data || data.nodes.length === 0) return; // Skip if no data
  // Calculate only when data changes
}, [data]); // Dependency array
```

### 2. Timeline Limiting
```typescript
{stats.timelineEvents.slice(0, 20).map(...)} // Show 20 max
{stats.timelineEvents.length > 20 && `... and ${remaining} more`}
```

### 3. Memoization (Future)
```typescript
const statistics = useMemo(() => {
  return calculateTreeStatistics(data, personStatsMap);
}, [data, personStatsMap]); // Calculate only on data change
```

### 4. Complexity Analysis
```
calculateBasicStats:        O(n + e) - nodes + edges traversal
calculateRelationshipStats: O(e)     - filter edges
calculateGenderStats:       O(n)     - count genders
calculateLifespanStats:     O(n log n) - sort for ranges
generateTimelineEvents:     O(n)     - group by year
Overall:                    O(n log n) - dominated by sorting
```

## Error Handling

### Null Safety
```typescript
if (!data || data.nodes.length === 0) {
  setStatistics(null); // Handle empty tree
}
```

### Missing Data
```typescript
const age = calculateAge(person.birthDate, person.deathDate);
if (age) lifespans.push(age); // Only include valid ages
```

### Type Checking
```typescript
if (isNaN(year)) continue; // Skip invalid dates
```

## Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| SVG Pie Chart | ✓ | ✓ | ✓ | ✓ |
| Blob API (CSV) | ✓ | ✓ | ✓ | ✓ |
| Map/Set | ✓ | ✓ | ✓ | ✓ |
| Date API | ✓ | ✓ | ✓ | ✓ |

## Testing Recommendations

### Unit Tests

```typescript
// statisticsCalculator.test.ts
describe('calculateBasicStats', () => {
  it('should count total people', () => { });
  it('should calculate generations', () => { });
  it('should find oldest person', () => { });
  it('should calculate average age', () => { });
});

describe('exportStatisticsAsCSV', () => {
  it('should generate valid CSV', () => { });
  it('should include all sections', () => { });
  it('should handle missing data', () => { });
});
```

### Integration Tests

```typescript
// StatisticsSidebar.test.tsx
describe('StatisticsSidebar', () => {
  it('should display overview tab by default', () => { });
  it('should switch tabs on click', () => { });
  it('should render pie chart', () => { });
  it('should download CSV on button click', () => { });
});
```

### E2E Tests

```typescript
// statistics.e2e.ts
describe('Statistics Feature', () => {
  it('should calculate statistics from tree data', () => { });
  it('should show/hide statistics panel', () => { });
  it('should export CSV file', () => { });
});
```

## Future Extensibility

### Adding New Metrics
```typescript
export interface NewMetric {
  value: number;
  label: string;
}

export function calculateNewMetric(data: TreeRenderV1): NewMetric {
  // Implementation
}

// Add to TreeStatistics interface
type TreeStatistics = {
  // ... existing fields
  newMetric: NewMetric;
};
```

### Adding New Export Formats
```typescript
export function exportStatisticsAsJSON(stats: TreeStatistics): string {
  return JSON.stringify(stats, null, 2);
}

export function exportStatisticsAsPDF(stats: TreeStatistics): Promise<Blob> {
  // PDF generation using html2pdf or similar
}
```

### Custom Visualizations
```typescript
// Create new component
const CustomChart = ({ stats }: { stats: TreeStatistics }) => {
  // Use D3, Chart.js, or other visualization library
};

// Add as new tab in StatisticsSidebar
```

## Integration Checklist

- [x] Import statistics utilities into TreeViewer
- [x] Add state for statistics, loading, tab selection
- [x] Create useEffect for statistics calculation
- [x] Create StatisticsSidebar component
- [x] Implement all 5 tabs with content
- [x] Create pie chart visualization
- [x] Add CSV export functionality
- [x] Update sidebar layout with tabs
- [x] Test TypeScript compilation
- [x] Verify no console errors
- [x] Document features in guides
- [x] Create quick reference

## Deployment Notes

### Breaking Changes
None - feature is completely additive

### Database Changes
None - uses only existing tree data

### API Changes
None - no new endpoints required

### Dependencies
None - no new packages required (uses only existing D3, React, Bootstrap)

### Migration Steps
None - automatic with code deployment

## Maintenance

### Code Quality
- Full TypeScript typing
- No linting errors
- Follows React best practices
- Modular, reusable functions

### Documentation
- Comprehensive user guide
- Quick reference card
- Technical implementation guide
- Code comments where needed

### Performance Monitoring
- Monitor statistics calculation time with large trees
- Track CSV export performance
- Monitor memory usage
- Test with 1000+ node trees

