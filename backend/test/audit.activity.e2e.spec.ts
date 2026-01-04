/**
 * E2E Tests: Activity & History Endpoints
 * 
 * Tests for:
 * - GET /api/trees/:treeId/activity (tree activity)
 * - GET /api/trees/:treeId/persons/:personId/history (person history)
 * - Authorization enforcement
 * - Empty history responses
 * - Pagination parameters
 */

import * as request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import { AppModule } from '../src/app.module';

describe('Activity & History Endpoints (e2e)', () => {
  let app: INestApplication;
  let server: any;
  const activityTreeId = `activity-tree-${Date.now()}`;

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

  describe('GET /api/trees/:treeId/activity', () => {
    beforeAll(async () => {
      await request(server).post('/api/trees').send({ treeId: activityTreeId });
      await request(server)
        .post(`/api/trees/${activityTreeId}/persons`)
        .send({ personId: 'p-activity-1', name: 'Activity One', gender: 'MALE' });
      await request(server)
        .post(`/api/trees/${activityTreeId}/persons`)
        .send({ personId: 'p-activity-2', name: 'Activity Two', gender: 'FEMALE' });
    });

    it('should return activity log for valid tree', async () => {
      const response = await request(server)
        .get(`/api/trees/${activityTreeId}/activity`)
        .expect(HttpStatus.OK);

      expect(response.body.treeId).toBe(activityTreeId);
      expect(response.body.entries.length).toBeGreaterThanOrEqual(2);
      expect(response.body.total).toBeGreaterThanOrEqual(2);
      expect(response.body.pagination.hasMore).toBe(false);
    });

    it('should support custom limit parameter', async () => {
      const response = await request(server)
        .get(`/api/trees/${activityTreeId}/activity?limit=1`)
        .expect(HttpStatus.OK);

      expect(response.body.pagination.limit).toBe(1);
      expect(response.body.pagination.hasMore).toBe(true);
    });

    it('should support offset parameter', async () => {
      const response = await request(server)
        .get(`/api/trees/${activityTreeId}/activity?offset=1&limit=1`)
        .expect(HttpStatus.OK);

      expect(response.body.pagination.offset).toBe(1);
    });

    it('should cap limit at 1000', async () => {
      const response = await request(server)
        .get(`/api/trees/${activityTreeId}/activity?limit=5000`)
        .expect(HttpStatus.OK);

      expect(response.body.pagination.limit).toBe(1000);
    });

    it('should default to limit 50 if not provided', async () => {
      const response = await request(server)
        .get(`/api/trees/${activityTreeId}/activity`)
        .expect(HttpStatus.OK);

      expect(response.body.pagination.limit).toBe(50);
    });

    it('should default to offset 0 if not provided', async () => {
      const response = await request(server)
        .get(`/api/trees/${activityTreeId}/activity`)
        .expect(HttpStatus.OK);

      expect(response.body.pagination.offset).toBe(0);
    });

    it('should return proper DTO structure', async () => {
      const response = await request(server)
        .get(`/api/trees/${activityTreeId}/activity`)
        .expect(HttpStatus.OK);

      const { body } = response;
      expect(body).toHaveProperty('treeId');
      expect(body).toHaveProperty('entries');
      expect(body).toHaveProperty('total');
      expect(body).toHaveProperty('pagination');
      expect(Array.isArray(body.entries)).toBe(true);
      expect(typeof body.total).toBe('number');
      expect(body.pagination).toHaveProperty('limit');
      expect(body.pagination).toHaveProperty('offset');
      expect(body.pagination).toHaveProperty('hasMore');
    });
  });

  describe('GET /api/trees/:treeId/persons/:personId/history', () => {
    beforeAll(async () => {
      // Create a tree and person for testing
      await request(server).post('/api/trees').send({ treeId: 'history-test-tree' });

      await request(server)
        .post('/api/trees/history-test-tree/persons')
        .send({
          personId: 'test-person-1',
          name: 'John Doe',
          gender: 'MALE',
        });
    });

    it('should return history including creation entry', async () => {
      const response = await request(server)
        .get('/api/trees/history-test-tree/persons/test-person-1/history')
        .expect(HttpStatus.OK);

      expect(response.body.treeId).toBe('history-test-tree');
      expect(response.body.personId).toBe('test-person-1');
      expect(response.body.total).toBeGreaterThanOrEqual(1);
      expect(response.body.entries.length).toBeGreaterThanOrEqual(1);
      expect(response.body.entries[0]).toMatchObject({ action: 'CREATE_PERSON' });
      expect(response.body.pagination).toEqual({
        limit: 50,
        offset: 0,
        hasMore: false,
      });
    });

    it('should return 404 for nonexistent person', async () => {
      await request(server)
        .get('/api/trees/history-test-tree/persons/nonexistent/history')
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should reject empty personId', async () => {
      await request(server)
        .get('/api/trees/history-test-tree/persons//history')
        .expect(HttpStatus.NOT_FOUND); // Route not found because :personId is empty
    });

    it('should support pagination parameters', async () => {
      const response = await request(server)
        .get('/api/trees/history-test-tree/persons/test-person-1/history?limit=20&offset=5')
        .expect(HttpStatus.OK);

      expect(response.body.pagination).toEqual({
        limit: 20,
        offset: 5,
        hasMore: false,
      });
    });

    it('should return proper DTO structure', async () => {
      const response = await request(server)
        .get('/api/trees/history-test-tree/persons/test-person-1/history')
        .expect(HttpStatus.OK);

      const { body } = response;
      expect(body).toHaveProperty('treeId');
      expect(body).toHaveProperty('personId');
      expect(body).toHaveProperty('entries');
      expect(body).toHaveProperty('total');
      expect(body).toHaveProperty('pagination');
      expect(Array.isArray(body.entries)).toBe(true);
      expect(typeof body.total).toBe('number');
    });

    it('should cap limit at 1000', async () => {
      const response = await request(server)
        .get(
          '/api/trees/history-test-tree/persons/test-person-1/history?limit=2000',
        )
        .expect(HttpStatus.OK);

      expect(response.body.pagination.limit).toBe(1000);
    });

    it('should have hasMore=false when total <= offset+limit', async () => {
      const response = await request(server)
        .get('/api/trees/history-test-tree/persons/test-person-1/history')
        .expect(HttpStatus.OK);

      // No entries exist, so hasMore should always be false
      expect(response.body.pagination.hasMore).toBe(false);
    });
  });

  describe('Authorization', () => {
    it('should return activity for authenticated users', async () => {
      // Test with default test user context
      const response = await request(server)
        .get(`/api/trees/${activityTreeId}/activity`)
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('treeId');
    });

    it('should return history for authenticated users', async () => {
      // Setup person
      await request(server).post('/api/trees').send({ treeId: 'auth-test-tree' });
      await request(server)
        .post('/api/trees/auth-test-tree/persons')
        .send({
          personId: 'auth-person',
          name: 'Auth Test',
          gender: 'UNKNOWN',
        });

      const response = await request(server)
        .get('/api/trees/auth-test-tree/persons/auth-person/history')
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('personId');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing treeId gracefully', async () => {
      await request(server).get('/api/trees//activity').expect(HttpStatus.NOT_FOUND);
    });

    it('should handle missing personId gracefully', async () => {
      await request(server)
        .get('/api/trees/test-tree/persons//history')
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should default invalid limit to 50 when tree exists', async () => {
      const limitTreeId = `limit-test-tree-${Date.now()}`;
      await request(server).post('/api/trees').send({ treeId: limitTreeId });

      const response = await request(server)
        .get(`/api/trees/${limitTreeId}/activity?limit=invalid`)
        .expect(HttpStatus.OK); // Invalid number becomes NaN, defaults to 50

      expect(response.body.pagination.limit).toBe(50);
    });
  });
});
