import { Person, PersonProps } from './person';
import { Relationship } from './relationship';
import {
  AgeInconsistencyError,
  CycleDetectedError,
  DuplicateRelationshipError,
  InvariantViolationError,
  ParentLimitExceededError,
  NotFoundError,
  PersonHasRelationshipsError,
} from './errors';

export type ViewMode = 'VERTICAL' | 'HORIZONTAL' | 'LIST';

interface RelationshipEdge {
  relationType: 'PARENT_CHILD' | 'SPOUSE';
  parentId?: string | null;
  childId?: string | null;
  spouse1Id?: string | null;
  spouse2Id?: string | null;
}

export interface RenderedTree {
  rootPersonId: string;
  nodes: Array<{ personId: string; generationLevel: number }>; // minimal placeholder
  edges: RelationshipEdge[];
  viewMode: ViewMode;
}

export class GenealogyGraph {
  readonly treeId: string;
  private persons: Map<string, Person> = new Map();
  private parentChildEdges: Set<string> = new Set();
  private spouseEdges: Set<string> = new Set();

  constructor(treeId: string) {
    if (!treeId || treeId.trim() === '') {
      throw new InvariantViolationError('treeId is required');
    }
    this.treeId = treeId;
  }

  addPerson(props: PersonProps): void {
    if (this.persons.has(props.personId)) {
      throw new InvariantViolationError('person already exists');
    }
    const person = new Person(props);
    this.persons.set(person.personId, person);
  }

  addParentChildRelationship(parentId: string, childId: string): void {
    this.requirePerson(parentId);
    this.requirePerson(childId);
    if (parentId === childId) {
      throw new InvariantViolationError('self relationship not allowed');
    }

    const key = this.parentChildKey(parentId, childId);
    if (this.parentChildEdges.has(key)) {
      throw new DuplicateRelationshipError('duplicate parent-child');
    }

    const parentCount = this.countParents(childId);
    if (parentCount >= 2) {
      throw new ParentLimitExceededError('child already has two parents');
    }

    this.ensureAgeConsistency(parentId, childId);

    // Cycle check: would adding edge create cycle?
    if (this.wouldCreateCycle(parentId, childId)) {
      throw new CycleDetectedError('adding relationship creates cycle');
    }

    this.parentChildEdges.add(key);
  }

  addSpouseRelationship(spouseA: string, spouseB: string): void {
    this.requirePerson(spouseA);
    this.requirePerson(spouseB);
    if (spouseA === spouseB) {
      throw new InvariantViolationError('self spouse not allowed');
    }
    const [a, b] = spouseA <= spouseB ? [spouseA, spouseB] : [spouseB, spouseA];
    const key = this.spouseKey(a, b);
    if (this.spouseEdges.has(key)) {
      throw new DuplicateRelationshipError('duplicate spouse relationship');
    }
    this.spouseEdges.add(key);
  }

  removeRelationship(personId1: string, personId2: string): void {
    // Try parent-child both directions
    const pc1 = this.parentChildKey(personId1, personId2);
    const pc2 = this.parentChildKey(personId2, personId1);
    if (this.parentChildEdges.delete(pc1) || this.parentChildEdges.delete(pc2)) {
      return;
    }
    // Try spouse (canonical ordering)
    const [a, b] = personId1 <= personId2 ? [personId1, personId2] : [personId2, personId1];
    const sp = this.spouseKey(a, b);
    if (this.spouseEdges.delete(sp)) {
      return;
    }
    throw new NotFoundError('relationship not found');
  }

  removePerson(personId: string): void {
    this.requirePerson(personId);

    // Check if person has any relationships
    const hasParentChildRelationships = this.hasParentChildRelationships(personId);
    const hasSpouseRelationships = this.hasSpouseRelationships(personId);

    if (hasParentChildRelationships || hasSpouseRelationships) {
      throw new PersonHasRelationshipsError(
        `cannot delete person ${personId}: person has existing relationships`,
      );
    }

    this.persons.delete(personId);
  }

  getPerson(personId: string): PersonProps | null {
    const p = this.persons.get(personId);
    if (!p) return null;
    return {
      personId: p.personId,
      name: p.name,
      gender: p.gender,
      birthDate: p.birthDate,
      birthPlace: p.birthPlace,
      deathDate: p.deathDate,
    };
  }

  getAncestors(personId: string): string[] {
    this.requirePerson(personId);
    const ancestors: Set<string> = new Set();
    const stack: string[] = [personId];
    const visited: Set<string> = new Set();

    while (stack.length) {
      const current = stack.pop() as string;
      if (visited.has(current)) continue;
      visited.add(current);
      for (const parent of this.parentsOf(current)) {
        if (!ancestors.has(parent)) {
          ancestors.add(parent);
          stack.push(parent);
        }
      }
    }
    return Array.from(ancestors);
  }

