// server.js — Ébano API REST
const express = require('express');
const cors = require('cors');
const path = require('path');
const pool = require('./db');
const { authenticateToken, login, ensureDefaultAdmin } = require('./auth');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Rota pública de login
app.post('/api/auth/login', login);

// ─────────────────────────────────────────────
// SABORES (/api/flavors)
// ─────────────────────────────────────────────

// Listar todos os sabores (opcionalmente filtrando por ativos)
app.get('/api/flavors', async (req, res) => {
  try {
    const onlyActive = req.query.active === 'true';
    let query = 'SELECT * FROM flavors ORDER BY name';
    let params = [];
    
    if (onlyActive) {
      query = 'SELECT * FROM flavors WHERE is_active = TRUE ORDER BY name';
    }
    
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Buscar sabor por ID
app.get('/api/flavors/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM flavors WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Sabor não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Criar sabor
app.post('/api/flavors', async (req, res) => {
  try {
    const { name, description, image_url, is_active } = req.body;
    if (!name) return res.status(400).json({ error: 'O nome do sabor é obrigatório' });
    
    const active = is_active !== false;
    const { rows } = await pool.query(
      'INSERT INTO flavors (name, description, image_url, is_active) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, description || null, image_url || null, active]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Já existe um sabor com este nome' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Atualizar sabor
app.put('/api/flavors/:id', async (req, res) => {
  try {
    const { name, description, image_url, is_active } = req.body;
    if (!name) return res.status(400).json({ error: 'O nome do sabor é obrigatório' });

    const { rows } = await pool.query(
      'UPDATE flavors SET name = $1, description = $2, image_url = $3, is_active = $4 WHERE id = $5 RETURNING *',
      [name, description, image_url, is_active !== false, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Sabor não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Desativar/Excluir sabor (soft delete padrão)
app.delete('/api/flavors/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      'UPDATE flavors SET is_active = FALSE WHERE id = $1',
      [req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Sabor não encontrado' });
    res.json({ message: 'Sabor desativado com sucesso' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// PRODUTOS (/api/products)
// ─────────────────────────────────────────────

// Listar todos os produtos (opcionalmente filtrando por ativos)
app.get('/api/products', async (req, res) => {
  try {
    const onlyActive = req.query.active === 'true';
    let query = 'SELECT * FROM products ORDER BY id';
    let params = [];

    if (onlyActive) {
      query = 'SELECT * FROM products WHERE is_active = TRUE ORDER BY id';
    }

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Buscar produto por ID
app.get('/api/products/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Produto não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Criar produto
app.post('/api/products', async (req, res) => {
  try {
    const { name, description, product_type, base_price, quantity, image_url, is_active } = req.body;
    if (!name || !product_type || base_price === undefined) {
      return res.status(400).json({ error: 'Nome, tipo de produto e preço base são obrigatórios' });
    }

    const { rows } = await pool.query(
      `INSERT INTO products (name, description, product_type, base_price, quantity, image_url, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, description || null, product_type, base_price, quantity || null, image_url || null, is_active !== false]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Atualizar produto
app.put('/api/products/:id', async (req, res) => {
  try {
    const { name, description, product_type, base_price, quantity, image_url, is_active } = req.body;
    if (!name || !product_type || base_price === undefined) {
      return res.status(400).json({ error: 'Nome, tipo de produto e preço base são obrigatórios' });
    }

    const { rows } = await pool.query(
      `UPDATE products 
       SET name = $1, description = $2, product_type = $3, base_price = $4, quantity = $5, image_url = $6, is_active = $7
       WHERE id = $8 RETURNING *`,
      [name, description, product_type, base_price, quantity, image_url, is_active !== false, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Produto não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Desativar produto
app.delete('/api/products/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      'UPDATE products SET is_active = FALSE WHERE id = $1',
      [req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Produto não encontrado' });
    res.json({ message: 'Produto desativado com sucesso' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// CUPONS DE DESCONTO (/api/coupons)
// ─────────────────────────────────────────────

// Listar todos os cupons
app.get('/api/coupons', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM coupons ORDER BY code');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Obter cupom pelo código (para validação do carrinho)
app.get('/api/coupons/:code', async (req, res) => {
  try {
    const code = req.params.code.trim().toUpperCase();
    const { rows } = await pool.query(
      `SELECT * FROM coupons 
       WHERE code = $1 AND is_active = TRUE 
         AND (starts_at IS NULL OR starts_at <= NOW()) 
         AND (ends_at IS NULL OR ends_at >= NOW())`,
      [code]
    );
    if (!rows.length) return res.status(404).json({ error: 'Cupom inválido, inativo ou expirado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Criar cupom
app.post('/api/coupons', async (req, res) => {
  try {
    const { code, discount_percent, is_active, starts_at, ends_at } = req.body;
    if (!code || !discount_percent) {
      return res.status(400).json({ error: 'Código e porcentagem de desconto são obrigatórios' });
    }

    const { rows } = await pool.query(
      `INSERT INTO coupons (code, discount_percent, is_active, starts_at, ends_at)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [code.trim().toUpperCase(), discount_percent, is_active !== false, starts_at || null, ends_at || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Já existe um cupom com este código' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Atualizar cupom
app.put('/api/coupons/:id', async (req, res) => {
  try {
    const { code, discount_percent, is_active, starts_at, ends_at } = req.body;
    if (!code || !discount_percent) {
      return res.status(400).json({ error: 'Código e porcentagem de desconto são obrigatórios' });
    }

    const { rows } = await pool.query(
      `UPDATE coupons 
       SET code = $1, discount_percent = $2, is_active = $3, starts_at = $4, ends_at = $5
       WHERE id = $6 RETURNING *`,
      [code.trim().toUpperCase(), discount_percent, is_active !== false, starts_at, ends_at, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Cupom não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Desativar cupom
app.delete('/api/coupons/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query('UPDATE coupons SET is_active = FALSE WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Cupom não encontrado' });
    res.json({ message: 'Cupom desativado com sucesso' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// ZONAS DE ENTREGA (/api/delivery-zones)
// ─────────────────────────────────────────────

// Listar zonas
app.get('/api/delivery-zones', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM delivery_zones ORDER BY name');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Criar zona
app.post('/api/delivery-zones', async (req, res) => {
  try {
    const { name, delivery_fee, is_active } = req.body;
    if (!name) return res.status(400).json({ error: 'O nome da zona é obrigatório' });

    const { rows } = await pool.query(
      'INSERT INTO delivery_zones (name, delivery_fee, is_active) VALUES ($1, $2, $3) RETURNING *',
      [name, delivery_fee || 0, is_active !== false]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Já existe uma zona com este nome' });
    res.status(500).json({ error: err.message });
  }
});

// Atualizar zona
app.put('/api/delivery-zones/:id', async (req, res) => {
  try {
    const { name, delivery_fee, is_active } = req.body;
    if (!name) return res.status(400).json({ error: 'O nome da zona é obrigatório' });

    const { rows } = await pool.query(
      'UPDATE delivery_zones SET name = $1, delivery_fee = $2, is_active = $3 WHERE id = $4 RETURNING *',
      [name, delivery_fee || 0, is_active !== false, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Zona não encontrada' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Deletar/Desativar zona
app.delete('/api/delivery-zones/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query('UPDATE delivery_zones SET is_active = FALSE WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Zona não encontrada' });
    res.json({ message: 'Zona desativada com sucesso' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// CONFIGURAÇÕES DA LOJA (/api/settings)
// ─────────────────────────────────────────────

// Obter todas as configurações
app.get('/api/settings', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM store_settings');
    // Transformar array de {setting_key, setting_value} em um objeto chave-valor
    const settings = {};
    rows.forEach(r => {
      settings[r.setting_key] = r.setting_value;
    });
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Salvar/Atualizar configurações (Upsert)
app.put('/api/settings', authenticateToken, async (req, res) => {
  try {
    const settings = req.body; // Objeto com múltiplos pares chave-valor
    if (typeof settings !== 'object') {
      return res.status(400).json({ error: 'Dados inválidos' });
    }

    const queries = Object.entries(settings).map(([key, val]) => {
      return pool.query(
        `INSERT INTO store_settings (setting_key, setting_value, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()`,
        [key, String(val)]
      );
    });

    await Promise.all(queries);
    res.json({ message: 'Configurações atualizadas com sucesso' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// PEDIDOS (/api/orders)
// ─────────────────────────────────────────────

// Listar pedidos
app.get('/api/orders', authenticateToken, async (req, res) => {
  try {
    const { status } = req.query;
    let query = 'SELECT * FROM orders ORDER BY created_at DESC';
    let params = [];

    if (status) {
      query = 'SELECT * FROM orders WHERE status = $1 ORDER BY created_at DESC';
      params = [status];
    }

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Obter detalhes de um pedido
app.get('/api/orders/:id', authenticateToken, async (req, res) => {
  try {
    const orderId = req.params.id;
    const orderQuery = 'SELECT * FROM orders WHERE id = $1';
    const itemsQuery = 'SELECT * FROM order_items WHERE order_id = $1';

    const [orderRes, itemsRes] = await Promise.all([
      pool.query(orderQuery, [orderId]),
      pool.query(itemsQuery, [orderId])
    ]);

    if (!orderRes.rows.length) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }

    const order = orderRes.rows[0];
    order.items = itemsRes.rows;

    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Criar pedido (com itens do pedido - Transação)
app.post('/api/orders', async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      customer_name,
      customer_phone,
      requested_date,
      requested_time,
      fulfillment_method,
      delivery_address,
      payment_method,
      gift_message,
      notes,
      coupon_code,
      subtotal,
      discount_amount,
      delivery_fee,
      total,
      items
    } = req.body;

    if (!customer_name || !requested_date || !fulfillment_method || !payment_method || !items || !items.length) {
      return res.status(400).json({ error: 'Dados obrigatórios do pedido estão ausentes' });
    }

    await client.query('BEGIN');

    // Inserir pedido
    const orderInsertQuery = `
      INSERT INTO orders (
        customer_name, customer_phone, requested_date, requested_time, 
        fulfillment_method, delivery_address, payment_method, gift_message, 
        notes, coupon_code, subtotal, discount_amount, delivery_fee, total
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id;
    `;
    const orderParams = [
      customer_name,
      customer_phone || null,
      requested_date,
      requested_time || null,
      fulfillment_method,
      delivery_address || null,
      payment_method,
      gift_message || null,
      notes || null,
      coupon_code || null,
      subtotal,
      discount_amount || 0,
      delivery_fee || 0,
      total
    ];

    const orderRes = await client.query(orderInsertQuery, orderParams);
    const orderId = orderRes.rows[0].id;

    // Inserir itens do pedido
    const itemInsertQuery = `
      INSERT INTO order_items (
        order_id, product_name, flavor_summary, unit_price, quantity, line_total
      ) VALUES ($1, $2, $3, $4, $5, $6);
    `;

    for (const item of items) {
      await client.query(itemInsertQuery, [
        orderId,
        item.product_name,
        item.flavor_summary || null,
        item.unit_price,
        item.quantity,
        item.line_total
      ]);
    }

    await client.query('COMMIT');
    res.status(201).json({ message: 'Pedido criado com sucesso', order_id: orderId });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Atualizar status do pedido
app.put('/api/orders/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'preparing', 'delivering', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }

    const { rows } = await pool.query(
      'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );

    if (!rows.length) return res.status(404).json({ error: 'Pedido não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// MÉTRICAS E DASHBOARD (/api/analytics)
// ─────────────────────────────────────────────
app.get('/api/analytics', authenticateToken, async (req, res) => {
  try {
    const totalRevQuery = "SELECT COALESCE(SUM(total), 0) AS total_revenue FROM orders WHERE status != 'cancelled'";
    const totalOrdersQuery = "SELECT COUNT(*) AS total_orders FROM orders";
    const pendingOrdersQuery = "SELECT COUNT(*) AS pending_orders FROM orders WHERE status IN ('pending', 'preparing')";
    const topItemsQuery = "SELECT product_name, SUM(quantity) AS qty FROM order_items GROUP BY product_name ORDER BY qty DESC LIMIT 5";

    const [revRes, ordersRes, pendingRes, topRes] = await Promise.all([
      pool.query(totalRevQuery),
      pool.query(totalOrdersQuery),
      pool.query(pendingOrdersQuery),
      pool.query(topItemsQuery)
    ]);

    res.json({
      total_revenue: parseFloat(revRes.rows[0].total_revenue),
      total_orders: parseInt(ordersRes.rows[0].total_orders),
      pending_orders: parseInt(pendingRes.rows[0].pending_orders),
      top_items: topRes.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// DEPOIMENTOS DE CLIENTES (/api/testimonials)
// ─────────────────────────────────────────────

// Listar depoimentos ativos (público)
app.get('/api/testimonials', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM testimonials WHERE is_active = TRUE ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Listar todos os depoimentos (autenticado)
app.get('/api/testimonials/all', authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM testimonials ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Criar depoimento
app.post('/api/testimonials', authenticateToken, async (req, res) => {
  try {
    const { customer_name, comment, rating } = req.body;
    if (!customer_name || !comment) {
      return res.status(400).json({ error: 'Nome e comentário são obrigatórios' });
    }
    const { rows } = await pool.query(
      'INSERT INTO testimonials (customer_name, comment, rating) VALUES ($1, $2, $3) RETURNING *',
      [customer_name, comment, rating || 5]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Atualizar depoimento
app.put('/api/testimonials/:id', authenticateToken, async (req, res) => {
  try {
    const { customer_name, comment, rating, is_active } = req.body;
    const { rows } = await pool.query(
      'UPDATE testimonials SET customer_name = $1, comment = $2, rating = $3, is_active = $4 WHERE id = $5 RETURNING *',
      [customer_name, comment, rating, is_active !== false, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Depoimento não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Excluir depoimento
app.delete('/api/testimonials/:id', authenticateToken, async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM testimonials WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Depoimento não encontrado' });
    res.json({ message: 'Depoimento removido com sucesso' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// INICIALIZAÇÃO
// ─────────────────────────────────────────────
if (require.main === module) {
  app.listen(PORT, async () => {
    console.log(`Servidor Ébano rodando em http://localhost:${PORT}`);
    await ensureDefaultAdmin();
  });
}

module.exports = app;
