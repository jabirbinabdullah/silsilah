// Application-level validation helpers (no business rules).
// - Enforce relationship row shape before persistence
// - Enforce canonical spouse ordering to satisfy unique constraints

export type RelationType = 'PARENT_CHILD' | 'SPOUSE';

export interface RelationshipShape {
  relationType: RelationType;
  parentId?: string | null;
  childId?: string | null;
  spouse1Id?: string | null;
  spouse2Id?: string | null;
}

export function enforceRelationshipShape(input: RelationshipShape): RelationshipShape {
  const { relationType } = input;
  if (relationType === 'PARENT_CHILD') {
    return {
      relationType,
      parentId: input.parentId ?? null,
      childId: input.childId ?? null,
      spouse1Id: null,
      spouse2Id: null,
    };
  }
  if (relationType === 'SPOUSE') {
    const [a, b] = canonicalSpouseOrder(input.spouse1Id ?? '', input.spouse2Id ?? '');
    return {
      relationType,
      parentId: null,
      childId: null,
      spouse1Id: a,
      spouse2Id: b,
    };
  }
  throw new Error('Unsupported relationType');
}

export function canonicalSpouseOrder(a: string, b: string): [string, string] {
  return a <= b ? [a, b] : [b, a];
}
