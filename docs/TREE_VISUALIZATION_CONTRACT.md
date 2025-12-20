# Tree Visualization DTO Contract (V1)

This document specifies the Data Transfer Object (DTO) structure that bridges the domain/application layers to the presentation layer for genealogy tree rendering.

**Key Principle:** The DTO is **directly renderable by recursive UI components**. The frontend receives a complete, pre-computed tree structure with no inference, guessing, or graph reconstruction needed.

---

## 1. Overview

### Purpose
The `TreeVisualizationDTO` is the API contract returned by:
```
Application Layer: RenderTreeQuery(treeId, rootPersonId, viewMode)
    ↓
Domain Layer: GenealogyGraph.buildVisualizationTree()
    ↓
Application Layer: Transform to TreeVisualizationDTO
    ↓
Presentation Layer: Consume and render
```

### Properties
- **Immutable**: All fields are read-only from frontend perspective
- **Self-contained**: No additional database queries needed
- **Pre-computed**: Generation levels, bounds, layout hints already calculated
- **Hierarchical**: Tree structure explicitly represented (no implicit traversal)
- **Metadata-rich**: Includes UI hints (collapse state, highlighted status)

---

## 2. TreeVisualizationDTO (Root Container)

```typescript
interface TreeVisualizationDTO {
    // ========== Core Identification ==========
    treeId: string              // GenealogyGraphId
    rootPersonId: string        // PersonId at root (generation level 0)
    viewMode: ViewMode          // "VERTICAL" | "HORIZONTAL" | "LIST"
    
    // ========== Tree Structure ==========
    root: TreeNodeDTO           // Root node (generation 0)
    allNodes: Map<PersonId, TreeNodeDTO>  // Lookup: fast node access
    
    // ========== Generation Information ==========
    generations: Map<int, PersonId[]>
        // Key: generation level (0, ±1, ±2, ...)
        // Value: list of PersonIds at that level
        // Enables: layout alignment, generation lines, batch rendering
    
    generationRange: {
        minLevel: int           // Lowest generation level (most ancestors)
        maxLevel: int           // Highest generation level (furthest descendants)
        count: int              // Total number of generation levels
    }
    
    // ========== Layout & Rendering ==========
    bounds: {
        width: number           // Total width (pixels, approximate)
        height: number          // Total height (pixels, approximate)
        unitWidth: number       // Width per person node
        unitHeight: number      // Height per person node
    }
    
    // ========== Metadata ==========
    renderTimestamp: ISO8601    // When tree was computed
    personCount: int            // Total persons in tree (reachable from root)
    relationshipCount: int      // Total relationships in tree
}
```

---

## 3. TreeNodeDTO (Individual Person Node)

### Structure

```typescript
interface TreeNodeDTO {
    // ========== Identity ==========
    personId: string            // Unique within tree
    
    // ========== Person Data ==========
    person: PersonDTO           // Complete person information
    
    // ========== Position in Tree ==========
    generationLevel: int        // Relative to root (0 = root, -1 = parent, +1 = child)
    
    // ========== Relationships: Parent-Child ==========
    parents: ParentChildEdgeDTO[]
        // All PARENT_CHILD relationships where this person is child
        // Always 0, 1, or 2 items (invariant G2)
        // Enables: rendering upward edges
    
    children: ParentChildEdgeDTO[]
        // All PARENT_CHILD relationships where this person is parent
        // Enables: rendering downward edges
    
    // ========== Relationships: Spousal ==========
    spouses: SpousalEdgeDTO[]
        // All SPOUSE relationships involving this person
        // Enables: rendering spouse connections, joint display
    
    // ========== UI State (Expand/Collapse) ==========
    displayState: {
        isCollapsed: boolean    // true = children hidden, false = expanded
        isHighlighted: boolean  // true = user selected or marked
        isRoot: boolean         // true = this is the designated root
    }
    
    // ========== Navigation Hints ==========
    hasAncestors: boolean       // true if generation level < 0 exists
    hasDescendants: boolean     // true if generation level > 0 exists
    ancestorCount: int          // Total ancestors (all levels above)
    descendantCount: int        // Total descendants (all levels below)
    
    // ========== Rendering Constraints ==========
    metadata: {
        personWidth: number     // Width allocated for rendering
        personHeight: number    // Height allocated for rendering
        x?: number              // Optional: computed x-coordinate
        y?: number              // Optional: computed y-coordinate
    }
}
```

### PersonDTO (Embedded Person Data)

