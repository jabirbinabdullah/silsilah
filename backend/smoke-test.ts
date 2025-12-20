import { MongoClient } from 'mongodb';
import { MongoGenealogyGraphRepository } from './src/infrastructure/repositories/genealogy-graph.mongo.repository';
import { GenealogyGraph } from './src/domain/genealogy-graph';
import { PersonHasRelationshipsError } from './src/domain/errors';

/**
 * End-to-End Smoke Test: Domain → Repository → MongoDB
 *
 * Validates:
 * 1. Aggregate creation and persistence
 * 2. Relationship management (spouse, parent-child)
 * 3. Hydration reconstruction
 * 4. Relationship removal
 * 5. Safe person deletion enforcement
 */

async function runSmokeTest() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const dbName = process.env.MONGODB_DB_NAME || 'silsilah_test';

  const client = new MongoClient(mongoUri);
  let repo: MongoGenealogyGraphRepository;

  try {
    console.log('🔗 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected');

    // Use test database
    repo = new MongoGenealogyGraphRepository(client, dbName);

    // Clean up test tree if exists
    const testDb = client.db(dbName);
    await testDb.collection('family_trees').deleteOne({ _id: 'tree-smoke-test' } as any);
    console.log('🧹 Cleaned up old test data');

    // ====== PHASE 1: Create Tree & Add Persons ======
    console.log('\n📋 PHASE 1: Create tree and add persons A, B, C');
    const tree = new GenealogyGraph('tree-smoke-test');

    tree.addPerson({
      personId: 'person-a',
      name: 'Alice',
      gender: 'FEMALE',
      birthDate: new Date('1960-01-01'),
      birthPlace: 'New York',
      deathDate: null,
    });

    tree.addPerson({
      personId: 'person-b',
      name: 'Bob',
      gender: 'MALE',
      birthDate: new Date('1962-05-15'),
      birthPlace: 'Boston',
      deathDate: null,
    });

    tree.addPerson({
      personId: 'person-c',
      name: 'Charlie',
      gender: 'MALE',
      birthDate: new Date('1985-03-20'),
      birthPlace: 'Chicago',
      deathDate: null,
    });

    console.log('✅ Added 3 persons: A, B, C');

    // ====== PHASE 2: Add Relationships ======
    console.log('\n👫 PHASE 2: Add spouse relationship (A ↔ B)');
    tree.addSpouseRelationship('person-a', 'person-b');
    console.log('✅ Spouse edge: A ↔ B');

    console.log('\n👨‍👦 PHASE 3: Add parent-child relationship (A → C)');
    tree.addParentChildRelationship('person-a', 'person-c');
    console.log('✅ Parent-child edge: A → C');

    // ====== PHASE 4: Persist ======
    console.log('\n💾 PHASE 4: Save to MongoDB');
    await repo.save(tree);
    console.log('✅ Saved');

    // ====== PHASE 5: Reload & Verify ======
    console.log('\n🔄 PHASE 5: Reload from MongoDB');
    const reloaded = await repo.findById('tree-smoke-test');
    if (!reloaded) throw new Error('Reload failed: tree not found');
    console.log('✅ Reloaded');

    const personsSnapshot = reloaded.getPersonsSnapshot();
    const parentChildEdges = reloaded.getParentChildEdgesSnapshot();
    const spouseEdges = reloaded.getSpouseEdgesSnapshot();

    console.log(`   Persons: ${personsSnapshot.length} (expected 3)`);
    console.log(`   Spouse edges: ${spouseEdges.length} (expected 1)`);
    console.log(`   Parent-child edges: ${parentChildEdges.length} (expected 1)`);

    if (personsSnapshot.length !== 3) throw new Error('❌ Expected 3 persons');
    if (spouseEdges.length !== 1) throw new Error('❌ Expected 1 spouse edge');
    if (parentChildEdges.length !== 1) throw new Error('❌ Expected 1 parent-child edge');

    console.log('✅ State verified after reload');

    // ====== PHASE 6: Remove Relationship ======
    console.log('\n🗑️  PHASE 6: Remove parent-child edge (A ↔ C)');
    reloaded.removeRelationship('person-a', 'person-c');
    console.log('✅ Edge removed from aggregate');

    console.log('\n💾 PHASE 7: Save removal');
    await repo.save(reloaded);
    console.log('✅ Saved');

    // ====== PHASE 8: Reload & Verify Removal ======
    console.log('\n🔄 PHASE 8: Reload and verify edge is gone');
    const reloadedAgain = await repo.findById('tree-smoke-test');
    if (!reloadedAgain) throw new Error('Reload failed');

    const parentChildEdgesAfterRemoval = reloadedAgain.getParentChildEdgesSnapshot();
    console.log(`   Parent-child edges after removal: ${parentChildEdgesAfterRemoval.length} (expected 0)`);

    if (parentChildEdgesAfterRemoval.length !== 0) throw new Error('❌ Expected 0 parent-child edges after removal');
    console.log('✅ Edge successfully removed');

    // ====== PHASE 9: Attempt Illegal Person Deletion ======
    console.log('\n⚠️  PHASE 9: Attempt to delete person B (has spouse edge)');
    try {
      reloadedAgain.removePerson('person-b');
      throw new Error('❌ Should have thrown PersonHasRelationshipsError');
    } catch (err: any) {
      if (err instanceof PersonHasRelationshipsError) {
        console.log(`✅ Correctly rejected: ${err.message}`);
      } else {
        throw err;
      }
    }

    // ====== PHASE 10: Delete Person C (no edges) ======
    console.log('\n🗑️  PHASE 10: Delete person C (no relationships)');
    reloadedAgain.removePerson('person-c');
    console.log('✅ Person C deleted');

    console.log('\n💾 PHASE 11: Save deletion');
    await repo.save(reloadedAgain);
    console.log('✅ Saved');

    // ====== PHASE 12: Final Reload & Verify ======
    console.log('\n🔄 PHASE 12: Final reload');
    const finalReload = await repo.findById('tree-smoke-test');
    if (!finalReload) throw new Error('Final reload failed');

    const finalPersons = finalReload.getPersonsSnapshot();
    console.log(`   Persons: ${finalPersons.length} (expected 2)`);

    if (finalPersons.length !== 2) throw new Error('❌ Expected 2 persons after deletion');
    console.log('✅ Person C successfully deleted');

    // ====== SUCCESS ======
    console.log('\n🎉 ALL TESTS PASSED');
    console.log('\n✅ Domain ↔ Repository ↔ MongoDB integration verified');
    console.log('✅ Relationship management working correctly');
    console.log('✅ Safe person deletion enforced');
    console.log('✅ Atomicity and hydration working');
    console.log('\n→ Ready for controller layer\n');
  } catch (err) {
    console.error('\n❌ TEST FAILED:', err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    await client.close();
  }
}

// Run test
runSmokeTest();
