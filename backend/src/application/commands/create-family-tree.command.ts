import type { GenealogyGraph, GenealogyGraphFactory } from '../../domain/types';
import type { GenealogyGraphRepository } from '../../infrastructure/repositories/genealogy-graph.repository';

export interface CreateFamilyTreeCommand {
  treeId: string;
}

export class CreateFamilyTreeHandler {
  constructor(
    private readonly repository: GenealogyGraphRepository,
    private readonly factory: GenealogyGraphFactory,
  ) {}

  async execute(command: CreateFamilyTreeCommand): Promise<GenealogyGraph> {
    const aggregate = this.factory.create(command.treeId);
    await this.repository.save(aggregate);
    return aggregate;
  }
}
