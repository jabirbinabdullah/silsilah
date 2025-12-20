# Domain Model: Genealogy System (V1)

## Overview

This document defines the core domain model for the genealogy system using domain-driven design principles.

**Key Principle:** `GenealogyGraph` is the **sole aggregate root**. `Person` and `Relationship` are internal entities with no external identity. All access and mutations flow through the aggregate boundary.

---

## 1. PERSON ENTITY (Internal to GenealogyGraph Aggregate)

### Identity

```
PersonId uniquely identifies a person within a single GenealogyGraph.
PersonId is NOT globally unique—only unique within its parent aggregate (tree).

Example: PersonId = "P-0001" within tree "FamilySmith"
         PersonId = "P-0001" within tree "FamilyJones" (different person, same ID)
```

### Fields

```
PersonId          : string (non-empty, immutable)
Name              : string (non-empty, max 255 chars)
Gender            : enum { MALE, FEMALE, UNKNOWN }
BirthDate         : Date? (optional; null = unknown)
BirthPlace        : string? (optional; null = unknown)
DeathDate         : Date? (optional; null = unknown)
```

### Invariants

#### **I1: Identity Immutability** [HARD-ENFORCED]
```
PersonId cannot change after Person is created.
Once created, a Person's identity is fixed.

Enforcement: PersonId is set only in constructor; no setter exists.
Violation: Impossible by design.
```

#### **I2: Name Requirement** [HARD-ENFORCED]
```
Name must not be empty or whitespace-only.
Name must not exceed 255 characters.

Enforcement: Constructor and setName() validate before assignment.
Violation: Operation rejected with validation error.
```

#### **I3: Gender Validity** [HARD-ENFORCED]
```
Gender must be one of: MALE, FEMALE, UNKNOWN.
If gender is unknown, it MUST be explicitly set to UNKNOWN (not null).

Enforcement: Enum constraint at type level; no null value possible.
Violation: Impossible by design.
```

#### **I4: Date Consistency** [HARD-ENFORCED]
```
IF BirthDate is set AND DeathDate is set:
   DeathDate > BirthDate (person cannot die before birth)

IF BirthDate is null:
   DeathDate may or may not be set (birth date unknown, death date known is allowed)

Enforcement: setBirthDate() and setDeathDate() validate before assignment.
Violation: Operation rejected with validation error.
```

#### **I5: No External Relationships Within Entity** [HARD-ENFORCED]
```
Person does NOT hold references to parent, child, or spouse within its own state.
Relationships are managed exclusively by GenealogyGraph aggregate.
Person is completely decoupled from its graph position.

Enforcement: Structural design; Person class has no relationship fields.
Violation: Impossible by design.
```

### Methods

#### Mutation Methods

```
class Person

    constructor(personId: PersonId, name: string, gender: Gender)
        require: personId is non-empty [HARD-ENFORCED]
        require: name is non-empty and ≤ 255 chars [HARD-ENFORCED]
        require: gender is MALE | FEMALE | UNKNOWN [HARD-ENFORCED]
        create immutable Person with birthDate = null, deathDate = null
        return: new Person instance

    setName(newName: string) -> Person
        require: newName is non-empty and ≤ 255 chars [HARD-ENFORCED]
        return: new Person with updated name
        (immutable; does not modify this)

    setBirthDate(date: Date) -> Person
        require: if deathDate exists, date < deathDate [HARD-ENFORCED]
        return: new Person with updated birthDate
        (immutable; does not modify this)

    setBirthPlace(place: string) -> Person
        require: place is non-empty or null [HARD-ENFORCED]
        return: new Person with updated birthPlace
        (immutable; does not modify this)

    setDeathDate(date: Date) -> Person
        require: if birthDate exists, date > birthDate [HARD-ENFORCED]
        return: new Person with updated deathDate
        (immutable; does not modify this)
```

#### Query Methods