```typescript
interface PersonDTO {
    // ========== Identity ==========
    personId: string            // Must match parent TreeNodeDTO.personId
    
    // ========== Personal Information ==========
    name: string                // Full name
    gender: "MALE" | "FEMALE" | "UNKNOWN"
    
    // ========== Birth Information ==========
    birthDate?: string          // ISO8601 or null (unknown)
    birthPlace?: string         // null if unknown
    
    // ========== Death Information ==========
    deathDate?: string          // ISO8601 or null (alive/unknown)
    
    // ========== Display Text ==========
    displayLabel: string        // Formatted name for rendering
                                // e.g., "John Doe (1945-2020)"
                                // Avoids frontend string formatting
}
```

---

## 4. Edge Representations

### ParentChildEdgeDTO (Parent-Child Relationship)

```typescript
interface ParentChildEdgeDTO {
    type: "PARENT_CHILD"        // Literal constant
    
    parentId: string            // PersonId of parent
    childId: string             // PersonId of child
    
    parentNode: TreeNodeDTO     // Full parent node (for direct access)
    childNode: TreeNodeDTO      // Full child node (for direct access)
    
    // ========== Rendering Hints ==========
    direction: "UP" | "DOWN"    // From perspective of root node
                                // UP: edge goes to parent (ancestor)
                                // DOWN: edge goes to child (descendant)
    
    lineStyle: "SOLID" | "DASHED"  // SOLID = confirmed, DASHED = uncertain
    
    metadata: {
        isSelected: boolean     // true if user highlighted this edge
    }
}
```

### SpousalEdgeDTO (Spouse Relationship)

```typescript
interface SpousalEdgeDTO {
    type: "SPOUSE"              // Literal constant
    
    spouse1Id: string           // First person in couple
    spouse2Id: string           // Second person in couple (arbitrary order)
    
    spouse1Node: TreeNodeDTO    // Full node for spouse 1
    spouse2Node: TreeNodeDTO    // Full node for spouse 2
    
    // ========== Rendering Hints ==========
    isConsecutiveGenerations: boolean  // true if spouses are same generation
                                       // false if different (unusual, allowed)
    
    lineStyle: "SOLID" | "DASHED"      // SOLID = married, DASHED = uncertain
    
    metadata: {
        isSelected: boolean     // true if user highlighted this edge
    }
}
```

---

## 5. Generation Level Representation

### Key Principles

1. **Generation levels are explicit numbers, not derived**
   - No frontend needs to compute relative positions
   - Layout engines can directly bin nodes by level

2. **Negative levels represent ancestors; positive represent descendants**
   ```
   Generation Level:   -2        -1       0        +1       +2
                       (Grandpa) (Parent) (Root)  (Child) (Grandchild)
   ```

3. **Lookup table (`generations` map) enables batch rendering**
   - Frontend can render all persons at level 0, then +1, then -1, etc.
   - Or render all in single pass with layout offset per level

### Example: Accessing Persons by Generation

```
tree.generations[0]     // All persons at root's generation
tree.generations[-1]    // All persons one generation above
tree.generations[1]     // All persons one generation below

// Batch rendering algorithm (pseudocode)
for each level in sorted(tree.generations.keys()):
    persons = tree.generations[level]
    yOffset = level * GENERATION_HEIGHT
    for each personId in persons:
        node = tree.allNodes[personId]
        renderPersonNode(node, xOffset, yOffset)
```

### Generation Bounds

```typescript
// From TreeVisualizationDTO.generationRange

{
    minLevel: -3,           // Ancestors go 3 levels up
    maxLevel: 4,            // Descendants go 4 levels down
    count: 8                // Total 8 generation levels
}

// Useful for:
// - Canvas sizing
// - Scrollbar dimensions
// - Generation line drawing
```

---

## 6. Expand/Collapse State Management

### State Representation

Each TreeNodeDTO includes:
```typescript
displayState: {
    isCollapsed: boolean,
    isHighlighted: boolean,
    isRoot: boolean
}
```

### Semantics

```
isCollapsed = true:
    - Node's children are NOT rendered (not included in visible tree)
    - Children count still available in descendantCount
    - UI shows "expand" button (▶)

isCollapsed = false:
    - Node's children ARE rendered recursively
    - UI shows "collapse" button (▼)
    - Initial state from server: all nodes expanded (isCollapsed = false)

isHighlighted = true:
    - Node is emphasized (bold border, background color, etc.)
    - Typically: user clicked on node, or server-side selection
    - Frontend can toggle on user interaction

isRoot = true:
    - This node is the designated root (generation level 0)
    - Only one node per tree has this = true
    - UI can show special styling (icon, label, etc.)
```

