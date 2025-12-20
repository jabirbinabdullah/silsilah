import type { GenealogyGraphFactory, UserContext } from '../../domain/types';
import { AuthorizationError } from '../../domain/errors';
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
  private userContext?: UserContext;
  private readonly requiresAuth: boolean;

  constructor(
    repository: GenealogyGraphRepository,
    factory: GenealogyGraphFactory,
    requiresAuth: boolean = false,
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
    this.requiresAuth = requiresAuth;
  }

  /**
   * Set the current user context for authorization.
   * Must be called before executing commands/queries if authorization is required.
   */
  setUserContext(context: UserContext): void {
    this.userContext = context;
  }

  /**
   * Check if user can perform mutations (EDITOR or OWNER).
   */
  private requireMutation(): void {
    if (!this.requiresAuth) return;

    if (!this.userContext) {
      throw new AuthorizationError('User context required for mutations');
    }
    if (this.userContext.role !== 'OWNER' && this.userContext.role !== 'EDITOR') {
      throw new AuthorizationError(
        `Role ${this.userContext.role} cannot perform mutations. Required: EDITOR or OWNER`,
      );
    }
  }

  /**
   * Check if user can read data (VIEWER, EDITOR, or OWNER).
   */
  private requireQuery(): void {
    if (!this.requiresAuth) return;

    if (!this.userContext) {
      throw new AuthorizationError('User context required for queries');
    }
    if (!['OWNER', 'EDITOR', 'VIEWER'].includes(this.userContext.role)) {
      throw new AuthorizationError(`Unknown role: ${this.userContext.role}`);
    }
  }

  /**
   * Check if user is OWNER (required for delete/ownership operations).
   */
  private requireOwner(): void {
    if (!this.requiresAuth) return;

    if (!this.userContext) {
      throw new AuthorizationError('User context required for owner operations');
    }
    if (this.userContext.role !== 'OWNER') {
      throw new AuthorizationError(
        `Role ${this.userContext.role} cannot perform owner operations. Required: OWNER`,
      );
    }
  }

  // Commands (mutations require EDITOR or OWNER)
  async handleCreateFamilyTree(cmd: CreateFamilyTreeCommand) {
    this.requireMutation();
    return this.createFamilyTree.execute(cmd);
  }

  async handleCreatePerson(cmd: CreatePersonCommand) {
    this.requireMutation();
    return this.createPerson.execute(cmd);
  }

  async handleEstablishParentChild(cmd: EstablishParentChildCommand) {
    this.requireMutation();
    return this.establishParentChild.execute(cmd);
  }

  async handleEstablishSpouse(cmd: EstablishSpouseCommand) {
    this.requireMutation();
    return this.establishSpouse.execute(cmd);
  }

  async handleRemoveRelationship(cmd: RemoveRelationshipCommand) {
    this.requireMutation();
    return this.removeRelationship.execute(cmd);
  }

  async handleRemovePerson(cmd: RemovePersonCommand) {
    this.requireOwner();
    return this.removePerson.execute(cmd);
  }

  // Queries (allowed for VIEWER, EDITOR, OWNER)
  async handleGetPerson(query: GetPersonQuery) {
    this.requireQuery();
    return this.getPerson.execute(query);
  }

  async handleGetAncestors(query: GetAncestorsQuery) {
    this.requireQuery();
    return this.getAncestors.execute(query);
  }

  async handleGetDescendants(query: GetDescendantsQuery) {
    this.requireQuery();
    return this.getDescendants.execute(query);
  }

  async handleRenderTree(query: RenderGenealogyTreeQuery) {
    this.requireQuery();
    return this.renderTree.execute(query);
  }
}
