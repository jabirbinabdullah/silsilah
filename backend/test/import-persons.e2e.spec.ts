import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import { MongoClient } from 'mongodb';
import { AppModule } from '../src/app.module';

describe('CSV Bulk Import (Priority C)', () => {
  let app: INestApplication;
  let client: MongoClient;
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const dbName = process.env.MONGODB_DB_NAME || 'silsilah';
  let treeId: string;

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
    await db.collection('audit_logs').deleteMany({});
    await app.close();
    await client.close();
  });

  beforeEach(async () => {
    const db = client.db(dbName);
    await db.collection('family_trees').deleteMany({});
    await db.collection('audit_logs').deleteMany({});

    // Create test tree
    treeId = 'tree-import-test';
    const now = new Date();
    await db.collection('family_trees').insertOne({
      _id: treeId as any,
      treeId,
      name: 'Test Tree',
      ownerId: 'user-123',
      members: [],
      persons: [
        {
          personId: 'existing-person',
          name: 'John Existing',
          gender: 'MALE',
          birthDate: new Date('1950-01-01'),
          birthPlace: null,
          deathDate: null,
        },
      ],
      parentChildEdges: [],
      spouseEdges: [],
      version: 1,
      createdAt: now,
      updatedAt: now,
    } as any);
  });

  describe('POST /trees/:treeId/persons/import', () => {
    test('Should import valid persons from CSV', async () => {
      const csvContent = `personId,name,gender,birthDate,birthPlace,deathDate
person-1,Alice Smith,FEMALE,1960-05-15,London,
person-2,Bob Jones,MALE,1965-08-20,New York,2020-01-01
person-3,Carol Wilson,UNKNOWN,1970-03-10,Paris,`;

      const response = await request(app.getHttpServer())
        .post(`/trees/${treeId}/persons/import`)
        .send({ csvContent })
        .expect(HttpStatus.CREATED);

      expect(response.body).toMatchObject({
        imported: 3,
        skipped: 0,
        total: 3,
        errors: [],
      });

      // Verify audit log
      const db = client.db(dbName);
      const auditEntries = await db.collection('audit_logs').find({}).toArray();
      expect(auditEntries).toHaveLength(1);
      expect(auditEntries[0].action).toBe('IMPORT_PERSONS');
    });

    test('Should skip existing persons (idempotent)', async () => {
      const csvContent = `personId,name,gender,birthDate,birthPlace,deathDate
existing-person,John Changed Name,MALE,1950-01-01,,
new-person,Jane Doe,FEMALE,1975-06-20,,`;

      const response = await request(app.getHttpServer())
        .post(`/trees/${treeId}/persons/import`)
        .send({ csvContent })
        .expect(HttpStatus.CREATED);

      expect(response.body).toMatchObject({
        imported: 1, // Only new-person
        skipped: 1, // existing-person skipped
        total: 2,
        errors: [],
      });
    });

    test('Should reject CSV with invalid gender', async () => {
      const csvContent = `personId,name,gender,birthDate,birthPlace,deathDate
person-invalid,Test User,INVALID_GENDER,1960-01-01,,`;

      const response = await request(app.getHttpServer())
        .post(`/trees/${treeId}/persons/import`)
        .send({ csvContent })
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toContain('gender must be MALE, FEMALE, or UNKNOWN');
    });

    test('Should reject CSV with invalid date format', async () => {
      const csvContent = `personId,name,gender,birthDate,birthPlace,deathDate
person-bad-date,Test User,MALE,01/15/1960,,`;

      const response = await request(app.getHttpServer())
        .post(`/trees/${treeId}/persons/import`)
        .send({ csvContent })
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toContain('ISO 8601 format');
    });

    test('Should reject CSV with no personId', async () => {
      const csvContent = `personId,name,gender,birthDate,birthPlace,deathDate
,Alice Smith,FEMALE,1960-05-15,,`;

      const response = await request(app.getHttpServer())
        .post(`/trees/${treeId}/persons/import`)
        .send({ csvContent })
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toContain('personId and name are required');
    });

    test('Should reject CSV with invalid personId format', async () => {
      const csvContent = `personId,name,gender,birthDate,birthPlace,deathDate
person@invalid,Alice Smith,FEMALE,1960-05-15,,`;

      const response = await request(app.getHttpServer())
        .post(`/trees/${treeId}/persons/import`)
        .send({ csvContent })
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toContain('alphanumeric, dash, or underscore');
    });

    test('Should reject CSV with empty content', async () => {
      const response = await request(app.getHttpServer())
        .post(`/trees/${treeId}/persons/import`)
        .send({ csvContent: '' })
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toContain('empty');
    });

    test('Should reject CSV with only header', async () => {
      const csvContent = `personId,name,gender,birthDate,birthPlace,deathDate`;

      const response = await request(app.getHttpServer())
        .post(`/trees/${treeId}/persons/import`)
        .send({ csvContent })
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toContain('no data rows');
    });

    test('Should return 404 for non-existent tree', async () => {
      const csvContent = `personId,name,gender,birthDate,birthPlace,deathDate
person-1,Alice Smith,FEMALE,1960-05-15,,`;

      const response = await request(app.getHttpServer())
        .post('/trees/non-existent-tree/persons/import')
        .send({ csvContent })
        .expect(HttpStatus.NOT_FOUND);

      expect(response.body.message).toContain('not found');
    });

    test('Should handle CSV with minimal data (personId and name only)', async () => {
      const csvContent = `personId,name
min-person-1,Minimal Person 1
min-person-2,Minimal Person 2`;

      const response = await request(app.getHttpServer())
        .post(`/trees/${treeId}/persons/import`)
        .send({ csvContent })
        .expect(HttpStatus.CREATED);

      expect(response.body).toMatchObject({
        imported: 2,
        skipped: 0,
        total: 2,
        errors: [],
      });
    });

    test('Should import with whitespace in values', async () => {
      const csvContent = `personId,name,gender,birthDate,birthPlace,deathDate
   space-person   ,  Jane with Spaces  ,FEMALE,1980-01-01,  Boston  ,`;

      const response = await request(app.getHttpServer())
        .post(`/trees/${treeId}/persons/import`)
        .send({ csvContent })
        .expect(HttpStatus.CREATED);

      expect(response.body).toMatchObject({
        imported: 1,
        skipped: 0,
        total: 1,
      });
    });

    test('Should reject CSV with name exceeding 255 characters', async () => {
      const longName = 'A'.repeat(256);
      const csvContent = `personId,name,gender,birthDate,birthPlace,deathDate
long-name,${longName},FEMALE,1960-01-01,,`;

      const response = await request(app.getHttpServer())
        .post(`/trees/${treeId}/persons/import`)
        .send({ csvContent })
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toContain('exceeds 255 characters');
    });

    test('Should preserve existing persons and add new ones', async () => {
      // First import
      let csvContent = `personId,name,gender,birthDate,birthPlace,deathDate
first-import,First Import,MALE,1960-01-01,,`;

      let response = await request(app.getHttpServer())
        .post(`/trees/${treeId}/persons/import`)
        .send({ csvContent })
        .expect(HttpStatus.CREATED);

      expect(response.body.imported).toBe(1);

      // Second import with overlaps
      csvContent = `personId,name,gender,birthDate,birthPlace,deathDate
first-import,First Import,MALE,1960-01-01,,
second-import,Second Import,FEMALE,1970-01-01,,`;

      response = await request(app.getHttpServer())
        .post(`/trees/${treeId}/persons/import`)
        .send({ csvContent })
        .expect(HttpStatus.CREATED);

      expect(response.body).toMatchObject({
        imported: 1, // Only second-import is new
        skipped: 1, // first-import already exists
        total: 2,
      });
    });
  });
});
