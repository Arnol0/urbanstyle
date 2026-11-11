const router = require('express').Router();
const pool = require('../config/db');

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(404).end();
  try {
    const { rows } = await pool.query('SELECT mime, data FROM images WHERE id = $1', [id]);
    if (!rows.length) return res.status(404).end();
    res.set({
      'Content-Type': rows[0].mime,
      'X-Content-Type-Options': 'nosniff',
      // Cada foto nueva tiene un id nuevo, así que se puede cachear para siempre.
      'Cache-Control': 'public, max-age=31536000, immutable',
    });
    res.send(rows[0].data);
  } catch (err) {
    console.error(err);
    res.status(500).end();
  }
});

module.exports = router;