```
    getPersonId() -> PersonId
        return: immutable PersonId

    getName() -> string
        return: person's full name

    getGender() -> Gender
        return: MALE, FEMALE, or UNKNOWN

    getBirthDate() -> Date?
        return: birth date or null if unknown

    getBirthPlace() -> string?
        return: birth place or null if unknown

    getDeathDate() -> Date?
        return: death date or null if unknown

    getAge(relativeTo: Date) -> int?
        if birthDate is null: return null
        if deathDate is not null: return (deathDate - birthDate) in years
        if deathDate is null: return (relativeTo - birthDate) in years
        return: age in years, or null if birthDate unknown
```

---

## 2. RELATIONSHIP ENTITY (Internal to GenealogyGraph Aggregate, Value Object)

### Identity

```
Relationships are identified by their constituent parts:
- (parentId, childId) for parent-child relationships
- (spouseId1, spouseId2) for spouse relationships

Relationships have no separate identity; they exist only through their ends.
```

### Fields

```
ParentId   : PersonId? (nullable; null for spouse relationships)
ChildId    : PersonId? (nullable; null for spouse relationships)
SpouseId   : PersonId? (nullable; null for parent-child relationships)
Type       : enum { PARENT_CHILD, SPOUSE }
```

### Invariants

#### **R1: Exactly One Relationship Type** [HARD-ENFORCED]
```
IF Type = PARENT_CHILD:
   ParentId must not be null
   ChildId must not be null
   SpouseId must be null
   ParentId ≠ ChildId

IF Type = SPOUSE:
   SpouseId must not be null
   ParentId must be null
   ChildId must be null

Enforcement: Constructor enforces via overloading and validation.
Violation: Impossible by design; each constructor sets exactly one type.
```

#### **R2: No Self-Relationships** [HARD-ENFORCED]
```
PARENT_CHILD: ParentId ≠ ChildId
   (A person cannot be their own parent or child)

SPOUSE: spouseId ≠ the person it refers to
   (Implicit; enforced at aggregate boundary)

Enforcement: Constructor validation for PARENT_CHILD; 
             aggregate enforces for SPOUSE.
Violation: Operation rejected with validation error.
```

#### **R3: Directionality for Parent-Child** [HARD-ENFORCED]
```
PARENT_CHILD relationships are directional: parentId → childId
No reverse relationship should exist: childId → parentId is forbidden.

Enforcement: Enforced by GenealogyGraph.addParentChildRelationship().
Violation: Duplicate check prevents reverse relationship.
```

#### **R4: Age Consistency** [SOFT-VALIDATED]
```
IF both person.birthDate and parent.birthDate are known:
   parent.birthDate < person.birthDate
   (Parent must be born before child)

This is NOT enforced by Relationship alone; validated at aggregate level.

Enforcement: GenealogyGraph.addParentChildRelationship() and 
             GenealogyGraph.updatePerson() check ages before state change.
Violation: Operation rejected with validation error (soft validation; 
           may warn instead of reject in future versions).
```

### Methods

#### Mutation Methods

```
class Relationship

    constructor(parentId: PersonId, childId: PersonId) -> Relationship
        require: parentId ≠ null [HARD-ENFORCED]
        require: childId ≠ null [HARD-ENFORCED]
        require: parentId ≠ childId [HARD-ENFORCED]
        create Relationship with Type = PARENT_CHILD, SpouseId = null
        return: new PARENT_CHILD Relationship

    constructor(spouse1Id: PersonId, spouse2Id: PersonId) -> Relationship
        require: spouse1Id ≠ null [HARD-ENFORCED]
        require: spouse2Id ≠ null [HARD-ENFORCED]
        require: spouse1Id ≠ spouse2Id [HARD-ENFORCED]
        create Relationship with Type = SPOUSE, ParentId = null, ChildId = null
        return: new SPOUSE Relationship
        Note: order doesn't matter for spouses; both directions equivalent
```

#### Query Methods

