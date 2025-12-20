# API Contracts (V1)

This document defines the HTTP API surface for the genealogy system, aligned with:
- GENEALOGY_REQUIREMENTS.md
- DOMAIN_MODEL.md (GenealogyGraph is the only aggregate root)
- TREE_VISUALIZATION_CONTRACT.md (TreeVisualizationDTO)

**Principles**
- All mutations are commands on `GenealogyGraph` (aggregate root).
- Visualization endpoints return **tree/graph structures**, not flat person lists.
- Responses are immutable views; frontend must not infer or reconstruct graphs.
- Errors map to invariant violations (hard vs soft) with explicit error codes.

---

## 1) Authentication & Roles
- Roles: `Admin`, `Editor`, `Public` (read-only)
- Auth: Bearer token (required for Admin/Editor); Public endpoints are read-only.

---

## 2) Endpoint List (Grouped by Capability)

### Tree Rendering (Visualization)
1. `GET /api/trees/{treeId}/render`
   - Query: `rootPersonId` (required), `viewMode` = `VERTICAL|HORIZONTAL|LIST` (default `VERTICAL`)
   - Returns: `TreeVisualizationDTO` (see TREE_VISUALIZATION_CONTRACT.md)
   - Constraint: No flat lists; always returns full tree/graph structure from root.

### Navigation (Ancestors / Descendants)
2. `GET /api/trees/{treeId}/ancestors`
   - Query: `personId` (required)
   - Returns: `{ personId, ancestors: PersonDTO[] }` (ancestors ordered outward)
3. `GET /api/trees/{treeId}/descendants`
   - Query: `personId` (required)
   - Returns: `{ personId, descendants: PersonDTO[] }` (descendants ordered outward)
   - Note: These are read models for navigation, not for visualization layout.

### Person & Relationship Commands
4. `POST /api/trees/{treeId}/persons`
   - Body: `CreatePersonRequest`
   - Returns: `PersonDTO`
5. `PATCH /api/trees/{treeId}/persons/{personId}`
   - Body: `UpdatePersonRequest`
   - Returns: `PersonDTO`
6. `DELETE /api/trees/{treeId}/persons/{personId}`
   - Returns: `204 No Content`

7. `POST /api/trees/{treeId}/relationships/parent-child`
   - Body: `CreateParentChildRequest`
   - Returns: `RelationshipDTO` (parent-child)
8. `POST /api/trees/{treeId}/relationships/spouse`
   - Body: `CreateSpouseRequest`
   - Returns: `RelationshipDTO` (spouse)
9. `DELETE /api/trees/{treeId}/relationships`
   - Query: `personId1`, `personId2`
   - Returns: `204 No Content`

### Root Selection
10. `POST /api/trees/{treeId}/root`
    - Body: `{ personId: string | null }`
    - Returns: `{ rootPersonId: string | null }`

### Import (CSV)
11. `POST /api/trees/{treeId}/import/csv`
    - Body: multipart/form-data with `file`
    - Returns: `{ importedPersons: int, importedRelationships: int }`
    - Note: GEDCOM is deferred (future scope).

---

## 3) Schemas (Requests / Responses)

### CreatePersonRequest
```json
{
  "personId": "P001",          // required, unique within tree
  "name": "Alice Smith",       // required, non-empty
  "gender": "FEMALE",          // MALE|FEMALE|UNKNOWN
  "birthDate": "1945-03-01",   // optional ISO8601
  "birthPlace": "Boston",      // optional
  "deathDate": null              // optional ISO8601
}
```

### UpdatePersonRequest
```json
{
  "name": "Alice Johnson",     // optional
  "gender": "FEMALE",          // optional
  "birthDate": "1945-03-01",   // optional
  "birthPlace": "Boston",      // optional
  "deathDate": "2020-07-01"    // optional
}
```

### CreateParentChildRequest
```json
{
  "parentId": "P010",          // required
  "childId": "P011"            // required
}
```

### CreateSpouseRequest
```json
{
  "spouse1Id": "P020",         // required
  "spouse2Id": "P021"          // required
}
```

### RelationshipDTO (generic)
```json
{
  "type": "PARENT_CHILD",      // or "SPOUSE"
  "parentId": "P010",          // present if PARENT_CHILD
  "childId": "P011",           // present if PARENT_CHILD
  "spouse1Id": null,            // present if SPOUSE
  "spouse2Id": null,            // present if SPOUSE
  "lineStyle": "SOLID"         // rendering hint (optional)
}
```

### TreeVisualizationDTO
- See [TREE_VISUALIZATION_CONTRACT.md](TREE_VISUALIZATION_CONTRACT.md) for the full structure.
- Returned by `/render`; never a flat list.

---

## 4) Request/Response Examples

### 4.1 Render Tree
**GET** `/api/trees/family-smith/render?rootPersonId=P001&viewMode=VERTICAL`

