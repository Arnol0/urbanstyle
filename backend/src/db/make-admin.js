// Uso: npm run make-admin -- correo@ejemplo.com
// La cuenta debe existir (créala primero en la tienda).
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '..', '.env') });
const pool = require('../config/db');

const email = String(process.argv[2] || '').trim().toLowerCase();
if (!email) {
  console.error('Uso: npm run make-admin -- correo@ejemplo.com');
  process.exit(1);
}

(async () => {
  try {
    const { rowCount } = await pool.query("UPDATE users SET role = 'admin' WHERE email = $1", [email]);
    if (rowCount) console.log(`Listo: ${email} ahora es administrador`);
    else { console.error('No existe un usuario con ese correo. Primero crea la cuenta en la tienda.'); process.exitCode = 1; }
  } catch (err) {
    console.error('Error:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
