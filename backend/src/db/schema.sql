-- Se puede ejecutar varias veces sin duplicar datos.
CREATE TABLE IF NOT EXISTS products (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  price       NUMERIC(10,2) NOT NULL,
  category    TEXT,
  image_url   TEXT,
  stock       INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT,              -- NULL si la cuenta es solo de Google
  google_id     TEXT UNIQUE,
  picture       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Productos de ejemplo: solo si la tabla está vacía
INSERT INTO products (name, description, price, category, image_url, stock)
SELECT * FROM (VALUES
  ('Hoodie Oversize Negro', 'Algodón pesado 380 g, corte amplio.', 129.90, 'polos', NULL, 12),
  ('Polo Boxy Gris Cemento', 'Algodón peinado, hombros caídos.', 69.90, 'polos', NULL, 25),
  ('Cargo Pants Verde Oliva', 'Seis bolsillos, tela resistente.', 149.90, 'pantalones', NULL, 8),
  ('Gorra Dad Hat', 'Bordado frontal, ajuste trasero.', 39.90, 'accesorios', NULL, 0)
) AS v(name, description, price, category, image_url, stock)
WHERE NOT EXISTS (SELECT 1 FROM products);
