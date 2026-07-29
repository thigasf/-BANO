// export_sql.js - Exporta o banco ebano como SQL para importar no Supabase
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'ebano',
  user: 'postgres',
  password: 'admin'
});

const outputFile = path.join('C:\\Users\\User\\Documents', 'ÉBANO', 'database', 'ebano_supabase.sql');

async function exportSchema() {
  await client.connect();
  const lines = [];

  lines.push('-- Ébano Brigadeiros - Export para Supabase');
  lines.push('-- Gerado em: ' + new Date().toISOString());
  lines.push('');

  // 1. Tabelas
  const tables = ['store_settings', 'products', 'flavors', 'admin_users', 'orders', 'order_items', 'testimonials'];

  // Schema de cada tabela
  lines.push('-- TABELAS');
  lines.push(`CREATE TABLE IF NOT EXISTS store_settings (
  setting_key VARCHAR(80) PRIMARY KEY,
  setting_value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);`);

  lines.push(`CREATE TABLE IF NOT EXISTS products (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  description TEXT,
  product_type VARCHAR(30) NOT NULL CHECK (product_type IN ('unit', 'box', 'event')),
  base_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);`);

  lines.push(`CREATE TABLE IF NOT EXISTS flavors (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(160) NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);`);

  lines.push(`CREATE TABLE IF NOT EXISTS admin_users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email VARCHAR(254) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);`);

  lines.push(`CREATE TABLE IF NOT EXISTS orders (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_name VARCHAR(160) NOT NULL,
  customer_phone VARCHAR(30),
  requested_date DATE NOT NULL,
  requested_time TIME,
  fulfillment_method VARCHAR(20) NOT NULL CHECK (fulfillment_method IN ('pickup', 'delivery')),
  delivery_address TEXT,
  payment_method VARCHAR(30) NOT NULL,
  gift_message TEXT,
  notes TEXT,
  coupon_code VARCHAR(50),
  subtotal NUMERIC(10,2) NOT NULL,
  discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);`);

  lines.push(`CREATE TABLE IF NOT EXISTS order_items (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_name VARCHAR(160) NOT NULL,
  flavor_summary TEXT,
  unit_price NUMERIC(10,2) NOT NULL,
  quantity INTEGER NOT NULL,
  line_total NUMERIC(10,2) NOT NULL
);`);

  lines.push(`CREATE TABLE IF NOT EXISTS testimonials (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_name VARCHAR(120) NOT NULL,
  comment TEXT NOT NULL,
  rating INTEGER NOT NULL DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);`);

  lines.push('');
  lines.push('-- DADOS');

  // 2. Dados de cada tabela (exceto admin_users por segurança)
  const dataTables = ['store_settings', 'products', 'flavors', 'orders', 'order_items', 'testimonials'];

  // Colunas a excluir por tabela
  const excludeCols = {
    store_settings: [],
    products: ['image_url', 'created_at'],
    flavors: ['created_at'],
    orders: ['created_at'],
    order_items: [],
    testimonials: ['created_at']
  };

  // Tabelas com GENERATED ALWAYS AS IDENTITY que precisam preservar o ID original
  // (para manter integridade de foreign keys)
  const identityTables = new Set(['products', 'flavors', 'orders', 'order_items', 'testimonials']);

  // IDs de orders com datas inválidas (serão filtrados)
  const invalidOrderIds = new Set();

  // OIDs de tipos do PostgreSQL
  const DATE_OID = 1082;
  const TIME_OID = 1083;
  const TIMETZ_OID = 1266;
  const TIMESTAMP_OID = 1114;
  const TIMESTAMPTZ_OID = 1184;

  for (const table of dataTables) {
    try {
      const result = await client.query(`SELECT * FROM ${table} ORDER BY 1`);
      if (result.rows.length === 0) continue;

      lines.push(`\n-- Dados de: ${table}`);
      // Para tabelas com identity, inclui o ID para preservar relações
      const keepId = identityTables.has(table);
      const skip = new Set([...(keepId ? [] : ['id']), ...(excludeCols[table] || [])]);

      // Mapeia nome da coluna -> OID do tipo
      const fieldTypes = {};
      for (const f of result.fields) fieldTypes[f.name] = f.dataTypeID;

      for (const row of result.rows) {
        const keys = Object.keys(row).filter(k => !skip.has(k));
        const cols = keys.join(', ');
        const vals = keys.map(k => {
          const v = row[k];
          if (v === null || v === undefined) return 'NULL';
          if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
          if (typeof v === 'number') return v;

          const oid = fieldTypes[k];

          // Coluna DATE -> formato YYYY-MM-DD
          if (oid === DATE_OID) {
            if (v instanceof Date) {
              const y = v.getUTCFullYear();
              const m = String(v.getUTCMonth() + 1).padStart(2, '0');
              const d = String(v.getUTCDate()).padStart(2, '0');
              return `'${y}-${m}-${d}'`;
            }
            // Já pode ser string 'YYYY-MM-DD'
            return `'${String(v).slice(0, 10)}'`;
          }

          // Coluna TIME / TIMETZ -> formatar sem timezone
          if (oid === TIME_OID || oid === TIMETZ_OID) {
            const s = String(v);
            // retornar só HH:MM:SS
            return `'${s.slice(0, 8)}'`;
          }

          // Coluna TIMESTAMP / TIMESTAMPTZ -> ISO string
          if (oid === TIMESTAMP_OID || oid === TIMESTAMPTZ_OID) {
            if (v instanceof Date) return `'${v.toISOString()}'`;
            const jsDate = new Date(String(v));
            if (!isNaN(jsDate.getTime())) return `'${jsDate.toISOString()}'`;
          }

          if (v instanceof Date) return `'${v.toISOString()}'`;
          const s = String(v);
          // Detectar strings que parecem datas JS ("Mon Jul...") e converter
          const jsDate = new Date(s);
          if (!isNaN(jsDate.getTime()) && s.includes(' ') && (s.includes('GMT') || s.includes('200') || s.includes('202') || s.includes('2026'))) {
            return `'${jsDate.toISOString()}'`;
          }
          return `'${s.replace(/'/g, "''")}'`;
        }).join(', ');

        // Filtrar orders com datas inválidas (ano > 9999)
        if (table === 'orders') {
          const dateIdx = keys.indexOf('requested_date');
          if (dateIdx >= 0) {
            const rawDate = row['requested_date'];
            const dateStr = rawDate instanceof Date
              ? `${rawDate.getUTCFullYear()}-${String(rawDate.getUTCMonth()+1).padStart(2,'0')}-${String(rawDate.getUTCDate()).padStart(2,'0')}`
              : String(rawDate).slice(0, 10);
            const year = parseInt(dateStr.split('-')[0]);
            if (isNaN(year) || year > 9999 || year < 1) {
              invalidOrderIds.add(row['id']);
              lines.push(`-- (pedido id=${row['id']} ignorado: data inválida '${dateStr}')`);
              continue;
            }
          }
        }

        // Filtrar order_items que referenciam pedidos inválidos
        if (table === 'order_items' && invalidOrderIds.has(row['order_id'])) {
          lines.push(`-- (item id=${row['id']} ignorado: pedido ${row['order_id']} inválido)`);
          continue;
        }

        const overriding = keepId ? ' OVERRIDING SYSTEM VALUE' : '';
        lines.push(`INSERT INTO ${table} (${cols})${overriding} VALUES (${vals}) ON CONFLICT DO NOTHING;`);
      }
    } catch (e) {
      lines.push(`-- Erro ao exportar ${table}: ${e.message}`);
    }
  }

  lines.push('');
  lines.push('-- Índices');
  lines.push('CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status, created_at DESC);');
  lines.push('CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);');
  lines.push('');
  lines.push('-- Resetar sequências (para novos inserts usarem IDs corretos)');
  for (const table of ['products', 'flavors', 'orders', 'order_items', 'testimonials', 'admin_users']) {
    lines.push(`SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT MAX(id) FROM ${table}), 0) + 1, false);`);
  }
  lines.push('');
  lines.push('-- Fim da exportação');

  fs.writeFileSync(outputFile, lines.join('\n'), 'utf8');
  console.log(`✅ Exportação concluída! Arquivo salvo em:\n${outputFile}`);
  console.log(`📁 Tamanho: ${Math.round(fs.statSync(outputFile).size / 1024)} KB`);
  
  await client.end();
}

exportSchema().catch(err => {
  console.error('Erro:', err.message);
  process.exit(1);
});
