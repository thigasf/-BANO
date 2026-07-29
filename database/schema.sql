-- Estrutura inicial da loja Ébano.
-- Execute neste banco somente após criar a base "ebano".

CREATE TABLE IF NOT EXISTS admin_users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  description TEXT,
  product_type VARCHAR(30) NOT NULL CHECK (product_type IN ('unit', 'box', 'event')),
  base_price NUMERIC(10,2) NOT NULL CHECK (base_price >= 0),
  quantity INTEGER,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS flavors (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coupons (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  discount_percent NUMERIC(5,2) NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS delivery_zones (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (delivery_fee >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS store_settings (
  setting_key VARCHAR(80) PRIMARY KEY,
  setting_value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
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
  subtotal NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0),
  discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (delivery_fee >= 0),
  total NUMERIC(10,2) NOT NULL CHECK (total >= 0),
  status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'delivering', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_name VARCHAR(160) NOT NULL,
  flavor_summary TEXT,
  unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  line_total NUMERIC(10,2) NOT NULL CHECK (line_total >= 0)
);

CREATE INDEX IF NOT EXISTS idx_orders_status_created_at ON orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

INSERT INTO flavors (name) VALUES
  ('Brigadeiro comum'), ('Brigadeiro meio amargo'), ('Brigadeiro de morango'),
  ('Brigadeiro de caramelo'), ('Brigadeiro de paçoca'), ('Brigadeiro de maracujá'),
  ('Brigadeiro de limão'), ('Brigadeiro de leite ninho'), ('Brigadeiro dois amores'), ('Beijinho')
ON CONFLICT (name) DO NOTHING;

INSERT INTO products (name, description, product_type, base_price, quantity) VALUES
  ('Brigadeiro avulso', 'Brigadeiro artesanal escolhido por sabor.', 'unit', 4.00, 1),
  ('Caixa com 4 brigadeiros', 'Caixa presenteável com quatro unidades.', 'box', 12.00, 4),
  ('Caixa degustação', 'Um de cada sabor da Ébano.', 'box', 25.00, 10),
  ('Cento de brigadeiros', 'Encomenda para festas e eventos.', 'event', 120.00, 100)
ON CONFLICT DO NOTHING;
