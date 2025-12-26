import { NotFoundError } from '../../domain/errors';
import type { PersonProps } from '../../domain/types';
import type { GenealogyGraphRepository } from '../../infrastructure/repositories/genealogy-graph.repository';

export interface AddPersonToTreeCommand extends PersonProps {
  treeId: string;
}

export class AddPersonToTreeHandler {
  constructor(private readonly repository: GenealogyGraphRepository) {}

  async execute(command: AddPersonToTreeCommand): Promise<string> {
    const aggregate = await this.repository.findById(command.treeId);
    if (!aggregate) {
      throw new NotFoundError('Family tree not found');
    }

    aggregate.addPerson({
      personId: command.personId,
      name: command.name,
      gender: command.gender,
      birthDate: command.birthDate ?? null,
      birthPlace: command.birthPlace ?? null,
      deathDate: command.deathDate ?? null,
    });

    await this.repository.save(aggregate);
    return command.personId;
  }
}
