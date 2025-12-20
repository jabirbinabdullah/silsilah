import type { GenealogyGraphRepository } from '../../infrastructure/repositories/genealogy-graph.repository';

export interface RemovePersonCommand {
  treeId: string;
  personId: string;
}

export class RemovePersonHandler {
  constructor(private readonly repository: GenealogyGraphRepository) {}

  async execute(command: RemovePersonCommand): Promise<void> {
    const aggregate = await this.repository.findById(command.treeId);
    if (!aggregate) {
      throw new Error('Family tree not found');
    }

    aggregate.removePerson(command.personId);
    await this.repository.save(aggregate);
  }
}
