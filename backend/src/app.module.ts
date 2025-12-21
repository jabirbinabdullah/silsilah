import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { MongoClient } from 'mongodb';
import { GenealogyController } from './presentation/controllers/genealogy.controller';
import { AuthController } from './presentation/controllers/auth.controller';
import { GenealogyApplicationService } from './application/services/genealogy-application.service';
import { MongoGenealogyGraphRepository } from './infrastructure/repositories/genealogy-graph.mongo.repository';
import { MongoUserRepository } from './infrastructure/repositories/user.mongo.repository';
import { MongoAuditLogRepository } from './infrastructure/repositories/audit-log.mongo.repository';
import { AuthService } from './infrastructure/services/auth.service';
import { JwtGuard } from './infrastructure/guards/jwt.guard';
import { GenealogyGraph } from './domain/genealogy-graph';

// Simple factory for GenealogyGraph
const genealogyGraphFactory = {
  create: (treeId: string) => new GenealogyGraph(treeId),
};

// MongoDB connection provider
const mongoClientProvider = {
  provide: 'MONGO_CLIENT',
  useFactory: async () => {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    const client = new MongoClient(uri);
    await client.connect();
    return client;
  },
};

// Genealogy Repository provider
const genealogyRepositoryProvider = {
  provide: 'GENEALOGY_REPOSITORY',
  useFactory: (mongoClient: MongoClient) => {
    const dbName = process.env.MONGODB_DB_NAME || 'silsilah';
    return new MongoGenealogyGraphRepository(mongoClient, dbName);
  },
  inject: ['MONGO_CLIENT'],
};

// User Repository provider
const userRepositoryProvider = {
  provide: 'USER_REPOSITORY',
  useFactory: (mongoClient: MongoClient) => {
    const dbName = process.env.MONGODB_DB_NAME || 'silsilah';
    return new MongoUserRepository(mongoClient, dbName);
  },
  inject: ['MONGO_CLIENT'],
};

// AuditLog Repository provider (append-only)
const auditLogRepositoryProvider = {
  provide: 'AUDIT_LOG_REPOSITORY',
  useFactory: (mongoClient: MongoClient) => {
    const dbName = process.env.MONGODB_DB_NAME || 'silsilah';
    return new MongoAuditLogRepository(mongoClient, dbName);
  },
  inject: ['MONGO_CLIENT'],
};

// Auth Service provider
const authServiceProvider = {
  provide: AuthService,
  useFactory: () => {
    const jwtSecret = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';
    return new AuthService(jwtSecret);
  },
};

// Application service provider
const appServiceProvider = {
  provide: GenealogyApplicationService,
  useFactory: (repository: any, auditLogRepository: any) => {
    return new GenealogyApplicationService(
      repository,
      genealogyGraphFactory,
      false,
      auditLogRepository,
    );
  },
  inject: ['GENEALOGY_REPOSITORY', 'AUDIT_LOG_REPOSITORY'],
};

@Module({
  imports: [],
  providers: [
    mongoClientProvider,
    genealogyRepositoryProvider,
    userRepositoryProvider,
    auditLogRepositoryProvider,
    authServiceProvider,
    appServiceProvider,
    // Conditionally enable global JWT guard via env toggle
    {
      provide: APP_GUARD,
      useFactory: (authService: AuthService) => {
        const enabled = (process.env.ENABLE_AUTH_GUARD || 'false').toLowerCase() === 'true';
        return enabled ? new JwtGuard(authService) : { canActivate: () => true };
      },
      inject: [AuthService],
    },
  ],
  controllers: [GenealogyController, AuthController],
})
export class AppModule {}
