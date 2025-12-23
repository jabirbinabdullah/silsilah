import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';

/**
 * Marker metadata key for endpoints that allow public read-only access
 */
export const IS_PUBLIC_READ = 'isPublicRead';

/**
 * Decorator to mark an endpoint as publicly readable (no JWT required)
 * ONLY for read-only operations - mutations must ALWAYS require authentication
 */
export const PublicRead = () => (target: any, key: string, descriptor: PropertyDescriptor) => {
  Reflect.defineMetadata(IS_PUBLIC_READ, true, descriptor.value);
  return descriptor;
};

/**
 * Guard for authenticated read operations.
 * Requires valid JWT token.
 * Populates req.userContext with { userId, username, role }
 */
@Injectable()
export class AuthenticatedReadGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);
    const secret = process.env.JWT_SECRET || 'test-secret';

    try {
      const decoded = jwt.verify(token, secret) as any;
      (request as any).userContext = {
        userId: decoded.userId || decoded.sub,
        username: decoded.username,
        role: decoded.role || 'VIEWER',
      };
      return true;
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}

/**
 * Guard for public read-only operations.
 * Does NOT require JWT token.
 * Sets a default viewer context for authorization logic.
 * 
 * IMPORTANT: This guard should ONLY be applied to read operations.
 * Mutations must ALWAYS use AuthenticatedReadGuard or role-specific guards.
 */
@Injectable()
export class PublicReadGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    
    // Check if endpoint is marked as public read
    const handler = context.getHandler();
    const isPublicRead = Reflect.getMetadata(IS_PUBLIC_READ, handler);
    
    if (!isPublicRead) {
      throw new UnauthorizedException('This endpoint requires authentication');
    }

    // Set anonymous viewer context
    (request as any).userContext = {
      userId: 'anonymous',
      username: 'anonymous',
      role: 'VIEWER',
    };
    
    return true;
  }
}
