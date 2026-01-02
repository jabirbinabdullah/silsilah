/**
 * E2E Tests: Mutation Audit Coverage
 * 
 * Verifies that each command creates an audit entry with correct action, actor, and IDs.
 * One test per command type.
 * 
 * Does NOT snapshot entire entries—only asserts key fields:
 * - action type
 * - actor (userId, username, role)
 * - treeId
 * - relevant personId(s)
 */

import * as request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import { AppModule } from '../src/app.module';

describe('Mutation Audit Coverage (e2e)', () => {
  let app: INestApplication;
  let server: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    server = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('CREATE_FAMILY_TREE', () => {
    it('should log audit entry when tree is created', async () => {
      const treeId = `audit-tree-create-${Date.now()}`;

      // Create tree
      await request(server)
        .post('/api/trees')
        .send({ treeId })
        .expect(HttpStatus.CREATED);

      // Fetch activity log
      const activity = await request(server)
        .get(`/api/trees/${treeId}/activity`)
        .expect(HttpStatus.OK);

      // Assert entry exists
      expect(activity.body.entries.length).toBeGreaterThanOrEqual(1);
      const createEntry = activity.body.entries.find(
        (e: any) => e.action === 'CREATE_FAMILY_TREE'
      );
      expect(createEntry).toBeDefined();
      expect(createEntry.treeId).toBe(treeId);
      expect(createEntry.actor).toHaveProperty('userId');
      expect(createEntry.actor).toHaveProperty('username');
      expect(createEntry.actor).toHaveProperty('role');
      expect(createEntry).toHaveProperty('timestamp');
    });
  });

  describe('CREATE_PERSON', () => {
    it('should log audit entry when person is added', async () => {
      const treeId = `audit-tree-person-${Date.now()}`;
      const personId = 'audit-person-1';

      // Setup tree
      await request(server)
        .post('/api/trees')
        .send({ treeId })
        .expect(HttpStatus.CREATED);

      // Create person
      await request(server)
        .post(`/api/trees/${treeId}/persons`)
        .send({ personId, name: 'Alice', gender: 'FEMALE' })
        .expect(HttpStatus.CREATED);

      // Fetch activity log
      const activity = await request(server)
        .get(`/api/trees/${treeId}/activity`)
        .expect(HttpStatus.OK);

      // Assert entry exists
      const createEntry = activity.body.entries.find(
        (e: any) => e.action === 'CREATE_PERSON'
      );
      expect(createEntry).toBeDefined();
      expect(createEntry.treeId).toBe(treeId);
      expect(createEntry.actor).toHaveProperty('userId');
      expect(createEntry.actor).toHaveProperty('username');
      expect(createEntry.actor).toHaveProperty('role');
      expect(createEntry).toHaveProperty('timestamp');

      // Verify person history also includes the creation entry
      const history = await request(server)
        .get(`/api/trees/${treeId}/persons/${personId}/history`)
        .expect(HttpStatus.OK);
      expect(history.body.entries.length).toBeGreaterThanOrEqual(1);
      expect(history.body.entries[0].action).toBe('CREATE_PERSON');
    });
  });

  describe('ESTABLISH_PARENT_CHILD', () => {
    it('should log audit entry when parent-child relationship is established', async () => {
      const treeId = `audit-tree-parent-${Date.now()}`;
      const parentId = 'audit-parent-1';
      const childId = 'audit-child-1';

      // Setup tree and persons
      await request(server)
        .post('/api/trees')
        .send({ treeId })
        .expect(HttpStatus.CREATED);

      await request(server)
        .post(`/api/trees/${treeId}/persons`)
        .send({ personId: parentId, name: 'Parent', gender: 'MALE' })
        .expect(HttpStatus.CREATED);

      await request(server)
        .post(`/api/trees/${treeId}/persons`)
        .send({ personId: childId, name: 'Child', gender: 'FEMALE' })
        .expect(HttpStatus.CREATED);

      // Establish relationship
      await request(server)
        .post(`/api/trees/${treeId}/relationships/parent-child`)
        .send({ parentId, childId })
        .expect(HttpStatus.CREATED);

      // Fetch activity log
      const activity = await request(server)
        .get(`/api/trees/${treeId}/activity`)
        .expect(HttpStatus.OK);

      // Assert entry exists
      const relEntry = activity.body.entries.find(
        (e: any) => e.action === 'ESTABLISH_PARENT_CHILD'
      );
      expect(relEntry).toBeDefined();
      expect(relEntry.treeId).toBe(treeId);
      expect(relEntry.actor).toHaveProperty('userId');
      expect(relEntry.actor).toHaveProperty('username');
      expect(relEntry).toHaveProperty('timestamp');

      // Verify both persons have this entry in their histories
      const parentHistory = await request(server)
        .get(`/api/trees/${treeId}/persons/${parentId}/history`)
        .expect(HttpStatus.OK);
      expect(
        parentHistory.body.entries.some(
          (e: any) => e.action === 'ESTABLISH_PARENT_CHILD'
        )
      ).toBe(true);

      const childHistory = await request(server)
        .get(`/api/trees/${treeId}/persons/${childId}/history`)
        .expect(HttpStatus.OK);
      expect(
        childHistory.body.entries.some(
          (e: any) => e.action === 'ESTABLISH_PARENT_CHILD'
        )
      ).toBe(true);
    });
  });

  describe('ESTABLISH_SPOUSE', () => {
    it('should log audit entry when spouse relationship is established', async () => {
      const treeId = `audit-tree-spouse-${Date.now()}`;
      const spouse1 = 'audit-spouse-1';
      const spouse2 = 'audit-spouse-2';

      // Setup tree and persons
      await request(server)
        .post('/api/trees')
        .send({ treeId })
        .expect(HttpStatus.CREATED);

      await request(server)
        .post(`/api/trees/${treeId}/persons`)
        .send({ personId: spouse1, name: 'Spouse 1', gender: 'MALE' })
        .expect(HttpStatus.CREATED);

      await request(server)
        .post(`/api/trees/${treeId}/persons`)
        .send({ personId: spouse2, name: 'Spouse 2', gender: 'FEMALE' })
        .expect(HttpStatus.CREATED);

      // Establish relationship
      await request(server)
        .post(`/api/trees/${treeId}/relationships/spouse`)
        .send({ spouseA: spouse1, spouseB: spouse2 })
        .expect(HttpStatus.CREATED);

      // Fetch activity log
      const activity = await request(server)
        .get(`/api/trees/${treeId}/activity`)
        .expect(HttpStatus.OK);

      // Assert entry exists
      const spouseEntry = activity.body.entries.find(
        (e: any) => e.action === 'ESTABLISH_SPOUSE'
      );
      expect(spouseEntry).toBeDefined();
      expect(spouseEntry.treeId).toBe(treeId);
      expect(spouseEntry.actor).toHaveProperty('userId');
      expect(spouseEntry.actor).toHaveProperty('username');
      expect(spouseEntry).toHaveProperty('timestamp');

      // Verify both persons have this entry
      const spouse1History = await request(server)
        .get(`/api/trees/${treeId}/persons/${spouse1}/history`)
        .expect(HttpStatus.OK);
      expect(
        spouse1History.body.entries.some(
          (e: any) => e.action === 'ESTABLISH_SPOUSE'
        )
      ).toBe(true);
    });
  });

  describe('REMOVE_RELATIONSHIP', () => {
    it('should log audit entry when relationship is removed', async () => {
      const treeId = `audit-tree-remove-rel-${Date.now()}`;
      const person1 = 'audit-person-remove-1';
      const person2 = 'audit-person-remove-2';

      // Setup tree and persons
      await request(server)
        .post('/api/trees')
        .send({ treeId })
        .expect(HttpStatus.CREATED);

      await request(server)
        .post(`/api/trees/${treeId}/persons`)
        .send({ personId: person1, name: 'Person 1', gender: 'MALE' })
        .expect(HttpStatus.CREATED);

      await request(server)
        .post(`/api/trees/${treeId}/persons`)
        .send({ personId: person2, name: 'Person 2', gender: 'FEMALE' })
        .expect(HttpStatus.CREATED);

      // Establish relationship
      await request(server)
        .post(`/api/trees/${treeId}/relationships/spouse`)
        .send({ spouseA: person1, spouseB: person2 })
        .expect(HttpStatus.CREATED);

      // Remove relationship
      await request(server)
        .delete(`/api/trees/${treeId}/relationships`)
        .send({ personId1: person1, personId2: person2 })
        .expect(HttpStatus.OK);

      // Fetch activity log
      const activity = await request(server)
        .get(`/api/trees/${treeId}/activity`)
        .expect(HttpStatus.OK);

      // Assert entry exists
      const removeEntry = activity.body.entries.find(
        (e: any) => e.action === 'REMOVE_RELATIONSHIP'
      );
      expect(removeEntry).toBeDefined();
      expect(removeEntry.treeId).toBe(treeId);
      expect(removeEntry.actor).toHaveProperty('userId');
      expect(removeEntry.actor).toHaveProperty('username');
      expect(removeEntry).toHaveProperty('timestamp');
    });
  });

  describe('REMOVE_PERSON', () => {
    it('should log audit entry when person is removed', async () => {
      const treeId = `audit-tree-remove-person-${Date.now()}`;
      const personId = 'audit-person-remove-orphan';

      // Setup tree and person (no relationships)
      await request(server)
        .post('/api/trees')
        .send({ treeId })
        .expect(HttpStatus.CREATED);

      await request(server)
        .post(`/api/trees/${treeId}/persons`)
        .send({ personId, name: 'Orphan', gender: 'UNKNOWN' })
        .expect(HttpStatus.CREATED);

      // Remove person
      await request(server)
        .delete(`/api/trees/${treeId}/persons/${personId}`)
        .expect(HttpStatus.OK);

      // Fetch activity log (person is gone, but activity log should have entry)
      const activity = await request(server)
        .get(`/api/trees/${treeId}/activity`)
        .expect(HttpStatus.OK);

      // Assert entry exists
      const removeEntry = activity.body.entries.find(
        (e: any) => e.action === 'REMOVE_PERSON'
      );
      expect(removeEntry).toBeDefined();
      expect(removeEntry.treeId).toBe(treeId);
      expect(removeEntry.actor).toHaveProperty('userId');
      expect(removeEntry.actor).toHaveProperty('username');
      expect(removeEntry).toHaveProperty('timestamp');
    });
  });

  describe('IMPORT_PERSONS', () => {
    it('should log audit entry when persons are imported', async () => {
      const treeId = `audit-tree-import-${Date.now()}`;

      // Setup tree
      await request(server)
        .post('/api/trees')
        .send({ treeId })
        .expect(HttpStatus.CREATED);

      // Import persons
      const csvContent = `personId,name,gender
import-1,Imported 1,MALE
import-2,Imported 2,FEMALE`;

      await request(server)
        .post(`/api/trees/${treeId}/persons/import`)
        .send({ csvContent })
        .expect(HttpStatus.CREATED);

      // Fetch activity log
      const activity = await request(server)
        .get(`/api/trees/${treeId}/activity`)
        .expect(HttpStatus.OK);

      // Assert entry exists
      const importEntry = activity.body.entries.find(
        (e: any) => e.action === 'IMPORT_PERSONS'
      );
      expect(importEntry).toBeDefined();
      expect(importEntry.treeId).toBe(treeId);
      expect(importEntry.actor).toHaveProperty('userId');
      expect(importEntry.actor).toHaveProperty('username');
      expect(importEntry).toHaveProperty('timestamp');
    });
  });
});
