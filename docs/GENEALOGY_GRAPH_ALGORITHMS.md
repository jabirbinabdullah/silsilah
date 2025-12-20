# GenealogyGraph Algorithms (V1)

This document defines the core algorithms used by the `GenealogyGraph` aggregate to maintain DAG structure, compute relationships, and enable tree visualization.

All algorithms respect the hard and soft invariants defined in [DOMAIN_MODEL.md](DOMAIN_MODEL.md).

---

## 1. Cycle Detection Algorithm

### Purpose
Prevent circular ancestry by detecting whether adding a parent-child relationship would create a cycle.

### Invariant Enforced
**G1: DAG Structure [HARD-ENFORCED]**

### Algorithm: `wouldCreateCycle(parentId, childId) -> bool`

#### High-Level Approach
If we add edge `parentId → childId`, a cycle exists if and only if `childId` is already an ancestor of `parentId`.

Proof:
- Before adding the edge: DAG is acyclic (invariant G1)
- Adding `parentId → childId` introduces a path from `parentId` to `childId`
- If `childId` can already reach `parentId` (childId is ancestor), then adding this edge closes the loop
- Any cycle must pass through this new edge
- Therefore: cycle ⟺ `childId` ∈ ancestors of `parentId`

**Scope discipline:** Cycle detection MUST be executed with a fresh `visited` and `recursionStack` set per mutation operation, scoped to the affected subgraph. Reusing traversal state across mutations can introduce false positives or miss cycles in large trees.

#### Pseudocode (Depth-First Search Approach)

```
algorithm wouldCreateCycle(parentId: PersonId, childId: PersonId) 
    -> bool

    input:  parentId (proposed parent), childId (proposed child)
    output: true if adding parentId → childId would create a cycle
    
    // Check if childId can already reach parentId in the current DAG
    // If yes, adding parentId → childId creates a path: 
    //    childId → ... → parentId → childId (cycle)
    
    return childId ∈ getAncestors_Internal(parentId)


algorithm getAncestors_Internal(personId: PersonId) -> Set<PersonId>
    """
    Internal helper: returns all ancestors of personId using DFS.
    Used during validation (before adding relationship).
    """
    
    input:  personId
    output: set of all ancestor PersonIds
    
    ancestors ← empty set
    visited ← empty set
    stack ← [personId]
    
    while stack is not empty:
        current ← stack.pop()
        
        if current ∈ visited:
            continue
        
        visited.add(current)
        
        // Find all PARENT_CHILD relationships where childId = current
        for each relationship ∈ this.Relationships:
            if relationship.Type = PARENT_CHILD and 
               relationship.ChildId = current:
                
                parent ← relationship.ParentId
                ancestors.add(parent)
                stack.push(parent)
    
    return ancestors
```

#### Cycle Detection Variant: Full Graph Validation (DFS with color marking)

Used in `validateInvariants()` to perform a complete graph audit:

```
algorithm isDAG() -> bool
    """
    Validates that the entire parent-child graph is acyclic.
    Uses color-based DFS (white-gray-black).
    
    Colors:
      WHITE (0) = unvisited
      GRAY (1)  = visiting (in current DFS path)
      BLACK (2) = finished (no cycle from this node)
    """
    
    input:  GenealogyGraph (internal state)
    output: true if graph is acyclic (DAG), false if cycle exists
    
    color ← map: PersonId → {WHITE, GRAY, BLACK}
    
    // Initialize all persons as WHITE
    for each person ∈ this.Persons:
        color[person.PersonId] ← WHITE
    
    // Check each unvisited component
    for each person ∈ this.Persons:
        if color[person.PersonId] = WHITE:
            if hasCycleDFS(person.PersonId, color):
                return false  // Cycle detected
    
    return true  // No cycles found; graph is DAG


algorithm hasCycleDFS(personId: PersonId, 
                      color: Map<PersonId, Color>) -> bool
    """
    DFS helper for cycle detection.
    A back edge (to a GRAY node) indicates a cycle.
    """
    
    input:  personId (current node), color map
    output: true if cycle exists in subtree rooted at personId
    
    color[personId] ← GRAY  // Mark as visiting
    
    // Traverse to all children (descendants)
    for each relationship ∈ this.Relationships:
        if relationship.Type = PARENT_CHILD and 
           relationship.ParentId = personId:
            
            childId ← relationship.ChildId
            
            // Back edge: child is already in current path
            if color[childId] = GRAY:
                return true  // Cycle detected
            
            // Forward edge: recurse on unvisited child
            if color[childId] = WHITE:
                if hasCycleDFS(childId, color):
                    return true  // Cycle found in subtree
    
    color[personId] ← BLACK  // Mark as finished
    return false  // No cycle from this node
```