```
    getType() -> RelationType
        return: PARENT_CHILD or SPOUSE

    getParentId() -> PersonId?
        return: parent id for PARENT_CHILD, null for SPOUSE

    getChildId() -> PersonId?
        return: child id for PARENT_CHILD, null for SPOUSE

    getSpouseId() -> PersonId?
        return: spouse id for SPOUSE, null for PARENT_CHILD

    getOtherPerson(personId: PersonId) -> PersonId
        if Type = PARENT_CHILD and personId = ParentId: return ChildId
        if Type = PARENT_CHILD and personId = ChildId: return ParentId
        if Type = SPOUSE: return the other SpouseId (bidirectional)
        return: the other person in this relationship

    isDirectedFrom(person1Id: PersonId, person2Id: PersonId) -> bool
        if Type = PARENT_CHILD: return ParentId = person1Id AND ChildId = person2Id
        if Type = SPOUSE: return false (spouses are undirected)
        return: true if relationship is directed from person1 to person2

    equals(other: Relationship) -> bool
        if Type = PARENT_CHILD:
            return ParentId = other.ParentId AND ChildId = other.ChildId
        if Type = SPOUSE:
            return (SpouseId₁ = other.SpouseId₁ AND SpouseId₂ = other.SpouseId₂)
                   OR (SpouseId₁ = other.SpouseId₂ AND SpouseId₂ = other.SpouseId₁)
        return: true if relationships are equivalent
```

---

## 3. GENEALOGYAGGREGATE ROOT (The Only Aggregate Root)

### Identity

```
GenealogyGraphId identifies a single family tree.
GenealogyGraphId is globally unique (across all trees).

Example: GenealogyGraphId = "tree-smith-family-2024"

Invariant: One GenealogyGraph = One family tree
           One family tree = One GenealogyGraph
```

### Composition

```
GenealogyGraph contains and manages:
  - Set of Person entities (internal, keyed by PersonId)
    → No external code can access these directly
  - Set of Relationship entities (internal, keyed by relationship endpoints)
    → No external code can access these directly
  - RootPersonId (optional; may be null initially, set to designate root)

All access goes through GenealogyGraph methods.
All mutations are atomic: load → validate all invariants → persist or reject.
```

### Invariants

#### **G1: DAG Structure (No Circular Ancestry)** [HARD-ENFORCED]
```
The parent-child relationships form a directed acyclic graph.

Forbidden patterns:
  - Person A → Child B → Grandchild C → Great-Grandchild A (cycle)
  - Person A → Child A (self-cycle)
  - Any cycle where a person appears as both ancestor AND descendant

Enforcement: wouldCreateCycle() is called before any addParentChildRelationship().
             DFS-based cycle detection validates the entire graph after add.
Violation: Operation rejected; relationship not added. Error message returned.
```

#### **G2: Maximum Two Biological Parents** [HARD-ENFORCED]
```
FOR each person ∈ GenealogyGraph:
    count(relationships where childId = person AND Type = PARENT_CHILD) ≤ 2

Violation: Attempting to add a third parent-child relationship is rejected.

Enforcement: Parent count check in addParentChildRelationship() before state change.
Violation: Operation rejected; relationship not added. Error message returned.
```

#### **G3: Relationship Uniqueness** [HARD-ENFORCED]
```
A given relationship (edge) may exist at most once.

FOR PARENT_CHILD: No duplicate (parentId, childId) pairs
FOR SPOUSE: No duplicate spouse pairs (both directions counted as same)

Enforcement: Duplicate check in addParentChildRelationship() and addSpouseRelationship().
Violation: Operation rejected or treated as idempotent (no error if already exists).
```

#### **G4: Referenced Persons Must Exist** [HARD-ENFORCED]
```
FOR each Relationship ∈ GenealogyGraph:
    IF Type = PARENT_CHILD:
        ParentId must refer to a Person ∈ GenealogyGraph
        ChildId must refer to a Person ∈ GenealogyGraph
    IF Type = SPOUSE:
        SpouseId must refer to a Person ∈ GenealogyGraph

Orphaned relationships (referencing non-existent persons) forbidden.
Removed persons must cascade-remove their relationships.

Enforcement: Validation at aggregate construction (hydration from DB).
             Cascade-delete in removePerson().
Violation: Violation detected in validateInvariants(); defensive check only.
```

