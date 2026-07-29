// test_supabase.js - Testa qual senha funciona no Supabase
const { Client } = require('pg');

const HOST = 'db.enomevvkqiuwrjvotrgx.supabase.co';
const PORT = 5432;
const DATABASE = 'postgres';
const USER = 'postgres';

const passwords = [
  { label: 'Senha 1', pass: '2YEzlw77r7hBnnsa' },
  { label: 'Senha 2', pass: '29052004tH@AdminÉbanopoggers' },
];

async function tryConnect(label, pass) {
  const client = new Client({ host: HOST, port: PORT, database: DATABASE, user: USER, password: pass, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 8000 });
  try {
    await client.connect();
    const res = await client.query('SELECT COUNT(*) FROM products');
    console.log(`✅ ${label} FUNCIONOU! Produtos no Supabase: ${res.rows[0].count}`);
    await client.end();
    return true;
  } catch (e) {
    console.log(`❌ ${label} falhou: ${e.message.slice(0, 80)}`);
    try { await client.end(); } catch {}
    return false;
  }
}

(async () => {
  for (const { label, pass } of passwords) {
    const ok = await tryConnect(label, pass);
    if (ok) {
      console.log(`\n🔑 Usar esta senha: ${pass}`);
      break;
    }
  }
})();
