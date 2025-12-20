import { InvalidRelationshipShapeError } from './errors';

export type RelationType = 'PARENT_CHILD' | 'SPOUSE';

export interface RelationshipProps {
  relationType: RelationType;
  parentId?: string | null;
  childId?: string | null;
  spouse1Id?: string | null;
  spouse2Id?: string | null;
}

export class Relationship {
  readonly relationType: RelationType;
  readonly parentId: string | null;
  readonly childId: string | null;
  readonly spouse1Id: string | null;
  readonly spouse2Id: string | null;

  private constructor(props: RelationshipProps) {
    this.relationType = props.relationType;
    this.parentId = props.parentId ?? null;
    this.childId = props.childId ?? null;
    this.spouse1Id = props.spouse1Id ?? null;
    this.spouse2Id = props.spouse2Id ?? null;
  }

  static parentChild(parentId: string, childId: string): Relationship {
    if (!parentId || !childId || parentId === childId) {
      throw new InvalidRelationshipShapeError('Invalid parent-child relationship');
    }
    return new Relationship({ relationType: 'PARENT_CHILD', parentId, childId });
  }

  static spouse(a: string, b: string): Relationship {
    if (!a || !b || a === b) {
      throw new InvalidRelationshipShapeError('Invalid spouse relationship');
    }
    const [spouse1Id, spouse2Id] = a <= b ? [a, b] : [b, a];
    return new Relationship({ relationType: 'SPOUSE', spouse1Id, spouse2Id });
  }
}
