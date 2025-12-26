# Tree Render Read Model - Implementation Guide

## Overview

This document describes the implementation of the **TreeRenderDTO v1** read model, which provides frontend clients with a complete snapshot of a genealogy tree for visualization purposes.

**Status:** ✅ Implemented and contract-tested (20/20 tests passing)

**Endpoint:** `GET /trees/:treeId/render-data`

**Related Documentation:**
- [READ_API_CONTRACT.md](./READ_API_CONTRACT.md) - Frontend read API contract
- [TREE_RENDER_TRAVERSAL.md](./TREE_RENDER_TRAVERSAL.md) - Traversal semantics

---

## Implementation Architecture

### Layer Responsibilities

```
┌─────────────────────────────────────────────────┐
│  Presentation Layer                             │
│  - GenealogyController.getTreeRenderData()     │
│  - Authorization via JwtGuard                   │
│  - HTTP 404/500 error mapping                   │
└─────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│  Application Layer                              │
│  - GenealogyApplicationService                  │
│  - .getTreeRenderData(treeId: string)           │
│  - Authorization: requireQuery() (VIEWER+)      │
│  - Defensive traversal with O(N+E) complexity   │
└─────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│  Infrastructure Layer                           │
│  - GenealogyGraphRepository.getSnapshot()       │
│  - MongoDB read-only replica support            │
└─────────────────────────────────────────────────┘
```

---

## DTO Structure (v1)

### TreeRenderDTO

```typescript
interface TreeRenderDTO {
  version: 'v1';              // Contract version
  treeId: string;             // Tree identifier
  nodes: TreeNode[];          // All persons
  spouseEdges: RelationshipEdge[];      // Spouse relationships
  parentChildEdges: RelationshipEdge[]; // Parent-child relationships
}

interface TreeNode {
  id: string;           // Person identifier
  displayName: string;  // Name for UI display
}

interface RelationshipEdge {
  personAId: string;    // First endpoint
  personBId: string;    // Second endpoint
}
```

**Field Semantics:**
- `displayName`: Mapped from domain `Person.name` field as-is (no trimming/cleaning)
- Edges are **directional** for parent-child (personA = parent, personB = child)
- Edges are **undirected** for spouses (personA/personB order is arbitrary)

---

## Implementation Details

### Phase 1: Input Validation

```typescript
if (!treeId || typeof treeId !== 'string' || treeId.trim() === '') {
  throw new InvariantViolationError('treeId must be a non-empty string');
}
```

**Result:** HTTP 400 Bad Request

### Phase 2: Authorization Check

```typescript
this.requireQuery(); // Requires VIEWER, EDITOR, or OWNER role
```

**Result:** HTTP 403 Forbidden if unauthorized

### Phase 3: Fetch Snapshot

```typescript
const snapshot = await this.readRepository.getSnapshot(treeId);
if (!snapshot) {
  throw new NotFoundError(`Tree ${treeId} not found`);
}
```

**Result:** HTTP 404 Not Found if tree doesn't exist

### Phase 4: Build Node Set (O(N))

```typescript
const nodes: TreeNode[] = [];
const validNodeIds = new Set<string>();

for (const p of snapshot.persons) {
  const id = p.personId ?? p.id;
  if (!id) continue;
  
  validNodeIds.add(id);
  nodes.push({
    id,
    displayName: p.name ?? p.label ?? '',
  });
}
```

**Defensive Strategy:**
- Skips persons without valid IDs
- Falls back to empty string for missing names
- Set-based membership for O(1) lookups

### Phase 5: Collect Spouse Edges (O(E))

```typescript
const spouseEdges: RelationshipEdge[] = [];

for (const edge of snapshot.spouseEdges) {
  const a = edge.personAId ?? edge.spouse1Id ?? edge.spouseAId;
  const b = edge.personBId ?? edge.spouse2Id ?? edge.spouseBId;
  
  if (!a || !b) continue;
  if (!validNodeIds.has(a) || !validNodeIds.has(b)) continue;
  
  spouseEdges.push({ personAId: a, personBId: b });
}
```

**Defensive Strategy:**
- Skips edges with missing/null endpoints
- Skips edges referencing persons not in validNodeIds (dangling references)
- **No deduplication** - preserves duplicate edges as-is

### Phase 6: Collect Parent-Child Edges (O(E))

```typescript
const parentChildEdges: RelationshipEdge[] = [];

for (const edge of snapshot.parentChildEdges) {
  const parentId = edge.parentId ?? edge.personAId;
  const childId = edge.childId ?? edge.personBId;
  
  if (!parentId || !childId) continue;
  if (!validNodeIds.has(parentId) || !validNodeIds.has(childId)) continue;
  
  parentChildEdges.push({ personAId: parentId, personBId: childId });
}
```

**Defensive Strategy:** Same as spouse edges

### Phase 7: Return Versioned DTO

```typescript
return {
  version: 'v1' as const,
  treeId: snapshot.treeId,
  nodes,
  spouseEdges,
  parentChildEdges,
};
```

---

## Complexity Analysis

