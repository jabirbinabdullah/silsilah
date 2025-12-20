import type { GenealogyGraphRepository } from '../../infrastructure/repositories/genealogy-graph.repository';

export interface GetAncestorsQuery {
  treeId: string;
  personId: string;
}

export class GetAncestorsHandler {
  constructor(private readonly repository: GenealogyGraphRepository) {}

  async execute(query: GetAncestorsQuery): Promise<string[] | null> {
    const aggregate = await this.repository.findById(query.treeId);
    if (!aggregate) {
      return null;
    }
    return aggregate.getAncestors(query.personId);
  }
}
