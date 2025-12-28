import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpException,
  UseGuards,
  Req,
  Header,
} from '@nestjs/common';
// Patch: declare global presence and activity stores for collaboration
declare global {
  // eslint-disable-next-line no-var
  var __presence: Record<string, any[]> | undefined;
  // eslint-disable-next-line no-var
  var __activity: Record<string, any[]> | undefined;
}

function getPresenceStore(): Record<string, any[]> {
  if (!globalThis.__presence) globalThis.__presence = {};
  return globalThis.__presence;
}

function getActivityStore(): Record<string, any[]> {
  if (!globalThis.__activity) globalThis.__activity = {};
  return globalThis.__activity;
}
import { Request } from 'express';
import { GenealogyApplicationService } from '../../application/services/genealogy-application.service';
import type { UserContext } from '../../domain/types';
import { PublicRead } from '../../infrastructure/guards/read.guards';
import { AuthorizationPolicy } from '../../application/policies/authorization.policy';
import {
  CreateFamilyTreeDto,
  CreatePersonDto,
  EstablishParentChildDto,
  EstablishSpouseDto,
  FamilyTreeCreatedDto,
  OperationSuccessDto,
  RemoveRelationshipDto,
  PersonResponseDto,
  AncestorsResponseDto,
  DescendantsResponseDto,
  RenderTreeResponseDto,
} from '../dtos/genealogy.dto';
import {
  NotFoundError,
  InvariantViolationError,
  CycleDetectedError,
  DuplicateRelationshipError,
  ParentLimitExceededError,
  AgeInconsistencyError,
  PersonHasRelationshipsError,
  AuthorizationError,
} from '../../domain/errors';

@Controller('api/trees')
export class GenealogyController {
        /**
         * GET /api/trees/:treeId/activity
         * Returns activity log for a tree (demo: in-memory)
         */
        @Get(':treeId/activity')
        async getActivityLog(
          @Param('treeId') treeId: string,
          @Query('limit') limit: string = '50',
          @Query('offset') offset: string = '0',
          @Req() req: Request,
        ): Promise<{ entries: any[]; total: number }> {
          const activityStore = getActivityStore();
          const all = activityStore[treeId] || [];
          const l = parseInt(limit, 10) || 50;
          const o = parseInt(offset, 10) || 0;
          return { entries: all.slice(o, o + l), total: all.length };
        }

        /**
         * POST /api/trees/:treeId/activity/log
         * Logs an activity for a tree (demo: in-memory)
         */
        @Post(':treeId/activity/log')
        async logActivity(
          @Param('treeId') treeId: string,
          @Body() activity: any,
          @Req() req: Request,
        ): Promise<any> {
          const activityStore = getActivityStore();
          if (!activityStore[treeId]) activityStore[treeId] = [];
          const entry = { ...activity, id: Date.now().toString(36) + Math.random().toString(36).slice(2), timestamp: new Date().toISOString() };
          activityStore[treeId].push(entry);
          return entry;
        }
    /**
     * --- COLLABORATION PRESENCE ENDPOINTS ---
     * POST /trees/:treeId/presence/register
     * Registers user presence for collaboration
     */
    @Post(':treeId/presence/register')
    async registerPresence(
      @Param('treeId') treeId: string,
      @Body() body: { userId: string; sessionId: string; username: string },
      @Req() req: Request,
    ): Promise<any> {
      // TODO: Store user presence in-memory or DB (for demo, use static array)
      // Return all active users for this tree
      // Replace with persistent storage in production
      if (!global['__presence']) global['__presence'] = {};
      if (!global['__presence'][treeId]) global['__presence'][treeId] = [];
      // Remove any previous session for this user
      global['__presence'][treeId] = global['__presence'][treeId].filter((u: any) => u.userId !== body.userId);
      global['__presence'][treeId].push({ ...body, lastActive: Date.now() });
      return global['__presence'][treeId];
    }

    /**
     * POST /trees/:treeId/presence/update
     * Updates user presence status
     */
    @Post(':treeId/presence/update')
    async updatePresence(
      @Param('treeId') treeId: string,
      @Body() body: { userId: string; sessionId: string; status: string; personId?: string },
      @Req() req: Request,
    ): Promise<any> {
      if (!global['__presence']) global['__presence'] = {};
      if (!global['__presence'][treeId]) global['__presence'][treeId] = [];
      const idx = global['__presence'][treeId].findIndex((u: any) => u.userId === body.userId);
      if (idx >= 0) {
        global['__presence'][treeId][idx] = { ...global['__presence'][treeId][idx], ...body, lastActive: Date.now() };
      }
      return global['__presence'][treeId];
    }

