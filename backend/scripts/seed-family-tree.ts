import { MongoClient } from 'mongodb';

/**
 * Seed a comprehensive family tree demonstrating:
 * - 3 generations (grandparents → parents → children)
 * - Multiple siblings in each generation
 * - Spouse relationships
 * - Parent-child relationships
 * - Realistic names and dates
 * 
 * Family Structure:
 * Generation 0 (Grandparents, born ~1940s):
 *   - William Smith (1945) ↔ Mary Johnson (1947)
 *   - Robert Davis (1943) ↔ Patricia Brown (1946)
 * 
 * Generation 1 (Parents, born ~1970s):
 *   - John Smith (1972, son of William & Mary) ↔ Sarah Davis (1974, daughter of Robert & Patricia)
 *   - Michael Smith (1975, son of William & Mary) ↔ Jennifer Wilson (1976)
 * 
 * Generation 2 (Children, born ~2000s):
 *   - Emma Smith (2001, daughter of John & Sarah)
 *   - James Smith (2003, son of John & Sarah)
 *   - Olivia Smith (2005, daughter of John & Sarah)
 *   - Daniel Smith (2002, son of Michael & Jennifer)
 *   - Sophie Smith (2004, daughter of Michael & Jennifer)
 */

async function seedFamilyTree() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const dbName = process.env.MONGODB_DB_NAME || 'silsilah';
  const treeId = 'test-tree-001';

  const client = new MongoClient(mongoUri);

  try {
    console.log('🔗 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db(dbName);
    const collection = db.collection('family_trees');

    // Check if tree already exists
    const existing = await collection.findOne({ _id: treeId } as any);
    if (existing) {
      console.log(`⚠️  Tree '${treeId}' already exists. Deleting...`);
      await collection.deleteOne({ _id: treeId } as any);
    }

    // Build comprehensive family tree
    const familyTreeDoc = {
      _id: treeId,
      treeId: treeId,
      
      persons: [
        // ===== GENERATION 0: GRANDPARENTS =====
        {
          personId: 'william-smith',
          name: 'William Smith',
          gender: 'MALE',
          birthDate: new Date('1945-03-15'),
          birthPlace: 'Boston, MA',
          deathDate: null,
        },
        {
          personId: 'mary-johnson',
          name: 'Mary Johnson',
          gender: 'FEMALE',
          birthDate: new Date('1947-07-22'),
          birthPlace: 'New York, NY',
          deathDate: null,
        },
        {
          personId: 'robert-davis',
          name: 'Robert Davis',
          gender: 'MALE',
          birthDate: new Date('1943-11-08'),
          birthPlace: 'Chicago, IL',
          deathDate: null,
        },
        {
          personId: 'patricia-brown',
          name: 'Patricia Brown',
          gender: 'FEMALE',
          birthDate: new Date('1946-05-30'),
          birthPlace: 'Philadelphia, PA',
          deathDate: null,
        },
        
        // ===== GENERATION 1: PARENTS =====
        {
          personId: 'john-smith',
          name: 'John Smith',
          gender: 'MALE',
          birthDate: new Date('1972-09-12'),
          birthPlace: 'Boston, MA',
          deathDate: null,
        },
        {
          personId: 'sarah-davis',
          name: 'Sarah Davis',
          gender: 'FEMALE',
          birthDate: new Date('1974-04-18'),
          birthPlace: 'Chicago, IL',
          deathDate: null,
        },
        {
          personId: 'michael-smith',
          name: 'Michael Smith',
          gender: 'MALE',
          birthDate: new Date('1975-12-03'),
          birthPlace: 'Boston, MA',
          deathDate: null,
        },
        {
          personId: 'jennifer-wilson',
          name: 'Jennifer Wilson',
          gender: 'FEMALE',
          birthDate: new Date('1976-08-25'),
          birthPlace: 'Seattle, WA',
          deathDate: null,
        },
        
        // ===== GENERATION 2: CHILDREN =====
        {
          personId: 'emma-smith',
          name: 'Emma Smith',
          gender: 'FEMALE',
          birthDate: new Date('2001-06-14'),
          birthPlace: 'Boston, MA',
          deathDate: null,
        },
        {
          personId: 'james-smith',
          name: 'James Smith',
          gender: 'MALE',
          birthDate: new Date('2003-03-22'),
          birthPlace: 'Boston, MA',
          deathDate: null,
        },
        {
          personId: 'olivia-smith',
          name: 'Olivia Smith',
          gender: 'FEMALE',
          birthDate: new Date('2005-11-08'),
          birthPlace: 'Boston, MA',
          deathDate: null,
        },
        {
          personId: 'daniel-smith',
          name: 'Daniel Smith',
          gender: 'MALE',
          birthDate: new Date('2002-01-30'),
          birthPlace: 'Seattle, WA',
          deathDate: null,
        },
        {
          personId: 'sophie-smith',
          name: 'Sophie Smith',
          gender: 'FEMALE',
          birthDate: new Date('2004-09-17'),
          birthPlace: 'Seattle, WA',
          deathDate: null,
        },
      ],
      
      spouseEdges: [
        // Grandparent couples
        { spouse1Id: 'william-smith', spouse2Id: 'mary-johnson' },
        { spouse1Id: 'robert-davis', spouse2Id: 'patricia-brown' },
        
        // Parent couples
        { spouse1Id: 'john-smith', spouse2Id: 'sarah-davis' },
        { spouse1Id: 'michael-smith', spouse2Id: 'jennifer-wilson' },
      ],
      
      parentChildEdges: [
        // William & Mary's children
        { parentId: 'william-smith', childId: 'john-smith' },
        { parentId: 'mary-johnson', childId: 'john-smith' },
        { parentId: 'william-smith', childId: 'michael-smith' },
        { parentId: 'mary-johnson', childId: 'michael-smith' },
        
        // Robert & Patricia's children
        { parentId: 'robert-davis', childId: 'sarah-davis' },
        { parentId: 'patricia-brown', childId: 'sarah-davis' },
        
        // John & Sarah's children
        { parentId: 'john-smith', childId: 'emma-smith' },
        { parentId: 'sarah-davis', childId: 'emma-smith' },
        { parentId: 'john-smith', childId: 'james-smith' },
        { parentId: 'sarah-davis', childId: 'james-smith' },
        { parentId: 'john-smith', childId: 'olivia-smith' },
        { parentId: 'sarah-davis', childId: 'olivia-smith' },
        
        // Michael & Jennifer's children
        { parentId: 'michael-smith', childId: 'daniel-smith' },
        { parentId: 'jennifer-wilson', childId: 'daniel-smith' },
        { parentId: 'michael-smith', childId: 'sophie-smith' },
        { parentId: 'jennifer-wilson', childId: 'sophie-smith' },
      ],
      
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    console.log('\n📋 Creating comprehensive family tree...');
    console.log(`   Tree ID: ${treeId}`);
    console.log(`   Persons: ${familyTreeDoc.persons.length}`);
    console.log(`   Spouse relationships: ${familyTreeDoc.spouseEdges.length}`);
    console.log(`   Parent-child relationships: ${familyTreeDoc.parentChildEdges.length}`);

    await collection.insertOne(familyTreeDoc as any);

    console.log('\n✅ Family tree seeded successfully!');
    console.log('\n👨‍👩‍👧‍👦 Family Structure:');
    console.log('Generation 0 (Grandparents):');
    console.log('  • William Smith (1945) ↔ Mary Johnson (1947)');
    console.log('  • Robert Davis (1943) ↔ Patricia Brown (1946)');
    console.log('\nGeneration 1 (Parents):');
    console.log('  • John Smith (1972, son of William & Mary) ↔ Sarah Davis (1974, daughter of Robert & Patricia)');
    console.log('  • Michael Smith (1975, son of William & Mary) ↔ Jennifer Wilson (1976)');
    console.log('\nGeneration 2 (Children):');
    console.log('  • Emma Smith (2001), James Smith (2003), Olivia Smith (2005) - children of John & Sarah');
    console.log('  • Daniel Smith (2002), Sophie Smith (2004) - children of Michael & Jennifer');
    console.log('\n💡 Use tree ID "test-tree-001" in the frontend to visualize this family tree.');

  } catch (error) {
    console.error('❌ Error seeding family tree:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n🔌 MongoDB connection closed');
  }
}

// Run seed
seedFamilyTree();
