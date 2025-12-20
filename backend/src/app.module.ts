import { Module } from '@nestjs/common';
import { MongoClient } from 'mongodb';
import { GenealogyController } from './presentation/controllers/genealogy.controller';
import { GenealogyApplicationService } from './application/services/genealogy-application.service';
import { MongoGenealogyGraphRepository } from './infrastructure/repositories/genealogy-graph.mongo.repository';
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

// Repository provider
const repositoryProvider = {
  provide: 'GENEALOGY_REPOSITORY',
  useFactory: (mongoClient: MongoClient) => {
    const dbName = process.env.MONGODB_DB_NAME || 'silsilah';
    return new MongoGenealogyGraphRepository(mongoClient, dbName);
  },
  inject: ['MONGO_CLIENT'],
};

// Application service provider
const appServiceProvider = {
  provide: GenealogyApplicationService,
  useFactory: (repository: any) => {
    return new GenealogyApplicationService(repository, genealogyGraphFactory);
  },
  inject: ['GENEALOGY_REPOSITORY'],
};

@Module({
  imports: [],
  providers: [mongoClientProvider, repositoryProvider, appServiceProvider],
  controllers: [GenealogyController],
})
export class AppModule {}
