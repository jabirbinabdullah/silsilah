import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { MongoClient } from 'mongodb';
import { AppModule } from '../src/app.module';

/**
 * End-to-End Tests: HTTP Layer + Real MongoDB
 *
 * Covers all genealogy endpoints with real database operations.
 * No mocks - uses actual MongoDB connection.
 *
 * Scenario:
 * 1. Create family tree
 * 2. Add three persons (A, B, C)
 * 3. Establish spouse relationship (A ↔ B)
 * 4. Establish parent-child relationship (A → C)
 * 5. Query endpoints (get person, ancestors, descendants)
 * 6. Remove relationship
 * 7. Delete person with relationship guard
 * 8. Delete person without relationships
 * 9. Verify final state
 */
describe('Genealogy E2E (HTTP + MongoDB)', () => {
  let app: INestApplication;
  let mongoClient: MongoClient;
  const treeId = 'tree-e2e-test';
  const testDbName = 'silsilah_e2e_test';
  const apiBase = '/api/trees';

  beforeAll(async () => {
    // Set test environment
    process.env.MONGODB_DB_NAME = testDbName;
    process.env.MONGODB_URI = 'mongodb://localhost:27017';

    // Create NestJS test module
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Get mongo client from providers
    mongoClient = moduleFixture.get('MONGO_CLIENT');

    // Clean up test database
    const testDb = mongoClient.db(testDbName);
    await testDb.collection('family_trees').deleteMany({});
  });

  afterAll(async () => {
    // Clean up
    const testDb = mongoClient.db(testDbName);
    await testDb.collection('family_trees').deleteMany({});

    await app.close();
    await mongoClient.close();
  });

  // ====== PHASE 1: CREATE TREE ======
  describe('POST /trees - Create family tree', () => {
    it('should create a new family tree', () => {
      return request(app.getHttpServer())
        .post(apiBase)
        .send({ treeId })
        .expect(201)
        .expect((res) => {
          expect(res.body).toEqual({
            treeId,
            message: expect.stringContaining("created successfully"),
          });
        });
    });

    it('should return 400 for missing treeId', () => {
      return request(app.getHttpServer())
        .post(apiBase)
        .send({})
        .expect(400);
    });
  });

  // ====== PHASE 2: ADD PERSONS ======
  describe('POST /trees/:treeId/persons - Add person', () => {
    it('should add person A', () => {
      return request(app.getHttpServer())
        .post(`${apiBase}/${treeId}/persons`)
        .send({
          personId: 'person-a',
          name: 'Alice',
          gender: 'FEMALE',
          birthDate: '1960-01-01',
          birthPlace: 'New York',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toEqual({
            personId: 'person-a',
          });
        });
    });

    it('should add person B', () => {
      return request(app.getHttpServer())
        .post(`${apiBase}/${treeId}/persons`)
        .send({
          personId: 'person-b',
          name: 'Bob',
          gender: 'MALE',
          birthDate: '1962-05-15',
          birthPlace: 'Boston',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toEqual({ personId: 'person-b' });
        });
    });

    it('should add person C', () => {
      return request(app.getHttpServer())
        .post(`${apiBase}/${treeId}/persons`)
        .send({
          personId: 'person-c',
          name: 'Charlie',
          gender: 'MALE',
          birthDate: '1985-03-20',
          birthPlace: 'Chicago',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toEqual({ personId: 'person-c' });
        });
    });

    it('should return 404 for nonexistent tree', () => {
      return request(app.getHttpServer())
        .post(`${apiBase}/nonexistent/persons`)
        .send({
          personId: 'person-x',
          name: 'Unknown',
          gender: 'UNKNOWN',
        })
        .expect(404);
    });

    it('should reject deathDate before birthDate (invariant)', () => {
      return request(app.getHttpServer())
        .post(`${apiBase}/${treeId}/persons`)
        .send({
          personId: 'person-invalid',
          name: 'Invalid',
          gender: 'UNKNOWN',
          birthDate: '2020-01-01',
          deathDate: '2010-01-01',
        })
        .expect(400);
    });
  });

  // ====== PHASE 3: GET PERSON ======
  describe('GET /trees/:treeId/persons/:personId - Retrieve person', () => {
    it('should retrieve person A', () => {
      return request(app.getHttpServer())
        .get(`${apiBase}/${treeId}/persons/person-a`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toMatchObject({
            personId: 'person-a',
            name: 'Alice',
            gender: 'FEMALE',
            birthPlace: 'New York',
          });
        });
    });

    it('should return 404 for nonexistent person', () => {
      return request(app.getHttpServer())
        .get(`${apiBase}/${treeId}/persons/nonexistent`)
        .expect(404);
    });
  });

  // ====== PHASE 4: ESTABLISH SPOUSE ======
  describe('POST /trees/:treeId/relationships/spouse - Establish spouse', () => {
    it('should establish spouse relationship between A and B', () => {
      return request(app.getHttpServer())
        .post(`${apiBase}/${treeId}/relationships/spouse`)
        .send({
          spouseA: 'person-a',
          spouseB: 'person-b',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toEqual({
            message: expect.stringContaining('Spouse relationship established'),
          });
        });
    });
  });

  // ====== PHASE 5: ESTABLISH PARENT-CHILD ======
  describe('POST /trees/:treeId/relationships/parent-child', () => {
    it('should establish parent-child relationship A → C', () => {
      return request(app.getHttpServer())
        .post(`${apiBase}/${treeId}/relationships/parent-child`)
        .send({
          parentId: 'person-a',
          childId: 'person-c',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toEqual({
            message: expect.stringContaining('Parent-child relationship established'),
          });
        });
    });

    it('should reject creating cycle', () => {
      return request(app.getHttpServer())
        .post(`${apiBase}/${treeId}/relationships/parent-child`)
        .send({
          parentId: 'person-c',
          childId: 'person-a',
        })
        .expect(422);
    });
  });

  // ====== PHASE 6: GET ANCESTORS ======
  describe('GET /trees/:treeId/persons/:personId/ancestors', () => {
    it('should return ancestors of C (should be A)', () => {
      return request(app.getHttpServer())
        .get(`${apiBase}/${treeId}/persons/person-c/ancestors`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({
            personId: 'person-c',
            ancestors: expect.arrayContaining(['person-a']),
          });
        });
    });

    it('should return empty ancestors for A (no parents)', () => {
      return request(app.getHttpServer())
        .get(`${apiBase}/${treeId}/persons/person-a/ancestors`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({
            personId: 'person-a',
            ancestors: [],
          });
        });
    });
  });

  // ====== PHASE 7: GET DESCENDANTS ======
  describe('GET /trees/:treeId/persons/:personId/descendants', () => {
    it('should return descendants of A (should be C)', () => {
      return request(app.getHttpServer())
        .get(`${apiBase}/${treeId}/persons/person-a/descendants`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({
            personId: 'person-a',
            descendants: expect.arrayContaining(['person-c']),
          });
        });
    });

    it('should return empty descendants for C (no children)', () => {
      return request(app.getHttpServer())
        .get(`${apiBase}/${treeId}/persons/person-c/descendants`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({
            personId: 'person-c',
            descendants: [],
          });
        });
    });
  });

  // ====== PHASE 8: REMOVE RELATIONSHIP ======
  describe('DELETE /trees/:treeId/relationships', () => {
    it('should remove parent-child relationship between A and C', () => {
      return request(app.getHttpServer())
        .delete(`${apiBase}/${treeId}/relationships`)
        .send({
          personId1: 'person-a',
          personId2: 'person-c',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({
            message: expect.stringContaining('Relationship removed'),
          });
        });
    });

    it('should verify A and C no longer have relationship', () => {
      return request(app.getHttpServer())
        .get(`${apiBase}/${treeId}/persons/person-c/ancestors`)
        .expect(200)
        .expect((res) => {
          expect(res.body.ancestors).not.toContain('person-a');
        });
    });
  });

  // ====== PHASE 9: DELETE PERSON WITH RELATIONSHIPS (SHOULD FAIL) ======
  describe('DELETE /trees/:treeId/persons/:personId - Remove person', () => {
    it('should reject deleting person B (has spouse relationship)', () => {
      return request(app.getHttpServer())
        .delete(`${apiBase}/${treeId}/persons/person-b`)
        .expect(409)
        .expect((res) => {
          expect(res.body.message).toContain('relationships');
        });
    });
  });

  // ====== PHASE 10: DELETE PERSON WITHOUT RELATIONSHIPS ======
  describe('DELETE /trees/:treeId/persons/:personId - Delete orphan person', () => {
    it('should successfully delete person C (no relationships after removal)', () => {
      return request(app.getHttpServer())
        .delete(`${apiBase}/${treeId}/persons/person-c`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({
            message: expect.stringContaining('person-c'),
          });
        });
    });

    it('should return 404 when querying deleted person', () => {
      return request(app.getHttpServer())
        .get(`${apiBase}/${treeId}/persons/person-c`)
        .expect(404);
    });
  });

  // ====== PHASE 11: RENDER TREE ======
  describe('GET /trees/:treeId/render', () => {
    it('should render tree from person A', () => {
      return request(app.getHttpServer())
        .get(`${apiBase}/${treeId}/render`)
        .query({ rootPersonId: 'person-a', viewMode: 'VERTICAL' })
        .expect(200)
        .expect((res) => {
          expect(res.body).toMatchObject({
            rootPersonId: 'person-a',
            viewMode: 'VERTICAL',
            nodes: expect.any(Array),
            edges: expect.any(Array),
          });
          expect(res.body.nodes).toContainEqual(
            expect.objectContaining({ personId: 'person-a' }),
          );
        });
    });

    it('should return 400 when rootPersonId is missing', () => {
      return request(app.getHttpServer())
        .get(`${apiBase}/${treeId}/render`)
        .query({ viewMode: 'VERTICAL' })
        .expect(400);
    });

    it('should default to VERTICAL viewMode', () => {
      return request(app.getHttpServer())
        .get(`${apiBase}/${treeId}/render`)
        .query({ rootPersonId: 'person-a' })
        .expect(200)
        .expect((res) => {
          expect(res.body.viewMode).toBe('VERTICAL');
        });
    });
  });

  // ====== FINAL ASSERTIONS ======
  describe('Final state verification', () => {
    it('should include root person in nodes (A)', async () => {
      return request(app.getHttpServer())
        .get(`${apiBase}/${treeId}/render`)
        .query({ rootPersonId: 'person-a' })
        .expect(200)
        .expect((res) => {
          const personIds = res.body.nodes.map((n: any) => n.personId);
          expect(personIds).toContain('person-a');
        });
    });

    it('should have 1 spouse edge (A ↔ B)', async () => {
      return request(app.getHttpServer())
        .get(`${apiBase}/${treeId}/render`)
        .query({ rootPersonId: 'person-a' })
        .expect(200)
        .expect((res) => {
          const spouseEdges = res.body.edges.filter(
            (e: any) => e.relationType === 'SPOUSE',
          );
          expect(spouseEdges.length).toBe(1);
        });
    });

    it('should have 0 parent-child edges', async () => {
      return request(app.getHttpServer())
        .get(`${apiBase}/${treeId}/render`)
        .query({ rootPersonId: 'person-a' })
        .expect(200)
        .expect((res) => {
          const parentChildEdges = res.body.edges.filter(
            (e: any) => e.relationType === 'PARENT_CHILD',
          );
          expect(parentChildEdges.length).toBe(0);
        });
    });
  });
});
