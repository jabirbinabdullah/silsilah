# Seeding Test Data

## Comprehensive Family Tree (test-tree-001)

### Family Structure

The seed creates a 3-generation family tree with 13 persons:

**Generation 0 - Grandparents (born ~1940s)**
- William Smith (1945) ↔ Mary Johnson (1947)
- Robert Davis (1943) ↔ Patricia Brown (1946)

**Generation 1 - Parents (born ~1970s)**
- John Smith (1972, son of William & Mary) ↔ Sarah Davis (1974, daughter of Robert & Patricia)
- Michael Smith (1975, son of William & Mary) ↔ Jennifer Wilson (1976)

**Generation 2 - Children (born ~2000s)**
- Emma Smith (2001), James Smith (2003), Olivia Smith (2005) - children of John & Sarah
- Daniel Smith (2002), Sophie Smith (2004) - children of Michael & Jennifer

### Relationships

- **4 spouse relationships** (all grandparent and parent couples)
- **16 parent-child relationships** (both parents for each child)

### How to Seed

```bash
cd backend
npm run seed:tree
```

This will:
1. Connect to MongoDB
2. Delete existing `test-tree-001` if it exists
3. Create a new comprehensive family tree
4. Output the family structure to console

### Testing the Tree

1. Start the backend: `cd backend && npm start`
2. Start the frontend: `cd frontend && npm run dev`
3. Open http://localhost:5174
4. Enter tree ID: **test-tree-001**
5. You should see a force-directed graph with 13 nodes and 20 edges

### Tree Visualization Features

The test tree demonstrates:
- Multi-generational layout
- Spouse relationships (blue lines)
- Parent-child relationships (gray lines)
- Multiple siblings in same generation
- Cross-family marriages (Sarah Davis marries John Smith, connecting two family lines)
