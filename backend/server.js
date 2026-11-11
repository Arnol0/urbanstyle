const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const productsRoutes = require('./src/routes/products.routes');
const authRoutes = require('./src/routes/auth.routes');
const ordersRoutes = require('./src/routes/orders.routes');
const imagesRoutes = require('./src/routes/images.routes');

if (!process.env.JWT_SECRET) {
  console.error('Falta JWT_SECRET en las variables de entorno.');
  process.exit(1);
}

const app = express();
app.set('trust proxy', 1); // Render va detrás de un proxy
app.use(cors());
app.use(express.json({ limit: '3mb' })); // las fotos del panel llegan reducidas, ~200 KB
app.use(cookieParser());

app.get('/api/health', (req, res) => res.json({ ok: true }));
// El ID de cliente de Google es público; el frontend lo necesita para el botón.
app.get('/api/config', (req, res) =>
  res.json({ googleClientId: process.env.GOOGLE_CLIENT_ID || null })
);
app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/images', imagesRoutes);

app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'La imagen es demasiado grande' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Datos no válidos' });
  console.error(err);
  res.status(500).json({ error: 'Error del servidor' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor listo en el puerto ${PORT}`));
