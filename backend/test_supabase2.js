// test_supabase2.js - Testa via Connection Pooler do Supabase
const { Client } = require('pg');

// Projeto: enomevvkqiuwrjvotrgx | Região: us-east-2
const configs = [
  {
    label: 'Pooler Session (porta 5432) - Senha 1',
    host: 'aws-0-us-east-2.pooler.supabase.com',
    port: 5432,
    user: 'postgres.enomevvkqiuwrjvotrgx',
    password: '2YEzlw77r7hBnnsa',
    database: 'postgres',
  },
  {
    label: 'Pooler Transaction (porta 6543) - Senha 1',
    host: 'aws-0-us-east-2.pooler.supabase.com',
    port: 6543,
    user: 'postgres.enomevvkqiuwrjvotrgx',
    password: '2YEzlw77r7hBnnsa',
    database: 'postgres',
  },
  {
    label: 'Pooler Session (porta 5432) - Senha 2',
    host: 'aws-0-us-east-2.pooler.supabase.com',
    port: 5432,
    user: 'postgres.enomevvkqiuwrjvotrgx',
    password: '29052004tH@AdminÉbanopoggers',
    database: 'postgres',
  },
];

async function tryConnect(cfg) {
  const client = new Client({
    host: cfg.host, port: cfg.port,
    database: cfg.database, user: cfg.user, password: cfg.password,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });
  try {
    await client.connect();
    const res = await client.query('SELECT COUNT(*) as c FROM products');
    console.log(`\n✅ ${cfg.label}`);
    console.log(`   Produtos no Supabase: ${res.rows[0].c}`);
    console.log(`   HOST: ${cfg.host}:${cfg.port}`);
    console.log(`   USER: ${cfg.user}`);
    console.log(`   PASS: ${cfg.password}`);
    await client.end();
    return cfg;
  } catch (e) {
    console.log(`❌ ${cfg.label}: ${e.message.slice(0, 100)}`);
    try { await client.end(); } catch {}
    return null;
  }
}

(async () => {
  for (const cfg of configs) {
    const ok = await tryConnect(cfg);
    if (ok) {
      console.log('\n🎉 Conexão encontrada! Use estas credenciais no db.js.');
      process.exit(0);
    }
  }
  console.log('\n⚠️  Nenhuma conexão funcionou. Verifique a senha no painel do Supabase.');
})();
