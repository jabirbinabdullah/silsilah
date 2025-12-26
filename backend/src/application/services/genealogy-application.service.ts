import type { GenealogyGraphFactory, UserContext, Member } from '../../domain/types';
import {
  AuthorizationError,
  OwnershipError,
  MembershipError,
  NotFoundError,
  InvariantViolationError,
} from '../../domain/errors';
import type { AuditLogRepository, GenealogyGraphRepository } from '../../infrastructure/repositories';
import { CreateFamilyTreeHandler, type CreateFamilyTreeCommand } from '../commands/create-family-tree.command';
import { AddPersonToTreeHandler, type AddPersonToTreeCommand } from '../commands/add-person-to-tree.command';
import { EstablishParentChildHandler, type EstablishParentChildCommand } from '../commands/establish-parent-child.command';
import { EstablishSpouseHandler, type EstablishSpouseCommand } from '../commands/establish-spouse.command';
import { RemoveRelationshipHandler, type RemoveRelationshipCommand } from '../commands/remove-relationship.command';
import { RemovePersonHandler, type RemovePersonCommand } from '../commands/remove-person.command';
import { ImportPersonsHandler } from '../commands/import-persons.handler';
import { type ImportPersonsCommand, type ImportPersonsResult } from '../commands/import-persons.command';
import { GetPersonHandler, type GetPersonQuery } from '../queries/get-person.query';
import { GetAncestorsHandler, type GetAncestorsQuery } from '../queries/get-ancestors.query';
import { GetDescendantsHandler, type GetDescendantsQuery } from '../queries/get-descendants.query';
import { RenderGenealogyTreeHandler, type RenderGenealogyTreeQuery } from '../queries/render-genealogy-tree.query';
import type { TreeRenderDTO } from '../dtos/tree-render.dto';
import type { TreeListItemDTO, TreeListResponseDTO } from '../dtos/tree-list.dto';

export class GenealogyApplicationService {
  private readonly createFamilyTree: CreateFamilyTreeHandler;
  private readonly addPersonToTree: AddPersonToTreeHandler;
  private readonly establishParentChild: EstablishParentChildHandler;
  private readonly establishSpouse: EstablishSpouseHandler;
  private readonly removeRelationship: RemoveRelationshipHandler;
  private readonly removePerson: RemovePersonHandler;
  private readonly importPersons: ImportPersonsHandler;
  private readonly getPerson: GetPersonHandler;
  private readonly getAncestors: GetAncestorsHandler;
  private readonly getDescendants: GetDescendantsHandler;
  private readonly renderTree: RenderGenealogyTreeHandler;
  private readonly repository: GenealogyGraphRepository;
  private readonly readRepository: GenealogyGraphRepository;
  private readonly auditLogRepository?: AuditLogRepository;
  private userContext?: UserContext;
  private readonly requiresAuth: boolean;

  constructor(
    repository: GenealogyGraphRepository,
    factory: GenealogyGraphFactory,
    requiresAuth: boolean = false,
    auditLogRepository?: AuditLogRepository,
    readRepository?: GenealogyGraphRepository,
  ) {
    this.repository = repository;
    this.readRepository = readRepository ?? repository;
    this.auditLogRepository = auditLogRepository;
    this.createFamilyTree = new CreateFamilyTreeHandler(repository, factory);
    this.addPersonToTree = new AddPersonToTreeHandler(repository);
    this.establishParentChild = new EstablishParentChildHandler(repository);
    this.establishSpouse = new EstablishSpouseHandler(repository);
    this.removeRelationship = new RemoveRelationshipHandler(repository);
    this.removePerson = new RemovePersonHandler(repository);
    this.importPersons = new ImportPersonsHandler(repository);
    this.getPerson = new GetPersonHandler(this.readRepository);
    this.getAncestors = new GetAncestorsHandler(this.readRepository);
    this.getDescendants = new GetDescendantsHandler(this.readRepository);
    this.renderTree = new RenderGenealogyTreeHandler(this.readRepository);
    this.requiresAuth = requiresAuth;
  }

