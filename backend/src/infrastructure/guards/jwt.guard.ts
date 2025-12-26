import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from '../services/auth.service';
import { TokenInvalidError, TokenExpiredError } from '../../domain/errors';
import type { UserContext } from '../../domain/types';

/**
 * JWT Guard extracts and verifies JWT tokens from Authorization header.
 * Converts token payload to UserContext and attaches it to request.
 */
@Injectable()
export class JwtGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    // Allow unauthenticated access to login endpoint
    if (request.path === '/auth/login') {
      return true;
    }

    // Extract token from Authorization header
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const token = authHeader.substring('Bearer '.length);

    // Verify token
    try {
      const payload = this.authService.verifyToken(token);
      const userContext: UserContext = this.authService.payloadToUserContext(payload);

      // Attach user context to request for controllers to use
      (request as any).userContext = userContext;

      return true;
    } catch (err) {
      if (err instanceof TokenExpiredError) {
        throw new UnauthorizedException('Token has expired');
      }
      if (err instanceof TokenInvalidError) {
        throw new UnauthorizedException('Invalid or malformed token');
      }
      throw new UnauthorizedException('Token verification failed');
    }
  }
}