#### Complexity Analysis

**Time:**
- `wouldCreateCycle(parentId, childId)`: O(V + E)
  - V = number of persons (nodes)
  - E = number of relationships (edges)
  - Single DFS traversal in worst case

- `isDAG()`: O(V + E)
  - DFS on entire graph from all unvisited nodes
  - Each node and edge visited once

**Space:**
- `wouldCreateCycle()`: O(V) for visited set and stack
- `isDAG()`: O(V) for color map and recursion stack

#### Invariant Enforcement

```
Before executing: addParentChildRelationship(parentId, childId)
    1. Validate parentId ∈ this.Persons [HARD-ENFORCED]
    2. Validate childId ∈ this.Persons [HARD-ENFORCED]
    3. Validate parentId ≠ childId [HARD-ENFORCED]
    4. Validate not wouldCreateCycle(parentId, childId) [HARD-ENFORCED]
    5. If all pass: Add relationship to this.Relationships
    6. Defensive check: assert isDAG() [HARD-ENFORCED but redundant]
```

---

## 2. Generation Level Computation

### Purpose
Calculate the distance (in generations) between two persons: root and target.
Used for tree layout, generation alignment, and ancestor/descendant classification.

### Invariant Enforced
**G1: DAG Structure [HARD-ENFORCED]**

### Algorithm: `getGenerationLevel(personId, rootId) -> int?`

#### High-Level Approach
Bidirectional BFS from root:
- Root has level 0
- Direct children of root have level +1
- Direct parents of root have level -1
- Search terminates when target person is found
- Returns null if persons are in disconnected components

#### Pseudocode

```
algorithm getGenerationLevel(targetId: PersonId, 
                             rootId: PersonId) -> int?
    
    input:  targetId (person to find generation level of)
            rootId (reference person, level 0)
    output: level (int), or null if unreachable
    
    // Base case
    if targetId = rootId:
        return 0
    
    visited ← empty set
    queue ← Queue()
    queue.enqueue((rootId, 0))  // (personId, level)
    
    while queue is not empty:
        (current, level) ← queue.dequeue()
        
        if current ∈ visited:
            continue
        
        visited.add(current)
        
        // Found target
        if current = targetId:
            return level
        
        // ========== DOWNWARD TRAVERSAL (children) ==========
        // Search through all PARENT_CHILD relationships where parent = current
        for each relationship ∈ this.Relationships:
            if relationship.Type = PARENT_CHILD and 
               relationship.ParentId = current:
                
                child ← relationship.ChildId
                
                if child ∉ visited:
                    if child = targetId:
                        return level + 1  // Early termination
                    queue.enqueue((child, level + 1))
        
        // ========== UPWARD TRAVERSAL (parents) ==========
        // Search through all PARENT_CHILD relationships where child = current
        for each relationship ∈ this.Relationships:
            if relationship.Type = PARENT_CHILD and 
               relationship.ChildId = current:
                
                parent ← relationship.ParentId
                
                if parent ∉ visited:
                    if parent = targetId:
                        return level - 1  // Early termination
                    queue.enqueue((parent, level - 1))
    
    // targetId not reachable from rootId
    return null
```

#### Variant: All Generation Levels from Root

For visualization, compute generation levels for all persons in the tree:

```
algorithm getAllGenerationLevels(rootId: PersonId) 
    -> Map<PersonId, int>
    
    input:  rootId (reference person)
    output: map of {PersonId → generation level}
    
    levels ← Map()
    visited ← empty set
    queue ← Queue()
    
    queue.enqueue((rootId, 0))
    levels[rootId] ← 0
    
    while queue is not empty:
        (current, level) ← queue.dequeue()
        
        if current ∈ visited:
            continue
        
        visited.add(current)
        
        // ========== DOWNWARD TRAVERSAL ==========
        for each relationship ∈ this.Relationships:
            if relationship.Type = PARENT_CHILD and 
               relationship.ParentId = current:
                
                child ← relationship.ChildId
                
                if child ∉ visited:
                    levels[child] ← level + 1
                    queue.enqueue((child, level + 1))
        
        // ========== UPWARD TRAVERSAL ==========
        for each relationship ∈ this.Relationships:
            if relationship.Type = PARENT_CHILD and 
               relationship.ChildId = current:
                
                parent ← relationship.ParentId
                
                if parent ∉ visited:
                    levels[parent] ← level - 1
                    queue.enqueue((parent, level - 1))
    
    return levels
```

#### Complexity Analysis

**Time:**
- `getGenerationLevel(targetId, rootId)`: O(V + E) worst case
  - May visit all persons and relationships
  - Early termination when target found (best case: O(depth))

- `getAllGenerationLevels(rootId)`: O(V + E)
  - BFS visits all reachable persons once
  - Each relationship considered once

**Space:**
- Both algorithms: O(V) for visited set and queue

#### Example: Generation Level Computation

```
Tree Structure:
    G1 (level -1)
     ↓
    P1 (level 0 = root)
   /  \
  C1  C2 (level +1)
  |
 GC1   (level +2)

getAllGenerationLevels(P1):
    Iteration 1: dequeue (P1, 0)
        visited.add(P1), levels[P1] = 0
        Find children: C1, C2
        Enqueue (C1, +1), (C2, +1)
        Find parents: G1
        Enqueue (G1, -1)
    
    Iteration 2: dequeue (C1, +1)
        visited.add(C1), levels[C1] = +1
        Find children: GC1
        Enqueue (GC1, +2)
        Find parents: P1 (already visited, skip)
    
    Iteration 3: dequeue (C2, +1)
        visited.add(C2), levels[C2] = +1
        Find children: (none)
        Find parents: P1 (already visited, skip)
    
    Iteration 4: dequeue (G1, -1)
        visited.add(G1), levels[G1] = -1
        Find children: P1 (already visited, skip)
        Find parents: (none)
    
    Iteration 5: dequeue (GC1, +2)
        visited.add(GC1), levels[GC1] = +2
        Find children: (none)
        Find parents: C1 (already visited, skip)

    Result: {P1: 0, C1: +1, C2: +1, GC1: +2, G1: -1}
```

---

## 3. Ancestor Traversal Algorithm

### Purpose
Find all ancestors of a person (transitively reachable through parent-child relationships going upward).

### Algorithm: `getAncestors(personId) -> List<PersonId>`

#### High-Level Approach
Depth-first traversal, following parent edges backward (child → parent).

#### Pseudocode

```
algorithm getAncestors(targetId: PersonId) -> Set<PersonId>
    
    input:  targetId (person whose ancestors to find)
    output: set of ancestor PersonIds
    
    ancestors ← empty set
    visited ← empty set
    stack ← [targetId]
    
    while stack is not empty:
        current ← stack.pop()
        
        if current ∈ visited:
            continue
        
        visited.add(current)
        
        // Find all PARENT_CHILD relationships where childId = current
        for each relationship ∈ this.Relationships:
            if relationship.Type = PARENT_CHILD and 
               relationship.ChildId = current:
                
                parent ← relationship.ParentId
                
                // parent is an ancestor; add to result
                ancestors.add(parent)
                
                // Continue searching from parent (transitivity)
                if parent ∉ visited:
                    stack.push(parent)
    
    return ancestors
```

#### Variant: Ancestors at Specific Distance (Generation)