#### **G5: Person Connectivity (Every Person Has a Relationship)** [SOFT-VALIDATED]
```
FOR each person ∈ GenealogyGraph:
    count(relationships where person ∈ {parentId, childId, spouseId}) ≥ 1

Isolated persons (no relationships) are not allowed.
Exception: Root person may be temporarily isolated during bulk operations.

Enforcement: Validation in removeRelationship(); warn if person becomes isolated.
             Defensive check in validateInvariants().
Violation: Detected but may not strictly reject in v1 (log warning).
           Future versions may enforce strictly.
```

#### **G6: Root Person Validity** [SOFT-VALIDATED]
```
IF RootPersonId is set:
    RootPersonId must refer to a Person ∈ GenealogyGraph
    
IF a Root Person is removed:
    RootPersonId is set to null (or automatically reassigned)

Enforcement: Validation in setRoot() before assignment.
             Cascade in removePerson().
Violation: Operation rejected with validation error, or auto-reassigned.
```

#### **G7: Age Consistency Across Family** [SOFT-VALIDATED]
```
FOR each PARENT_CHILD relationship:
    parent ← Person with ParentId
    child ← Person with ChildId
    
    IF both person.birthDate are known:
        parent.birthDate < child.birthDate (parent older than child)
    
    IF parent.deathDate is known AND child.birthDate is known:
        parent.deathDate may be either before or after child.birthDate
        (parents can die; children can be born posthumously in records)

Enforcement: agesConsistent() checked in addParentChildRelationship() and updatePerson().
Violation: Operation rejected with validation error (soft validation; 
           may warn instead in future versions for data quality scenarios).
```

---

## 4. GENEALOGYAGGREGATE ROOT: Methods

### Mutation Methods (Write Operations)

```
class GenealogyGraph

    constructor(graphId: GenealogyGraphId) -> GenealogyGraph
        require: graphId is non-empty [HARD-ENFORCED]
        create empty GenealogyGraph with no persons, no relationships
        RootPersonId ← null
        return: new GenealogyGraph instance

    addPerson(person: Person) -> Result<Unit>
        require: person.PersonId not already in this.Persons [HARD-ENFORCED]
        require: person is already fully constructed (all invariants satisfied)
        
        Add person to this.Persons
        return: Result.Success
        
        Note: person is isolated (no relationships) until a relationship is added.
        Note: G5 allows this temporarily; must be connected before persistence.

    removePerson(personId: PersonId) -> Result<Unit>
        require: personId ∈ this.Persons [HARD-ENFORCED]
        
        Find all relationships involving personId
        Remove those relationships from this.Relationships
        Remove person from this.Persons
        If personId = RootPersonId: set RootPersonId = null
        return: Result.Success

    addParentChildRelationship(parentId: PersonId, childId: PersonId) 
        -> Result<Unit>
        
        require: parentId ∈ this.Persons [HARD-ENFORCED]
        require: childId ∈ this.Persons [HARD-ENFORCED]
        require: parentId ≠ childId [HARD-ENFORCED]
        
        // Check parent count invariant [HARD-ENFORCED]
        require: count(existing parent relationships for childId) < 2
        
        // Check for cycles [HARD-ENFORCED]
        require: wouldCreateCycle(parentId, childId) = false
        
        // Check for duplicate [HARD-ENFORCED]
        require: relationship (parentId → childId) not already exists
        
        // Check age consistency [SOFT-VALIDATED]
        parent ← this.Persons[parentId]
        child ← this.Persons[childId]
        require: agesConsistent(parent, child) = true
        
        relationship ← new Relationship(parentId, childId)
        Add relationship to this.Relationships
        return: Result.Success

    addSpouseRelationship(spouse1Id: PersonId, spouse2Id: PersonId) 
        -> Result<Unit>
        
        require: spouse1Id ∈ this.Persons [HARD-ENFORCED]
        require: spouse2Id ∈ this.Persons [HARD-ENFORCED]
        require: spouse1Id ≠ spouse2Id [HARD-ENFORCED]
        
        // Check for duplicate [HARD-ENFORCED]
        require: spouse relationship not already exists (both directions)
        
        relationship ← new Relationship(spouse1Id, spouse2Id)
        Add relationship to this.Relationships
        return: Result.Success

    removeRelationship(personId1: PersonId, personId2: PersonId) 
        -> Result<Unit>
        
        require: personId1 ∈ this.Persons [HARD-ENFORCED]
        require: personId2 ∈ this.Persons [HARD-ENFORCED]
        
        Find relationship between personId1 and personId2
        require: relationship exists
        
        Remove relationship from this.Relationships
        
        // After removal, check persons still have ≥ 1 relationship [SOFT-VALIDATED]
        if personId1 has no relationships: warn "Person isolated" (G5)
        if personId2 has no relationships: warn "Person isolated" (G5)
        
        return: Result.Success

    setRoot(personId: PersonId) -> Result<Unit>
        require: personId ∈ this.Persons OR personId = null [HARD-ENFORCED]
        
        RootPersonId ← personId
        return: Result.Success

    updatePerson(personId: PersonId, updatedPerson: Person) 
        -> Result<Unit>
        
        require: personId ∈ this.Persons [HARD-ENFORCED]
        require: updatedPerson.PersonId = personId [HARD-ENFORCED]
        require: updatedPerson satisfies all Person invariants [HARD-ENFORCED]
        
        // Check age consistency with all related persons [SOFT-VALIDATED]
        FOR each relationship involving personId:
            require: agesConsistent(updatedPerson, related person) = true
        
        this.Persons[personId] ← updatedPerson
        return: Result.Success
```

