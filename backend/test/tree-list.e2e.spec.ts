import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import { MongoClient } from 'mongodb';
import { AppModule } from '../src/app.module';

describe('Tree Listing E2E', () => {
  let app: INestApplication;
  let client: MongoClient;
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const dbName = process.env.MONGODB_DB_NAME || 'silsilah';

  beforeAll(async () => {
    process.env.ENABLE_AUTH_GUARD = 'false';
    process.env.MONGODB_DB_NAME = dbName;
    process.env.MONGODB_URI = uri;

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    client = new MongoClient(uri);
    await client.connect();
  });

  afterAll(async () => {
    const db = client.db(dbName);
    await db.collection('family_trees').deleteMany({});
    await app.close();
    await client.close();
  });

  beforeEach(async () => {
    const db = client.db(dbName);
    await db.collection('family_trees').deleteMany({});
  });

  describe('GET /trees', () => {
    it('returns empty array when user has no trees', async () => {
      const res = await request(app.getHttpServer())
        .get('/trees')
        .expect(HttpStatus.OK);

      expect(res.body).toEqual({
        trees: [],
        total: 0,
      });
    });

    it('returns tree where user is owner', async () => {
      const db = client.db(dbName);
      const now = new Date();
      
      await db.collection('family_trees').insertOne({
        _id: 'tree-owned' as any,
        treeId: 'tree-owned',
        persons: [
          { id: 'p1', label: 'Alice' },
          { id: 'p2', label: 'Bob' },
        ],
        parentChildEdges: [],
        spouseEdges: [],
        version: 1,
        ownerId: 'test-user',
        members: [],
        createdAt: now,
        updatedAt: now,
      } as any);

      const res = await request(app.getHttpServer())
        .get('/trees')
        .expect(HttpStatus.OK);

      expect(res.body.total).toBe(1);
      expect(res.body.trees).toHaveLength(1);
      expect(res.body.trees[0]).toMatchObject({
        treeId: 'tree-owned',
        name: 'tree-owned',
        role: 'OWNER',
        personCount: 2,
      });
      expect(res.body.trees[0].createdAt).toBeDefined();
      expect(res.body.trees[0].updatedAt).toBeDefined();
    });

    it('returns tree where user is EDITOR member', async () => {
      const db = client.db(dbName);
      const now = new Date();
      
      await db.collection('family_trees').insertOne({
        _id: 'tree-member' as any,
        treeId: 'tree-member',
        persons: [{ id: 'p1', label: 'Alice' }],
        parentChildEdges: [],
        spouseEdges: [],
        version: 1,
        ownerId: 'other-user',
        members: [
          { userId: 'test-user', role: 'EDITOR' },
        ],
        createdAt: now,
        updatedAt: now,
      } as any);

      const res = await request(app.getHttpServer())
        .get('/trees')
        .expect(HttpStatus.OK);

      expect(res.body.total).toBe(1);
      expect(res.body.trees[0]).toMatchObject({
        treeId: 'tree-member',
        role: 'EDITOR',
        personCount: 1,
      });
    });

    it('returns tree where user is VIEWER member', async () => {
      const db = client.db(dbName);
      const now = new Date();
      
      await db.collection('family_trees').insertOne({
        _id: 'tree-viewer' as any,
        treeId: 'tree-viewer',
        persons: [],
        parentChildEdges: [],
        spouseEdges: [],
        version: 1,
        ownerId: 'other-user',
        members: [
          { userId: 'test-user', role: 'VIEWER' },
        ],
        createdAt: now,
        updatedAt: now,
      } as any);

      const res = await request(app.getHttpServer())
        .get('/trees')
        .expect(HttpStatus.OK);

      expect(res.body.total).toBe(1);
      expect(res.body.trees[0]).toMatchObject({
        treeId: 'tree-viewer',
        role: 'VIEWER',
        personCount: 0,
      });
    });

    it('returns multiple trees with correct roles', async () => {
      const db = client.db(dbName);
      const now = new Date();
      
      // Tree owned by user
      await db.collection('family_trees').insertOne({
        _id: 'tree-owned' as any,
        treeId: 'tree-owned',
        persons: [{ id: 'p1', label: 'Alice' }],
        parentChildEdges: [],
        spouseEdges: [],
        version: 1,
        ownerId: 'test-user',
        members: [],
        createdAt: now,
        updatedAt: now,
      } as any);

      // Tree where user is editor
      await db.collection('family_trees').insertOne({
        _id: 'tree-editor' as any,
        treeId: 'tree-editor',
        persons: [{ id: 'p2', label: 'Bob' }],
        parentChildEdges: [],
        spouseEdges: [],
        version: 1,
        ownerId: 'other-user',
        members: [{ userId: 'test-user', role: 'EDITOR' }],
        createdAt: now,
        updatedAt: now,
      } as any);

      // Tree where user is viewer
      await db.collection('family_trees').insertOne({
        _id: 'tree-viewer' as any,
        treeId: 'tree-viewer',
        persons: [],
        parentChildEdges: [],
        spouseEdges: [],
        version: 1,
        ownerId: 'other-user',
        members: [{ userId: 'test-user', role: 'VIEWER' }],
        createdAt: now,
        updatedAt: now,
      } as any);

      const res = await request(app.getHttpServer())
        .get('/trees')
        .expect(HttpStatus.OK);

      expect(res.body.total).toBe(3);
      expect(res.body.trees).toHaveLength(3);

      const roles = res.body.trees.map((t: any) => ({ treeId: t.treeId, role: t.role }));
      expect(roles).toEqual(expect.arrayContaining([
        { treeId: 'tree-owned', role: 'OWNER' },
        { treeId: 'tree-editor', role: 'EDITOR' },
        { treeId: 'tree-viewer', role: 'VIEWER' },
      ]));
    });

    it('does not return trees where user has no access', async () => {
      const db = client.db(dbName);
      const now = new Date();
      
      // Tree owned by someone else, user not a member
      await db.collection('family_trees').insertOne({
        _id: 'tree-no-access' as any,
        treeId: 'tree-no-access',
        persons: [{ id: 'p1', label: 'Alice' }],
        parentChildEdges: [],
        spouseEdges: [],
        version: 1,
        ownerId: 'other-user',
        members: [
          { userId: 'another-user', role: 'EDITOR' },
        ],
        createdAt: now,
        updatedAt: now,
      } as any);

      const res = await request(app.getHttpServer())
        .get('/trees')
        .expect(HttpStatus.OK);

      expect(res.body).toEqual({
        trees: [],
        total: 0,
      });
    });

    it('includes correct personCount for each tree', async () => {
      const db = client.db(dbName);
      const now = new Date();
      
      await db.collection('family_trees').insertOne({
        _id: 'tree-small' as any,
        treeId: 'tree-small',
        persons: [
          { id: 'p1', label: 'Alice' },
        ],
        parentChildEdges: [],
        spouseEdges: [],
        version: 1,
        ownerId: 'test-user',
        members: [],
        createdAt: now,
        updatedAt: now,
      } as any);

      await db.collection('family_trees').insertOne({
        _id: 'tree-large' as any,
        treeId: 'tree-large',
        persons: [
          { id: 'p1', label: 'Alice' },
          { id: 'p2', label: 'Bob' },
          { id: 'p3', label: 'Charlie' },
          { id: 'p4', label: 'Diana' },
          { id: 'p5', label: 'Eve' },
        ],
        parentChildEdges: [],
        spouseEdges: [],
        version: 1,
        ownerId: 'test-user',
        members: [],
        createdAt: now,
        updatedAt: now,
      } as any);

      const res = await request(app.getHttpServer())
        .get('/trees')
        .expect(HttpStatus.OK);

      expect(res.body.total).toBe(2);
      
      const smallTree = res.body.trees.find((t: any) => t.treeId === 'tree-small');
      const largeTree = res.body.trees.find((t: any) => t.treeId === 'tree-large');

      expect(smallTree.personCount).toBe(1);
      expect(largeTree.personCount).toBe(5);
    });
  });
});
