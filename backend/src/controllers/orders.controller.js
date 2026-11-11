const pool = require('../config/db');
const publicUser = require('../utils/publicUser');

// Compra simulada: se valida y se guarda el pedido, pero no se cobra nada.
const COUPONS = { URBAN10: { pct: 0.10 }, BIENVENIDO: { pct: 0.15, login: true } };
const PAYMENTS = ['Yape', 'Plin', 'Tarjeta'];
const r2 = (n) => Math.round(n * 100) / 100;
const str = (v, n) => String(v ?? '').trim().slice(0, n);
const fail = (status, msg) => Object.assign(new Error(msg), { status, msg });

const ORDERS_SQL = `
  SELECT o.*, COALESCE((
    SELECT json_agg(json_build_object('name', i.name, 'size', i.size, 'qty', i.qty, 'price', i.price) ORDER BY i.id)
    FROM order_items i WHERE i.order_id = o.id), '[]'::json) AS items
  FROM orders o`;

exports.create = async (req, res) => {
  const b = req.body || {};
  const d = b.delivery || {};
  const delivery = { name: str(d.name, 80), phone: str(d.phone, 9), address: str(d.address, 160), district: str(d.district, 60) };
  const items = Array.isArray(b.items) ? b.items : [];

  if (!items.length || items.length > 50) return res.status(400).json({ error: 'Tu carrito está vacío' });
  if (!delivery.name || !/^[0-9]{9}$/.test(delivery.phone) || !delivery.address || !delivery.district)
    return res.status(400).json({ error: 'Completa tus datos de entrega (celular de 9 dígitos)' });
  if (!PAYMENTS.includes(b.payment)) return res.status(400).json({ error: 'Elige un método de pago' });

  // Une líneas repetidas (mismo producto y talla)
  const merged = new Map();
  for (const it of items) {
    const id = Number(it.product_id), qty = Math.floor(Number(it.qty)), size = str(it.size, 10);
    if (!Number.isInteger(id) || !size || !(qty >= 1 && qty <= 20)) return res.status(400).json({ error: 'Carrito inválido' });
    const k = id + '|' + size;
    merged.set(k, { id, size, qty: (merged.get(k) ? merged.get(k).qty : 0) + qty });
  }
  // Orden fijo para bloquear filas siempre en el mismo orden (evita bloqueos mutuos)
  const lines = [...merged.values()].sort((a, c) => a.id - c.id || a.size.localeCompare(c.size));

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let user = null;
    if (req.userId) {
      const u = await client.query('SELECT * FROM users WHERE id = $1 FOR UPDATE', [req.userId]);
      user = u.rows[0] || null;
    }

    // El precio y el stock salen de la base, nunca del navegador
    const prods = new Map();
    let sub = 0;
    for (const l of lines) {
      if (!prods.has(l.id)) {
        const { rows } = await client.query('SELECT * FROM products WHERE id = $1 FOR UPDATE', [l.id]);
        if (!rows.length) throw fail(409, 'Una prenda de tu carrito ya no está disponible');
        prods.set(l.id, { row: rows[0], sizes: { ...rows[0].sizes } });
      }
      const p = prods.get(l.id);
      const have = p.sizes[l.size];
      if (!(have >= l.qty)) throw fail(409, `Ya no hay stock suficiente de ${p.row.name} (talla ${l.size})`);
      p.sizes[l.size] = have - l.qty;
      l.name = p.row.name;
      l.price = Number(p.row.price);
      sub += l.price * l.qty;
    }
    sub = r2(sub);

    const code = str(b.coupon, 20).toUpperCase();
    const cp = COUPONS[code];
    if (code && !cp) throw fail(400, 'Código de descuento no válido');
    if (cp && cp.login && !user) throw fail(400, 'Ese código es solo para usuarios registrados');
    const discount = cp ? r2(sub * cp.pct) : 0;
    const pointsDiscount = b.usePoints && user ? Math.min(Math.floor(user.points / 20), Math.floor(sub - discount)) : 0;
    const shipping = sub >= 150 ? 0 : 8;
    const total = r2(sub - discount - pointsDiscount + shipping);

    for (const p of prods.values()) {
      const stock = Object.values(p.sizes).reduce((a, n) => a + n, 0);
      await client.query('UPDATE products SET sizes = $1, stock = $2 WHERE id = $3', [JSON.stringify(p.sizes), stock, p.row.id]);
    }

    let updatedUser = null, earned = 0;
    if (user) {
      earned = Math.floor(total);
      const up = await client.query('UPDATE users SET points = points - $1 + $2 WHERE id = $3 RETURNING *', [pointsDiscount * 20, earned, user.id]);
      updatedUser = up.rows[0];
    }

    const { rows: [{ id }] } = await client.query("SELECT nextval('orders_id_seq') AS id");
    const orderCode = 'US-' + String(id).padStart(4, '0');
    const secs = Math.floor(Number(b.seconds));
    await client.query(
      `INSERT INTO orders (id, code, user_id, customer_name, phone, address, district, payment, coupon,
                           subtotal, discount, points_discount, shipping, total, points_earned, checkout_seconds)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
      [id, orderCode, user ? user.id : null, delivery.name, delivery.phone, delivery.address, delivery.district,
       b.payment, cp ? code : null, sub, discount, pointsDiscount, shipping, total, earned,
       secs >= 0 && secs < 86400 ? secs : null]
    );
    for (const l of lines) {
      await client.query(
        'INSERT INTO order_items (order_id, product_id, name, size, qty, price) VALUES ($1,$2,$3,$4,$5,$6)',
        [id, l.id, l.name, l.size, l.qty, l.price]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({
      order: { code: orderCode, subtotal: sub, discount, points_discount: pointsDiscount, shipping, total, earned },
      user: updatedUser ? publicUser(updatedUser) : null,
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    if (err.status) return res.status(err.status).json({ error: err.msg });
    console.error(err);
    res.status(500).json({ error: 'No se pudo registrar el pedido. Inténtalo de nuevo' });
  } finally {
    client.release();
  }
};

exports.mine = async (req, res) => {
  try {
    const { rows } = await pool.query(`${ORDERS_SQL} WHERE o.user_id = $1 ORDER BY o.id DESC LIMIT 50`, [req.userId]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudieron cargar tus pedidos' });
  }
};

exports.all = async (req, res) => {
  try {
    const { rows } = await pool.query(`${ORDERS_SQL} ORDER BY o.id DESC LIMIT 200`);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudieron cargar los pedidos' });
  }
};
