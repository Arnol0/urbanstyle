const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const pool = require('../config/db');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const COOKIE = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
};

const publicUser = require('../utils/publicUser');

function startSession(res, user) {
  const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.cookie('token', token, { ...COOKIE, maxAge: 7 * 24 * 60 * 60 * 1000 });
}

exports.register = async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  if (!name || !EMAIL_RE.test(email))
    return res.status(400).json({ error: 'Escribe tu nombre y un correo válido' });
  if (password.length < 8)
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
  if (password.length > 72)
    return res.status(400).json({ error: 'La contraseña puede tener hasta 72 caracteres' });

  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      'INSERT INTO users (name, email, password_hash, points) VALUES ($1, $2, $3, 100) RETURNING *',
      [name, email, hash]
    );
    startSession(res, rows[0]);
    res.status(201).json({ user: publicUser(rows[0]) });
  } catch (err) {
    if (err.code === '23505')
      return res.status(409).json({ error: 'Ese correo ya tiene una cuenta. Inicia sesión' });
    console.error(err);
    res.status(500).json({ error: 'No se pudo crear la cuenta' });
  }
};

exports.login = async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = rows[0];
    if (user && !user.password_hash)
      return res.status(401).json({ error: 'Esta cuenta usa Google. Entra con el botón de Google' });
    if (!user || !(await bcrypt.compare(password, user.password_hash)))
      return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
    startSession(res, user);
    res.json({ user: publicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo iniciar sesión' });
  }
};

exports.google = async (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return res.status(503).json({ error: 'El acceso con Google no está configurado' });

  try {
    // Google firma el token; aquí se verifica la firma y que sea para nuestra app.
    const ticket = await new OAuth2Client(clientId).verifyIdToken({
      idToken: String(req.body.credential || ''),
      audience: clientId,
    });
    const p = ticket.getPayload();
    if (!p.email || !p.email_verified)
      return res.status(401).json({ error: 'Tu correo de Google no está verificado' });

    const email = p.email.toLowerCase();
    const found = await pool.query(
      'SELECT * FROM users WHERE google_id = $1 OR email = $2 LIMIT 1',
      [p.sub, email]
    );
    let user = found.rows[0];

    if (!user) {
      const ins = await pool.query(
        'INSERT INTO users (name, email, google_id, picture, points) VALUES ($1, $2, $3, $4, 100) RETURNING *',
        [p.name || email.split('@')[0], email, p.sub, p.picture || null]
      );
      user = ins.rows[0];
    } else if (!user.google_id) {
      // Ya tenía cuenta con correo y contraseña: se vincula con Google.
      const upd = await pool.query(
        'UPDATE users SET google_id = $1, picture = COALESCE(picture, $2) WHERE id = $3 RETURNING *',
        [p.sub, p.picture || null, user.id]
      );
      user = upd.rows[0];
    }

    startSession(res, user);
    res.json({ user: publicUser(user) });
  } catch (err) {
    console.error(err.message);
    res.status(401).json({ error: 'No pudimos verificar tu cuenta de Google' });
  }
};

exports.me = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [req.userId]);
    if (!rows.length) return res.status(401).json({ error: 'Sesión no válida' });
    res.json({ user: publicUser(rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al leer tu sesión' });
  }
};

exports.logout = (req, res) => {
  res.clearCookie('token', COOKIE);
  res.json({ ok: true });
};
