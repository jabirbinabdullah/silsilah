import type { GenealogyGraphRepository } from '../../infrastructure/repositories/genealogy-graph.repository';

export interface GetDescendantsQuery {
  treeId: string;
  personId: string;
}

export class GetDescendantsHandler {
  constructor(private readonly repository: GenealogyGraphRepository) {}

  async execute(query: GetDescendantsQuery): Promise<string[] | null> {
    const aggregate = await this.repository.findById(query.treeId);
    if (!aggregate) {
      return null;
    }
    return aggregate.getDescendants(query.personId);
  }
}
