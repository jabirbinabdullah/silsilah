import type { GenealogyGraph } from '../../domain/types';

export interface GenealogyGraphRepository {
  findById(treeId: string): Promise<GenealogyGraph | null>;
  save(aggregate: GenealogyGraph): Promise<void>;
  getSnapshot(treeId: string): Promise<{
    treeId: string;
    persons: Array<{
      personId: string;
      name: string;
      gender: 'MALE' | 'FEMALE' | 'UNKNOWN';
      birthDate?: Date | null;
      birthPlace?: string | null;
      deathDate?: Date | null;
    }>;
    parentChildEdges: Array<{ parentId: string; childId: string }>;
    spouseEdges: Array<{ spouse1Id: string; spouse2Id: string }>;
    ownerId: string;
    members: Array<{ userId: string; role: 'OWNER' | 'EDITOR' | 'VIEWER' }>;
    version: number;
    createdAt: Date;
    updatedAt: Date;
  } | null>;
  
  /**
   * List all trees where the user is owner or member.
   * Returns minimal metadata for tree selection/navigation.
   */
  listTreesForUser(userId: string): Promise<Array<{
    treeId: string;
    ownerId: string;
    members: Array<{ userId: string; role: 'OWNER' | 'EDITOR' | 'VIEWER' }>;
    personCount: number;
    createdAt: Date;
    updatedAt: Date;
  }>>;
}
