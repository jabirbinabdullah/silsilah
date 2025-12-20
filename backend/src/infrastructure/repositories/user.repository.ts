import type { UserAccount } from '../../domain/types';

export interface UserRepository {
  findByUsername(username: string): Promise<UserAccount | null>;
  save(user: UserAccount): Promise<void>;
}

// Prisma implementation skeleton; no business logic here.
export class PrismaUserRepository implements UserRepository {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private readonly prisma: any) {}

  async findByUsername(username: string): Promise<UserAccount | null> {
    throw new Error('Not implemented');
  }

  async save(user: UserAccount): Promise<void> {
    throw new Error('Not implemented');
  }
}