  getDescendants(personId: string): string[] {
    this.requirePerson(personId);
    const descendants: Set<string> = new Set();
    const stack: string[] = [personId];
    const visited: Set<string> = new Set();

    while (stack.length) {
      const current = stack.pop() as string;
      if (visited.has(current)) continue;
      visited.add(current);
      for (const child of this.childrenOf(current)) {
        if (!descendants.has(child)) {
          descendants.add(child);
          stack.push(child);
        }
      }
    }
    return Array.from(descendants);
  }

  renderTree(rootPersonId: string, viewMode: ViewMode): RenderedTree {
    this.requirePerson(rootPersonId);
    const levels = this.computeGenerationLevels(rootPersonId);
    const nodes = Array.from(levels.entries()).map(([personId, level]) => ({ personId, generationLevel: level }));
    const edges: RelationshipEdge[] = [];

    for (const key of this.parentChildEdges) {
      const [parentId, childId] = key.split('->');
      edges.push({ relationType: 'PARENT_CHILD', parentId, childId });
    }
    for (const key of this.spouseEdges) {
      const [a, b] = key.split('~');
      edges.push({ relationType: 'SPOUSE', spouse1Id: a, spouse2Id: b });
    }

    return { rootPersonId, nodes, edges, viewMode };
  }

  getPersonsSnapshot(): PersonProps[] {
    return Array.from(this.persons.values()).map((p) => ({
      personId: p.personId,
      name: p.name,
      gender: p.gender,
      birthDate: p.birthDate,
      birthPlace: p.birthPlace,
      deathDate: p.deathDate,
    }));
  }

  getParentChildEdgesSnapshot(): Array<{ parentId: string; childId: string }> {
    return Array.from(this.parentChildEdges).map((key) => {
      const [parentId, childId] = key.split('->');
      return { parentId, childId };
    });
  }

  getSpouseEdgesSnapshot(): Array<{ spouse1Id: string; spouse2Id: string }> {
    return Array.from(this.spouseEdges).map((key) => {
      const [spouse1Id, spouse2Id] = key.split('~');
      return { spouse1Id, spouse2Id };
    });
  }

  // Helpers
  private requirePerson(personId: string) {
    if (!this.persons.has(personId)) {
      throw new NotFoundError(`person ${personId} not found`);
    }
  }

  private parentChildKey(parentId: string, childId: string): string {
    return `${parentId}->${childId}`;
  }

  private spouseKey(a: string, b: string): string {
    return `${a}~${b}`;
  }

  private parentsOf(childId: string): string[] {
    const parents: string[] = [];
    for (const key of this.parentChildEdges) {
      const [p, c] = key.split('->');
      if (c === childId) parents.push(p);
    }
    return parents;
  }

  private childrenOf(parentId: string): string[] {
    const children: string[] = [];
    for (const key of this.parentChildEdges) {
      const [p, c] = key.split('->');
      if (p === parentId) children.push(c);
    }
    return children;
  }

  private countParents(childId: string): number {
    return this.parentsOf(childId).length;
  }

  private ensureAgeConsistency(parentId: string, childId: string) {
    const parent = this.persons.get(parentId)!;
    const child = this.persons.get(childId)!;
    if (parent.birthDate && child.birthDate && parent.birthDate >= child.birthDate) {
      throw new AgeInconsistencyError('parent must be older than child');
    }
  }

  private wouldCreateCycle(parentId: string, childId: string): boolean {
    // Detect if childId is already an ancestor of parentId
    const ancestorsOfParent = this.getAncestors(parentId);
    return ancestorsOfParent.includes(childId);
  }

  private computeGenerationLevels(rootId: string): Map<string, number> {
    const levels = new Map<string, number>();
    const queue: Array<{ id: string; level: number }> = [{ id: rootId, level: 0 }];
    const visited: Set<string> = new Set();

    while (queue.length) {
      const { id, level } = queue.shift() as { id: string; level: number };
      if (visited.has(id)) continue;
      visited.add(id);
      levels.set(id, level);

      for (const child of this.childrenOf(id)) {
        if (!visited.has(child)) queue.push({ id: child, level: level + 1 });
      }
      for (const parent of this.parentsOf(id)) {
        if (!visited.has(parent)) queue.push({ id: parent, level: level - 1 });
      }
    }

    return levels;
  }

  private hasParentChildRelationships(personId: string): boolean {
    for (const key of this.parentChildEdges) {
      const [parentId, childId] = key.split('->');
      if (parentId === personId || childId === personId) {
        return true;
      }
    }
    return false;
  }

  private hasSpouseRelationships(personId: string): boolean {
    for (const key of this.spouseEdges) {
      const [spouse1Id, spouse2Id] = key.split('~');
      if (spouse1Id === personId || spouse2Id === personId) {
        return true;
      }
    }
    return false;
  }
}
