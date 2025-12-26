import type { User } from '../../domain/types';
import type { Collection, MongoClient } from 'mongodb';

interface UserDocument {
  _id: string;
  username: string;
  email?: string | null;
  passwordHash: string;
  role: 'OWNER' | 'EDITOR' | 'VIEWER';
  createdAt: Date;
}

export interface UserRepository {
  create(user: User): Promise<void>;
  findByUsername(username: string): Promise<User | null>;
  findById(userId: string): Promise<User | null>;
}

export class MongoUserRepository implements UserRepository {
  private collection: Collection<UserDocument>;

  constructor(mongoClient: MongoClient, dbName: string = 'silsilah') {
    this.collection = mongoClient.db(dbName).collection<UserDocument>('users');
  }

  async create(user: User): Promise<void> {
    const doc: UserDocument = {
      _id: user.id,
      username: user.username,
      email: user.email ?? null,
      passwordHash: user.passwordHash,
      role: user.role,
      createdAt: user.createdAt,
    };

    await this.collection.insertOne(doc);
  }

  async findByUsername(username: string): Promise<User | null> {
    const doc = await this.collection.findOne({ username });

    if (!doc) {
      return null;
    }

    return {
      id: doc._id,
      username: doc.username,
      email: doc.email,
      passwordHash: doc.passwordHash,
      role: doc.role,
      createdAt: doc.createdAt,
    };
  }

  async findById(userId: string): Promise<User | null> {
    const doc = await this.collection.findOne({ _id: userId });

    if (!doc) {
      return null;
    }

    return {
      id: doc._id,
      username: doc.username,
      email: doc.email,
      passwordHash: doc.passwordHash,
      role: doc.role,
      createdAt: doc.createdAt,
    };
  }
}
