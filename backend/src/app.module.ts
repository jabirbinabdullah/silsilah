import { Inject, Module, OnModuleDestroy, Optional } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { MongoClient } from 'mongodb';
import { GenealogyController } from './presentation/controllers/genealogy.controller';
import { AuthController } from './presentation/controllers/auth.controller';
import { PublicController } from './presentation/controllers/public.controller';
import { HealthController } from './presentation/controllers/health.controller';
import { GenealogyApplicationService } from './application/services/genealogy-application.service';
import { GetTreeActivityHandler } from './application/queries/get-tree-activity.query';
import { GetPersonHistoryHandler } from './application/queries/get-person-history.query';
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
    const options = {
      serverSelectionTimeoutMS: Number(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS || 5000),
      maxPoolSize: Number(process.env.MONGODB_MAX_POOL_SIZE || 20),
      minPoolSize: Number(process.env.MONGODB_MIN_POOL_SIZE || 0),
    };
    console.log('[MONGO] Connecting to:', uri);
    const client = new MongoClient(uri, options);
    try {
      await client.connect();
      console.log('[MONGO] Connected successfully');
      return client;
    } catch (err) {
      console.error('[MONGO] Connection failed:', err);
      throw err;
    }
  },
  inject: [],
  durable: true,
};

// Optional read-only MongoDB client (used for read paths if provided)
const readonlyMongoClientProvider = {
  provide: 'READONLY_MONGO_CLIENT',
  useFactory: async () => {
    const uri = process.env.MONGODB_READONLY_URI;
    if (!uri) return null;
    const options = {
      serverSelectionTimeoutMS: Number(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS || 5000),
      maxPoolSize: Number(process.env.MONGODB_MAX_POOL_SIZE || 20),
      minPoolSize: Number(process.env.MONGODB_MIN_POOL_SIZE || 0),
      readPreference: 'secondaryPreferred' as const,
    };
    const client = new MongoClient(uri, options);
    await client.connect();
    return client;
  },
  durable: true,
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

// Optional read-only Genealogy Repository for queries
const readGenealogyRepositoryProvider = {
  provide: 'READ_GENEALOGY_REPOSITORY',
  useFactory: (readonlyClient: MongoClient | null, mongoClient: MongoClient) => {
    const client = readonlyClient ?? mongoClient;
    const dbName = process.env.MONGODB_DB_NAME || 'silsilah';
    return new MongoGenealogyGraphRepository(client, dbName);
  },
  inject: ['READONLY_MONGO_CLIENT', 'MONGO_CLIENT'],
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

const getTreeActivityHandlerProvider = {
  provide: GetTreeActivityHandler,
  useFactory: (auditLogRepository: any, readRepository: any) => {
    return new GetTreeActivityHandler(auditLogRepository, readRepository);
  },
  inject: ['AUDIT_LOG_REPOSITORY', 'READ_GENEALOGY_REPOSITORY'],
};

const getPersonHistoryHandlerProvider = {
  provide: GetPersonHistoryHandler,
  useFactory: (auditLogRepository: any, readRepository: any) => {
    return new GetPersonHistoryHandler(auditLogRepository, readRepository);
  },
  inject: ['AUDIT_LOG_REPOSITORY', 'READ_GENEALOGY_REPOSITORY'],
};

// Application service provider
const appServiceProvider = {
  provide: GenealogyApplicationService,
  useFactory: (repository: any, auditLogRepository: any, readRepository: any) => {
    return new GenealogyApplicationService(
      repository,
      genealogyGraphFactory,
      false,
      auditLogRepository,
      readRepository,
    );
  },
  inject: ['GENEALOGY_REPOSITORY', 'AUDIT_LOG_REPOSITORY', 'READ_GENEALOGY_REPOSITORY'],
};

@Module({
  imports: [],
  providers: [
    mongoClientProvider,
    readonlyMongoClientProvider,
    genealogyRepositoryProvider,
    readGenealogyRepositoryProvider,
    userRepositoryProvider,
    auditLogRepositoryProvider,
    authServiceProvider,
    getTreeActivityHandlerProvider,
    getPersonHistoryHandlerProvider,
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
  controllers: [GenealogyController, AuthController, PublicController, HealthController],
})
export class AppModule {}