Response `200 OK` (truncated):
```json
{
  "treeId": "family-smith",
  "rootPersonId": "P001",
  "viewMode": "VERTICAL",
  "root": { "personId": "P001", "generationLevel": 0, ... },
  "allNodes": { "P001": { ... }, "P002": { ... } },
  "generations": { "0": ["P001"], "1": ["P002", "P003"] },
  "generationRange": { "minLevel": 0, "maxLevel": 2, "count": 3 },
  "bounds": { "width": 800, "height": 600, "unitWidth": 150, "unitHeight": 100 },
  "personCount": 12,
  "relationshipCount": 14
}
```

### 4.2 Create Person
**POST** `/api/trees/family-smith/persons`
```json
{
  "personId": "P050",
  "name": "Jane Smith",
  "gender": "FEMALE",
  "birthDate": "1980-05-05",
  "birthPlace": "Denver",
  "deathDate": null
}
```
Response `201 Created`:
```json
{
  "personId": "P050",
  "name": "Jane Smith",
  "gender": "FEMALE",
  "birthDate": "1980-05-05",
  "birthPlace": "Denver",
  "deathDate": null,
  "displayLabel": "Jane Smith (b. 1980)"
}
```

### 4.3 Add Parent-Child
**POST** `/api/trees/family-smith/relationships/parent-child`
```json
{ "parentId": "P010", "childId": "P050" }
```
Response `201 Created`:
```json
{
  "type": "PARENT_CHILD",
  "parentId": "P010",
  "childId": "P050",
  "lineStyle": "SOLID"
}
```

### 4.4 Set Root Person
**POST** `/api/trees/family-smith/root`
```json
{ "personId": "P050" }
```
Response `200 OK`:
```json
{ "rootPersonId": "P050" }
```

---

## 5) Error Model

### Error Envelope
```json
{
  "error": "<ERROR_CODE>",
  "message": "Human-friendly description",
  "details": { ... }  // optional, invariant-specific context
}
```

### HTTP Status Mapping
- `400 Bad Request`: Validation or invariant violation (client-correctable)
- `401 Unauthorized`: Missing/invalid token
- `403 Forbidden`: Role not allowed (e.g., Public trying to write)
- `404 Not Found`: Tree or person not found
- `409 Conflict`: Attempt to violate hard invariant where retry is possible (e.g., duplicate edge)
- `500 Internal Server Error`: Unexpected server failure

### Error Codes → Invariants

**Hard-Enforced (block operation)**
- `CYCLE_DETECTED` → G1 (DAG) violation
- `PARENT_LIMIT_EXCEEDED` → G2 (max 2 parents)
- `DUPLICATE_RELATIONSHIP` → G3 (relationship uniqueness)
- `MISSING_PERSON_REFERENCE` → G4 (referenced persons must exist)
- `INVALID_PERSON_ID` → Person identity empty/invalid
- `INVALID_NAME` → Person name empty/too long
- `INVALID_GENDER` → Not in {MALE,FEMALE,UNKNOWN}
- `INVALID_DATES` → DeathDate ≤ BirthDate (I4)
- `SELF_RELATIONSHIP` → R2 (self-parent or self-spouse)

**Soft-Validated (warn/reject depending on policy; v1 rejects for consistency)**
- `AGE_INCONSISTENCY` → G7 (parent born after child); typically `400`
- `ISOLATED_PERSON` → G5 (person has no relationships); warning or `409` if disallowed at persist time
- `INVALID_ROOT` → G6 (root does not exist); `400`

**Authorization**
- `UNAUTHORIZED` → 401
- `FORBIDDEN` → 403

**Not Found**
- `TREE_NOT_FOUND` → `treeId` unknown
- `PERSON_NOT_FOUND` → personId unknown in tree
- `RELATIONSHIP_NOT_FOUND` → edge not present when deleting

---

## 6) Notes on Visualization Endpoints

- No flat person list is exposed for visualization; only `render` returns `TreeVisualizationDTO`.
- `ancestors` and `descendants` endpoints return linear lists for navigation, not for layout.
- Frontend must not reconstruct graphs; all edges/nodes for rendering are in `TreeVisualizationDTO`.

---

## 7) Role Matrix (Summary)

| Endpoint | Admin | Editor | Public |
|----------|-------|--------|--------|
| GET /render | ✔ | ✔ | ✔ |
| GET /ancestors | ✔ | ✔ | ✔ |
| GET /descendants | ✔ | ✔ | ✔ |
| POST /persons | ✔ | ✔ | ✖ |
| PATCH /persons/{id} | ✔ | ✔ | ✖ |
| DELETE /persons/{id} | ✔ | ✔ | ✖ |
| POST /relationships/* | ✔ | ✔ | ✖ |
| DELETE /relationships | ✔ | ✔ | ✖ |
| POST /root | ✔ | ✔ | ✖ |
| POST /import/csv | ✔ | ✔ | ✖ |

---

## 8) Versioning
- API Version: v1 (breaking changes require /v2 namespace)
- DTO changes: additive fields are backward compatible; removals or structural changes require version bump.

---

## 9) Performance & Size
- Typical render payload (500 persons): ~1.5 MB JSON (see TREE_VISUALIZATION_CONTRACT.md).
- For trees >5k persons (not primary v1 target), consider server-side pagination by generation or subtree; not part of v1 contract.