```
algorithm getAncestorsAtLevel(personId: PersonId, 
                               level: int) -> List<PersonId>
    """
    Returns ancestors exactly 'level' generations above.
    level = 1: direct parents
    level = 2: grandparents
    level = 0: invalid (personId itself)
    """
    
    input:  personId, level (positive integer)
    output: list of PersonIds at specified generation above
    
    if level ≤ 0:
        return empty list
    
    current_generation ← {personId}
    
    for i = 1 to level:
        next_generation ← empty set
        
        for each person ∈ current_generation:
            // Find all parents of person
            for each relationship ∈ this.Relationships:
                if relationship.Type = PARENT_CHILD and 
                   relationship.ChildId = person:
                    
                    parent ← relationship.ParentId
                    next_generation.add(parent)
        
        if next_generation is empty:
            return empty list  // Hit top of tree
        
        current_generation ← next_generation
    
    return current_generation.toList()
```

#### Ancestor Line Computation (Full Lineage)

```
algorithm getAncestorLines(personId: PersonId) 
    -> List<List<PersonId>>
    """
    Returns all ancestor paths from personId to root(s).
    Each path represents a complete lineage.
    """
    
    input:  personId
    output: list of ancestor chains (each chain is root → ... → personId)
    
    paths ← empty list
    
    function dfs(current: PersonId, path: List<PersonId>):
        
        path.append(current)
        
        // Find parents of current
        has_parents ← false
        
        for each relationship ∈ this.Relationships:
            if relationship.Type = PARENT_CHILD and 
               relationship.ChildId = current:
                
                has_parents ← true
                parent ← relationship.ParentId
                dfs(parent, path)
        
        // Leaf node (no parents) = root of this lineage
        if not has_parents:
            paths.add(path.copy())  // Save path
        
        path.remove(current)  // Backtrack
    
    dfs(personId, empty list)
    return paths
```

#### Complexity Analysis

**Time:**
- `getAncestors(personId)`: O(V + E)
  - Visits each ancestor once
  - Scans all relationships for parent edges
  - Worst case: all persons are ancestors

- `getAncestorsAtLevel(personId, level)`: O(level × (V + E))
  - Worst case: O(V + E) per level
  - Total: O(level × (V + E))

- `getAncestorLines(personId)`: O(paths × depth)
  - Exponential in worst case (many roots)
  - Practical genealogies: limited by reasonable family structures

**Space:**
- `getAncestors(personId)`: O(V) for visited set and stack
- `getAncestorLines(personId)`: O(paths × depth) for all lineages

---

## 4. Descendant Traversal Algorithm

### Purpose
Find all descendants of a person (transitively reachable through parent-child relationships going downward).

### Algorithm: `getDescendants(personId) -> List<PersonId>`

#### High-Level Approach
Depth-first traversal, following child edges forward (parent → child).

#### Pseudocode

```
algorithm getDescendants(targetId: PersonId) -> Set<PersonId>
    
    input:  targetId (person whose descendants to find)
    output: set of descendant PersonIds
    
    descendants ← empty set
    visited ← empty set
    stack ← [targetId]
    
    while stack is not empty:
        current ← stack.pop()
        
        if current ∈ visited:
            continue
        
        visited.add(current)
        
        // Find all PARENT_CHILD relationships where parentId = current
        for each relationship ∈ this.Relationships:
            if relationship.Type = PARENT_CHILD and 
               relationship.ParentId = current:
                
                child ← relationship.ChildId
                
                // child is a descendant; add to result
                descendants.add(child)
                
                // Continue searching from child (transitivity)
                if child ∉ visited:
                    stack.push(child)
    
    return descendants
```

#### Variant: Descendants at Specific Distance (Generation)

```
algorithm getDescendantsAtLevel(personId: PersonId, 
                                 level: int) -> List<PersonId>
    """
    Returns descendants exactly 'level' generations below.
    level = 1: direct children
    level = 2: grandchildren
    level = 0: invalid (personId itself)
    """
    
    input:  personId, level (positive integer)
    output: list of PersonIds at specified generation below
    
    if level ≤ 0:
        return empty list
    
    current_generation ← {personId}
    
    for i = 1 to level:
        next_generation ← empty set
        
        for each person ∈ current_generation:
            // Find all children of person
            for each relationship ∈ this.Relationships:
                if relationship.Type = PARENT_CHILD and 
                   relationship.ParentId = person:
                    
                    child ← relationship.ChildId
                    next_generation.add(child)
        
        if next_generation is empty:
            return empty list  // Hit bottom of tree
        
        current_generation ← next_generation
    
    return current_generation.toList()
```

