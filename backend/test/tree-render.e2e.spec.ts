import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import { MongoClient, ObjectId } from 'mongodb';
import { AppModule } from '../src/app.module';

describe('Tree Render E2E', () => {
  let app: INestApplication;
  let client: MongoClient;
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const dbName = process.env.MONGODB_DB_NAME || 'silsilah';
  const testTreeId = 'tree-render-test';

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

  describe('Authorization boundary', () => {
    it('returns 404 when tree does not exist', async () => {
      const res = await request(app.getHttpServer())
        .get('/trees/nonexistent-tree/render-data')
        .expect(HttpStatus.NOT_FOUND);
    });

    it('returns 400 when treeId is empty', async () => {
      await request(app.getHttpServer())
        .get('/trees/ /render-data')
        .expect(HttpStatus.BAD_REQUEST); // Empty treeId validation
    });
  });

  describe('Empty and minimal cases', () => {
    it('returns empty arrays for tree with no persons', async () => {
      const db = client.db(dbName);
      await db.collection('family_trees').insertOne({
        _id: testTreeId as any,
        treeId: testTreeId,
        persons: [],
        parentChildEdges: [],
        spouseEdges: [],
        version: 1,
        ownerId: 'owner-1',
        members: [],
      } as any);

      const res = await request(app.getHttpServer())
        .get(`/trees/${testTreeId}/render-data`)
        .expect(HttpStatus.OK);

      expect(res.body).toEqual({
        version: 'v1',
        treeId: testTreeId,
        nodes: [],
        spouseEdges: [],
        parentChildEdges: [],
      });
    });

    it('returns single node with no edges for orphan person', async () => {
      const db = client.db(dbName);
      await db.collection('family_trees').insertOne({
        _id: testTreeId as any,
        treeId: testTreeId,
        persons: [{ id: 'p1', label: 'Alice' }],
        parentChildEdges: [],
        spouseEdges: [],
        version: 1,
        ownerId: 'owner-1',
        members: [],
      } as any);

      const res = await request(app.getHttpServer())
        .get(`/trees/${testTreeId}/render-data`)
        .expect(HttpStatus.OK);

      expect(res.body.version).toBe('v1');
      expect(res.body.nodes).toHaveLength(1);
      expect(res.body.nodes[0]).toEqual({ id: 'p1', displayName: 'Alice' });
      expect(res.body.spouseEdges).toHaveLength(0);
      expect(res.body.parentChildEdges).toHaveLength(0);
    });

    it('returns all nodes when persons are unrelated', async () => {
      const db = client.db(dbName);
      await db.collection('family_trees').insertOne({
        _id: testTreeId as any,
        treeId: testTreeId,
        persons: [
          { id: 'p1', label: 'Alice' },
          { id: 'p2', label: 'Bob' },
        ],
        parentChildEdges: [],
        spouseEdges: [],
        version: 1,
        ownerId: 'owner-1',
        members: [],
      } as any);

      const res = await request(app.getHttpServer())
        .get(`/trees/${testTreeId}/render-data`)
        .expect(HttpStatus.OK);

      expect(res.body.nodes).toHaveLength(2);
      expect(res.body.spouseEdges).toHaveLength(0);
      expect(res.body.parentChildEdges).toHaveLength(0);
    });
  });

  describe('Dangling references (defensive behavior)', () => {
    it('skips spouse edge when one person is missing', async () => {
      const db = client.db(dbName);
      await db.collection('family_trees').insertOne({
        _id: testTreeId as any,
        treeId: testTreeId,
        persons: [{ id: 'p1', label: 'Alice' }],
        parentChildEdges: [],
        spouseEdges: [{ personAId: 'p1', personBId: 'p-nonexistent' }],
        version: 1,
        ownerId: 'owner-1',
        members: [],
      } as any);

      const res = await request(app.getHttpServer())
        .get(`/trees/${testTreeId}/render-data`)
        .expect(HttpStatus.OK);

      expect(res.body.nodes).toHaveLength(1);
      expect(res.body.spouseEdges).toHaveLength(0); // Skipped
    });

    it('skips parent-child edge when parent is missing', async () => {
      const db = client.db(dbName);
      await db.collection('family_trees').insertOne({
        _id: testTreeId as any,
        treeId: testTreeId,
        persons: [{ id: 'c1', label: 'Child' }],
        parentChildEdges: [{ parentId: 'p-missing', childId: 'c1' }],
        spouseEdges: [],
        version: 1,
        ownerId: 'owner-1',
        members: [],
      } as any);

      const res = await request(app.getHttpServer())
        .get(`/trees/${testTreeId}/render-data`)
        .expect(HttpStatus.OK);

      expect(res.body.nodes).toHaveLength(1);
      expect(res.body.parentChildEdges).toHaveLength(0); // Skipped
    });

    it('skips parent-child edge when child is missing', async () => {
      const db = client.db(dbName);
      await db.collection('family_trees').insertOne({
        _id: testTreeId as any,
        treeId: testTreeId,
        persons: [{ id: 'p1', label: 'Parent' }],
        parentChildEdges: [{ parentId: 'p1', childId: 'c-missing' }],
        spouseEdges: [],
        version: 1,
        ownerId: 'owner-1',
        members: [],
      } as any);

      const res = await request(app.getHttpServer())
        .get(`/trees/${testTreeId}/render-data`)
        .expect(HttpStatus.OK);

      expect(res.body.nodes).toHaveLength(1);
      expect(res.body.parentChildEdges).toHaveLength(0); // Skipped
    });

    it('skips edge when both endpoints are missing', async () => {
      const db = client.db(dbName);
      await db.collection('family_trees').insertOne({
        _id: testTreeId as any,
        treeId: testTreeId,
        persons: [{ id: 'p1', label: 'Alice' }],
        parentChildEdges: [],
        spouseEdges: [{ personAId: 'missing-a', personBId: 'missing-b' }],
        version: 1,
        ownerId: 'owner-1',
        members: [],
      } as any);

      const res = await request(app.getHttpServer())
        .get(`/trees/${testTreeId}/render-data`)
        .expect(HttpStatus.OK);

      expect(res.body.nodes).toHaveLength(1);
      expect(res.body.spouseEdges).toHaveLength(0);
    });
  });

  describe('Duplicate edges', () => {
    it('returns duplicate spouse edges without deduplication', async () => {
      const db = client.db(dbName);
      await db.collection('family_trees').insertOne({
        _id: testTreeId as any,
        treeId: testTreeId,
        persons: [
          { id: 'p1', label: 'Alice' },
          { id: 'p2', label: 'Bob' },
        ],
        parentChildEdges: [],
        spouseEdges: [
          { personAId: 'p1', personBId: 'p2' },
          { personAId: 'p1', personBId: 'p2' }, // Duplicate
        ],
        version: 1,
        ownerId: 'owner-1',
        members: [],
      } as any);

      const res = await request(app.getHttpServer())
        .get(`/trees/${testTreeId}/render-data`)
        .expect(HttpStatus.OK);

      expect(res.body.spouseEdges).toHaveLength(2);
      expect(res.body.spouseEdges[0]).toEqual({ personAId: 'p1', personBId: 'p2' });
      expect(res.body.spouseEdges[1]).toEqual({ personAId: 'p1', personBId: 'p2' });
    });

    it('returns duplicate parent-child edges without deduplication', async () => {
      const db = client.db(dbName);
      await db.collection('family_trees').insertOne({
        _id: testTreeId as any,
        treeId: testTreeId,
        persons: [
          { id: 'p1', label: 'Parent' },
          { id: 'c1', label: 'Child' },
        ],
        parentChildEdges: [
          { parentId: 'p1', childId: 'c1' },
          { parentId: 'p1', childId: 'c1' }, // Duplicate
        ],
        spouseEdges: [],
        version: 1,
        ownerId: 'owner-1',
        members: [],
      } as any);

      const res = await request(app.getHttpServer())
        .get(`/trees/${testTreeId}/render-data`)
        .expect(HttpStatus.OK);

      expect(res.body.parentChildEdges).toHaveLength(2);
    });
  });

  describe('Disconnected graphs', () => {
    it('includes all persons regardless of connectedness', async () => {
      const db = client.db(dbName);
      await db.collection('family_trees').insertOne({
        _id: testTreeId as any,
        treeId: testTreeId,
        persons: [
          { id: 'p1', label: 'Alice' },
          { id: 'c1', label: 'Child1' },
          { id: 'p2', label: 'Bob' },
          { id: 'c2', label: 'Child2' },
        ],
        parentChildEdges: [
          { parentId: 'p1', childId: 'c1' },
          { parentId: 'p2', childId: 'c2' },
        ],
        spouseEdges: [],
        version: 1,
        ownerId: 'owner-1',
        members: [],
      } as any);

      const res = await request(app.getHttpServer())
        .get(`/trees/${testTreeId}/render-data`)
        .expect(HttpStatus.OK);

      expect(res.body.nodes).toHaveLength(4);
      expect(res.body.parentChildEdges).toHaveLength(2);
    });

    it('includes all root persons when multiple roots exist', async () => {
      const db = client.db(dbName);
      await db.collection('family_trees').insertOne({
        _id: testTreeId as any,
        treeId: testTreeId,
        persons: [
          { id: 'r1', label: 'Root1' },
          { id: 'r2', label: 'Root2' },
          { id: 'r3', label: 'Root3' },
        ],
        parentChildEdges: [],
        spouseEdges: [],
        version: 1,
        ownerId: 'owner-1',
        members: [],
      } as any);

      const res = await request(app.getHttpServer())
        .get(`/trees/${testTreeId}/render-data`)
        .expect(HttpStatus.OK);

      expect(res.body.nodes).toHaveLength(3);
    });
  });

  describe('Cycles (defensive handling)', () => {
    it('returns parent-child cycle without throwing', async () => {
      const db = client.db(dbName);
      await db.collection('family_trees').insertOne({
        _id: testTreeId as any,
        treeId: testTreeId,
        persons: [
          { id: 'p1', label: 'Alice' },
          { id: 'p2', label: 'Bob' },
        ],
        parentChildEdges: [
          { parentId: 'p1', childId: 'p2' },
          { parentId: 'p2', childId: 'p1' }, // Cycle
        ],
        spouseEdges: [],
        version: 1,
        ownerId: 'owner-1',
        members: [],
      } as any);

      const res = await request(app.getHttpServer())
        .get(`/trees/${testTreeId}/render-data`)
        .expect(HttpStatus.OK);

      expect(res.body.parentChildEdges).toHaveLength(2);
    });

    it('returns self-referential edge without throwing', async () => {
      const db = client.db(dbName);
      await db.collection('family_trees').insertOne({
        _id: testTreeId as any,
        treeId: testTreeId,
        persons: [{ id: 'p1', label: 'Alice' }],
        parentChildEdges: [{ parentId: 'p1', childId: 'p1' }], // Self-reference
        spouseEdges: [],
        version: 1,
        ownerId: 'owner-1',
        members: [],
      } as any);

      const res = await request(app.getHttpServer())
        .get(`/trees/${testTreeId}/render-data`)
        .expect(HttpStatus.OK);

      expect(res.body.parentChildEdges).toHaveLength(1);
      expect(res.body.parentChildEdges[0]).toEqual({ personAId: 'p1', personBId: 'p1' });
    });
  });

  describe('Determinism', () => {
    it('maintains deterministic output across repeated calls', async () => {
      const db = client.db(dbName);
      await db.collection('family_trees').insertOne({
        _id: testTreeId as any,
        treeId: testTreeId,
        persons: [
          { id: 'p1', label: 'Alice' },
          { id: 'p2', label: 'Bob' },
        ],
        parentChildEdges: [],
        spouseEdges: [{ personAId: 'p1', personBId: 'p2' }],
        version: 1,
        ownerId: 'owner-1',
        members: [],
      } as any);

      const res1 = await request(app.getHttpServer()).get(`/trees/${testTreeId}/render-data`);
      const res2 = await request(app.getHttpServer()).get(`/trees/${testTreeId}/render-data`);

      expect(res1.body).toEqual(res2.body);
    });
  });

  describe('DTO structure validation', () => {
    it('includes version field set to v1', async () => {
      const db = client.db(dbName);
      await db.collection('family_trees').insertOne({
        _id: testTreeId as any,
        treeId: testTreeId,
        persons: [{ id: 'p1', label: 'Alice' }],
        parentChildEdges: [],
        spouseEdges: [],
        version: 1,
        ownerId: 'owner-1',
        members: [],
      } as any);

      const res = await request(app.getHttpServer())
        .get(`/trees/${testTreeId}/render-data`)
        .expect(HttpStatus.OK);

      expect(res.body.version).toBe('v1');
    });

    it('includes treeId matching request parameter', async () => {
      const db = client.db(dbName);
      await db.collection('family_trees').insertOne({
        _id: testTreeId as any,
        treeId: testTreeId,
        persons: [{ id: 'p1', label: 'Alice' }],
        parentChildEdges: [],
        spouseEdges: [],
        version: 1,
        ownerId: 'owner-1',
        members: [],
      } as any);

      const res = await request(app.getHttpServer())
        .get(`/trees/${testTreeId}/render-data`)
        .expect(HttpStatus.OK);

      expect(res.body.treeId).toBe(testTreeId);
    });

    it('returns TreeNode with id and displayName fields only', async () => {
      const db = client.db(dbName);
      await db.collection('family_trees').insertOne({
        _id: testTreeId as any,
        treeId: testTreeId,
        persons: [{ id: 'p1', label: 'Alice' }],
        parentChildEdges: [],
        spouseEdges: [],
        version: 1,
        ownerId: 'owner-1',
        members: [],
      } as any);

      const res = await request(app.getHttpServer())
        .get(`/trees/${testTreeId}/render-data`)
        .expect(HttpStatus.OK);

      const node = res.body.nodes[0];
      expect(Object.keys(node).sort()).toEqual(['displayName', 'id']);
      expect(node.id).toBe('p1');
      expect(node.displayName).toBe('Alice');
    });

    it('returns RelationshipEdge with personAId and personBId fields only', async () => {
      const db = client.db(dbName);
      await db.collection('family_trees').insertOne({
        _id: testTreeId as any,
        treeId: testTreeId,
        persons: [
          { id: 'p1', label: 'Alice' },
          { id: 'p2', label: 'Bob' },
        ],
        parentChildEdges: [],
        spouseEdges: [{ personAId: 'p1', personBId: 'p2' }],
        version: 1,
        ownerId: 'owner-1',
        members: [],
      } as any);

      const res = await request(app.getHttpServer())
        .get(`/trees/${testTreeId}/render-data`)
        .expect(HttpStatus.OK);

      const edge = res.body.spouseEdges[0];
      expect(Object.keys(edge).sort()).toEqual(['personAId', 'personBId']);
    });
  });
});
