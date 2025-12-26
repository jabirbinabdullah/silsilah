import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { MongoClient } from 'mongodb';
import * as bcrypt from 'bcrypt';

describe('Auth E2E (login only)', () => {
  let app: INestApplication;
  let client: MongoClient;
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const dbName = process.env.MONGODB_DB_NAME || 'silsilah';

  const username = `demo-${Date.now()}`;
  const password = 'password123';

  beforeAll(async () => {
    // Disable auth guard for other routes
    process.env.ENABLE_AUTH_GUARD = 'true';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    client = new MongoClient(uri);
    await client.connect();

    const db = client.db(dbName);
    const users = db.collection<any>('users');

    const passwordHash = await bcrypt.hash(password, 10);
    await users.insertOne({
      _id: `user-${Date.now()}`,
      username,
      email: null,
      passwordHash,
      role: 'OWNER',
      createdAt: new Date(),
    });
  });

  afterAll(async () => {
    await app.close();
    if (client) await client.close();
  });

  it('POST /auth/login should return JWT token', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username, password })
      .expect(200);

    expect(res.body).toHaveProperty('token');
    expect(typeof res.body.token).toBe('string');
    expect(res.body.username).toBe(username);
  });
});