  /**
   * Set the current user context for authorization.
   * Must be called before executing commands/queries if authorization is required.
   */
  setUserContext(context: UserContext): void {
    this.userContext = context;
  }

  private requireOwnerStrict(): void {
    if (!this.userContext) {
      throw new AuthorizationError('User context required for owner operations');
    }
    if (this.userContext.role !== 'OWNER') {
      throw new AuthorizationError('Only owners can perform this operation');
    }
  }

  private async appendAudit(action: string, treeId: string): Promise<void> {
    if (!this.auditLogRepository) return;

    const user = this.userContext;
    const entry = {
      treeId,
      action,
      userId: user?.userId ?? 'anonymous',
      username: user?.username ?? 'anonymous',
      role: user?.role ?? 'UNKNOWN',
      timestamp: new Date(),
    } as const;

    try {
      await this.auditLogRepository.append(entry);
    } catch (err) {
      // Do not block core operations on audit failures
      console.warn('Audit log append failed', err);
    }
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
    const result = await this.createFamilyTree.execute(cmd);
    await this.appendAudit('CREATE_FAMILY_TREE', cmd.treeId);
    return result;
  }

  async handleAddPersonToTree(cmd: AddPersonToTreeCommand) {
    this.requireMutation();
    const result = await this.addPersonToTree.execute(cmd);
    await this.appendAudit('CREATE_PERSON', cmd.treeId);
    return result;
  }

  async handleEstablishParentChild(cmd: EstablishParentChildCommand) {
    this.requireMutation();
    const result = await this.establishParentChild.execute(cmd);
    await this.appendAudit('ESTABLISH_PARENT_CHILD', cmd.treeId);
    return result;
  }

  async handleEstablishSpouse(cmd: EstablishSpouseCommand) {
    this.requireMutation();
    const result = await this.establishSpouse.execute(cmd);
    await this.appendAudit('ESTABLISH_SPOUSE', cmd.treeId);
    return result;
  }

  async handleRemoveRelationship(cmd: RemoveRelationshipCommand) {
    this.requireMutation();
    const result = await this.removeRelationship.execute(cmd);
    await this.appendAudit('REMOVE_RELATIONSHIP', cmd.treeId);
    return result;
  }

  async handleRemovePerson(cmd: RemovePersonCommand) {
    this.requireOwner();
    const result = await this.removePerson.execute(cmd);
    await this.appendAudit('REMOVE_PERSON', cmd.treeId);
    return result;
  }