    /**
     * POST /trees/:treeId/presence/unregister
     * Removes user presence
     */
    @Post(':treeId/presence/unregister')
    async unregisterPresence(
      @Param('treeId') treeId: string,
      @Body() body: { userId: string; sessionId: string },
      @Req() req: Request,
    ): Promise<void> {
      if (!global['__presence']) global['__presence'] = {};
      if (!global['__presence'][treeId]) return;
      global['__presence'][treeId] = global['__presence'][treeId].filter((u: any) => u.userId !== body.userId);
    }

    /**
     * GET /trees/:treeId/presence
     * Returns all active users for a tree
     */
    @Get(':treeId/presence')
    async getActiveUsers(
      @Param('treeId') treeId: string,
      @Req() req: Request,
    ): Promise<any[]> {
      if (!global['__presence']) global['__presence'] = {};
      return global['__presence'][treeId] || [];
    }
  constructor(
    private readonly appService: GenealogyApplicationService,
  ) {}

  /**
   * Extract UserContext from JWT token in request.
   * Returns a default OWNER context if no token is present (for testing).
   */
  private getUserContext(req: Request): UserContext {
    const userContext = (req as any).userContext as UserContext;
    
    // If no user context (e.g., in tests without JWT), provide default OWNER for backward compat
    if (!userContext) {
      return {
        userId: 'test-user',
        username: 'test-user',
        role: 'OWNER',
      };
    }
    
    return userContext;
  }

  /**
   * GET /trees
   * List all trees accessible by the current user
   */
  @Get()
  async listTrees(@Req() req: Request) {
    try {
      const userContext = this.getUserContext(req);
      this.appService.setUserContext(userContext);

      return await this.appService.listTrees();
    } catch (err) {
      this.handleDomainError(err);
    }
  }

  /**
   * POST /trees
   * Create a new family tree
   */
  @Post()
  async createTree(
    @Body() dto: CreateFamilyTreeDto,
    @Req() req: Request,
  ): Promise<FamilyTreeCreatedDto> {
    try {
      const userContext = this.getUserContext(req);
      this.appService.setUserContext(userContext);

      await this.appService.handleCreateFamilyTree({
        treeId: dto.treeId,
      });
      return {
        treeId: dto.treeId,
        message: `Family tree '${dto.treeId}' created successfully`,
      };
    } catch (err) {
      this.handleDomainError(err);
    }
  }

  /**
   * POST /trees/:id/persons
   * Add a person to the tree (command: AddPersonToTreeCommand)
   */
  @Post(':treeId/persons')
  async createPerson(
    @Param('treeId') treeId: string,
    @Body() dto: CreatePersonDto,
    @Req() req: Request,
  ): Promise<{ personId: string }> {
    try {
      const userContext = this.getUserContext(req);
      this.appService.setUserContext(userContext);

      const birthDate = dto.birthDate ? new Date(dto.birthDate) : null;
      const deathDate = dto.deathDate ? new Date(dto.deathDate) : null;

      if (birthDate && Number.isNaN(birthDate.getTime())) {
        throw new InvariantViolationError('birthDate is invalid');
      }
      if (deathDate && Number.isNaN(deathDate.getTime())) {
        throw new InvariantViolationError('deathDate is invalid');
      }

      const personId = await this.appService.handleAddPersonToTree({
        treeId,
        personId: dto.personId,
        name: dto.name,
        gender: dto.gender,
        birthDate,
        birthPlace: dto.birthPlace || null,
        deathDate,
      });
      return {
        personId,
      };
    } catch (err) {
      this.handleDomainError(err);
    }
  }

  /**
   * POST /trees/:id/persons/import
   * Bulk import persons from CSV
   */
  @Post(':treeId/persons/import')
  async importPersons(
    @Param('treeId') treeId: string,
    @Body() dto: { csvContent: string },
    @Req() req: Request,
  ): Promise<any> {
    try {
      const userContext = this.getUserContext(req);
      this.appService.setUserContext(userContext);

      const result = await this.appService.handleImportPersons({
        treeId,
        csvContent: dto.csvContent,
      });

      return {
        imported: result.imported,
        skipped: result.skipped,
        total: result.total,
        errors: result.errors,
      };
    } catch (err) {
      this.handleDomainError(err);
    }
  }

