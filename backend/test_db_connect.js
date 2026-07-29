// test_db_connect.js
const { Pool } = require('pg');

async function testConfig(name, config) {
  console.log(`\nTesting ${name}...`);
  const pool = new Pool(config);
  try {
    const res = await pool.query('SELECT COUNT(*) FROM products');
    console.log(`✅ Success for ${name}: count = ${res.rows[0].count}`);
    await pool.end();
    return true;
  } catch (err) {
    console.log(`❌ Failed for ${name}:`, err.message);
    await pool.end().catch(() => {});
    return false;
  }
}

(async () => {
  // Option 1: pooler port 5432, ssl: { rejectUnauthorized: false }
  await testConfig('Pooler 5432 with ssl', {
    host: 'aws-0-us-east-2.pooler.supabase.com',
    port: 5432,
    database: 'postgres',
    user: 'postgres.enomevvkqiuwrjvotrgx',
    password: '2YEzlw77r7hBnnsa',
    ssl: { rejectUnauthorized: false }
  });

  // Option 2: pooler port 5432, ssl: false
  await testConfig('Pooler 5432 ssl false', {
    host: 'aws-0-us-east-2.pooler.supabase.com',
    port: 5432,
    database: 'postgres',
    user: 'postgres.enomevvkqiuwrjvotrgx',
    password: '2YEzlw77r7hBnnsa',
    ssl: false
  });

  // Option 3: pooler port 6543 (transaction mode), ssl: { rejectUnauthorized: false }
  await testConfig('Pooler 6543 with ssl', {
    host: 'aws-0-us-east-2.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres.enomevvkqiuwrjvotrgx',
    password: '2YEzlw77r7hBnnsa',
    ssl: { rejectUnauthorized: false }
  });

  // Option 4: pooler port 6543, ssl: false
  await testConfig('Pooler 6543 ssl false', {
    host: 'aws-0-us-east-2.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres.enomevvkqiuwrjvotrgx',
    password: '2YEzlw77r7hBnnsa',
    ssl: false
  });

  // Option 5: Connection String URI
  await testConfig('Connection String 5432 sslmode=disable', {
    connectionString: 'postgresql://postgres.enomevvkqiuwrjvotrgx:2YEzlw77r7hBnnsa@aws-0-us-east-2.pooler.supabase.com:5432/postgres?sslmode=disable'
  });

  // Option 6: Connection String 5432 sslmode=require
  await testConfig('Connection String 5432 sslmode=require', {
    connectionString: 'postgresql://postgres.enomevvkqiuwrjvotrgx:2YEzlw77r7hBnnsa@aws-0-us-east-2.pooler.supabase.com:5432/postgres?sslmode=require',
    ssl: { rejectUnauthorized: false }
  });

  // Option 7: Direct DB host db.enomevvkqiuwrjvotrgx.supabase.co port 5432
  await testConfig('Direct Host db.enomevvkqiuwrjvotrgx.supabase.co port 5432', {
    host: 'db.enomevvkqiuwrjvotrgx.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: '2YEzlw77r7hBnnsa',
    ssl: { rejectUnauthorized: false }
  });

})();