### Query Methods (Read Operations)

```
    getAncestors(personId: PersonId) -> List<PersonId>
        require: personId ∈ this.Persons
        
        ancestors ← empty set
        queue ← [personId]
        visited ← empty set
        
        while queue is not empty:
            current ← queue.dequeue()
            if current ∈ visited: continue
            visited.add(current)
            
            for each PARENT_CHILD relationship where childId = current:
                parent ← relationship.ParentId
                ancestors.add(parent)
                queue.enqueue(parent)
        
        return: list of ancestor PersonIds

    getDescendants(personId: PersonId) -> List<PersonId>
        require: personId ∈ this.Persons
        
        descendants ← empty set
        queue ← [personId]
        visited ← empty set
        
        while queue is not empty:
            current ← queue.dequeue()
            if current ∈ visited: continue
            visited.add(current)
            
            for each PARENT_CHILD relationship where parentId = current:
                child ← relationship.ChildId
                descendants.add(child)
                queue.enqueue(child)
        
        return: list of descendant PersonIds

    getGenerationLevel(personId: PersonId, rootId: PersonId) -> int?
        require: personId ∈ this.Persons
        require: rootId ∈ this.Persons
        
        if personId = rootId: return 0
        
        distance ← 0
        visited ← empty set
        queue ← [(rootId, 0)]
        
        while queue is not empty:
            (current, level) ← queue.dequeue()
            if current ∈ visited: continue
            visited.add(current)
            
            if current = personId: return level
            
            // Traverse downward (descendants)
            for each PARENT_CHILD relationship where parentId = current:
                child ← relationship.ChildId
                queue.enqueue((child, level + 1))
            
            // Traverse upward (ancestors)
            for each PARENT_CHILD relationship where childId = current:
                parent ← relationship.ParentId
                queue.enqueue((parent, level - 1))
        
        return: generation level relative to root, or null if unreachable

    getParents(personId: PersonId) -> List<PersonId>
        require: personId ∈ this.Persons
        
        parents ← empty list
        for each PARENT_CHILD relationship where childId = personId:
            parents.add(relationship.ParentId)
        
        return: list of parent PersonIds (0, 1, or 2 items)

    getChildren(personId: PersonId) -> List<PersonId>
        require: personId ∈ this.Persons
        
        children ← empty list
        for each PARENT_CHILD relationship where parentId = personId:
            children.add(relationship.ChildId)
        
        return: list of child PersonIds

    getSpouses(personId: PersonId) -> List<PersonId>
        require: personId ∈ this.Persons
        
        spouses ← empty list
        for each SPOUSE relationship involving personId:
            spouses.add(relationship.getOtherPerson(personId))
        
        return: list of spouse PersonIds

    getPerson(personId: PersonId) -> Person?
        require: personId is non-empty
        
        if personId ∈ this.Persons: return this.Persons[personId]
        return: null

    getRelationships(personId: PersonId) -> List<Relationship>
        require: personId ∈ this.Persons
        
        relationships ← empty list
        for each relationship where personId ∈ {parentId, childId, spouseId}:
            relationships.add(relationship)
        
        return: list of Relationships involving this person

    getAllPersons() -> List<Person>
        return: immutable list of all Persons in aggregate
        
    getAllRelationships() -> List<Relationship>
        return: immutable list of all Relationships in aggregate

    getRootPersonId() -> PersonId?
        return: currently designated root, or null if not set

    validateInvariants() -> List<String>
        """
        Returns empty list if all invariants satisfied.
        Returns list of violation descriptions if any invariant violated.
        """
        
        violations ← empty list
        
        // G1: DAG check [HARD-ENFORCED]
        if not isDAG(): violations.add("Cycle detected in ancestor relationships")
        
        // G2: Parent count check [HARD-ENFORCED]
        for each person ∈ this.Persons:
            if count(parents of person) > 2:
                violations.add(f"Person {person.PersonId} has >2 parents")
        
        // G3: Relationship uniqueness check [HARD-ENFORCED]
        seen ← empty set
        for each relationship ∈ this.Relationships:
            key ← relationship.canonical_key()
            if key ∈ seen: violations.add(f"Duplicate relationship: {key}")
            seen.add(key)
        
        // G4: Referenced persons check [HARD-ENFORCED]
        for each relationship ∈ this.Relationships:
            if relationship.Type = PARENT_CHILD:
                if relationship.ParentId not in this.Persons:
                    violations.add(f"Parent {relationship.ParentId} does not exist")
                if relationship.ChildId not in this.Persons:
                    violations.add(f"Child {relationship.ChildId} does not exist")
            if relationship.Type = SPOUSE:
                if relationship.SpouseId not in this.Persons:
                    violations.add(f"Spouse {relationship.SpouseId} does not exist")
        
        // G5: Connectivity check [SOFT-VALIDATED]
        for each person ∈ this.Persons:
            if count(relationships involving person) = 0:
                violations.add(f"Warning: Person {person.PersonId} is isolated")
        
        // G6: Root validity check [SOFT-VALIDATED]
        if RootPersonId ≠ null and RootPersonId not in this.Persons:
            violations.add(f"Root person {RootPersonId} does not exist")
        
        // G7: Age consistency check [SOFT-VALIDATED]
        for each PARENT_CHILD relationship:
            parent ← this.Persons[relationship.ParentId]
            child ← this.Persons[relationship.ChildId]
            if not agesConsistent(parent, child):
                violations.add(f"Warning: Age inconsistency between 
                                {parent.PersonId} (parent) and {child.PersonId} (child)")
        
        return: list of violation descriptions (empty if valid)
```

