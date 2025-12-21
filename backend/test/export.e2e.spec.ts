import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { MongoClient } from 'mongodb';
import { AppModule } from '../src/app.module';

describe('Export E2E (owner-only)', () => {
  let app: INestApplication;
  let mongoClient: MongoClient;
  const treeId = 'export-tree';
  const dbName = 'silsilah_export_test';

  beforeAll(async () => {
    process.env.MONGODB_DB_NAME = dbName;
    process.env.MONGODB_URI = 'mongodb://localhost:27017';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    mongoClient = moduleFixture.get('MONGO_CLIENT');

    const db = mongoClient.db(dbName);
    await db.collection('family_trees').deleteMany({});

    // Seed minimal tree
    await request(app.getHttpServer())
      .post('/trees')
      .send({ treeId })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/trees/${treeId}/persons`)
      .send({ personId: 'a', name: 'Alice', gender: 'FEMALE' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/trees/${treeId}/persons`)
      .send({ personId: 'b', name: 'Bob', gender: 'MALE' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/trees/${treeId}/persons`)
      .send({ personId: 'c', name: 'Charlie', gender: 'MALE' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/trees/${treeId}/relationships/spouse`)
      .send({ spouseA: 'a', spouseB: 'b' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/trees/${treeId}/relationships/parent-child`)
      .send({ parentId: 'a', childId: 'c' })
      .expect(201);
  });

  afterAll(async () => {
    const db = mongoClient.db(dbName);
    await db.collection('family_trees').deleteMany({});
    await app.close();
    await mongoClient.close();
  });

  it('GET /trees/:id/export/json returns snapshot', async () => {
    const res = await request(app.getHttpServer())
      .get(`/trees/${treeId}/export/json`)
      .expect(200);

    expect(res.body.treeId).toBe(treeId);
    expect(res.body.persons.length).toBe(3);
    expect(res.body.parentChildEdges.length).toBe(1);
    expect(res.body.spouseEdges.length).toBe(1);
  });

  it('GET /trees/:id/export/gedcom returns GEDCOM text', async () => {
    const res = await request(app.getHttpServer())
      .get(`/trees/${treeId}/export/gedcom`)
      .expect(200);

    expect(typeof res.text).toBe('string');
    expect(res.text).toContain('@a@ INDI');
    expect(res.text).toContain('FAM');
    expect(res.text).toContain('CHIL @c@');
  });
});
