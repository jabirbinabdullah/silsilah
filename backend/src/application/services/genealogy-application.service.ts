import type { GenealogyGraphFactory } from '../../domain/types';
import type { GenealogyGraphRepository } from '../../infrastructure/repositories';
import { CreateFamilyTreeHandler, type CreateFamilyTreeCommand } from '../commands/create-family-tree.command';
import { CreatePersonHandler, type CreatePersonCommand } from '../commands/create-person.command';
import { EstablishParentChildHandler, type EstablishParentChildCommand } from '../commands/establish-parent-child.command';
import { EstablishSpouseHandler, type EstablishSpouseCommand } from '../commands/establish-spouse.command';
import { RemoveRelationshipHandler, type RemoveRelationshipCommand } from '../commands/remove-relationship.command';
import { RemovePersonHandler, type RemovePersonCommand } from '../commands/remove-person.command';
import { GetPersonHandler, type GetPersonQuery } from '../queries/get-person.query';
import { GetAncestorsHandler, type GetAncestorsQuery } from '../queries/get-ancestors.query';
import { GetDescendantsHandler, type GetDescendantsQuery } from '../queries/get-descendants.query';
import { RenderGenealogyTreeHandler, type RenderGenealogyTreeQuery } from '../queries/render-genealogy-tree.query';

export class GenealogyApplicationService {
  private readonly createFamilyTree: CreateFamilyTreeHandler;
  private readonly createPerson: CreatePersonHandler;
  private readonly establishParentChild: EstablishParentChildHandler;
  private readonly establishSpouse: EstablishSpouseHandler;
  private readonly removeRelationship: RemoveRelationshipHandler;
  private readonly removePerson: RemovePersonHandler;
  private readonly getPerson: GetPersonHandler;
  private readonly getAncestors: GetAncestorsHandler;
  private readonly getDescendants: GetDescendantsHandler;
  private readonly renderTree: RenderGenealogyTreeHandler;

  constructor(
    repository: GenealogyGraphRepository,
    factory: GenealogyGraphFactory,
  ) {
    this.createFamilyTree = new CreateFamilyTreeHandler(repository, factory);
    this.createPerson = new CreatePersonHandler(repository);
    this.establishParentChild = new EstablishParentChildHandler(repository);
    this.establishSpouse = new EstablishSpouseHandler(repository);
    this.removeRelationship = new RemoveRelationshipHandler(repository);
    this.removePerson = new RemovePersonHandler(repository);
    this.getPerson = new GetPersonHandler(repository);
    this.getAncestors = new GetAncestorsHandler(repository);
    this.getDescendants = new GetDescendantsHandler(repository);
    this.renderTree = new RenderGenealogyTreeHandler(repository);
  }

  // Commands
  async handleCreateFamilyTree(cmd: CreateFamilyTreeCommand) {
    return this.createFamilyTree.execute(cmd);
  }

  async handleCreatePerson(cmd: CreatePersonCommand) {
    return this.createPerson.execute(cmd);
  }

  async handleEstablishParentChild(cmd: EstablishParentChildCommand) {
    return this.establishParentChild.execute(cmd);
  }

  async handleEstablishSpouse(cmd: EstablishSpouseCommand) {
    return this.establishSpouse.execute(cmd);
  }

  async handleRemoveRelationship(cmd: RemoveRelationshipCommand) {
    return this.removeRelationship.execute(cmd);
  }

  async handleRemovePerson(cmd: RemovePersonCommand) {
    return this.removePerson.execute(cmd);
  }

  // Queries
  async handleGetPerson(query: GetPersonQuery) {
    return this.getPerson.execute(query);
  }

  async handleGetAncestors(query: GetAncestorsQuery) {
    return this.getAncestors.execute(query);
  }

  async handleGetDescendants(query: GetDescendantsQuery) {
    return this.getDescendants.execute(query);
  }

  async handleRenderTree(query: RenderGenealogyTreeQuery) {
    return this.renderTree.execute(query);
  }
}
