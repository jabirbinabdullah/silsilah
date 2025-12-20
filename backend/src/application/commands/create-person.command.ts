import type { GenealogyGraphRepository } from '../../infrastructure/repositories/genealogy-graph.repository';
import type { PersonProps } from '../../domain/types';

export interface CreatePersonCommand extends PersonProps {
  treeId: string;
}

export class CreatePersonHandler {
  constructor(private readonly repository: GenealogyGraphRepository) {}

  async execute(command: CreatePersonCommand): Promise<void> {
    const aggregate = await this.repository.findById(command.treeId);
    if (!aggregate) {
      throw new Error('Family tree not found');
    }
    aggregate.addPerson(command);
    await this.repository.save(aggregate);
  }
}
