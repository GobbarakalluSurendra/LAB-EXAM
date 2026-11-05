const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config();

const LOCAL_URI = 'mongodb://127.0.0.1:27017/smartlab';
const ATLAS_URI = process.env.MONGODB_URI;

async function migrate() {
  console.log('Connecting to Local MongoDB...');
  const localConn = await mongoose.createConnection(LOCAL_URI).asPromise();
  console.log('✓ Connected to Local MongoDB.');

  console.log('Connecting to MongoDB Atlas Cloud...');
  const atlasConn = await mongoose.createConnection(ATLAS_URI).asPromise();
  console.log('✓ Connected to MongoDB Atlas Cloud.');

  const collections = await localConn.db.listCollections().toArray();
  console.log(`Found ${collections.length} collections in local database:`, collections.map((c) => c.name));

  const summary = {};

  for (const collInfo of collections) {
    const collName = collInfo.name;
    if (collName.startsWith('system.')) continue;

    const sourceColl = localConn.db.collection(collName);
    const targetColl = atlasConn.db.collection(collName);

    const docs = await sourceColl.find({}).toArray();
    console.log(`\nMigrating collection: '${collName}' (${docs.length} documents)...`);

    if (docs.length > 0) {
      // Clear target collection first to avoid conflicts on duplicate run
      await targetColl.deleteMany({});
      const insertResult = await targetColl.insertMany(docs);
      console.log(`  ✓ Inserted ${insertResult.insertedCount} documents into Atlas '${collName}'.`);
      summary[collName] = insertResult.insertedCount;
    } else {
      console.log(`  ✓ Collection '${collName}' is empty (0 documents).`);
      summary[collName] = 0;
    }
  }

  console.log('\n=============================================');
  console.log('           DATA MIGRATION SUMMARY            ');
  console.log('=============================================');
  for (const [coll, count] of Object.entries(summary)) {
    console.log(`  ${coll.padEnd(25)}: ${count} documents`);
  }
  console.log('=============================================');
  console.log('All local data successfully shifted to Atlas!');

  await localConn.close();
  await atlasConn.close();
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