### Internal Helper Methods (Private)

```
    private wouldCreateCycle(parentId: PersonId, childId: PersonId) -> bool
        """
        Returns true if adding parentId → childId would create a cycle.
        """
        
        // If childId is already an ancestor of parentId, adding this edge would
        // create a cycle: parentId ← ... ← childId ← parentId
        
        return childId ∈ getAncestors(parentId)

    private agesConsistent(person1: Person, person2: Person) -> bool
        """
        For parent-child: parent must be born before child.
        Handles null dates gracefully (unknown = no constraint).
        """
        
        if person1.birthDate is null or person2.birthDate is null:
            return true  // Cannot validate with missing dates
        
        return person1.birthDate < person2.birthDate

    private isDAG() -> bool
        """
        Returns true if the graph is acyclic (no cycles).
        Uses DFS-based cycle detection on parent-child relationships.
        """
        
        for each person ∈ this.Persons:
            if hasCycleDFS(person, visited=empty set):
                return false
        
        return true

    private hasCycleDFS(personId: PersonId, visited: Set<PersonId>) 
        -> bool
        """
        Recursive DFS to detect if personId is reachable from any of its 
        descendants (which would indicate a cycle).
        """
        
        visited.add(personId)
        
        for each PARENT_CHILD relationship where parentId = personId:
            childId ← relationship.ChildId
            
            if childId = personId: return true  // Self-cycle
            if childId ∈ visited: return true   // Back edge = cycle
            
            if hasCycleDFS(childId, visited): return true
        
        visited.remove(personId)  // Backtrack
        return false
```

