import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { InvalidCredentialsError, TokenInvalidError, TokenExpiredError } from '../../domain/errors';
import type { User, UserContext } from '../../domain/types';

export interface JwtPayload {
  userId: string;
  username: string;
  role: 'OWNER' | 'EDITOR' | 'VIEWER';
}

/**
 * AuthService handles password hashing, JWT issuance, and token verification.
 * Auth-agnostic: no dependency on domain logic or application service.
 */
export class AuthService {
  private readonly jwtSecret: string;
  private readonly jwtExpiresIn: string = '24h';
  private readonly bcryptRounds: number = 10;

  constructor(jwtSecret: string) {
    if (!jwtSecret || jwtSecret.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters');
    }
    this.jwtSecret = jwtSecret;
  }

  /**
   * Hash a plain text password using bcrypt.
   */
  async hashPassword(plainPassword: string): Promise<string> {
    return bcrypt.hash(plainPassword, this.bcryptRounds);
  }

  /**
   * Verify a plain text password against a hash.
   */
  async verifyPassword(plainPassword: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hash);
  }

  /**
   * Issue a JWT token for a user.
   */
  issueToken(user: User): string {
    const payload: JwtPayload = {
      userId: user.id,
      username: user.username,
      role: user.role,
    };

    // Type cast to 'any' for compatibility with jwt.sign overloads
    const options: any = {
      expiresIn: this.jwtExpiresIn,
    };

    return jwt.sign(payload as any, this.jwtSecret, options);
  }

  /**
   * Verify a JWT token and extract the payload.
   * Throws TokenInvalidError or TokenExpiredError on failure.
   */
  verifyToken(token: string): JwtPayload {
    try {
      const payload = jwt.verify(token, this.jwtSecret) as JwtPayload;
      return payload;
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw new TokenExpiredError('Token has expired');
      }
      if (err instanceof jwt.JsonWebTokenError) {
        throw new TokenInvalidError('Invalid or malformed token');
      }
      throw new TokenInvalidError('Token verification failed');
    }
  }

  /**
   * Convert JWT payload to UserContext.
   */
  payloadToUserContext(payload: JwtPayload): UserContext {
    return {
      userId: payload.userId,
      username: payload.username,
      role: payload.role,
    };
  }
}
