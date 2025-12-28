# Statistics Panel Feature

## Overview

The Statistics Panel provides comprehensive insights into genealogical tree data including demographics, relationships, timelines, and more. Accessible directly from the TreeViewer sidebar with export capabilities.

## Features

### 1. Overview Tab
- **Total People**: Count of all individuals in the tree
- **Generations**: Number of distinct generations
- **Average Age**: Calculated from available birth dates
- **Oldest Person**: Name and age of the eldest individual
- **Youngest Person**: Name and age of the youngest individual

### 2. Relationships Tab
- **Spouse Relationships**: Count of marriages/partnerships
- **Parent-Child Relationships**: Count of direct descendant links
- **Total Relationships**: Sum of all relationship types
- **Visual Progress Bars**: Proportional display of relationship types
- **Relationship Ratio**: Quick reference of spouse to descendant ratio

### 3. Gender Distribution Tab
- **Gender Breakdown**: Count of male, female, and unknown gender entries
- **Pie Chart Visualization**: SVG-based pie chart showing distribution
- **Gender Legend**: Color-coded breakdown with count badges
- **Percentage Display**: Quick percentage reference for gender split

### 4. Lifespan Statistics Tab
- **Birth Date Statistics**: Count of people with recorded birth dates
- **Death Date Statistics**: Count of people with recorded death dates
- **Average Lifespan**: Calculated years lived (when both dates available)
- **Birth Year Range**: Earliest and latest birth years
- **Death Year Range**: Earliest and latest death years
- **Average Birth/Death Years**: Mean year calculations

### 5. Timeline Tab
- **Family Events**: Chronological list of births and deaths
- **Event Counts**: Number of events per year
- **Timeline View**: Scrollable list of up to 20 most recent events
- **Event Indicators**: 👶 for births, ⚰️ for deaths
- **Year-Based Organization**: Events sorted chronologically

### 6. CSV Export
- **Export Button**: Quick access CSV download button
- **Complete Data Export**: All statistics included in export
- **Formatted Output**: Professional CSV format with headers
- **Auto-Generated Filename**: Includes tree name and timestamp

## Usage

### Accessing Statistics

1. **Open TreeViewer**: Navigate to any genealogical tree
2. **Click Stats Tab**: Click the "📊 Stats" button in the right sidebar
3. **Browse Tabs**: Navigate through different statistics categories
4. **View Details**: Explore demographic, relationship, and timeline information

### Exporting Data

1. **Navigate to Statistics Tab**: Ensure "📊 Stats" is selected
2. **Click CSV Button**: Click the "⬇️ CSV" button in the sidebar header
3. **Download Starts**: File downloads automatically with naming pattern: `{treeName}_statistics_{timestamp}.csv`
4. **Import to Excel**: Open CSV in spreadsheet application for further analysis

### Understanding the Data

#### Gender Distribution
- Shows visual pie chart of gender demographics
- Useful for understanding family composition
- Percentages indicate proportional distribution

#### Relationships Analysis
- Spouse relationships show partnership count
- Parent-child shows generational links
- Ratio helps understand family structure (more ancestors vs. descendants)

#### Lifespan Insights
- Birth/death year ranges show family's time span
- Average lifespan indicates life expectancy in the family
- Useful for historical context and demographic analysis

#### Timeline View
- Shows major family events chronologically
- Helps identify generations and periods
- Limited to 20 most recent for performance

## Architecture

### Component Structure

```
TreeViewer
├── StatisticsSidebar (main statistics component)
│   ├── OverviewTab (basic metrics)
│   ├── RelationshipsTab (relationship counts & visualization)
│   ├── GenderTab (gender distribution with pie chart)
│   ├── LifespanTab (age and lifespan metrics)
│   └── TimelineTab (chronological events)
└── statisticsCalculator utility functions
```

### Data Flow

```
TreeRenderV1 (tree data)
  ↓
calculateTreeStatistics()
  ↓
TreeStatistics object
  ↓
StatisticsSidebar component
  ↓
User-facing UI with export
```

### Key Functions

#### `calculateTreeStatistics(data, personStatsMap)`
Main calculation function that:
- Calls all calculation functions
- Returns complete TreeStatistics object
- Includes calculation timestamp

#### `calculateBasicStats(data, personStatsMap)`
Calculates:
- Total people count
- Generation count
- Oldest/youngest people
- Average age

#### `calculateRelationshipStats(data)`
Counts:
- Spouse relationships
- Parent-child relationships
- Total relationships

#### `calculateGenderStats(personStatsMap)`
Tallies:
- Male count
- Female count
- Unknown gender count

#### `calculateLifespanStats(personStatsMap)`
Computes:
- Birth/death date availability
- Average lifespan
- Average birth/death years
- Birth/death year ranges

#### `generateTimelineEvents(personStatsMap)`
Creates:
- Chronological event list
- Birth and death events per year
- Event counts

#### `exportStatisticsAsCSV(stats, treeName)`
Generates:
- Formatted CSV string
- All statistics included
- Professional report format

