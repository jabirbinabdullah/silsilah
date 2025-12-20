// Request DTOs (Plain interfaces, not classes)
export interface CreateFamilyTreeDto {
  treeId: string;
}

export interface CreatePersonDto {
  personId: string;
  name: string;
  gender: 'MALE' | 'FEMALE' | 'UNKNOWN';
  birthDate?: Date | null;
  birthPlace?: string | null;
  deathDate?: Date | null;
}

export interface EstablishParentChildDto {
  parentId: string;
  childId: string;
}

export interface EstablishSpouseDto {
  spouseA: string;
  spouseB: string;
}

export interface RemovePersonDto {
  personId: string;
}

export interface RemoveRelationshipDto {
  personId1: string;
  personId2: string;
}

export interface RenderTreeDto {
  rootPersonId: string;
  viewMode: 'VERTICAL' | 'HORIZONTAL' | 'LIST';
}

// Response DTOs
export interface PersonResponseDto {
  personId: string;
  name: string;
  gender: 'MALE' | 'FEMALE' | 'UNKNOWN';
  birthDate?: Date | null;
  birthPlace?: string | null;
  deathDate?: Date | null;
}

export interface AncestorsResponseDto {
  personId: string;
  ancestors: string[];
}

export interface DescendantsResponseDto {
  personId: string;
  descendants: string[];
}

export interface FamilyTreeCreatedDto {
  treeId: string;
  message: string;
}

export interface OperationSuccessDto {
  message: string;
}

export interface RenderTreeResponseDto {
  rootPersonId: string;
  nodes: Array<{ personId: string; generationLevel: number }>;
  edges: Array<{
    relationType: 'PARENT_CHILD' | 'SPOUSE';
    parentId?: string | null;
    childId?: string | null;
    spouse1Id?: string | null;
    spouse2Id?: string | null;
  }>;
  viewMode: 'VERTICAL' | 'HORIZONTAL' | 'LIST';
}

export interface ErrorResponseDto {
  statusCode: number;
  message: string;
  error: string;
}
