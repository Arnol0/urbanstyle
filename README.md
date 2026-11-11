# UrbanStyle MVP

Frontend (HTML + Tailwind + JS) y backend (Node + Express + PostgreSQL en Neon).
Incluye registro/login con correo y con Google. El backend también sirve el frontend:
se despliega como **un solo servicio**.

## Variables de entorno
Archivo `.env` en la carpeta principal (en Render se agregan en Environment):
- `DATABASE_URL`: cadena de conexión de Neon
- `JWT_SECRET`: texto largo aleatorio (`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`)
- `GOOGLE_CLIENT_ID`: ID de cliente OAuth de Google

## Crear las tablas (una sola vez)
```bash
cd backend
npm install
npm run db:init
```

## Probar en local
```bash
cd backend
npm run dev     # http://localhost:3000
```

## Google
1. console.cloud.google.com → crea un proyecto.
2. Configura la pantalla de consentimiento de OAuth (tipo Externo).
3. Credenciales → Crear credenciales → ID de cliente de OAuth → Aplicación web.
4. En **Orígenes autorizados de JavaScript** agrega `http://localhost:3000` y `https://TU-APP.onrender.com`.
5. Copia el ID de cliente a `GOOGLE_CLIENT_ID`.

## Render
Web Service desde GitHub: Root Directory `backend`, Build `npm install`, Start `npm start`.
Variables: `DATABASE_URL`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `NODE_ENV=production`.

## API
- `GET /api/products`, `GET /api/products/:id`
- `POST /api/auth/register` · `POST /api/auth/login` · `POST /api/auth/google`
- `POST /api/auth/logout` · `GET /api/auth/me`