| Phase | Complexity | Description |
|-------|-----------|-------------|
| Validation | O(1) | String checks |
| Authorization | O(1) | Role check |
| Fetch snapshot | O(1) | MongoDB query |
| Build node set | O(N) | Iterate persons |
| Collect spouse edges | O(E₁) | Filter + map |
| Collect parent-child edges | O(E₂) | Filter + map |
| **Total** | **O(N + E)** | Linear in graph size |

Where:
- N = number of persons
- E = E₁ + E₂ (total edges)

---

## Contract Guarantees

### ✅ Guaranteed Behaviors

1. **Version field**: Always `'v1'`
2. **Authorization**: Respects RBAC (VIEWER/EDITOR/OWNER required)
3. **Defensive traversal**: Never throws on dangling references or cycles
4. **O(N+E) complexity**: Set-based membership checks
5. **Deterministic output**: Same input → same output (within same execution)
6. **All persons included**: Disconnected graphs return all nodes

### ⚠️ Non-Guarantees (Explicitly Excluded)

1. **No ordering guarantees**: Node/edge order is unspecified
2. **No deduplication**: Duplicate edges preserved as-is
3. **No client-side validation**: Frontend must validate relationships
4. **No historical consistency**: Snapshot reflects current state only
5. **No partial results**: Returns complete snapshot or fails

---

## Error Handling

| Error Type | HTTP Status | Scenario |
|------------|-------------|----------|
| `InvariantViolationError` | 400 | Empty/invalid treeId |
| `AuthorizationError` | 403 | Insufficient permissions |
| `NotFoundError` | 404 | Tree doesn't exist |
| Generic `Error` | 500 | Unexpected failures |

---

## Test Coverage

**Test Suite:** `backend/test/tree-render.e2e.spec.ts`

**Status:** ✅ 20/20 tests passing

### Test Categories

1. **Authorization boundary** (2 tests)
   - 404 for nonexistent tree
   - 400 for empty treeId

2. **Empty/minimal cases** (3 tests)
   - Empty tree (no persons)
   - Single orphan person
   - Multiple unrelated persons

3. **Dangling references** (4 tests)
   - Spouse edge with missing person
   - Parent-child edge with missing parent
   - Parent-child edge with missing child
   - Edge with both endpoints missing

4. **Duplicate edges** (2 tests)
   - Duplicate spouse edges preserved
   - Duplicate parent-child edges preserved

5. **Disconnected graphs** (2 tests)
   - All persons included regardless of connectedness
   - Multiple root persons

6. **Cycle handling** (2 tests)
   - Parent-child cycles don't throw
   - Self-referential edges don't throw

7. **Determinism** (1 test)
   - Repeated calls produce consistent output

8. **DTO structure** (4 tests)
   - Version field = 'v1'
   - TreeId matches request parameter
   - TreeNode has only id/displayName fields
   - RelationshipEdge has only personAId/personBId fields

---

## Performance Considerations

### Read-Only Replica Support

The implementation uses `readRepository` (configurable via environment):

```typescript
constructor(
  repository: GenealogyGraphRepository,
  factory: GenealogyGraphFactory,
  requiresAuth: boolean = false,
  auditLogRepository?: AuditLogRepository,
  readRepository?: GenealogyGraphRepository, // ← Optional read replica
)
```

**Production Setup:**
```bash
MONGODB_URI=mongodb://primary:27017
MONGODB_READ_URI=mongodb://replica:27017  # Optional
```

### Caching Strategy (Future)

The current implementation does **not** cache results. Future optimizations could add:
- HTTP Cache-Control headers (e.g., `max-age=60`)
- Redis-based DTO caching with tree version as cache key
- Invalidation on mutations (via audit log triggers)

**Not implemented yet** - prioritize correctness over performance.

---

## Migration Path to v2

When breaking changes are needed:

1. Create new DTO interface `TreeRenderDTOv2`
2. Add version negotiation via query param: `?version=v2`
3. Maintain v1 endpoint for backward compatibility
4. Update [READ_API_CONTRACT.md](./READ_API_CONTRACT.md) with deprecation timeline
5. Migrate frontend clients incrementally

**Versioning Strategy:**
- v1 = Current implementation (displayName, no metadata)
- v2 = Could add: birth/death dates, gender, relationship metadata
- v3 = Could add: privacy controls, computed fields, pagination

---

## Monitoring and Observability

### Metrics to Track

1. **Response time** (p50, p95, p99)
2. **Error rate** (404 vs 500)
3. **Request rate** (by tree size)
4. **Authorization failures** (403 rate)

### Logging

The implementation logs errors via:
```typescript
console.warn('Audit log append failed', err);
```

**Production:** Integrate with structured logging (e.g., Winston, Pino)

---

## References

- **API Endpoint:** `GET /trees/:treeId/render-data`
- **Controller:** `backend/src/presentation/controllers/genealogy.controller.ts`
- **Service:** `backend/src/application/services/genealogy-application.service.ts`
- **DTO Types:** `backend/src/application/dtos/tree-render.dto.ts`
- **Tests:** `backend/test/tree-render.e2e.spec.ts`
- **Contract:** [READ_API_CONTRACT.md](./READ_API_CONTRACT.md)
- **Traversal Semantics:** [TREE_RENDER_TRAVERSAL.md](./TREE_RENDER_TRAVERSAL.md)

---

**Last Updated:** December 22, 2025  
**Implementation Status:** ✅ Complete and tested
