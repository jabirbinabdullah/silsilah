import type { GenealogyGraphRepository } from '../../infrastructure/repositories/genealogy-graph.repository';
import { enforceRelationshipShape } from '../validation';

export interface EstablishParentChildCommand {
  treeId: string;
  parentId: string;
  childId: string;
}

export class EstablishParentChildHandler {
  constructor(private readonly repository: GenealogyGraphRepository) {}

  async execute(command: EstablishParentChildCommand): Promise<void> {
    const aggregate = await this.repository.findById(command.treeId);
    if (!aggregate) {
      throw new Error('Family tree not found');
    }

    // Enforce row shape at application layer
    enforceRelationshipShape({
      relationType: 'PARENT_CHILD',
      parentId: command.parentId,
      childId: command.childId,
    });

    aggregate.addParentChildRelationship(command.parentId, command.childId);
    await this.repository.save(aggregate);
  }
}
