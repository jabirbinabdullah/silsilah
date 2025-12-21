import type { GenealogyGraph, Member, UserRole } from '../../domain/types';
import { GenealogyGraph as GenealogyGraphImpl } from '../../domain/genealogy-graph';
import type { Collection, MongoClient } from 'mongodb';

interface FamilyTreeDocument {
  _id: string;
  treeId: string;
  persons: Array<{
    personId: string;
    name: string;
    gender: 'MALE' | 'FEMALE' | 'UNKNOWN';
    birthDate?: Date | null;
    birthPlace?: string | null;
    deathDate?: Date | null;
  }>;
  parentChildEdges: Array<{ parentId: string; childId: string }>;
  spouseEdges: Array<{ spouse1Id: string; spouse2Id: string }>;
  ownerId: string;
  members: Array<{ userId: string; role: UserRole }>;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface GenealogyGraphRepository {
  findById(treeId: string): Promise<GenealogyGraph | null>;
  save(aggregate: GenealogyGraph): Promise<void>;
  getSnapshot(treeId: string): Promise<FamilyTreeDocument | null>;
}

export class MongoGenealogyGraphRepository implements GenealogyGraphRepository {
  private collection: Collection<FamilyTreeDocument>;

  constructor(mongoClient: MongoClient, dbName: string = 'silsilah') {
    this.collection = mongoClient.db(dbName).collection<FamilyTreeDocument>('family_trees');
  }

  async findById(treeId: string): Promise<GenealogyGraph | null> {
    const doc = await this.collection.findOne({ _id: treeId });

    if (!doc) {
      return null;
    }

    // Reconstruct aggregate using domain methods (fail-fast on invalid data)
    const aggregate = new GenealogyGraphImpl(treeId);

    // Add all persons first (relationships require persons to exist)
    for (const person of doc.persons) {
      aggregate.addPerson({
        personId: person.personId,
        name: person.name,
        gender: person.gender,
        birthDate: person.birthDate,
        birthPlace: person.birthPlace,
        deathDate: person.deathDate,
      });
    }

    // Add parent-child relationships (enforces: person exists, no cycle, <=2 parents, age consistency)
    for (const edge of doc.parentChildEdges) {
      aggregate.addParentChildRelationship(edge.parentId, edge.childId);
    }

    // Add spouse relationships (enforces: persons exist, canonical ordering, no duplicates)
    for (const edge of doc.spouseEdges) {
      aggregate.addSpouseRelationship(edge.spouse1Id, edge.spouse2Id);
    }

    return aggregate;
  }

  async save(aggregate: GenealogyGraph): Promise<void> {
    const treeId = aggregate.treeId;

    // Obtain snapshots from aggregate
    const personsSnapshot = aggregate.getPersonsSnapshot();
    const parentChildEdges = aggregate.getParentChildEdgesSnapshot();
    const spouseEdges = aggregate.getSpouseEdgesSnapshot();

    const now = new Date();

    // Check if document exists to determine version
    const existing = await this.collection.findOne({ _id: treeId });

    const doc: FamilyTreeDocument = {
      _id: treeId,
      treeId,
      persons: personsSnapshot,
      parentChildEdges,
      spouseEdges,
      ownerId: existing?.ownerId || '',
      members: existing?.members || [],
      version: existing ? existing.version + 1 : 1,
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now,
    };

    if (existing) {
      // Optimistic locking: only update if version hasn't changed
      const result = await this.collection.replaceOne(
        { _id: treeId, version: existing.version },
        doc,
      );

      if (result.matchedCount === 0) {
        throw new Error(
          `Optimistic locking failure: tree ${treeId} was modified by another process`,
        );
      }
    } else {
      // Insert new document
      await this.collection.insertOne(doc);
    }
  }

  /**
   * Get ownership metadata for a tree.
   */
  async getOwnership(treeId: string): Promise<{ ownerId: string; members: Member[] } | null> {
    const doc = await this.collection.findOne({ _id: treeId });
    if (!doc) {
      return null;
    }
    return {
      ownerId: doc.ownerId,
      members: doc.members,
    };
  }

  /**
   * Update ownership metadata (ownerId and members).
   * This preserves the aggregate data and only updates ownership fields.
   */
  async updateOwnership(
    treeId: string,
    ownerId: string,
    members: Member[],
  ): Promise<void> {
    const existing = await this.collection.findOne({ _id: treeId });

    if (!existing) {
      throw new Error(`Tree ${treeId} not found`);
    }

    const updated: FamilyTreeDocument = {
      ...existing,
      ownerId,
      members,
      version: existing.version + 1,
      updatedAt: new Date(),
    };

    const result = await this.collection.replaceOne(
      { _id: treeId, version: existing.version },
      updated,
    );

    if (result.matchedCount === 0) {
      throw new Error(
        `Optimistic locking failure: tree ${treeId} was modified by another process`,
      );
    }
  }

  async getSnapshot(treeId: string): Promise<FamilyTreeDocument | null> {
    const doc = await this.collection.findOne({ _id: treeId });
    if (!doc) {
      return null;
    }
    return doc;
  }
}
