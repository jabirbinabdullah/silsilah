import type { GenealogyGraphRepository } from '../../infrastructure/repositories/genealogy-graph.repository';

export type ViewMode = 'VERTICAL' | 'HORIZONTAL' | 'LIST';

export interface RenderGenealogyTreeQuery {
  treeId: string;
  rootPersonId: string;
  viewMode: ViewMode;
}

export class RenderGenealogyTreeHandler {
  constructor(private readonly repository: GenealogyGraphRepository) {}

  async execute(query: RenderGenealogyTreeQuery): Promise<unknown | null> {
    const aggregate = await this.repository.findById(query.treeId);
    if (!aggregate) {
      return null;
    }
    return aggregate.renderTree(query.rootPersonId, query.viewMode);
  }
}