### State Management Flow

```
Server (Initial Render):
    ├─ All nodes have isCollapsed = false (expanded)
    ├─ One node has isRoot = true (the designated root)
    └─ isHighlighted = false (unless server selects one)

Frontend (User Interaction):
    ├─ User clicks node → local state change:
    │   1. Set isHighlighted = true on clicked node
    │   2. Set isHighlighted = false on previously highlighted
    │   3. Re-render subtree
    │
    ├─ User clicks collapse button → state change:
    │   1. Set isCollapsed = true on that node
    │   2. Hide children in render (don't remove from DOM in list mode)
    │   3. Show "expand" button
    │
    └─ User clicks expand button → state change:
        1. Set isCollapsed = false on that node
        2. Show children in render
        3. Show "collapse" button

Collapsing does NOT require server round-trip:
    - DTO contains full tree structure (all levels)
    - Frontend just toggles rendering visibility
    - All descendants already in memory
```

### Example: Rendering with Collapse State

```typescript
// Pseudocode: recursive tree rendering

function renderNode(node: TreeNodeDTO, depth: number) {
    
    // Always render this node
    renderPersonBox(node.person, depth)
    
    // Render spouse connections (always, regardless of collapse)
    for each spouse of node.spouses:
        if not node.displayState.isCollapsed:  // Only if expanded
            drawSpouseLine(node, spouse)
    
    // Render children (only if not collapsed)
    if not node.displayState.isCollapsed:
        for each child in node.children:
            drawParentChildEdge(node, child)
            renderNode(child.childNode, depth + 1)
    else:
        // Show expand button instead
        renderExpandButton(node)
}
```

---

## 7. Serialization Format (JSON Example)

### Complete Tree Example

```json
{
  "treeId": "tree-smith-family-2024",
  "rootPersonId": "P001",
  "viewMode": "VERTICAL",
  
  "root": {
    "personId": "P001",
    "person": {
      "personId": "P001",
      "name": "Robert Smith",
      "gender": "MALE",
      "birthDate": "1945-03-15",
      "deathDate": null,
      "displayLabel": "Robert Smith (b. 1945)"
    },
    "generationLevel": 0,
    "parents": [
      {
        "type": "PARENT_CHILD",
        "parentId": "P0",
        "childId": "P001",
        "direction": "UP",
        "lineStyle": "SOLID",
        "parentNode": { ... },
        "childNode": { ... },
        "metadata": { "isSelected": false }
      }
    ],
    "children": [
      {
        "type": "PARENT_CHILD",
        "parentId": "P001",
        "childId": "P002",
        "direction": "DOWN",
        "lineStyle": "SOLID",
        "parentNode": { ... },
        "childNode": { ... },
        "metadata": { "isSelected": false }
      }
    ],
    "spouses": [
      {
        "type": "SPOUSE",
        "spouse1Id": "P001",
        "spouse2Id": "P101",
        "isConsecutiveGenerations": true,
        "lineStyle": "SOLID",
        "spouse1Node": { ... },
        "spouse2Node": { ... },
        "metadata": { "isSelected": false }
      }
    ],
    "displayState": {
      "isCollapsed": false,
      "isHighlighted": false,
      "isRoot": true
    },
    "hasAncestors": true,
    "hasDescendants": true,
    "ancestorCount": 4,
    "descendantCount": 7,
    "metadata": {
      "personWidth": 150,
      "personHeight": 80
    }
  },

  "allNodes": {
    "P001": { ... },
    "P0": { ... },
    "P002": { ... },
    "P101": { ... },
    ...
  },

  "generations": {
    "-1": ["P0"],
    "0": ["P001"],
    "1": ["P002", "P003"],
    "2": ["P004", "P005", "P006"]
  },

  "generationRange": {
    "minLevel": -1,
    "maxLevel": 2,
    "count": 4
  },

  "bounds": {
    "width": 800,
    "height": 600,
    "unitWidth": 150,
    "unitHeight": 100
  },

  "renderTimestamp": "2024-12-20T15:30:00Z",
  "personCount": 8,
  "relationshipCount": 10
}
```

---

## 8. Direct Renderability Guarantee

### What Frontend CAN do with DTO (No inference needed):

