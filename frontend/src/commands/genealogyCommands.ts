/**
 * Genealogy Commands Layer
 * 
 * SINGLE ENTRY POINT for all write operations on genealogy data.
 * 
 * Principles:
 * - Intention-revealing function names
 * - No business logic here (delegates to API)
 * - Typed request/response payloads
 * - Centralized error handling and logging
 * - Audit trail ready (all mutations pass through here)
 * 
 * @module genealogyCommands
 */

import * as api from '../api';

/**
 * Response from successful mutations
 */
export interface CommandResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

/**
 * Person Creation Command
 */
export interface AddPersonCommand {
  treeId: string;
  name: string;
  gender: 'MALE' | 'FEMALE' | 'UNKNOWN';
  birthDate?: string | null;
  birthPlace?: string | null;
  deathDate?: string | null;
}

/**
 * Parent-Child Relationship Command
 */
export interface AddParentChildRelationshipCommand {
  treeId: string;
  parentId: string;
  childId: string;
}

/**
 * Spouse Relationship Command
 */
export interface AddSpouseRelationshipCommand {
  treeId: string;
  personAId: string;
  personBId: string;
}

/**
 * Person Update Command
 */
export interface UpdatePersonCommand {
  treeId: string;
  personId: string;
  name: string;
  gender: 'MALE' | 'FEMALE' | 'UNKNOWN';
  birthDate?: string | null;
  birthPlace?: string | null;
  deathDate?: string | null;
}

/**
 * Person Deletion Command
 */
export interface DeletePersonCommand {
  treeId: string;
  personId: string;
  cascade?: 'person-only' | 'with-children' | 'with-all-relationships';
}

/**
 * Tree Update Command
 */
export interface UpdateTreeCommand {
  treeId: string;
  name?: string;
  description?: string;
  visibility?: 'public' | 'private';
}

/**
 * GenealogyCommandBus - Centralized mutation dispatcher
 * 
 * All write operations MUST go through these methods.
 * Components are forbidden from calling API mutation functions directly.
 */
export class GenealogyCommandBus {
  /**
   * Create a new person in a family tree.
   * 
   * @param cmd - Person creation payload
   * @returns Person ID if successful
   * @throws Error with descriptive message on failure
   */
  static async addPerson(cmd: AddPersonCommand): Promise<CommandResult<{ personId: string }>> {
    try {
      const result = await api.createPerson(cmd.treeId, {
        personId: '', // Backend generates
        name: cmd.name,
        gender: cmd.gender,
        birthDate: cmd.birthDate ?? null,
        birthPlace: cmd.birthPlace ?? null,
        deathDate: cmd.deathDate ?? null,
      });

      return {
        success: true,
        data: result,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Failed to add person',
        code: err?.code,
      };
    }
  }

  /**
   * Establish a parent-child relationship.
   * 
   * Validates that:
   * - Both persons exist in the tree
   * - No cycles are created
   * - Age constraints are satisfied (if enforced)
   * - Parent limit is not exceeded
   * 
   * @param cmd - Relationship payload
   * @returns Success message
   * @throws Error on constraint violation
   */
  static async addParentChildRelationship(
    cmd: AddParentChildRelationshipCommand
  ): Promise<CommandResult<{ message: string }>> {
    try {
      const result = await api.establishParentChild(cmd.treeId, {
        parentId: cmd.parentId,
        childId: cmd.childId,
      });

      return {
        success: true,
        data: result,
      };
    } catch (err: any) {
      return {
        success: false,
        error: this.parseApiError(err),
        code: err?.code,
      };
    }
  }

  /**
   * Establish a spouse relationship.
   * 
   * Creates a bidirectional spouse link between two persons.
   * 
   * @param cmd - Relationship payload
   * @returns Success message
   * @throws Error if either person doesn't exist
   */
  static async addSpouseRelationship(
    cmd: AddSpouseRelationshipCommand
  ): Promise<CommandResult<{ message: string }>> {
    try {
      const result = await api.establishSpouseRelationship(cmd.treeId, {
        personAId: cmd.personAId,
        personBId: cmd.personBId,
      });

      return {
        success: true,
        data: result,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Failed to add spouse relationship',
        code: err?.code,
      };
    }
  }

