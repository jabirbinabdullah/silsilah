import type { GenealogyGraph } from '../../domain/types';

export interface GenealogyGraphRepository {
  findById(treeId: string): Promise<GenealogyGraph | null>;
  save(aggregate: GenealogyGraph): Promise<void>;
}
