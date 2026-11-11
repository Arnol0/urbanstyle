-- Se puede ejecutar varias veces sin duplicar datos ni perder información.
CREATE TABLE IF NOT EXISTS products (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  price       NUMERIC(10,2) NOT NULL,
  category    TEXT,
  image_url   TEXT,
  stock       INTEGER NOT NULL DEFAULT 0,   -- total = suma de las tallas
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE products ADD COLUMN IF NOT EXISTS sizes JSONB NOT NULL DEFAULT '{}'::jsonb; -- {"S":3,"M":5}

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT,              -- NULL si la cuenta es solo de Google
  google_id     TEXT UNIQUE,
  picture       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE users ADD COLUMN IF NOT EXISTS role   TEXT    NOT NULL DEFAULT 'customer'; -- 'customer' | 'admin'
ALTER TABLE users ADD COLUMN IF NOT EXISTS points INTEGER NOT NULL DEFAULT 0;

-- Fotos subidas desde el panel de administrador (así no dependen del disco del servidor)
CREATE TABLE IF NOT EXISTS images (
  id         SERIAL PRIMARY KEY,
  mime       TEXT  NOT NULL,
  data       BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pedidos (pago simulado: no se guarda ningún dato de tarjeta)
CREATE TABLE IF NOT EXISTS orders (
  id               INTEGER PRIMARY KEY,
  code             TEXT NOT NULL UNIQUE,
  user_id          INTEGER REFERENCES users(id) ON DELETE SET NULL,
  customer_name    TEXT NOT NULL,
  phone            TEXT NOT NULL,
  address          TEXT NOT NULL,
  district         TEXT NOT NULL,
  payment          TEXT NOT NULL,
  coupon           TEXT,
  subtotal         NUMERIC(10,2) NOT NULL,
  discount         NUMERIC(10,2) NOT NULL DEFAULT 0,
  points_discount  NUMERIC(10,2) NOT NULL DEFAULT 0,
  shipping         NUMERIC(10,2) NOT NULL DEFAULT 0,
  total            NUMERIC(10,2) NOT NULL,
  points_earned    INTEGER NOT NULL DEFAULT 0,
  checkout_seconds INTEGER,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- El id se toma de esta secuencia para poder armar el código US-0001 antes de insertar
CREATE SEQUENCE IF NOT EXISTS orders_id_seq OWNED BY orders.id;

CREATE TABLE IF NOT EXISTS order_items (
  id         SERIAL PRIMARY KEY,
  order_id   INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  name       TEXT NOT NULL,
  size       TEXT NOT NULL,
  qty        INTEGER NOT NULL,
  price      NUMERIC(10,2) NOT NULL
);

-- Productos de ejemplo: solo si la tabla está vacía
INSERT INTO products (name, description, price, category, image_url, stock, sizes)
SELECT * FROM (VALUES
  ('Hoodie Oversize Negro', 'Algodón pesado 380 g, corte amplio.', 129.90, 'poleron', 'img/hoodie-negro.png', 12, '{"S":3,"M":3,"L":3,"XL":3}'::jsonb),
  ('Polo Boxy Gris Cemento', 'Algodón peinado, hombros caídos.', 69.90, 'polo', 'img/polo-gris.jpg', 25, '{"S":7,"M":6,"L":6,"XL":6}'::jsonb),
  ('Cargo Pants Verde Oliva', 'Seis bolsillos, tela resistente.', 149.90, 'pantalon', 'img/cargo-oliva.jpg', 8, '{"28":2,"30":2,"32":2,"34":2}'::jsonb),
  ('Gorra Dad Hat', 'Bordado frontal, ajuste trasero.', 39.90, 'gorra', 'img/gorra-dad-hat.jpg', 0, '{"Única":0}'::jsonb)
) AS v(name, description, price, category, image_url, stock, sizes)
WHERE NOT EXISTS (SELECT 1 FROM products);

-- Migración de una base ya existente (idempotente):
-- 1) categorías antiguas -> nuevas
UPDATE products SET category = 'poleron' WHERE category = 'polos' AND name ILIKE 'hoodie%';
UPDATE products SET category = CASE category
  WHEN 'polos' THEN 'polo' WHEN 'pantalones' THEN 'pantalon' WHEN 'accesorios' THEN 'gorra' ELSE category END
WHERE category IN ('polos', 'pantalones', 'accesorios');
-- 2) productos sin tallas: reparte el stock que ya tenían entre las tallas de su categoría
UPDATE products SET sizes = CASE
  WHEN category = 'pantalon' THEN jsonb_build_object('28', stock - 3*(stock/4), '30', stock/4, '32', stock/4, '34', stock/4)
  WHEN category IN ('polo','poleron','casaca','short') THEN jsonb_build_object('S', stock - 3*(stock/4), 'M', stock/4, 'L', stock/4, 'XL', stock/4)
  ELSE jsonb_build_object('Única', stock) END
WHERE sizes = '{}'::jsonb;
-- 3) fotos de ejemplo (solo si el producto no tiene foto)
UPDATE products SET image_url = 'img/hoodie-negro.png'  WHERE image_url IS NULL AND name = 'Hoodie Oversize Negro';
UPDATE products SET image_url = 'img/polo-gris.jpg'     WHERE image_url IS NULL AND name = 'Polo Boxy Gris Cemento';
UPDATE products SET image_url = 'img/cargo-oliva.jpg'   WHERE image_url IS NULL AND name = 'Cargo Pants Verde Oliva';
UPDATE products SET image_url = 'img/gorra-dad-hat.jpg' WHERE image_url IS NULL AND name = 'Gorra Dad Hat';
