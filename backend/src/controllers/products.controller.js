const pool = require('../config/db');

exports.getAll = async (req, res) => {
  try {
    const { category } = req.query;
    const { rows } = category
      ? await pool.query(
          'SELECT * FROM products WHERE category = $1 ORDER BY id DESC',
          [category]
        )
      : await pool.query('SELECT * FROM products ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudieron cargar los productos' });
  }
};

exports.getById = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM products WHERE id = $1', [
      req.params.id,
    ]);
    if (!rows.length) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al buscar el producto' });
  }
};
