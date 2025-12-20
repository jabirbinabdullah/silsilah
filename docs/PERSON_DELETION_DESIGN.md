# Person Deletion: Design Notes & Future Enhancements

## Current Implementation (V1)

The smoke test validates the current behavior: **`removePerson()` throws `PersonHasRelationshipsError` if the person has any relationships.**

### Why This Design?

**Explicit Constraint:** Prevents orphaned relationships by requiring explicit removal first.
- Must call `removeRelationship(personId1, personId2)` before deleting either person.
- Guarantees no partial deletions or cascading side-effects.
- Domain error is clear and actionable to the caller.

### Workflow Example

```typescript
// Current approach: explicit cleanup
const aggregate = await repo.load('tree-123');

// Try to delete person with spouse relationship
aggregate.removePerson('person-b');  // ❌ throws PersonHasRelationshipsError

// Must remove relationship first
aggregate.removeRelationship('person-a', 'person-b');
aggregate.removePerson('person-b');  // ✅ succeeds
aggregate.removePerson('person-a');  // ✅ succeeds
```

### Advantages
- **Explicit intent:** Caller must consciously choose to break relationships.
- **Safety:** No accidental cascading deletes.
- **Auditability:** Each relationship removal is a separate operation.
- **Simple domain logic:** No hidden side-effects in `removePerson()`.

## Future Enhancement: Cascading Delete

### Proposed Behavior

Add optional `cascade` flag to `removePerson()`:

```typescript
removePerson(personId: string, cascade?: boolean): void
```

- If `cascade = false` (default): Current behavior—throw if relationships exist.
- If `cascade = true`: Automatically remove all relationships before deleting person.

### Implementation

```typescript
removePerson(personId: string, cascade: boolean = false): void {
  this.requirePerson(personId);

  const hasRelationships = this.hasParentChildRelationships(personId) 
    || this.hasSpouseRelationships(personId);

  if (hasRelationships && !cascade) {
    throw new PersonHasRelationshipsError(
      `cannot delete person ${personId}: person has existing relationships`
    );
  }

  if (cascade && hasRelationships) {
    // Remove all parent-child edges
    for (const edge of this.getParentChildEdgesSnapshot()) {
      if (edge.parentId === personId || edge.childId === personId) {
        this.removeRelationship(edge.parentId, edge.childId);
      }
    }
    // Remove all spouse edges
    for (const edge of this.getSpouseEdgesSnapshot()) {
      if (edge.spouse1Id === personId || edge.spouse2Id === personId) {
        this.removeRelationship(edge.spouse1Id, edge.spouse2Id);
      }
    }
  }

  this.persons.delete(personId);
}
```

### Advantages
- **Flexibility:** Caller chooses explicit or cascading behavior.
- **Bulk operations:** Enable CSV import or tree restructuring without manual relationship removal.
- **Backward compatible:** Default `cascade = false` maintains current strict behavior.

### Considerations
- **Audit trail:** Cascading deletes may be harder to audit. Consider logging.
- **Domain semantics:** Do cascading deletes match genealogy semantics? (Usually "no"—removing a person shouldn't erase their parent-child relationships to others.)
- **Timing:** Consider implementing in V2 when audit logging is added.

## Smoke Test Validation

The smoke test confirms the current (non-cascading) implementation:

```
✅ PHASE 9: Attempt to delete person B (has spouse edge)
✅ Correctly rejected: cannot delete person person-b: person has existing relationships

✅ PHASE 10: Delete person C (no relationships)
✅ Person C deleted
```

This validates:
- ✅ Enforcement is working as designed
- ✅ Error message is clear
- ✅ Persons without relationships delete cleanly

## Recommendation

**Keep V1 as-is.** The explicit constraint is safer and matches the domain's intent:
- Genealogical relationships are meaningful; removing a person shouldn't automatically sever their genetic ties to other people.
- Explicit removal requires conscious decision-making by the caller.
- Add cascading as an opt-in feature in V2 if bulk operations become necessary.
