/**
 * Migration: Create Audit Log Indexes
 * 
 * Purpose: Ensure optimal query performance on audit collection.
 * 
 * Indexes:
 * - { treeId: 1, timestamp: -1 }: Supports tree activity queries (sorted by recency)
 * - { personId: 1, timestamp: -1 }: Supports person history queries (sorted by recency)
 * 
 * Usage:
 *   npx ts-node scripts/create-audit-indexes.ts
 */

import { MongoClient } from 'mongodb';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = 'genealogy-db';
const COLLECTION_NAME = 'audit_logs';

async function createIndexes() {
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    console.log('✓ Connected to MongoDB');

    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    // Ensure collection exists
    const collections = await db.listCollections({ name: COLLECTION_NAME }).toArray();
    if (collections.length === 0) {
      await db.createCollection(COLLECTION_NAME);
      console.log(`✓ Created collection: ${COLLECTION_NAME}`);
    }

    // Create required indexes
    const indexes = [
      {
        name: 'idx_treeId_timestamp',
        spec: { treeId: 1, timestamp: -1 },
        options: { name: 'idx_treeId_timestamp' },
      },
      {
        name: 'idx_personId_timestamp',
        spec: { personId: 1, timestamp: -1 },
        options: { name: 'idx_personId_timestamp' },
      },
      {
        name: 'idx_action_timestamp',
        spec: { action: 1, timestamp: -1 },
        options: { name: 'idx_action_timestamp' },
      },
    ];

    for (const { name, spec, options } of indexes) {
      try {
        const result = await collection.createIndex(spec, options);
        console.log(`✓ Index created/verified: ${name} (${JSON.stringify(spec)})`);
      } catch (err) {
        if ((err as any).codeName === 'IndexAlreadyExists') {
          console.log(`✓ Index already exists: ${name}`);
        } else {
          throw err;
        }
      }
    }

    console.log('\n✓ All audit indexes created successfully');
  } catch (err) {
    console.error('✗ Failed to create indexes:', err);
    process.exit(1);
  } finally {
    await client.close();
  }
}

createIndexes();
