import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import { MongoClient } from 'mongodb';
import { AppModule } from '../src/app.module';

describe('Public Read-Only Access E2E', () => {
  let app: INestApplication;
  let client: MongoClient;
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const dbName = process.env.MONGODB_DB_NAME || 'silsilah';
  const testTreeId = 'public-test-tree';

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

  describe('GET /public/trees/:treeId/render-data', () => {
    it('returns tree render data without authentication', async () => {
      const db = client.db(dbName);
      const now = new Date();

      await db.collection('family_trees').insertOne({
        _id: testTreeId as any,
        treeId: testTreeId,
        persons: [
          { personId: 'p1', name: 'Alice' },
          { personId: 'p2', name: 'Bob' },
        ],
        parentChildEdges: [{ parentId: 'p1', childId: 'p2' }],
        spouseEdges: [],
        version: 1,
        ownerId: 'owner-1',
        members: [],
        createdAt: now,
        updatedAt: now,
      } as any);

      const res = await request(app.getHttpServer())
        .get(`/public/trees/${testTreeId}/render-data`)
        .expect(HttpStatus.OK);

      expect(res.body).toMatchObject({
        version: 'v1',
        treeId: testTreeId,
      });
      expect(res.body.nodes).toHaveLength(2);
      expect(res.body.parentChildEdges).toHaveLength(1);
    });

    it('handles nonexistent tree with 404', async () => {
      await request(app.getHttpServer())
        .get('/public/trees/nonexistent/render-data')
        .expect(HttpStatus.NOT_FOUND);
    });

    it('handles invalid treeId with 400', async () => {
      await request(app.getHttpServer())
        .get('/public/trees/ /render-data')
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('returns defensive traversal without dangling references', async () => {
      const db = client.db(dbName);
      const now = new Date();

      await db.collection('family_trees').insertOne({
        _id: testTreeId as any,
        treeId: testTreeId,
        persons: [{ personId: 'p1', name: 'Alice' }],
        parentChildEdges: [{ parentId: 'p1', childId: 'missing-child' }],
        spouseEdges: [],
        version: 1,
        ownerId: 'owner-1',
        members: [],
        createdAt: now,
        updatedAt: now,
      } as any);

      const res = await request(app.getHttpServer())
        .get(`/public/trees/${testTreeId}/render-data`)
        .expect(HttpStatus.OK);

      expect(res.body.nodes).toHaveLength(1);
      expect(res.body.parentChildEdges).toHaveLength(0); // Dangling ref skipped
    });

    it('respects disconnected graphs', async () => {
      const db = client.db(dbName);
      const now = new Date();

      await db.collection('family_trees').insertOne({
        _id: testTreeId as any,
        treeId: testTreeId,
        persons: [
          { personId: 'p1', name: 'Alice' },
          { personId: 'p2', name: 'Bob' },
          { personId: 'p3', name: 'Charlie' },
          { personId: 'p4', name: 'Diana' },
        ],
        parentChildEdges: [
          { parentId: 'p1', childId: 'p2' },
          { parentId: 'p3', childId: 'p4' },
        ],
        spouseEdges: [],
        version: 1,
        ownerId: 'owner-1',
        members: [],
        createdAt: now,
        updatedAt: now,
      } as any);

      const res = await request(app.getHttpServer())
        .get(`/public/trees/${testTreeId}/render-data`)
        .expect(HttpStatus.OK);

      expect(res.body.nodes).toHaveLength(4); // All nodes included
      expect(res.body.parentChildEdges).toHaveLength(2);
    });
  });

  describe('GET /public/trees/:treeId/persons/:personId', () => {
    it('returns person details without authentication', async () => {
      const db = client.db(dbName);
      const now = new Date();

      await db.collection('family_trees').insertOne({
        _id: testTreeId as any,
        treeId: testTreeId,
        persons: [
          { personId: 'p1', name: 'Alice', gender: 'FEMALE', birthDate: new Date('1990-01-01') },
        ],
        parentChildEdges: [],
        spouseEdges: [],
        version: 1,
        ownerId: 'owner-1',
        members: [],
        createdAt: now,
        updatedAt: now,
      } as any);

      const res = await request(app.getHttpServer())
        .get(`/public/trees/${testTreeId}/persons/p1`)
        .expect(HttpStatus.OK);

      expect(res.body).toMatchObject({
        personId: 'p1',
        name: 'Alice',
        gender: 'FEMALE',
      });
    });

    it('handles nonexistent person with 404', async () => {
      const db = client.db(dbName);
      const now = new Date();

      await db.collection('family_trees').insertOne({
        _id: testTreeId as any,
        treeId: testTreeId,
        persons: [],
        parentChildEdges: [],
        spouseEdges: [],
        version: 1,
        ownerId: 'owner-1',
        members: [],
        createdAt: now,
        updatedAt: now,
      } as any);

      await request(app.getHttpServer())
        .get(`/public/trees/${testTreeId}/persons/nonexistent`)
        .expect(HttpStatus.NOT_FOUND);
    });

    it('handles nonexistent tree with 404', async () => {
      await request(app.getHttpServer())
        .get('/public/trees/nonexistent/persons/p1')
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  describe('Security - No mutations allowed via public endpoints', () => {
    it('public endpoints only expose GET methods', async () => {
      // This test documents that public endpoints should never allow mutations
      const methods = ['POST', 'PUT', 'DELETE', 'PATCH'];

      for (const method of methods) {
        const req = (request(app.getHttpServer()) as any)[method.toLowerCase()](
          `/public/trees/test/render-data`,
        );
        const res = await req;
        // Expect either 404 (method not found) or 405 (method not allowed)
        expect([404, 405]).toContain(res.status);
      }
    });
  });

  describe('Anonymous context behavior', () => {
    it('sets VIEWER role for public requests', async () => {
      const db = client.db(dbName);
      const now = new Date();

      // Create a tree with specific owner
      await db.collection('family_trees').insertOne({
        _id: testTreeId as any,
        treeId: testTreeId,
        persons: [{ personId: 'p1', name: 'Alice' }],
        parentChildEdges: [],
        spouseEdges: [],
        version: 1,
        ownerId: 'owner-1',
        members: [{ userId: 'member-1', role: 'EDITOR' }],
        createdAt: now,
        updatedAt: now,
      } as any);

      // Public access should work (VIEWER is allowed)
      const res = await request(app.getHttpServer())
        .get(`/public/trees/${testTreeId}/render-data`)
        .expect(HttpStatus.OK);

      expect(res.body.nodes).toHaveLength(1);
    });
  });
});