---

## 5. Aggregate Boundary Enforcement

### External Code Access Pattern

```
External Code (Application Layer, Presentation Layer)
    ↓
[Can ONLY call GenealogyGraph public methods]
    ↓
GenealogyGraph.addPerson(person)
GenealogyGraph.addParentChildRelationship(parentId, childId)
GenealogyGraph.updatePerson(personId, updatedPerson)
GenealogyGraph.getAncestors(personId)
GenealogyGraph.getPerson(personId)
[etc. - only public methods]
    ↓
[GenealogyGraph enforces ALL invariants before state change]
    ↓
[Internal: Person and Relationship modified only through aggregate]
    ↓
[Return Result<T> with success/failure]
    ↓
External Code receives response

---

NEVER allow external code to:
  ❌ person.setName() called directly (Person not exposed)
  ❌ relationship.ParentId modified directly (Relationship not exposed)
  ❌ Access to raw Persons/Relationships collection (immutable copy only)
  ❌ Partial updates (must load entire aggregate, modify, save entire)
  ❌ Create Person outside aggregate context
  ❌ Create Relationship outside aggregate context
```

---

## 6. Invariant Summary: Hard-Enforced vs Soft-Validated

| Level | Invariant | Category | Enforcement | Action on Violation |
|-------|-----------|----------|-------------|-------------------|
| **Person** | Non-empty name | HARD | Constructor + setter | Reject |
| **Person** | Valid gender | HARD | Enum constraint | Impossible |
| **Person** | Death > birth date | HARD | Setter validation | Reject |
| **Person** | Immutable identity | HARD | Constructor only | Impossible |
| **Person** | No rel. references | HARD | Structural design | Impossible |
| **Relationship** | Exactly one type | HARD | Constructor constraint | Impossible |
| **Relationship** | No self-rel. | HARD | Constructor validation | Reject |
| **Relationship** | Directionality | HARD | By design | Impossible |
| **Relationship** | Age consistency | SOFT | Aggregate validation | Reject (warn) |
| **Graph** | DAG (no cycles) | HARD | DFS before add | Reject |
| **Graph** | ≤ 2 parents | HARD | Count check before add | Reject |
| **Graph** | Rel. uniqueness | HARD | Duplicate check | Reject/Idempotent |
| **Graph** | Referenced exist | HARD | Validation on persist | Reject |
| **Graph** | Person connected | SOFT | Check on remove | Warn |
| **Graph** | Root validity | SOFT | Validation before set | Reject/Reassign |
| **Graph** | Age consistency | SOFT | Check before mutations | Reject (warn) |

---

## 7. Aggregate Root Characteristics

| Characteristic | Status |
|---|---|
| **Only Aggregate Root** | ✅ GenealogyGraph exclusively |
| **Encapsulates internal entities** | ✅ Person and Relationship private |
| **Enforces invariants** | ✅ All 7 graph invariants enforced |
| **Atomic transactions** | ✅ Load → validate → persist or reject |
| **Immutable boundaries** | ✅ No direct field access |
| **Explicit external identity** | ✅ GenealogyGraphId globally unique |
| **Clear separation of concerns** | ✅ Mutations vs queries explicitly separated |

---

## 8. Version 1 Scope Confirmation

### In Scope for V1
✅ GenealogyGraph aggregate with internal Person and Relationship entities  
✅ DAG integrity validation (hard-enforced)  
✅ Invariant enforcement (hard-enforced: cycles, parent count, uniqueness, age)  
✅ Graph queries (ancestors, descendants, generation levels)  
✅ Transaction-safe mutations (atomic load → validate → persist)  
✅ Defensive validation (soft validation for data quality)  

### Explicitly Deferred
❌ Domain events (events, audit trail)  
❌ Temporal relationships (history, divorce tracking)  
❌ Complex relationship types (siblings, cousins, in-laws)  
❌ Lazy loading for >5K nodes  
❌ GEDCOM import (CSV only)  
❌ Multi-user collaboration  

