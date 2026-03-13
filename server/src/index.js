/**
 * CallShip - Servidor API (tu index original + licencias)
 * PostgreSQL, users (username), calls, licenses. Sirve /public si existe.
 * Incluye medidas de seguridad: rate limit, helmet, CORS opcional.
 */
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const db = require('./db');
const { apiLimiter, authLimiter, adminLimiter, checkJwtSecret, isProd } = require('./middleware/security');
const { safeError } = require('./config');

// Evitar que excepciones no capturadas o promesas rechazadas tiren el proceso sin log
process.on('uncaughtException', (err) => {
  console.error('uncaughtException:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('unhandledRejection:', reason);
});

checkJwtSecret();

const app = express();
const PORT = process.env.PORT || 4000;

// Para que rate limit vea la IP real detrás de Railway/proxy
app.set('trust proxy', 1);

// Cabeceras de seguridad (XSS, clickjacking, MIME sniffing, CSP)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
    },
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  crossOriginResourcePolicy: { policy: 'same-site' },
}));

// CORS: en producción restringe al origen de tu web si defines ALLOWED_ORIGIN
const allowedOrigins = (process.env.ALLOWED_ORIGIN || '').split(',').map((o) => o.trim()).filter(Boolean);
const corsOptions = isProd && allowedOrigins.length > 0
  ? { origin: allowedOrigins, credentials: true }
  : {};
app.use(cors(corsOptions));

// Límite de tamaño del body para evitar payloads enormes
app.use(express.json({ limit: '512kb' }));

// Rate limit global: protege contra abuso y DDoS por IP
app.use('/api', apiLimiter);

// Archivos estáticos desde /public (frontend build del dialer)
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));
// SPA: rutas no-API sirven index.html (para producción con frontend en /public)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  const indexFile = path.join(publicDir, 'index.html');
  if (!fs.existsSync(publicDir) || !fs.existsSync(indexFile)) return next();
  const p = path.join(publicDir, req.path);
  fs.stat(p, (err, stat) => {
    if (!err && stat && stat.isFile()) return next();
    res.sendFile(indexFile, (e) => { if (e) next(); });
  });
});

// Health / ping (tu endpoint original)
app.get('/api/ping', async (req, res) => {
  try {
    const db = require('./db');
    // PostgreSQL: SELECT NOW(); SQLite: usamos hora local
    try {
      const result = await db.pool.query('SELECT NOW()');
      res.json({ ok: true, time: result.rows[0]?.now || new Date().toISOString() });
    } catch {
      res.json({ ok: true, time: new Date().toISOString() });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: safeError(err) });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'callship-server' });
});

// Para verificar qué build está desplegado (abre https://www.callship.us/api/build-info)
app.get('/api/build-info', (req, res) => {
  const buildFile = path.join(publicDir, 'build.txt');
  try {
    if (fs.existsSync(buildFile)) {
      const content = fs.readFileSync(buildFile, 'utf8').trim();
      return res.json({ ok: true, build: content, hasPublic: true });
    }
    return res.json({ ok: false, message: 'No existe build.txt', hasPublic: fs.existsSync(publicDir) });
  } catch (e) {
    return res.json({ ok: false, error: safeError(e), hasPublic: fs.existsSync(publicDir) });
  }
});

(async () => {
  try {
    await db.init();

    // Rastreador de depósitos manuales por hash: al confirmarse en blockchain se acredita automáticamente
    const cryptoDepositChecker = require('./cryptoDepositChecker');
    cryptoDepositChecker.start();

    // Rutas (se registran DESPUÉS de inicializar la DB)
    // Auth con rate limit estricto para evitar brute force en login/registro
    app.use('/api/auth', authLimiter, require('./routes/auth'));
    app.use('/api/users', require('./routes/users'));
    app.use('/api/licenses', require('./routes/licenses'));
    app.use('/api/calls', require('./routes/calls'));
    app.use('/api/products', require('./routes/products'));
    app.use('/api/rates', require('./routes/rates'));
    app.use('/api/billing', require('./routes/billing'));
    app.use('/api/reports', require('./routes/reports'));
    app.use('/api/settings', require('./routes/settings'));
    app.use('/api/sip-devices', require('./routes/sipdevices'));
    app.use('/api/oxapay', require('./routes/oxapay'));
    app.use('/api/admin', adminLimiter, require('./routes/admin'));

    app.listen(PORT, () => {
      console.log('API CallShip escuchando en http://localhost:' + PORT);
    });
  } catch (err) {
    console.error('Error iniciando la base de datos:', err);
    process.exit(1);
  }
})();
