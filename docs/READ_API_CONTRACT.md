# Read API Contract (Frontend)

Context:
- Backend follows DDD with a single aggregate root: `GenealogyGraph`.
- Frontend is strictly read-only. No client-side business rules.
- All mutations occur via application commands executed server-side.

## Frontend Read Contract
This contract enumerates the ONLY read queries permitted for frontend consumption. No other queries are exposed to the frontend.

**Note on server-side filtering:** Server-side filtering refers only to authorization and ownership rules. Data is never partially filtered for layout, performance, or presentation reasons.

### Query: getTreeRenderData(treeId)
- Name: `getTreeRenderData`
- Input parameters:
  - `treeId`
- Output DTO shape (fields only):
  - `treeId`
  - `nodes`: array of objects with fields:
    - `id`
    - `displayName` (string; opaque, server-defined, non-stable)
  - `spouseEdges`: array of objects with fields:
    - `personAId`
    - `personBId`
  - `parentChildEdges`: array of objects with fields:
    - `parentId`
    - `childId`
- Explicit non-guarantees:
  - No guarantee of order for `nodes` or edges.
  - No guarantee of completeness if server-side policies filter data.
  - No guarantee of derived computations (e.g., inferred relationships) beyond provided fields.
  - `displayName` is for presentation only and must not be used for identity, sorting, or business logic.

#### Traversal Semantics
- `nodes` represent individuals in the tree; `id` is the stable identifier.
- `spouseEdges` are undirected: `(personAId, personBId)` indicates a spousal relationship with no ordering semantics.
- `parentChildEdges` are directed: `parentId` → `childId` represents a parent-child relationship.
- Frontend must not infer transitive relationships (e.g., grandparent, sibling) beyond explicit edges.
- Frontend must not assume cyclical validation; malformed data (cycles, dangling references) may occur and must be handled gracefully.
- No guarantee of a single root node or tree connectedness; the graph may be disconnected or contain multiple roots.

### Query: getPersonDetails(treeId, personId)
- Name: `getPersonDetails`
- Input parameters:
  - `treeId`
  - `personId`
- Output DTO shape (fields only):
  - `treeId`
  - `personId`
  - `person`: object with fields:
    - `id`
    - `displayName` (string; opaque, server-defined, non-stable)
    - `attributes`: object whose fields are server-defined, e.g.:
      - `name`
      - `birthDate`
      - `deathDate`
      - `gender`
- Explicit non-guarantees:
  - No guarantee that any attribute is present; absence is valid.
  - No guarantee of attribute semantics beyond field names; values are opaque strings for display.
  - No guarantee of referential completeness (linked entities may be absent).
  - No guarantee of sort order inside nested collections.

### Query: getRelationshipEdges(treeId)
- Name: `getRelationshipEdges`
- Input parameters:
  - `treeId`
- Output DTO shape (fields only):
  - `treeId`
  - `spouseEdges`: array of objects with fields:
    - `personAId`
    - `personBId`
  - `parentChildEdges`: array of objects with fields:
    - `parentId`
    - `childId`
- Explicit non-guarantees:
  - No guarantee of edge order or pagination stability.
  - No guarantee of inferred or transitive relationships; only explicit edges are returned.
  - No guarantee of completeness if server-side policies filter edges.

This query exists to support relationship inspection and debugging. Frontend must not assume equivalence with getTreeRenderData edge sets.

## Mutation Boundary Statement
- Frontend never mutates domain state directly.
- Frontend does not perform `PATCH` operations or partial updates.
- All domain mutations are encapsulated as server-side commands that are atomic and intention-revealing.
- This is a hard architectural rule, not a suggestion.
- Frontend must not attempt to emulate domain rules or validate business invariants.
