import type { GenealogyGraphRepository } from '../../infrastructure/repositories/genealogy-graph.repository';
import { enforceRelationshipShape, canonicalSpouseOrder } from '../validation';

export interface EstablishSpouseCommand {
  treeId: string;
  spouseAId: string;
  spouseBId: string;
}

export class EstablishSpouseHandler {
  constructor(private readonly repository: GenealogyGraphRepository) {}

  async execute(command: EstablishSpouseCommand): Promise<void> {
    const aggregate = await this.repository.findById(command.treeId);
    if (!aggregate) {
      throw new Error('Family tree not found');
    }

    const [spouse1Id, spouse2Id] = canonicalSpouseOrder(command.spouseAId, command.spouseBId);

    // Enforce row shape + canonical order at application layer
    enforceRelationshipShape({
      relationType: 'SPOUSE',
      spouse1Id,
      spouse2Id,
    });

    aggregate.addSpouseRelationship(spouse1Id, spouse2Id);
    await this.repository.save(aggregate);
  }
}
