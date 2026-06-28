import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Global Teardown: Dijalankan SEKALI setelah semua test suite selesai.
 *
 * Fungsi:
 * 1. Connect ke MongoDB test database
 * 2. Cleanup data test (hapus semua kecuali seed data)
 * 3. Disconnect
 */
async function globalTeardown() {
  const dbUrl = process.env.DATABASE_URL_TEST;

  if (!dbUrl) {
    console.warn('⚠️  DATABASE_URL_TEST tidak di-set, skip teardown');
    return;
  }

  console.log('\n🧹 [Global Teardown] Membersihkan test database...');

  const client = new MongoClient(dbUrl);

  try {
    await client.connect();
    const db = client.db('db_pos_test');

    // Hapus semua data test dari collections
    // Untuk users: pertahankan admin & kasir (seed data)
    const usersResult = await db.collection('users').deleteMany({
      username: { $nin: ['admin', 'kasir'] },
    });
    console.log(`   🗑️  Cleaned users: ${usersResult.deletedCount} test users removed`);

    // Untuk collections lain: hapus semua
    const collectionsToClean = ['categories', 'products', 'transactions', 'notifications', 'forgotpasswordcooldowns'];

    for (const collName of collectionsToClean) {
      const result = await db.collection(collName).deleteMany({});
      if (result.deletedCount > 0) {
        console.log(`   🗑️  Cleaned ${collName}: ${result.deletedCount} docs removed`);
      }
    }

    console.log('🧹 [Global Teardown] Selesai!\n');
  } catch (error) {
    console.error('❌ [Global Teardown] Gagal:', error);
  } finally {
    await client.close();
  }
}

export default globalTeardown;
