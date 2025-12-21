import { Controller, Post, Body, HttpCode, HttpStatus, Inject } from '@nestjs/common';
import { AuthService } from '../../infrastructure/services/auth.service';
import type { UserRepository } from '../../infrastructure/repositories/user.mongo.repository';
import { InvalidCredentialsError } from '../../domain/errors';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  userId: string;
  username: string;
  role: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    @Inject('USER_REPOSITORY') private readonly userRepository: UserRepository,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() req: LoginRequest): Promise<LoginResponse> {
    if (!req.username || !req.password) {
      throw new InvalidCredentialsError('Username and password are required');
    }

    // Find user by username
    const user = await this.userRepository.findByUsername(req.username);
    if (!user) {
      throw new InvalidCredentialsError('Invalid username or password');
    }

    // Verify password
    const passwordMatch = await this.authService.verifyPassword(req.password, user.passwordHash);
    if (!passwordMatch) {
      throw new InvalidCredentialsError('Invalid username or password');
    }

    // Issue JWT token
    const token = this.authService.issueToken(user);

    return {
      token,
      userId: user.id,
      username: user.username,
      role: user.role,
    };
  }
}