#### Descendant Subtree Computation (With Structure)

```
algorithm getDescendantSubtree(personId: PersonId) 
    -> Tree<PersonId>
    """
    Returns full descendant subtree rooted at personId.
    Structure preserves parent-child relationships.
    """
    
    input:  personId
    output: tree node (root = personId, children = descendants)
    
    function buildSubtree(current: PersonId) -> TreeNode:
        
        node ← new TreeNode(current)
        children ← empty list
        
        // Find all children of current
        for each relationship ∈ this.Relationships:
            if relationship.Type = PARENT_CHILD and 
               relationship.ParentId = current:
                
                child ← relationship.ChildId
                children.add(buildSubtree(child))
        
        node.children ← children
        return node
    
    return buildSubtree(personId)
```

#### Complexity Analysis

**Time:**
- `getDescendants(personId)`: O(V + E)
  - Visits each descendant once
  - Scans all relationships for child edges

- `getDescendantsAtLevel(personId, level)`: O(level × (V + E))
  - O(V + E) per level iteration

- `getDescendantSubtree(personId)`: O(V + E)
  - Builds tree structure for all descendants

**Space:**
- `getDescendants(personId)`: O(V) for visited set and stack
- `getDescendantSubtree(personId)`: O(V) for tree nodes and recursion stack

---

## 5. Tree Construction for Visualization

### Purpose
Construct a complete tree representation suitable for rendering in vertical, horizontal, or list format.

### Algorithm: `buildVisualizationTree(rootId, viewMode) -> VisualizationTree`

#### Data Structures

```
struct TreeNode:
    personId       : PersonId
    person         : Person
    generationLevel: int
    ancestors      : List<TreeNode>     (parents)
    descendants    : List<TreeNode>     (children)
    spouses        : List<PersonId>     (for rendering spouse relationships)
    metadata       : Map<string, any>   (UI hints: collapsed, highlighted)

struct VisualizationTree:
    rootId         : PersonId
    rootNode       : TreeNode
    allNodes       : Map<PersonId, TreeNode>  (lookup table)
    generationMap  : Map<int, List<PersonId>> (persons per generation level)
    viewMode       : enum {VERTICAL, HORIZONTAL, LIST}
    bounds         : Rectangle           (layout dimensions)
```

#### High-Level Approach
1. Load root person
2. Compute generation levels for all reachable persons
3. Construct bidirectional tree (ancestors upward, descendants downward)
4. Add spouse relationships as metadata
5. Compute layout bounds (for renderer)

#### Pseudocode