  /**
   * POST /trees/:id/relationships/parent-child
   * Establish parent-child relationship
   */
  @Post(':treeId/relationships/parent-child')
  async establishParentChild(
    @Param('treeId') treeId: string,
    @Body() dto: EstablishParentChildDto,
    @Req() req: Request,
  ): Promise<OperationSuccessDto> {
    try {
      const userContext = this.getUserContext(req);
      this.appService.setUserContext(userContext);

      await this.appService.handleEstablishParentChild({
        treeId,
        parentId: dto.parentId,
        childId: dto.childId,
      });
      return {
        message: `Parent-child relationship established: ${dto.parentId} → ${dto.childId}`,
      };
    } catch (err) {
      this.handleDomainError(err);
    }
  }

  /**
   * POST /trees/:id/relationships/spouse
   * Establish spouse relationship
   */
  @Post(':treeId/relationships/spouse')
  async establishSpouse(
    @Param('treeId') treeId: string,
    @Body() dto: EstablishSpouseDto,
    @Req() req: Request,
  ): Promise<OperationSuccessDto> {
    try {
      const userContext = this.getUserContext(req);
      this.appService.setUserContext(userContext);

      await this.appService.handleEstablishSpouse({
        treeId,
        spouseAId: dto.spouseA,
        spouseBId: dto.spouseB,
      });
      return {
        message: `Spouse relationship established: ${dto.spouseA} ↔ ${dto.spouseB}`,
      };
    } catch (err) {
      this.handleDomainError(err);
    }
  }

  /**
   * DELETE /trees/:id/relationships
   * Remove a relationship between two people
   */
  @Delete(':treeId/relationships')
  async removeRelationship(
    @Param('treeId') treeId: string,
    @Body() dto: RemoveRelationshipDto,
    @Req() req: Request,
  ): Promise<OperationSuccessDto> {
    try {
      const userContext = this.getUserContext(req);
      this.appService.setUserContext(userContext);

      await this.appService.handleRemoveRelationship({
        treeId,
        personId1: dto.personId1,
        personId2: dto.personId2,
      });
      return {
        message: `Relationship removed between '${dto.personId1}' and '${dto.personId2}' in tree '${treeId}'`,
      };
    } catch (err) {
      this.handleDomainError(err);
    }
  }

  /**
   * DELETE /trees/:id/persons/:personId
   * Remove a person from the tree
   */
  @Delete(':treeId/persons/:personId')
  async removePerson(
    @Param('treeId') treeId: string,
    @Param('personId') personId: string,
    @Req() req: Request,
  ): Promise<OperationSuccessDto> {
    try {
      const userContext = this.getUserContext(req);
      this.appService.setUserContext(userContext);

      await this.appService.handleRemovePerson({
        treeId,
        personId,
      });
      return {
        message: `Person '${personId}' removed from tree '${treeId}'`,
      };
    } catch (err) {
      this.handleDomainError(err);
    }
  }

  /**
   * GET /trees/:id/persons/:personId
   * Retrieve a person
   */
  @Get(':treeId/persons/:personId')
  async getPerson(
    @Param('treeId') treeId: string,
    @Param('personId') personId: string,
    @Req() req: Request,
  ): Promise<PersonResponseDto> {
    try {
      const userContext = this.getUserContext(req);
      this.appService.setUserContext(userContext);

      const person = await this.appService.handleGetPerson({ treeId, personId });
      if (!person) {
        throw new HttpException('Person not found', HttpStatus.NOT_FOUND);
      }
      return person as PersonResponseDto;
    } catch (err) {
      this.handleDomainError(err);
    }
  }

  /**
   * GET /trees/:id/persons/:personId/ancestors
   * Retrieve ancestors for a person
   */
  @Get(':treeId/persons/:personId/ancestors')
  async getAncestors(
    @Param('treeId') treeId: string,
    @Param('personId') personId: string,
    @Req() req: Request,
  ): Promise<AncestorsResponseDto> {
    try {
      const userContext = this.getUserContext(req);
      this.appService.setUserContext(userContext);

      const ancestors = await this.appService.handleGetAncestors({ treeId, personId });
      if (!ancestors) {
        throw new HttpException('Family tree not found', HttpStatus.NOT_FOUND);
      }
      return { personId, ancestors } as AncestorsResponseDto;
    } catch (err) {
      this.handleDomainError(err);
    }
  }

  /**
   * GET /trees/:id/persons/:personId/descendants
   * Retrieve descendants for a person
   */
  @Get(':treeId/persons/:personId/descendants')
  async getDescendants(
    @Param('treeId') treeId: string,
    @Param('personId') personId: string,
    @Req() req: Request,
  ): Promise<DescendantsResponseDto> {
    try {
      const userContext = this.getUserContext(req);
      this.appService.setUserContext(userContext);

      const descendants = await this.appService.handleGetDescendants({ treeId, personId });
      if (!descendants) {
        throw new HttpException('Family tree not found', HttpStatus.NOT_FOUND);
      }
      return { personId, descendants } as DescendantsResponseDto;
    } catch (err) {
      this.handleDomainError(err);
    }
  }

