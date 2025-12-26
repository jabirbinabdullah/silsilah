import { MongoClient } from 'mongodb';
import * as bcrypt from 'bcrypt';

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const dbName = process.env.MONGODB_DB_NAME || 'silsilah';

  const username = process.env.SEED_USERNAME || 'demo';
  const password = process.env.SEED_PASSWORD || 'password123';
  const role = (process.env.SEED_ROLE || 'OWNER') as 'OWNER' | 'EDITOR' | 'VIEWER';

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  const users = db.collection('users');

  const existing = await users.findOne({ username });
  if (existing) {
    console.log(`User '${username}' already exists. Skipping.`);
    await client.close();
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const doc = {
    _id: `user-${Date.now()}`,
    username,
    email: null,
    passwordHash,
    role,
    createdAt: new Date(),
  };

  await users.insertOne(doc);
  await client.close();
  console.log(`Seeded user '${username}' with role '${role}'.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
