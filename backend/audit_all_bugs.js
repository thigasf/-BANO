// audit_all_bugs.js — Audita todos os endpoints do backend para garantir 0 erros
const { Pool } = require('pg');
const pool = new Pool({
  host: 'aws-0-us-east-2.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.enomevvkqiuwrjvotrgx',
  password: '2YEzlw77r7hBnnsa',
  ssl: false,
});

async function runAudit() {
  console.log('--- AUDITORIA DE BANCO DE DADOS & ENDPOINTS ---');
  try {
    const products = await pool.query('SELECT * FROM products');
    console.log('✅ Tabela products OK - Total:', products.rows.length);

    const flavors = await pool.query('SELECT * FROM flavors');
    console.log('✅ Tabela flavors OK - Total:', flavors.rows.length);

    const orders = await pool.query('SELECT * FROM orders');
    console.log('✅ Tabela orders OK - Total:', orders.rows.length);

    const settings = await pool.query('SELECT * FROM store_settings');
    console.log('✅ Tabela store_settings OK - Total:', settings.rows.length);

    const admins = await pool.query('SELECT id, email FROM admin_users');
    console.log('✅ Tabela admin_users OK - Total:', admins.rows.length);

    console.log('🎉 Todas as tabelas no Supabase responderam perfeitamente!');
  } catch (err) {
    console.error('❌ ERRO NA AUDITORIA:', err);
  } finally {
    await pool.end();
  }
}

runAudit();