```typescript
// ✅ Directly render from DTO

// 1. Recursive node rendering
function renderTree(node: TreeNodeDTO) {
    drawBox(node.person.displayLabel, node.displayState)
    
    if (!node.displayState.isCollapsed) {
        for (let child of node.children) {
            drawLine(node, child.childNode)
            renderTree(child.childNode)
        }
    }
}

// 2. Batch render by generation
for (let level of Object.keys(tree.generations).sort()) {
    let nodes = tree.generations[level]
    for (let personId of nodes) {
        let node = tree.allNodes[personId]
        drawAtGeneration(node, level)
    }
}

// 3. Access any node instantly
let node = tree.allNodes["P001"]
let spouses = node.spouses  // Already loaded
let children = node.children  // Already loaded

// 4. Spouse rendering
for (let spousalEdge of node.spouses) {
    drawSpouseLine(spousalEdge.spouse1Node, spousalEdge.spouse2Node)
}

// 5. Update collapse state (local only)
node.displayState.isCollapsed = !node.displayState.isCollapsed
```

### What Frontend CANNOT do (and shouldn't):

```typescript
// ❌ DO NOT: Reconstruct graph relationships
let childNode = tree.allNodes["P002"]
for (let parent of childNode.parents) {
    // DON'T query to find parent's other children
    // Use parent.parentNode.children instead
}

// ❌ DO NOT: Compute generation levels
let level = computeLevel(node)  // WRONG: already in node.generationLevel

// ❌ DO NOT: Infer ancestor/descendant paths
let path = findPathToAncestor(node, ancestor)  // WRONG: use tree structure

// ❌ DO NOT: Reconstruct spouse relationships
// They're pre-computed in node.spouses

// ❌ DO NOT: Perform graph traversals beyond immediate edges
// Use what's in parents[], children[], spouses[]
```

---

## 9. Rendering Algorithm (Frontend Example)

### Vertical Tree Rendering

```typescript
function renderVerticalTree(tree: TreeVisualizationDTO, canvas: Canvas) {
    
    // Initialize canvas
    canvas.width = tree.bounds.width
    canvas.height = tree.bounds.height
    
    const GENERATION_HEIGHT = 120
    const PERSON_WIDTH = tree.bounds.unitWidth
    
    // ========== Render all nodes ==========
    const nodePositions = new Map()
    
    for (let [level, personIds] of Object.entries(tree.generations)) {
        const y = (tree.generationRange.maxLevel - level) * GENERATION_HEIGHT
        let x = 50  // Starting x
        
        for (let personId of personIds) {
            const node = tree.allNodes[personId]
            
            // Position
            nodePositions.set(personId, { x, y })
            x += PERSON_WIDTH + 20
            
            // Render person box
            drawPersonBox(canvas, node.person, x, y, {
                width: PERSON_WIDTH,
                height: 80,
                isHighlighted: node.displayState.isHighlighted,
                isRoot: node.displayState.isRoot
            })
            
            // Render collapse/expand button if has children
            if (node.children.length > 0) {
                const buttonLabel = node.displayState.isCollapsed ? "▶" : "▼"
                drawButton(canvas, x + PERSON_WIDTH, y, buttonLabel)
            }
        }
    }
    
    // ========== Render parent-child edges ==========
    for (let [personId, node] of Object.entries(tree.allNodes)) {
        if (node.displayState.isCollapsed) continue  // Skip if collapsed
        
        for (let childEdge of node.children) {
            const parentPos = nodePositions.get(node.personId)
            const childPos = nodePositions.get(childEdge.childId)
            
            drawLine(canvas, parentPos, childPos, {
                style: childEdge.lineStyle,
                color: "black"
            })
        }
    }
    
    // ========== Render spouse edges ==========
    for (let [personId, node] of Object.entries(tree.allNodes)) {
        for (let spouseEdge of node.spouses) {
            const spouse1Pos = nodePositions.get(spouseEdge.spouse1Id)
            const spouse2Pos = nodePositions.get(spouseEdge.spouse2Id)
            
            // Draw horizontal line between spouses
            drawLine(canvas, spouse1Pos, spouse2Pos, {
                style: "SOLID",
                color: "red"
            })
        }
    }
}
```

---

## 10. State Mutations & Updates

### Frontend State Changes (No Server Round-Trip)

