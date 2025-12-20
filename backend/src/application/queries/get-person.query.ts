import type { GenealogyGraphRepository } from '../../infrastructure/repositories/genealogy-graph.repository';
import type { PersonProps } from '../../domain/types';

export interface GetPersonQuery {
  treeId: string;
  personId: string;
}

export class GetPersonHandler {
  constructor(private readonly repository: GenealogyGraphRepository) {}

  async execute(query: GetPersonQuery): Promise<PersonProps | null> {
    const aggregate = await this.repository.findById(query.treeId);
    if (!aggregate) {
      return null;
    }
    return aggregate.getPerson(query.personId);
  }
}
