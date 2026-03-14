# Subir CallShip a Railway

## 1. Crear proyecto en Railway

1. Entra en [railway.app](https://railway.app) e inicia sesión.
2. **New Project** → **Deploy from GitHub repo** (o **Empty Project** si subes por CLI).
3. Si usas GitHub: conecta el repositorio y elige la rama (p. ej. `main`). Railway usará la **raíz del repo** (donde está `package.json` y `railway.toml`).

## 2. Base de datos PostgreSQL (recomendado)

1. En el proyecto Railway: **+ New** → **Database** → **PostgreSQL**.
2. Railway crea el servicio y te asigna variables como `DATABASE_URL` o `DATABASE_PUBLIC_URL`.
3. En tu **servicio de la app** (el que despliega el código): **Variables** → **Add variable** → **Add a variable from another service** y enlaza las variables del PostgreSQL (p. ej. `DATABASE_URL`).

El servidor usa `DATABASE_PUBLIC_URL` o `DATABASE_URL`; no hace falta definir `PG_HOST`, `PG_PORT`, etc. si ya viene en la URL.

## 3. Variables de entorno del servicio

En el servicio de la aplicación (no en la base de datos), en **Variables**, añade al menos:

| Variable | Obligatoria | Descripción |
|----------|-------------|-------------|
| `NODE_ENV` | Recomendado | `production` |
| `JWT_SECRET` | **Sí** | Cadena larga y aleatoria (p. ej. genera una con `openssl rand -hex 32`) |
| `PORT` | No | Railway la asigna sola; el servidor la usa por defecto |
| `DATABASE_URL` o `DATABASE_PUBLIC_URL` | Si usas PostgreSQL | La enlazas desde el plugin PostgreSQL |
| `ALLOWED_ORIGIN` | Recomendado | Origen del frontend, p. ej. `https://tu-app.up.railway.app` (sin barra final). Varios: separados por coma |
| `ADMIN_USERS` | Opcional | Usernames de admin separados por coma (default: `medinax6`) |

### Opcionales (según lo que uses)

- **Correo (SMTP):** `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`, `FRONTEND_URL`
- **OxaPay:** `OXAPAY_MERCHANT_API_KEY`, `OXAPAY_RETURN_URL`, `OXAPAY_CALLBACK_URL`, `OXAPAY_SANDBOX`, `OXAPAY_WEBHOOK_SECRET`
- **Crypto (depósitos manuales):** `CRYPTO_BTC_ADDRESS`, `CRYPTO_ETH_ADDRESS`, `CRYPTO_USDT_TRC20_ADDRESS` o `CRYPTO_WALLETS` (JSON)

Para **producción con dominio propio** (p. ej. `https://www.callship.us`), pon:

- `ALLOWED_ORIGIN=https://www.callship.us`
- `FRONTEND_URL=https://www.callship.us`

Si el front se sirve desde el mismo dominio que la API (una sola app en Railway), no hace falta `VITE_API_URL`; la web usa `/api` en el mismo origen.

## 4. Build y Start en Railway

Con el `railway.toml` en la raíz del repo, Railway usará:

- **Build:** `npm install && npm run build`  
  (instala deps, construye el dialer, copia a `server/public`, instala deps del server)
- **Start:** `npm start`  
  (ejecuta el servidor Node que escucha en `PORT` y sirve API + estáticos)

No hace falta configurar nada más en el panel si el repo ya tiene `railway.toml`.

## 5. Dominio y HTTPS

1. En el servicio → **Settings** → **Networking** → **Generate Domain**.
2. Te dará una URL tipo `tu-app.up.railway.app`. Ya usa HTTPS.
3. Si quieres tu propio dominio: **Custom Domain** y apunta el DNS (CNAME) a la URL que te indique Railway.

## 6. Subir el código

### Opción A: Desde GitHub

- Conectas el repo y cada push a la rama elegida puede disparar un nuevo deploy (según la configuración del proyecto).

### Opción B: Railway CLI

```bash
# Instalar CLI: https://docs.railway.app/develop/cli
npm i -g @railway/cli

# En la raíz del proyecto CallShip
cd C:\Users\Shipe\OneDrive\Escritorio\CallShip
railway login
railway init   # enlaza proyecto existente o crea uno nuevo
railway up    # sube y despliega
```

## 7. Comprobar que funciona

- Abre la URL del servicio (p. ej. `https://tu-app.up.railway.app`).
- Deberías ver el login del dialer.
- Prueba `https://tu-app.up.railway.app/api/ping`; debe responder OK (Railway usa este endpoint como healthcheck si está configurado).

## Resumen mínimo para el primer deploy

1. Proyecto nuevo en Railway.
2. Añadir PostgreSQL y enlazar `DATABASE_URL` (o `DATABASE_PUBLIC_URL`) al servicio de la app.
3. En el servicio de la app, variables: `NODE_ENV=production`, `JWT_SECRET=<valor largo aleatorio>`, y si quieres CORS: `ALLOWED_ORIGIN=https://tu-dominio.up.railway.app`.
4. Conectar repo (o `railway up`) y desplegar.

El `railway.toml` en la raíz ya define build, start y healthcheck; no necesitas tocar la configuración de build/start en el dashboard salvo que quieras sobreescribirlas.
