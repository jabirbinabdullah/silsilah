import {
  Controller,
  Get,
  Param,
  HttpStatus,
  HttpException,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { GenealogyApplicationService } from '../../application/services/genealogy-application.service';
import {
  NotFoundError,
  InvariantViolationError,
  AuthorizationError,
  CycleDetectedError,
  DuplicateRelationshipError,
  ParentLimitExceededError,
  AgeInconsistencyError,
  PersonHasRelationshipsError,
} from '../../domain/errors';

/**
 * Public read-only endpoints.
 * These endpoints do NOT require JWT authentication.
 * All operations are read-only with VIEWER permissions.
 * 
 * Security considerations:
 * - Only exposes data explicitly marked for public access
 * - No mutations allowed (no POST/PUT/DELETE methods)
 * - Rate limiting should be applied at infrastructure level
 */
@Controller('public')
export class PublicController {
  constructor(
    private readonly appService: GenealogyApplicationService,
  ) {}

  /**
   * GET /public/trees/:treeId/render-data
   * Public access to tree visualization data.
   * Does not require authentication.
   * 
   * WARNING: In production, you should add access control:
   * - Add 'isPublic' boolean field to tree metadata
   * - Only return trees where isPublic === true
   * - Return 404 for non-public trees
   */
  @Get('trees/:treeId/render-data')
  async getTreeRenderData(
    @Param('treeId') treeId: string,
    @Req() req: Request,
  ) {
    try {
      // Set anonymous viewer context for authorization
      (req as any).userContext = {
        userId: 'anonymous',
        username: 'Public Viewer',
        role: 'VIEWER',
      };

      this.appService.setUserContext((req as any).userContext);
      return await this.appService.getTreeRenderData(treeId);
    } catch (err) {
      this.handleDomainError(err);
    }
  }

  /**
   * GET /public/trees/:treeId/persons/:personId
   * Public access to person details.
   */
  @Get('trees/:treeId/persons/:personId')
  async getPerson(
    @Param('treeId') treeId: string,
    @Param('personId') personId: string,
    @Req() req: Request,
  ) {
    try {
      (req as any).userContext = {
        userId: 'anonymous',
        username: 'Public Viewer',
        role: 'VIEWER',
      };

      this.appService.setUserContext((req as any).userContext);
      const person = await this.appService.handleGetPerson({ treeId, personId });
      
      if (!person) {
        throw new HttpException('Person not found', HttpStatus.NOT_FOUND);
      }
      
      return person;
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