  async handleImportPersons(cmd: ImportPersonsCommand): Promise<ImportPersonsResult> {
    this.requireMutation(); // EDITOR or OWNER
    const result = await this.importPersons.execute(cmd);
    await this.appendAudit('IMPORT_PERSONS', cmd.treeId);
    return result;
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
   * Get tree render data for frontend visualization.
   * Returns a best-effort snapshot with defensive traversal.
   * - Skips dangling references (missing person nodes)
   * - Does NOT deduplicate edges
   * - O(N+E) complexity with Set-based membership checks
   * - Respects authorization boundary (requires VIEWER, EDITOR, or OWNER)
   */
  async getTreeRenderData(treeId: string): Promise<TreeRenderDTO> {
    this.requireQuery();

    // Phase 1: Validate input
    if (!treeId || typeof treeId !== 'string' || treeId.trim() === '') {
      throw new InvariantViolationError('treeId must be a non-empty string');
    }

    // Phase 2: Fetch snapshot using existing method
    const snapshot = await (this.readRepository as any).getSnapshot(treeId);
    if (!snapshot) {
      throw new NotFoundError(`Tree ${treeId} not found`);
    }

    const persons = Array.isArray(snapshot.persons) ? snapshot.persons : [];
    const spouseEdgesRaw = Array.isArray(snapshot.spouseEdges) ? snapshot.spouseEdges : [];
    const parentChildEdgesRaw = Array.isArray(snapshot.parentChildEdges) ? snapshot.parentChildEdges : [];

    // Phase 3: Build Set of valid node IDs (O(N))
    const nodes: Array<{ id: string; displayName: string }> = [];
    const validNodeIds = new Set<string>();
    for (const p of persons) {
      const id = (p as any).personId ?? (p as any).id;
      if (!id) continue;
      validNodeIds.add(id);
      nodes.push({
        id,
        displayName: (p as any).name ?? (p as any).label ?? '', // Explicit mapping
      });
    }

    // Phase 4: Collect spouse edges, skip edges with dangling references
    const spouseEdges: Array<{ personAId: string; personBId: string }> = [];
    for (const edge of spouseEdgesRaw) {
      const a = (edge as any).personAId ?? (edge as any).spouse1Id ?? (edge as any).spouseAId;
      const b = (edge as any).personBId ?? (edge as any).spouse2Id ?? (edge as any).spouseBId;
      if (!a || !b) continue;
      if (!validNodeIds.has(a) || !validNodeIds.has(b)) continue;
      spouseEdges.push({ personAId: a, personBId: b });
    }

    // Phase 5: Collect parent-child edges, skip edges with dangling references
    const parentChildEdges: Array<{ personAId: string; personBId: string }> = [];
    for (const edge of parentChildEdgesRaw) {
      const parentId = (edge as any).parentId ?? (edge as any).personAId;
      const childId = (edge as any).childId ?? (edge as any).personBId;
      if (!parentId || !childId) continue;
      if (!validNodeIds.has(parentId) || !validNodeIds.has(childId)) continue;
      parentChildEdges.push({ personAId: parentId, personBId: childId });
    }

    // Phase 6: Return versioned DTO
    return {
      version: 'v1' as const,
      treeId: snapshot.treeId,
      nodes,
      spouseEdges,
      parentChildEdges,
    };
  }

  /**
   * List all trees accessible by the current user.
   * Returns trees where user is owner or member.
   * Requires authentication (any valid user).
   */
  async listTrees(): Promise<TreeListResponseDTO> {
    if (!this.userContext) {
      throw new AuthorizationError('User context required to list trees');
    }

    const userId = this.userContext.userId;
    const treesData = await this.readRepository.listTreesForUser(userId);

    const trees: TreeListItemDTO[] = treesData.map(tree => {
      // Determine user's role
      let role: 'OWNER' | 'EDITOR' | 'VIEWER' = 'VIEWER';
      if (tree.ownerId === userId) {
        role = 'OWNER';
      } else {
        const membership = tree.members.find(m => m.userId === userId);
        if (membership) {
          role = membership.role;
        }
      }

      return {
        treeId: tree.treeId,
        name: tree.treeId, // TODO: Add optional tree name field to domain
        role,
        personCount: tree.personCount,
        createdAt: tree.createdAt,
        updatedAt: tree.updatedAt,
      };
    });

    return {
      trees,
      total: trees.length,
    };
  }

  async exportTreeSnapshot(treeId: string) {
    this.requireOwnerStrict();
    const snapshot = await (this.readRepository as any).getSnapshot(treeId);
    if (!snapshot) {
      throw new NotFoundError(`Tree ${treeId} not found`);
    }

    return {
      treeId: snapshot.treeId,
      persons: snapshot.persons,
      parentChildEdges: snapshot.parentChildEdges,
      spouseEdges: snapshot.spouseEdges,
      ownerId: snapshot.ownerId,
      members: snapshot.members,
      version: snapshot.version,
      createdAt: snapshot.createdAt,
      updatedAt: snapshot.updatedAt,
      exportedAt: new Date(),
    };
  }

  async exportTreeGedcom(treeId: string): Promise<string> {
    const snapshot = await this.exportTreeSnapshot(treeId);
    return this.toGedcom(snapshot.treeId, snapshot.persons, snapshot.parentChildEdges, snapshot.spouseEdges);
  }

  private toGedcom(
    treeId: string,
    persons: Array<{ personId: string; name: string; gender: 'MALE' | 'FEMALE' | 'UNKNOWN'; birthDate?: Date | null; birthPlace?: string | null; deathDate?: Date | null }>,
    parentChildEdges: Array<{ parentId: string; childId: string }>,
    spouseEdges: Array<{ spouse1Id: string; spouse2Id: string }>,
  ): string {
    const lines: string[] = [];
    lines.push('0 HEAD');
    lines.push('1 SOUR silsilah');
    lines.push('1 GEDC');
    lines.push('2 VERS 5.5.1');
    lines.push('1 CHAR UTF-8');

    const formatDate = (value: unknown): string | null => {
      if (!value) return null;
      const date = typeof value === 'string' ? new Date(value) : (value as Date);
      if (Number.isNaN(date.getTime())) return null;
      return date.toISOString().split('T')[0];
    };

    // Individuals
    const personMap = new Map(persons.map((p) => [p.personId, p]));
    for (const p of persons) {
      lines.push(`0 @${p.personId}@ INDI`);
      lines.push(`1 NAME ${p.name}`);
      lines.push(`1 SEX ${p.gender === 'MALE' ? 'M' : p.gender === 'FEMALE' ? 'F' : 'U'}`);
      const birthDate = formatDate(p.birthDate);
      if (birthDate) {
        lines.push('1 BIRT');
        lines.push(`2 DATE ${birthDate}`);
        if (p.birthPlace) {
          lines.push(`2 PLAC ${p.birthPlace}`);
        }
      }
      const deathDate = formatDate(p.deathDate);
      if (deathDate) {
        lines.push('1 DEAT');
        lines.push(`2 DATE ${deathDate}`);
      }
    }

    // Families
    const families: Array<{
      id: string;
      husband?: string;
      wife?: string;
      children: string[];
    }> = [];

    // Spouse-based families
    let famCounter = 1;
    for (const edge of spouseEdges) {
      const famId = `F${famCounter++}`;
      families.push({
        id: famId,
        husband: edge.spouse1Id,
        wife: edge.spouse2Id,
        children: [],
      });
    }

    // Helper: find or create family for parent when no spouse family exists
    const ensureFamilyForParent = (parentId: string): number => {
      for (let i = 0; i < families.length; i++) {
        const fam = families[i];
        if (fam.husband === parentId || fam.wife === parentId) {
          return i;
        }
      }
      const famId = `F${famCounter++}`;
      families.push({ id: famId, husband: parentId, children: [] });
      return families.length - 1;
    };

    for (const edge of parentChildEdges) {
      const famIndex = ensureFamilyForParent(edge.parentId);
      families[famIndex].children.push(edge.childId);
    }

    for (const fam of families) {
      lines.push(`0 @${fam.id}@ FAM`);
      if (fam.husband) {
        const role = personMap.get(fam.husband)?.gender === 'FEMALE' ? 'WIFE' : 'HUSB';
        lines.push(`1 ${role} @${fam.husband}@`);
      }
      if (fam.wife) {
        const role = personMap.get(fam.wife)?.gender === 'MALE' ? 'HUSB' : 'WIFE';
        lines.push(`1 ${role} @${fam.wife}@`);
      }
      for (const child of fam.children) {
        lines.push(`1 CHIL @${child}@`);
      }
    }

    lines.push('0 TRLR');
    return lines.join('\n');
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
    await this.appendAudit('ADD_MEMBER', treeId);
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
    await this.appendAudit('REMOVE_MEMBER', treeId);
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

    await this.appendAudit('CHANGE_MEMBER_ROLE', treeId);
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
    await this.appendAudit('TRANSFER_OWNERSHIP', treeId);
  }
}
