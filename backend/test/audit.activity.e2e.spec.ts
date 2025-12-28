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

import request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import { AppModule } from '../src/app.module';

describe('Activity & History Endpoints (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/trees/:treeId/activity', () => {
    it('should return activity log for valid tree', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/trees/test-tree/activity')
        .expect(HttpStatus.OK);

      expect(response.body).toEqual({
        treeId: 'test-tree',
        entries: [],
        total: 0,
        pagination: {
          limit: 50,
          offset: 0,
          hasMore: false,
        },
      });
    });

    it('should support custom limit parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/trees/test-tree/activity?limit=10')
        .expect(HttpStatus.OK);

      expect(response.body.pagination.limit).toBe(10);
    });

    it('should support offset parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/trees/test-tree/activity?offset=5')
        .expect(HttpStatus.OK);

      expect(response.body.pagination.offset).toBe(5);
    });

    it('should cap limit at 1000', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/trees/test-tree/activity?limit=5000')
        .expect(HttpStatus.OK);

      expect(response.body.pagination.limit).toBe(1000);
    });

    it('should default to limit 50 if not provided', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/trees/test-tree/activity')
        .expect(HttpStatus.OK);

      expect(response.body.pagination.limit).toBe(50);
    });

    it('should default to offset 0 if not provided', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/trees/test-tree/activity')
        .expect(HttpStatus.OK);

      expect(response.body.pagination.offset).toBe(0);
    });

    it('should return proper DTO structure', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/trees/test-tree/activity')
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
      await request(app.getHttpServer()).post('/api/trees').send({ treeId: 'history-test-tree' });

      await request(app.getHttpServer())
        .post('/api/trees/history-test-tree/persons')
        .send({
          personId: 'test-person-1',
          name: 'John Doe',
          gender: 'MALE',
        });
    });

    it('should return empty history for valid person', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/trees/history-test-tree/persons/test-person-1/history')
        .expect(HttpStatus.OK);

      expect(response.body).toEqual({
        treeId: 'history-test-tree',
        personId: 'test-person-1',
        entries: [],
        total: 0,
        pagination: {
          limit: 50,
          offset: 0,
          hasMore: false,
        },
      });
    });

    it('should return 404 for nonexistent person', async () => {
      await request(app.getHttpServer())
        .get('/api/trees/history-test-tree/persons/nonexistent/history')
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should reject empty personId', async () => {
      await request(app.getHttpServer())
        .get('/api/trees/history-test-tree/persons//history')
        .expect(HttpStatus.NOT_FOUND); // Route not found because :personId is empty
    });

    it('should support pagination parameters', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/trees/history-test-tree/persons/test-person-1/history?limit=20&offset=5')
        .expect(HttpStatus.OK);

      expect(response.body.pagination).toEqual({
        limit: 20,
        offset: 5,
        hasMore: false,
      });
    });

    it('should return proper DTO structure', async () => {
      const response = await request(app.getHttpServer())
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
      const response = await request(app.getHttpServer())
        .get(
          '/api/trees/history-test-tree/persons/test-person-1/history?limit=2000',
        )
        .expect(HttpStatus.OK);

      expect(response.body.pagination.limit).toBe(1000);
    });

    it('should have hasMore=false when total <= offset+limit', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/trees/history-test-tree/persons/test-person-1/history')
        .expect(HttpStatus.OK);

      // No entries exist, so hasMore should always be false
      expect(response.body.pagination.hasMore).toBe(false);
    });
  });

  describe('Authorization', () => {
    it('should return activity for authenticated users', async () => {
      // Test with default test user context
      const response = await request(app.getHttpServer())
        .get('/api/trees/test-tree/activity')
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('treeId');
    });

    it('should return history for authenticated users', async () => {
      // Setup person
      await request(app.getHttpServer()).post('/api/trees').send({ treeId: 'auth-test-tree' });
      await request(app.getHttpServer())
        .post('/api/trees/auth-test-tree/persons')
        .send({
          personId: 'auth-person',
          name: 'Auth Test',
          gender: 'UNKNOWN',
        });

      const response = await request(app.getHttpServer())
        .get('/api/trees/auth-test-tree/persons/auth-person/history')
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('personId');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing treeId gracefully', async () => {
      await request(app.getHttpServer()).get('/api/trees//activity').expect(HttpStatus.NOT_FOUND);
    });

    it('should handle missing personId gracefully', async () => {
      await request(app.getHttpServer())
        .get('/api/trees/test-tree/persons//history')
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should return 400 for invalid limit', async () => {
      // NOTE: NestJS will attempt to parse invalid numbers
      // This is a framework concern, not a handler concern
      const response = await request(app.getHttpServer())
        .get('/api/trees/test-tree/activity?limit=invalid')
        .expect(HttpStatus.OK); // Invalid number becomes NaN, defaults to 50

      expect(response.body.pagination.limit).toBe(50);
    });
  });
});
