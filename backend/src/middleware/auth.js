const jwt = require('jsonwebtoken');
const pool = require('../config/db');

exports.requireAuth = (req, res, next) => {
  const token = req.cookies && req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Inicia sesión para continuar' });
  try {
    req.userId = jwt.verify(token, process.env.JWT_SECRET).sub;
    next();
  } catch {
    res.status(401).json({ error: 'Tu sesión expiró. Inicia sesión de nuevo' });
  }
};

// Para compras de invitado: si hay sesión válida la usa, si no, sigue sin usuario.
exports.optionalAuth = (req, res, next) => {
  req.userId = null;
  const token = req.cookies && req.cookies.token;
  if (token) {
    try { req.userId = jwt.verify(token, process.env.JWT_SECRET).sub; } catch { /* invitado */ }
  }
  next();
};

// El rol se lee de la base en cada petición: quitarlo o ponerlo surte efecto de inmediato.
exports.requireAdmin = [
  exports.requireAuth,
  async (req, res, next) => {
    try {
      const { rows } = await pool.query('SELECT role FROM users WHERE id = $1', [req.userId]);
      if (!rows[0] || rows[0].role !== 'admin')
        return res.status(403).json({ error: 'Solo para administradores' });
      next();
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'No se pudieron verificar tus permisos' });
    }
  },
];