```
algorithm buildVisualizationTree(rootId: PersonId, 
                                 viewMode: ViewMode) 
    -> VisualizationTree
    
    input:  rootId (root of tree), viewMode (VERTICAL|HORIZONTAL|LIST)
    output: complete visualization tree structure
    
    // ========== PHASE 1: Compute Generation Levels ==========
    generationLevels ← getAllGenerationLevels(rootId)
    
    if rootId ∉ generationLevels:
        return error: "Root person not reachable"
    
    // ========== PHASE 2: Collect All Reachable Persons ==========
    reachablePerson ← Set(generationLevels.keys())
    
    // ========== PHASE 3: Build Tree Nodes ==========
    allNodes ← Map<PersonId, TreeNode>()
    
    for each personId ∈ reachablePersons:
        person ← getPerson(personId)
        
        node ← new TreeNode()
        node.personId ← personId
        node.person ← person
        node.generationLevel ← generationLevels[personId]
        node.ancestors ← empty list
        node.descendants ← empty list
        node.spouses ← empty list
        node.metadata ← empty map
        
        allNodes[personId] ← node
    
    // ========== PHASE 4: Link Parent-Child Relationships ==========
    for each relationship ∈ this.Relationships:
        if relationship.Type ≠ PARENT_CHILD:
            continue
        
        parentId ← relationship.ParentId
        childId ← relationship.ChildId
        
        // Only include if both in reachable set
        if parentId ∈ reachablePersons and childId ∈ reachablePersons:
            
            parentNode ← allNodes[parentId]
            childNode ← allNodes[childId]
            
            // Add to descendant list (parent's perspective)
            parentNode.descendants.add(childNode)
            
            // Add to ancestor list (child's perspective)
            childNode.ancestors.add(parentNode)
    
    // ========== PHASE 5: Link Spouse Relationships ==========
    for each relationship ∈ this.Relationships:
        if relationship.Type ≠ SPOUSE:
            continue
        
        // Spouse relationships are undirected; store as PersonIds
        spouse1Id ← relationship.SpouseId  (implied from context)
        spouse2Id ← relationship.getOtherPerson(spouse1Id)
        
        if spouse1Id ∈ reachablePersons and spouse2Id ∈ reachablePersons:
            
            node1 ← allNodes[spouse1Id]
            node2 ← allNodes[spouse2Id]
            
            node1.spouses.add(spouse2Id)
            node2.spouses.add(spouse1Id)
    
    // ========== PHASE 6: Build Generation Map ==========
    generationMap ← Map<int, List<PersonId>>()
    
    for each (personId, level) ∈ generationLevels:
        if level ∉ generationMap:
            generationMap[level] ← empty list
        
        generationMap[level].add(personId)
    
    // ========== PHASE 7: Compute Layout Bounds ==========
    // (Depends on viewMode; simplistic for now)
    numGenerations ← max(generationMap.keys()) - min(generationMap.keys()) + 1
    maxPersonsPerGen ← max(size of generationMap[level] for all levels)
    
    bounds ← new Rectangle()
    if viewMode = VERTICAL:
        bounds.width ← maxPersonsPerGen × PERSON_WIDTH + SPACING
        bounds.height ← numGenerations × GENERATION_HEIGHT + SPACING
    else if viewMode = HORIZONTAL:
        bounds.width ← numGenerations × GENERATION_WIDTH + SPACING
        bounds.height ← maxPersonsPerGen × PERSON_HEIGHT + SPACING
    
    // ========== PHASE 8: Create Visualization Tree ==========
    tree ← new VisualizationTree()
    tree.rootId ← rootId
    tree.rootNode ← allNodes[rootId]
    tree.allNodes ← allNodes
    tree.generationMap ← generationMap
    tree.viewMode ← viewMode
    tree.bounds ← bounds
    
    return tree
```

#### Complexity Analysis

**Time:**
- Phase 1 (gen levels): O(V + E)
- Phase 2 (collect): O(V)
- Phase 3 (build nodes): O(V)
- Phase 4 (link parents): O(E)
- Phase 5 (link spouses): O(E)
- Phase 6 (gen map): O(V)
- Phase 7 (bounds): O(V)
- **Total: O(V + E)**

**Space:**
- allNodes: O(V)
- generationMap: O(V)
- Recursion/working space: O(depth)
- **Total: O(V)**

#### Rendering Output Formats

##### Vertical Tree (Top-Down)

```
Generations are rows; persons within generation are columns.

        G1
        |
        P1
       /  \
      C1  C2
      |
     GC1

Layout:
Row 0 (Gen -1): [G1]
Row 1 (Gen  0): [P1]
Row 2 (Gen +1): [C1] [C2]
Row 3 (Gen +2): [GC1]

Edges: drawn vertically downward and connecting sibling pairs
```

##### Horizontal Tree (Left-Right)

```
Generations are columns; persons within generation are rows.

G1 ── P1 ── C1 ── GC1
         └── C2

Layout:
Col 0 (Gen -1): [G1]
Col 1 (Gen  0): [P1]
Col 2 (Gen +1): [C1]
                [C2]
Col 3 (Gen +2): [GC1]

Edges: drawn horizontally rightward
```

##### List View (Textual)