#### `downloadStatisticsCSV(csvContent, fileName)`
Handles:
- Blob creation
- Download link generation
- Automatic browser download

## Styling & UI

### Tab Navigation
- Five tabs: Overview, Relations, Gender, Lifespan, Timeline
- Bootstrap nav-tabs styling
- Compact font (0.85rem) for mobile efficiency
- Active tab highlighting

### Color Scheme
- **Primary**: Blue (#007bff) - males in pie chart
- **Secondary**: Pink (#e83e8c) - females in pie chart
- **Tertiary**: Gray (#6c757d) - unknown gender
- **Success**: Green - parent-child relationships
- **Danger**: Red - death statistics
- **Info**: Light blue - average metrics

### Responsive Design
- Adapts to sidebar width constraints
- Scrollable content areas
- Compact badge styling
- Mobile-friendly tab interface

## Integration Points

### TreeViewer Component
- Statistics state management
- Data flow from tree data
- Statistics sidebar rendering
- Tab switching logic

### statisticsCalculator Utility
- Standalone calculation functions
- No React dependencies
- Reusable in other components
- Type-safe with full TypeScript

### Export Functionality
- CSV format generation
- Browser download handling
- Automatic file naming
- Blob-based download

## Performance Considerations

### Optimization Strategies
1. **Lazy Calculation**: Statistics only calculated when data changes
2. **Memoization**: useCallback for expensive functions
3. **Limited Timeline**: Only shows first 20 events (scrollable)
4. **Efficient Algorithms**: O(n) complexity for most calculations

### Data Constraints
- Handles trees with 1000+ nodes
- SVG pie chart renders efficiently
- Timeline pagination for large datasets
- No external chart library dependencies

## CSV Export Format

### File Structure
```
Genealogical Tree Statistics Report
Tree: {treeName}
Generated: {timestamp}

=== BASIC STATISTICS ===
Total People,{count}
Total Generations,{count}
Oldest Person,"{name}",Age: {age}
Youngest Person,"{name}",Age: {age}
Average Age,{age}

=== RELATIONSHIP STATISTICS ===
Spouse Relationships,{count}
Parent-Child Relationships,{count}
Total Relationships,{count}

=== GENDER DISTRIBUTION ===
Male,{count}
Female,{count}
Unknown,{count}

=== LIFESPAN STATISTICS ===
People with Birth Date,{count}
People with Death Date,{count}
Average Lifespan (years),{age}
...

=== TIMELINE EVENTS ===
Year,Type,Count
{year},{type},{count}
...
```

## Future Enhancements

### Possible Additions
1. **Advanced Filtering**: Filter statistics by date range or generation
2. **Comparison Mode**: Compare statistics between different subtrees
3. **Historical Analysis**: Trend analysis over time periods
4. **Chart Improvements**: More visualization types (bar charts, line graphs)
5. **Data Quality Metrics**: Completeness percentage, data gaps
6. **Relationship Analytics**: Most common surnames, family branches
7. **Visual Reports**: Generate PDF reports with charts
8. **Custom Date Ranges**: Filter by specific time periods

## Technical Notes

### Browser Compatibility
- All modern browsers supported
- SVG pie chart compatible with IE11+
- CSV export uses Blob API (IE10+)
- No external dependencies required

### API Requirements
- Requires TreeRenderV1 data structure
- Optional: PersonStats with detailed birth/death dates
- Currently uses UNKNOWN for gender (can be enhanced with API data)

### Accessibility
- Semantic HTML structure
- Proper color contrast
- Tab navigation support
- Alt text for visual elements

## Troubleshooting

### Statistics Not Showing
1. Ensure tree data has loaded (check data object)
2. Verify statistics calculation completed (check isLoading state)
3. Check browser console for errors

### CSV Export Not Working
1. Ensure CSV button is visible (check showStatistics state)
2. Verify statistics data exists (check statistics object)
3. Check browser download settings
4. Try different filename format if download fails

### Missing Data in Statistics
1. CSV export includes all available calculated statistics
2. Missing fields indicate unavailable data in tree (e.g., no birth dates)
3. Unknown gender indicates gender not recorded in tree data

### Performance Issues with Large Trees
1. Timeline tab limits to 20 events for performance
2. All other tabs should handle 1000+ nodes efficiently
3. Statistics calculate on data change only (not on every render)

## File Locations

- **Main Component**: `src/components/StatisticsSidebar.tsx`
- **Utilities**: `src/utils/statisticsCalculator.ts`
- **Integration**: `src/components/TreeViewer.tsx`
- **Documentation**: `docs/STATISTICS_PANEL.md`

## Related Features

- [Keyboard Controls](./KEYBOARD_CONTROLS.md) - Navigation shortcuts
- [Quick Add Child](./QUICK_ADD_CHILD.md) - Rapid data entry
- [Performance Optimization](./PERFORMANCE_OPTIMIZATIONS.md) - Large tree handling

