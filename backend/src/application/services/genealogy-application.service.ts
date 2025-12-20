import type { GenealogyGraphFactory, UserContext, Member } from '../../domain/types';
import {
  AuthorizationError,
  OwnershipError,
  MembershipError,
} from '../../domain/errors';
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
  private readonly repository: GenealogyGraphRepository;
  private userContext?: UserContext;
  private readonly requiresAuth: boolean;

  constructor(
    repository: GenealogyGraphRepository,
    factory: GenealogyGraphFactory,
    requiresAuth: boolean = false,
  ) {
    this.repository = repository;
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

  /**
   * Add a member to the tree with specified role.
   * Only OWNER can add members.
   */
  async addMember(
    treeId: string,
    ownerContext: UserContext,
    userId: string,
    role: 'VIEWER' | 'EDITOR' | 'OWNER',
  ): Promise<void> {
    this.requireOwner();

    if (ownerContext.role !== 'OWNER') {
      throw new AuthorizationError('Only OWNER can add members');
    }

    if (ownerContext.userId === userId) {
      throw new MembershipError('Cannot re-add owner as regular member');
    }

    const ownership = await (this.repository as any).getOwnership(treeId);
    if (!ownership) {
      throw new Error(`Tree ${treeId} not found`);
    }

    // Check if member already exists
    if (ownership.members.some((m: Member) => m.userId === userId)) {
      throw new MembershipError(`User ${userId} is already a member`);
    }

    const updatedMembers: Member[] = [...ownership.members, { userId, role }];
    await (this.repository as any).updateOwnership(treeId, ownership.ownerId, updatedMembers);
  }

  /**
   * Remove a member from the tree.
   * Only OWNER can remove members.
   * Cannot remove the last OWNER.
   */
  async removeMember(treeId: string, ownerContext: UserContext, userId: string): Promise<void> {
    this.requireOwner();

    if (ownerContext.role !== 'OWNER') {
      throw new AuthorizationError('Only OWNER can remove members');
    }

    const ownership = await (this.repository as any).getOwnership(treeId);
    if (!ownership) {
      throw new Error(`Tree ${treeId} not found`);
    }

    // Check if trying to remove the owner
    if (ownership.ownerId === userId) {
      throw new OwnershipError(
        'Cannot remove the owner. Transfer ownership first if you want to leave.',
      );
    }

    // Remove the member
    const updatedMembers = ownership.members.filter((m: Member) => m.userId !== userId);

    // Verify member existed
    if (updatedMembers.length === ownership.members.length) {
      throw new MembershipError(`User ${userId} is not a member`);
    }

    await (this.repository as any).updateOwnership(treeId, ownership.ownerId, updatedMembers);
  }

  /**
   * Change a member's role.
   * Only OWNER can change roles.
   * Cannot downgrade the last OWNER.
   */
  async changeMemberRole(
    treeId: string,
    ownerContext: UserContext,
    userId: string,
    newRole: 'VIEWER' | 'EDITOR' | 'OWNER',
  ): Promise<void> {
    this.requireOwner();

    if (ownerContext.role !== 'OWNER') {
      throw new AuthorizationError('Only OWNER can change member roles');
    }

    const ownership = await (this.repository as any).getOwnership(treeId);
    if (!ownership) {
      throw new Error(`Tree ${treeId} not found`);
    }

    // Check if target user is the owner or is a member
    const isOwner = ownership.ownerId === userId;
    const memberIndex = ownership.members.findIndex((m: Member) => m.userId === userId);

    if (!isOwner && memberIndex === -1) {
      throw new MembershipError(`User ${userId} is not part of this tree`);
    }

    // If changing owner's role, check if they're the last OWNER
    if (isOwner && newRole !== 'OWNER') {
      const otherOwners = ownership.members.filter((m: Member) => m.role === 'OWNER');
      if (otherOwners.length === 0) {
        throw new OwnershipError('Cannot remove the last OWNER. Transfer ownership first.');
      }
    }

    // Update member role
    if (!isOwner && memberIndex >= 0) {
      const updatedMembers = [...ownership.members];
      updatedMembers[memberIndex] = { userId, role: newRole };
      await (this.repository as any).updateOwnership(treeId, ownership.ownerId, updatedMembers);
    }
  }

  /**
   * Transfer ownership to another user.
   * Only OWNER can transfer ownership.
   * Target must be a member of the tree.
   */
  async transferOwnership(
    treeId: string,
    ownerContext: UserContext,
    newOwnerId: string,
  ): Promise<void> {
    this.requireOwner();

    if (ownerContext.role !== 'OWNER') {
      throw new AuthorizationError('Only OWNER can transfer ownership');
    }

    if (ownerContext.userId === newOwnerId) {
      throw new OwnershipError('New owner must be different from current owner');
    }

    const ownership = await (this.repository as any).getOwnership(treeId);
    if (!ownership) {
      throw new Error(`Tree ${treeId} not found`);
    }

    // Check if new owner is a member
    const newOwnerMember = ownership.members.find((m: Member) => m.userId === newOwnerId);
    if (!newOwnerMember) {
      throw new MembershipError(
        `User ${newOwnerId} must be a member of the tree before becoming owner`,
      );
    }

    // Update: new owner becomes owner, current owner becomes editor
    const updatedMembers = ownership.members.map((m: Member) =>
      m.userId === newOwnerId ? { userId: newOwnerId, role: 'OWNER' as const } : m,
    );

    // Add old owner as editor if not already
    if (!updatedMembers.some((m: Member) => m.userId === ownerContext.userId)) {
      updatedMembers.push({ userId: ownerContext.userId, role: 'EDITOR' });
    }

    await (this.repository as any).updateOwnership(treeId, newOwnerId, updatedMembers);
  }
}
