// Domain placeholder contracts to allow application layer to compile.
// Replace with real domain implementations later. Keep this file framework-agnostic.

export interface PersonProps {
  personId: string;
  name: string;
  gender: 'MALE' | 'FEMALE' | 'UNKNOWN';
  birthDate?: Date | null;
  birthPlace?: string | null;
  deathDate?: Date | null;
}

export type ViewMode = 'VERTICAL' | 'HORIZONTAL' | 'LIST';

export interface RenderedTreeNode {
  personId: string;
  generationLevel: number;
}

export interface RenderedTreeEdge {
  relationType: 'PARENT_CHILD' | 'SPOUSE';
  parentId?: string | null;
  childId?: string | null;
  spouse1Id?: string | null;
  spouse2Id?: string | null;
}

export interface RenderedTree {
  rootPersonId: string;
  nodes: RenderedTreeNode[];
  edges: RenderedTreeEdge[];
  viewMode: ViewMode;
}

export interface GenealogyGraph {
  readonly treeId: string;

  addPerson(props: PersonProps): void;
  addParentChildRelationship(parentId: string, childId: string): void;
  addSpouseRelationship(spouseA: string, spouseB: string): void;
  removeRelationship(personId1: string, personId2: string): void;
  removePerson(personId: string): void;

  getPerson(personId: string): PersonProps | null;
  getAncestors(personId: string): string[];
  getDescendants(personId: string): string[];
  renderTree(rootPersonId: string, viewMode: ViewMode): RenderedTree;

  // Persistence snapshots
  getPersonsSnapshot(): PersonProps[];
  getParentChildEdgesSnapshot(): Array<{ parentId: string; childId: string }>;
  getSpouseEdgesSnapshot(): Array<{ spouse1Id: string; spouse2Id: string }>;
}

export interface GenealogyGraphFactory {
  create(treeId: string): GenealogyGraph;
}

export interface UserAccount {
  id: string;
  username: string;
  role: 'ADMIN' | 'EDITOR' | 'PUBLIC';
}
