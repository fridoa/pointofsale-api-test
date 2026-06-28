import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Global Setup: Dijalankan SEKALI sebelum semua test suite.
 *
 * Fungsi:
 * 1. Connect ke MongoDB test database
 * 2. Bersihkan semua collections (fresh state)
 * 3. Seed user admin & kasir
 */
async function globalSetup() {
  const dbUrl = process.env.DATABASE_URL_TEST;

  if (!dbUrl) {
    throw new Error(
      '❌ DATABASE_URL_TEST belum di-set di .env\n' +
      'Tambahkan: DATABASE_URL_TEST=mongodb+srv://user:pass@cluster/...'
    );
  }

  console.log('\n🔧 [Global Setup] Memulai setup test database...');

  const client = new MongoClient(dbUrl);

  try {
    await client.connect();
    const db = client.db('db_pos_test');

    // 1. Bersihkan semua collections
    const collections = ['users', 'categories', 'products', 'transactions', 'notifications', 'forgotpasswordcooldowns'];

    for (const collName of collections) {
      const collection = db.collection(collName);
      const count = await collection.countDocuments();
      if (count > 0) {
        await collection.deleteMany({});
        console.log(`   🗑️  Cleaned ${collName} (${count} docs)`);
      }
    }

    // 2. Seed admin & kasir
    const usersCollection = db.collection('users');
    const hashedPassword = await bcrypt.hash('password123', 10);
    const now = new Date();

    await usersCollection.insertMany([
      {
        name: 'Admin Test',
        username: 'admin',
        password: hashedPassword,
        email: 'admin@test.com',
        role: 'admin',
        deletedAt: null,
        fcmToken: null,
        createdAt: now,
        updatedAt: now,
      },
      {
        name: 'Kasir Test',
        username: 'kasir',
        password: hashedPassword,
        email: 'kasir@test.com',
        role: 'kasir',
        deletedAt: null,
        fcmToken: null,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    console.log('   ✅ Seeded: admin & kasir');
    console.log('🔧 [Global Setup] Selesai!\n');
  } catch (error) {
    console.error('❌ [Global Setup] Gagal:', error);
    throw error;
  } finally {
    await client.close();
  }
}

export default globalSetup;
