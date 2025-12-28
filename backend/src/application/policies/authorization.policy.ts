/**
 * Authorization Policy Module
 * 
 * Centralizes all authorization gates and role checks.
 * Controllers MUST delegate authorization through this module.
 * 
 * @module authorization.policy
 */

import type { UserContext } from '../../domain/types';
import { AuthorizationError } from '../../domain/errors';

/**
 * Authorization result with clear pass/fail status
 */
export interface AuthorizationResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Authorization Policy Service
 * 
 * Enforces access control rules for genealogy operations.
 * Separates public vs authenticated paths.
 */
export class AuthorizationPolicy {
  /**
   * Checks if user is authenticated
   */
  static requireAuthenticated(context: UserContext | undefined): void {
    if (!context) {
      throw new AuthorizationError('Authentication required');
    }
  }

  /**
   * Checks if user has OWNER role
   */
  static requireOwner(context: UserContext | undefined): void {
    this.requireAuthenticated(context);
    if (context!.role !== 'OWNER') {
      throw new AuthorizationError('Only owners can perform this operation');
    }
  }

  /**
   * Checks if user has EDITOR or OWNER role
   */
  static requireEditor(context: UserContext | undefined): void {
    this.requireAuthenticated(context);
    if (context!.role !== 'OWNER' && context!.role !== 'EDITOR') {
      throw new AuthorizationError('Editor or owner role required');
    }
  }

  /**
   * Checks if user can write to a tree (OWNER or EDITOR)
   */
  static canWrite(context: UserContext | undefined): boolean {
    if (!context) return false;
    return context.role === 'OWNER' || context.role === 'EDITOR';
  }

  /**
   * Checks if user can read (public paths allow anonymous)
   */
  static canRead(context: UserContext | undefined, isPublicTree: boolean): boolean {
    // Public trees are readable by anyone
    if (isPublicTree) return true;
    // Private trees require authentication
    return !!context;
  }

  /**
   * Verifies user can perform owner-only operations
   * Returns detailed result for conditional logic
   */
  static checkOwnerAccess(context: UserContext | undefined): AuthorizationResult {
    if (!context) {
      return { allowed: false, reason: 'Authentication required' };
    }
    if (context.role !== 'OWNER') {
      return { allowed: false, reason: 'Owner role required' };
    }
    return { allowed: true };
  }

  /**
   * Verifies user can perform write operations
   */
  static checkWriteAccess(context: UserContext | undefined): AuthorizationResult {
    if (!context) {
      return { allowed: false, reason: 'Authentication required' };
    }
    if (context.role !== 'OWNER' && context.role !== 'EDITOR') {
      return { allowed: false, reason: 'Write access denied' };
    }
    return { allowed: true };
  }

  /**
   * Determines if operation requires authentication
   * Used to distinguish public vs authenticated endpoints
   */
  static isPublicEndpoint(path: string): boolean {
    // Public read endpoints: /public/trees/:id/*
    return path.includes('/public/');
  }

  /**
   * Throws if user lacks write access
   */
  static assertCanWrite(context: UserContext | undefined): void {
    const result = this.checkWriteAccess(context);
    if (!result.allowed) {
      throw new AuthorizationError(result.reason || 'Access denied');
    }
  }

  /**
   * Throws if user lacks owner access
   */
  static assertIsOwner(context: UserContext | undefined): void {
    const result = this.checkOwnerAccess(context);
    if (!result.allowed) {
      throw new AuthorizationError(result.reason || 'Owner access required');
    }
  }
}
