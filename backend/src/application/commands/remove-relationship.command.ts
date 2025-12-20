import type { GenealogyGraphRepository } from '../../infrastructure/repositories/genealogy-graph.repository';

export interface RemoveRelationshipCommand {
  treeId: string;
  personId1: string;
  personId2: string;
}

export class RemoveRelationshipHandler {
  constructor(private readonly repository: GenealogyGraphRepository) {}

  async execute(command: RemoveRelationshipCommand): Promise<void> {
    const aggregate = await this.repository.findById(command.treeId);
    if (!aggregate) {
      throw new Error('Family tree not found');
    }

    aggregate.removeRelationship(command.personId1, command.personId2);
    await this.repository.save(aggregate);
  }
}