```typescript
// User toggles collapse on node
function toggleCollapse(nodeId: string, tree: TreeVisualizationDTO) {
    const node = tree.allNodes[nodeId]
    node.displayState.isCollapsed = !node.displayState.isCollapsed
    rerenderSubtree(node)  // Re-render only affected portion
}

// User highlights a node
function selectNode(nodeId: string, tree: TreeVisualizationDTO) {
    // Clear previous selection
    for (let [id, node] of Object.entries(tree.allNodes)) {
        node.displayState.isHighlighted = false
    }
    
    // Set new selection
    tree.allNodes[nodeId].displayState.isHighlighted = true
    rerenderSubtree(tree.allNodes[nodeId])
}

// User clicks "view as root" on a node
function changeRoot(nodeId: string) {
    // Send command to server (requires new DTO)
    server.command("SetRoot", { treeId: tree.treeId, personId: nodeId })
    // Server returns new DTO with nodeId at generation level 0
}
```

### Server-Side State (Persisted)

```
isCollapsed:     Frontend-only state (not persisted)
                 Resets on page reload

isHighlighted:   Frontend-only state (not persisted)
                 Resets on page reload

isRoot:          Server-persisted state
                 Requires SetRootPersonCommand to change
                 Returns new DTO with updated generation levels
```

---

## 11. DTO Invariants (Contracts)

All DTO structures must satisfy:

### TreeVisualizationDTO Invariants

```
I1: Root node exists
    root.personId = rootPersonId
    root.generationLevel = 0

I2: All nodes in allNodes map
    for each node ∈ tree: node ∈ tree.allNodes[node.personId]

I3: Generation map completeness
    sum(generations[*].length) = personCount

I4: Parent count per node
    for each node ∈ allNodes: node.parents.length ≤ 2

I5: Edge referential integrity
    for each edge in node.children, node.parents, node.spouses:
        edge.parentNode.personId ∈ allNodes
        edge.childNode.personId ∈ allNodes

I6: No cycles (DAG guaranteed)
    for each node: generationLevel(node) < generationLevel(descendant)

I7: Generation range validity
    minLevel = min(generations.keys())
    maxLevel = max(generations.keys())
    count = maxLevel - minLevel + 1

I8: Exactly one root
    for each node ∈ allNodes: count(node.displayState.isRoot) = 1

I9: Person data consistency
    node.person.personId = node.personId
```

### TreeNodeDTO Invariants

```
I10: Edge directionality
    for each edge in parents: edge.direction = "UP"
    for each edge in children: edge.direction = "DOWN"

I11: Spouse symmetry
    if A ∈ B.spouses, then B ∈ A.spouses

I12: Relationship counts
    ancestorCount = |getAllAncestors(personId)|
    descendantCount = |getAllDescendants(personId)|

I13: Ancestor/descendant hints
    hasAncestors = true ⟺ generationLevel < 0 ∧ exists parent
    hasDescendants = true ⟺ generationLevel > 0 ∨ exists child
```

---

## 12. API Response Example

### Request
```
GET /api/genealogy/trees/{treeId}/render?rootPersonId=P001&viewMode=VERTICAL
Authorization: Bearer {token}
Accept: application/json
```

### Response
```
HTTP/1.1 200 OK
Content-Type: application/json
Content-Length: 45032

{
  "treeId": "tree-smith-2024",
  "rootPersonId": "P001",
  ... [complete DTO as shown in §7]
}
```

### Error Response
```
HTTP/1.1 400 Bad Request

{
  "error": "TREE_NOT_FOUND",
  "message": "Tree ID 'tree-invalid' does not exist",
  "treeId": "tree-invalid"
}
```

---

## 13. Performance Considerations

### DTO Size Estimates

For a typical family tree (500 persons):
- Average relationships per person: 2-4
- Node size (JSON): ~2KB (person data + edges)
- allNodes map: ~1MB
- generations index: ~50KB
- Total DTO: ~1.5MB

**Optimization:** For very large trees (>5K persons), consider:
- Pagination by generation level
- Lazy-load descendant subtrees
- Separate API endpoint for collapse/expand (return partial updates)

### Frontend Rendering Performance

```
Initial render:    O(V + E) where V = persons, E = relationships
Collapse node:     O(subtree size) - only re-render affected children
Scroll/pan:        O(visible nodes) - render only visible portion
Change root:       Server round-trip (returns new DTO)
```

---

## 14. Backward Compatibility

### Version 1 DTO Contract
```
This document defines TreeVisualizationDTO v1.
Field additions: backward compatible (new fields have defaults)
Field removals: breaking change (major version bump)
Structural changes: backward compatible if optional fields
```

### Future Extensions (V2+)
```
- Image URLs for persons (portraits)
- Alternative spouse representation (married years, divorce)
- Annotation support (notes, citations)
- Multi-root forest (no longer DAG, but forest of trees)
- Temporal relationships (show only living, only in certain year)
```

