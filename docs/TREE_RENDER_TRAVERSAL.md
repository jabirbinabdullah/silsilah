# Traversal Semantics — getTreeRenderData(treeId)

## Purpose

`getTreeRenderData` returns a structural representation of a genealogy graph suitable for visualization.

**It answers only this question:**
> "What persons exist in this tree, and what explicit relationships connect them?"

**It does not answer:**
- How the tree should look
- What generation someone belongs to (unless explicitly included later)
- What relationships can be inferred

---

## 1. Traversal Scope

**Rule:**  
The traversal scope is the entire `GenealogyGraph` aggregate for the given `treeId`.

**Implications:**
- All persons stored in the aggregate are eligible to appear as nodes.
- No depth limit is applied.
- Orphans (persons with no parents and no children) are included.

**Explicit Non-Behavior:**
- No pagination
- No subtree filtering
- No "focus person" semantics

This keeps the query:
- Predictable
- Cacheable
- Free of UI-driven parameters

---

## 2. Root Semantics

**Definition:**  
A root is any person who has no recorded parent in the aggregate.

**Rules:**
- Multiple roots are allowed.
- Root status is not explicitly encoded in the DTO.
- Frontend may derive roots by inspecting `parentChildEdges`.

**Rationale:**
- Root selection is a presentation concern.
- Encoding roots server-side would introduce UI semantics.

---

## 3. Traversal Strategy

**Strategy:**  
Non-recursive enumeration, not tree-walking.

**Implementation-wise:**
- Nodes are collected by iterating over all persons.
- Edges are collected by iterating over all explicit relationships.

**Important Distinction:**  
This is **not**:
- DFS
- BFS
- Ancestor/descendant traversal

It is a **structural dump**, not a navigation query.

**This guarantees:**
- O(N + E) behavior
- No stack depth risk
- No ordering implications

---

## 4. Ordering Semantics

**Rule:**  
No ordering is guaranteed for:
- `nodes`
- `spouseEdges`
- `parentChildEdges`

**Determinism:**
- Output must be deterministic for the same stored snapshot.
- Determinism does not imply meaningful order.

**Acceptable examples:**
- Insertion order
- Internal map iteration order (if stable per snapshot)

**Unacceptable:**
- Randomized order
- Order dependent on runtime timing

**Frontend Responsibility:**
- UI must impose its own ordering if required.
- UI must not assume implicit hierarchy from array order.

---

## 5. Relationship Semantics

### Parent–Child Edges
- Represent explicitly recorded parent-child relationships only.
- No inferred parents.
- No transitive closure.
- Each edge means: "ParentId is a recorded parent of ChildId."

### Spouse Edges
- Represent explicit spouse relationships only.
- Symmetric by definition.
- No guarantee of marriage dates, duration, or ordering.

---

## 6. Defensive Behavior (Invariant Breach)

Even though invariants are enforced at write time, read logic must be defensive.

**If Corrupt Data Exists (Unexpected State):**

The traversal must:
- Return best-effort output
- Never throw due to structural inconsistency
- Never attempt to "repair" data

**Examples:**
- A parent reference to a missing person → edge omitted
- Duplicate edges → duplicates may be returned
- Cycles (should be impossible) → returned as-is

**Rationale:**
- Read paths must be resilient.
- Auditability > prettiness.
- Silent repair hides corruption.

---

## 7. Authorization Effects

**Rule:**  
Authorization is evaluated before traversal.

- If access is denied → request fails.
- If access is allowed → traversal operates on the full authorized snapshot.

**Explicitly Forbidden:**
- Partial redaction of nodes or edges for presentation reasons.
- Silent omission of "sensitive" persons.

**If future privacy rules are needed, they must:**
- Be explicit
- Trigger a contract version bump

---

## 8. Non-Goals (Reaffirmed)

`getTreeRenderData` does **not**:
- Compute generation depth
- Assign layout coordinates
- Infer ancestry or descendants
- Resolve display ordering
- Perform validation
- Expose domain internals