  /**
   * GET /trees/:id/render
   * Render the genealogy tree
   * Query params: rootPersonId, viewMode
   */
  @Get(':treeId/render')
  async renderTree(
    @Param('treeId') treeId: string,
    @Query('rootPersonId') rootPersonId: string,
    @Query('viewMode') viewMode: 'VERTICAL' | 'HORIZONTAL' | 'LIST' = 'VERTICAL',
    @Req() req: Request,
  ): Promise<RenderTreeResponseDto> {
    try {
      const userContext = this.getUserContext(req);
      this.appService.setUserContext(userContext);

      if (!rootPersonId) {
        throw new HttpException(
          'rootPersonId query parameter is required',
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await this.appService.handleRenderTree({
        treeId,
        rootPersonId,
        viewMode,
      });

      if (!result) {
        throw new HttpException('Tree not found', HttpStatus.NOT_FOUND);
      }

      return result as RenderTreeResponseDto;
    } catch (err) {
      this.handleDomainError(err);
    }
  }

  /**
   * GET /trees/:id/render-data
   * Get tree render data for frontend visualization.
   * Returns a versioned DTO with all nodes and edges for client-side rendering.
   * Respects authorization boundary (VIEWER, EDITOR, or OWNER).
   */
  @Get(':treeId/render-data')
  async getTreeRenderData(
    @Param('treeId') treeId: string,
    @Req() req: Request,
  ) {
    try {
      const userContext = this.getUserContext(req);
      this.appService.setUserContext(userContext);

      return await this.appService.getTreeRenderData(treeId);
    } catch (err) {
      this.handleDomainError(err);
    }
  }

  /**
   * GET /trees/:id/export/json
   * Owner-only: export full tree snapshot as JSON
   */
  @Get(':treeId/export/json')
  async exportJson(
    @Param('treeId') treeId: string,
    @Req() req: Request,
  ) {
    try {
      const userContext = this.getUserContext(req);
      this.appService.setUserContext(userContext);

      // Delegate authorization to policy module
      AuthorizationPolicy.assertIsOwner(userContext);

      return await this.appService.exportTreeSnapshot(treeId);
    } catch (err) {
      this.handleDomainError(err);
    }
  }

  /**
   * GET /trees/:id/export/gedcom
   * Owner-only: export tree as GEDCOM text (read-only)
   */
  @Get(':treeId/export/gedcom')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  async exportGedcom(
    @Param('treeId') treeId: string,
    @Req() req: Request,
  ): Promise<string> {
    try {
      const userContext = this.getUserContext(req);
      this.appService.setUserContext(userContext);

      // Delegate authorization to policy module
      AuthorizationPolicy.assertIsOwner(userContext);

      return await this.appService.exportTreeGedcom(treeId);
    } catch (err) {
      this.handleDomainError(err);
    }
  }

  /**
   * Map domain errors to HTTP responses
   */
  private handleDomainError(err: unknown): never {
    if (err instanceof HttpException) {
      throw err;
    }

    if (err instanceof AuthorizationError) {
      throw new HttpException(err.message, HttpStatus.FORBIDDEN);
    }
    if (err instanceof NotFoundError) {
      throw new HttpException(err.message, HttpStatus.NOT_FOUND);
    }
    if (err instanceof PersonHasRelationshipsError) {
      throw new HttpException(err.message, HttpStatus.CONFLICT);
    }
    if (err instanceof CycleDetectedError) {
      throw new HttpException(
        `Cannot establish relationship: ${err.message}`,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    if (err instanceof DuplicateRelationshipError) {
      throw new HttpException(err.message, HttpStatus.CONFLICT);
    }
    if (err instanceof ParentLimitExceededError) {
      throw new HttpException(err.message, HttpStatus.UNPROCESSABLE_ENTITY);
    }
    if (err instanceof AgeInconsistencyError) {
      throw new HttpException(err.message, HttpStatus.UNPROCESSABLE_ENTITY);
    }
    if (err instanceof InvariantViolationError) {
      throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
    }

    if (err instanceof Error && err.message === 'Family tree not found') {
      throw new HttpException(err.message, HttpStatus.NOT_FOUND);
    }

    // Generic error
    if (err instanceof Error) {
      throw new HttpException(err.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    throw new HttpException(
      'An unexpected error occurred',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
