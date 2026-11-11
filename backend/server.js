const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const productsRoutes = require('./src/routes/products.routes');
const authRoutes = require('./src/routes/auth.routes');

if (!process.env.JWT_SECRET) {
  console.error('Falta JWT_SECRET en las variables de entorno.');
  process.exit(1);
}

const app = express();
app.set('trust proxy', 1); // Render va detrás de un proxy
app.use(cors());
app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (req, res) => res.json({ ok: true }));
// El ID de cliente de Google es público; el frontend lo necesita para el botón.
app.get('/api/config', (req, res) =>
  res.json({ googleClientId: process.env.GOOGLE_CLIENT_ID || null })
);
app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);

app.use(express.static(path.join(__dirname, '..', 'frontend')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor listo en el puerto ${PORT}`));