  /**
   * Update person attributes.
   * 
   * @param cmd - Person update payload
   * @returns Updated person ID
   * @throws Error on validation failure
   */
  static async updatePerson(cmd: UpdatePersonCommand): Promise<CommandResult<{ personId: string }>> {
    try {
      const result = await api.updatePerson(cmd.treeId, cmd.personId, {
        name: cmd.name,
        gender: cmd.gender,
        birthDate: cmd.birthDate ?? null,
        birthPlace: cmd.birthPlace ?? null,
        deathDate: cmd.deathDate ?? null,
      });

      return {
        success: true,
        data: result,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Failed to update person',
        code: err?.code,
      };
    }
  }

  /**
   * Delete a person from the tree.
   * 
   * Cascade options control what happens to related data:
   * - person-only: Delete person, fail if has relationships
   * - with-children: Delete person and all descendants
   * - with-all-relationships: Delete person and all relationships
   * 
   * @param cmd - Deletion payload with cascade strategy
   * @returns Success message
   * @throws Error if cascade strategy is violated
   */
  static async deletePerson(cmd: DeletePersonCommand): Promise<CommandResult<{ message: string }>> {
    try {
      const result = await api.deletePerson(cmd.treeId, cmd.personId, {
        cascade: cmd.cascade || 'person-only',
      });

      return {
        success: true,
        data: result,
      };
    } catch (err: any) {
      return {
        success: false,
        error: this.parseApiError(err),
        code: err?.code,
      };
    }
  }

  /**
   * Update tree metadata.
   * 
   * @param cmd - Tree update payload
   * @returns Success message
   */
  static async updateTree(cmd: UpdateTreeCommand): Promise<CommandResult<{ message: string }>> {
    try {
      const result = await api.updateTree(cmd.treeId, {
        name: cmd.name,
        description: cmd.description,
        visibility: cmd.visibility,
      });

      return {
        success: true,
        data: result,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Failed to update tree',
        code: err?.code,
      };
    }
  }

  /**
   * Delete an entire family tree (owner-only).
   * 
   * @param treeId - Tree to delete
   * @returns Success message
   */
  static async deleteTree(treeId: string): Promise<CommandResult<{ message: string }>> {
    try {
      const result = await api.deleteTree(treeId);

      return {
        success: true,
        data: result,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Failed to delete tree',
        code: err?.code,
      };
    }
  }

  /**
   * Create a new family tree
   */
  static async createTree(cmd: {
    name: string;
    description?: string;
    visibility?: 'public' | 'private';
  }): Promise<CommandResult<{ treeId: string; name: string }>> {
    try {
      const { createTree } = await import('../api');
      const data = await createTree({
        name: cmd.name,
        description: cmd.description,
        visibility: cmd.visibility,
      });
      return { success: true, data };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Failed to create tree',
        code: err?.code,
      };
    }
  }

  /**
   * Duplicate an existing family tree
   */
  static async duplicateTree(cmd: {
    sourceTreeId: string;
    newName: string;
  }): Promise<CommandResult<{ treeId: string; name: string }>> {
    try {
      const { duplicateTree } = await import('../api');
      const data = await duplicateTree(cmd.sourceTreeId, cmd.newName);
      return { success: true, data };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Failed to duplicate tree',
        code: err?.code,
      };
    }
  }

  /**
   * Parses API error responses into human-readable messages.
   * Maps HTTP status codes and domain error types to clear text.
   * 
   * @internal
   */
  private static parseApiError(err: any): string {
    if (!err) return 'Unknown error';

    // Check for domain-specific error patterns
    const message = err?.message || '';

    if (message.includes('cycle')) {
      return 'Cannot establish relationship: would create a circular ancestry';
    }
    if (message.includes('parent limit')) {
      return 'Person already has maximum number of parents';
    }
    if (message.includes('age')) {
      return 'Parent must be older than child';
    }
    if (message.includes('duplicate')) {
      return 'Relationship already exists';
    }
    if (message.includes('relationships')) {
      return 'Cannot delete person with existing relationships';
    }

    return message;
  }
}