```
algorithm buildListRepresentation(tree: VisualizationTree) -> string

    output ← empty string
    sortedLevels ← sort(tree.generationMap.keys())
    
    for each level ∈ sortedLevels:
        
        persons ← tree.generationMap[level]
        genLabel ← formatGenerationLabel(level)
        output += f"Generation {genLabel}:\n"
        
        for each personId ∈ persons:
            node ← tree.allNodes[personId]
            person ← node.person
            
            output += f"  - {person.name} "
            output += f"(b. {person.birthDate or '?'}, "
            output += f"d. {person.deathDate or 'alive'})\n"
            
            // Show relationships
            if node.spouses is not empty:
                output += f"    Spouse(s): "
                for each spouseId ∈ node.spouses:
                    spousePerson ← getPerson(spouseId)
                    output += f"{spousePerson.name}, "
                output += "\n"
    
    return output
```

#### Example: Tree Construction

```
Input Tree:
    Alice (b. 1920)
       |
    Bob (b. 1945) ── married to ── Carol (b. 1947)
     /  \
  David  Eve (b. 1970)
  (b. 1968)

buildVisualizationTree(Bob, VERTICAL):

Phase 1: generationLevels = {
    Alice: -1,
    Bob: 0,
    Carol: 0 (spouse, not ancestor)
    David: +1,
    Eve: +1
}

Phase 2: reachablePersons = {Alice, Bob, Carol, David, Eve}

Phase 3: Create TreeNodes for all 5 persons

Phase 4: Link parent-child:
    Alice.descendants = [Bob]
    Bob.ancestors = [Alice]
    Bob.descendants = [David, Eve]
    David.ancestors = [Bob]
    Eve.ancestors = [Bob]

Phase 5: Link spouses:
    Bob.spouses = [Carol]
    Carol.spouses = [Bob]

Phase 6: generationMap = {
    -1: [Alice],
    0: [Bob, Carol],
    +1: [David, Eve]
}

Phase 7: Bounds:
    numGenerations = 3
    maxPerGen = 2
    bounds.width = 2 × 100 + 20 = 220
    bounds.height = 3 × 80 + 20 = 260

Phase 8: VisualizationTree returned with all structure
```

---

## 6. Algorithm Performance Summary

| Algorithm | Time Complexity | Space Complexity | Use Case |
|-----------|-----------------|------------------|----------|
| `wouldCreateCycle()` | O(V + E) | O(V) | Validate before add |
| `isDAG()` | O(V + E) | O(V) | Full invariant check |
| `getGenerationLevel()` | O(V + E)* | O(V) | Single level lookup |
| `getAllGenerationLevels()` | O(V + E) | O(V) | Render entire tree |
| `getAncestors()` | O(V + E) | O(V) | Ancestor list |
| `getAncestorLines()` | O(paths × depth) | O(paths × depth) | Full lineage |
| `getDescendants()` | O(V + E) | O(V) | Descendant list |
| `getDescendantSubtree()` | O(V + E) | O(V) | Subtree structure |
| `buildVisualizationTree()` | O(V + E) | O(V) | Full rendering |

*Best case: O(depth) when target found early; worst case: O(V + E)

---

## 7. Invariant Enforcement Points

All algorithms respect hard vs soft invariants:

```
HARD-ENFORCED Invariants (blocking):
  G1: wouldCreateCycle() prevents adding edges that create cycles
  G2: parent count check in addParentChildRelationship()
  G3: duplicate check in addParentChildRelationship()
  G4: referenced persons must exist (defensive isDAG())

SOFT-VALIDATED Invariants (warned, logged):
  G5: person connectivity checked in removeRelationship()
  G6: root validity checked in setRoot()
  G7: age consistency checked in addParentChildRelationship()
```

All traversal algorithms (getAncestors, getDescendants, etc.) assume a valid DAG:
- They do not check for cycles (DAG is guaranteed by construction)
- They rely on O(V + E) complexity due to DAG structure
- In a cyclic graph, these algorithms would loop infinitely
- **Defensive validation (isDAG) should run after persistence for extra safety**

