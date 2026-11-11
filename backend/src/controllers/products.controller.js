const pool = require('../config/db');

const CATEGORIES = ['polo', 'poleron', 'casaca', 'pantalon', 'short', 'gorra'];
const fail = (status, msg) => Object.assign(new Error(msg), { status, msg });
const sendFail = (res, err, fallback) => {
  if (err.status) return res.status(err.status).json({ error: err.msg });
  console.error(err);
  res.status(500).json({ error: fallback });
};

const totalStock = (s) => Object.values(s).reduce((a, b) => a + b, 0);

function cleanSizes(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const out = {};
  for (const [k, v] of Object.entries(input)) {
    const key = String(k).trim().slice(0, 10);
    const n = Math.floor(Number(v));
    if (!key || !Number.isFinite(n) || n < 0 || n > 9999) return null;
    out[key] = n;
  }
  return Object.keys(out).length ? out : null;
}

function cleanUrl(u) {
  const s = String(u || '').trim();
  if (!s) return null;
  if (s.length > 500 || !/^(https?:\/\/|\/|img\/)/i.test(s)) throw fail(400, 'El enlace de la imagen no es válido');
  return s;
}

function parseBody(b) {
  const name = String(b.name || '').trim();
  const description = String(b.description || '').trim().slice(0, 500) || null;
  const price = Number(b.price);
  const category = String(b.category || '');
  const sizes = cleanSizes(b.sizes);
  if (!name || name.length > 120) throw fail(400, 'Escribe un nombre (máximo 120 caracteres)');
  if (!Number.isFinite(price) || price <= 0 || price > 100000) throw fail(400, 'El precio debe ser mayor que 0');
  if (!CATEGORIES.includes(category)) throw fail(400, 'Elige una categoría válida');
  if (!sizes) throw fail(400, 'Indica el stock de cada talla (0 o más)');
  return { name, description, price: Math.round(price * 100) / 100, category, sizes };
}

async function saveImage(client, dataUrl) {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
  if (!m) throw fail(400, 'La imagen debe ser JPG, PNG o WebP');
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > 2 * 1024 * 1024) throw fail(413, 'La imagen supera los 2 MB');
  const { rows } = await client.query('INSERT INTO images (mime, data) VALUES ($1, $2) RETURNING id', [m[1], buf]);
  return '/api/images/' + rows[0].id;
}

// Solo borra fotos que subió el panel (las de img/ o enlaces externos no se tocan).
async function dropImage(client, url) {
  const m = /^\/api\/images\/(\d+)$/.exec(url || '');
  if (m) await client.query('DELETE FROM images WHERE id = $1', [m[1]]);
}

exports.getAll = async (req, res) => {
  try {
    const { category } = req.query;
    const { rows } = category
      ? await pool.query('SELECT * FROM products WHERE category = $1 ORDER BY id DESC', [category])
      : await pool.query('SELECT * FROM products ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudieron cargar los productos' });
  }
};

exports.getById = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al buscar el producto' });
  }
};

exports.create = async (req, res) => {
  const client = await pool.connect();
  try {
    const v = parseBody(req.body);
    await client.query('BEGIN');
    const image = req.body.image_data ? await saveImage(client, req.body.image_data) : cleanUrl(req.body.image_url);
    const { rows } = await client.query(
      `INSERT INTO products (name, description, price, category, image_url, stock, sizes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [v.name, v.description, v.price, v.category, image, totalStock(v.sizes), JSON.stringify(v.sizes)]
    );
    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    sendFail(res, err, 'No se pudo guardar la prenda');
  } finally {
    client.release();
  }
};

exports.update = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(404).json({ error: 'Producto no encontrado' });
  const client = await pool.connect();
  try {
    const v = parseBody(req.body);
    await client.query('BEGIN');
    const cur = await client.query('SELECT image_url FROM products WHERE id = $1 FOR UPDATE', [id]);
    if (!cur.rows.length) throw fail(404, 'Producto no encontrado');
    const old = cur.rows[0].image_url;

    let image = old;
    if (req.body.image_data) image = await saveImage(client, req.body.image_data);
    else if ('image_url' in req.body) image = cleanUrl(req.body.image_url);
    if (image !== old) await dropImage(client, old);

    const { rows } = await client.query(
      `UPDATE products SET name=$1, description=$2, price=$3, category=$4, image_url=$5, stock=$6, sizes=$7
       WHERE id=$8 RETURNING *`,
      [v.name, v.description, v.price, v.category, image, totalStock(v.sizes), JSON.stringify(v.sizes), id]
    );
    await client.query('COMMIT');
    res.json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    sendFail(res, err, 'No se pudo actualizar la prenda');
  } finally {
    client.release();
  }
};

exports.remove = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(404).json({ error: 'Producto no encontrado' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query('DELETE FROM products WHERE id = $1 RETURNING image_url', [id]);
    if (!rows.length) throw fail(404, 'Producto no encontrado');
    await dropImage(client, rows[0].image_url);
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    sendFail(res, err, 'No se pudo eliminar la prenda');
  } finally {
    client.release();
  }
};
