/**
 * CallShip - Servidor API (tu index original + licencias)
 * PostgreSQL, users (username), calls, licenses. Sirve /public si existe.
 */
require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Archivos estáticos desde /public (frontend build del dialer)
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));
// SPA: rutas no-API sirven index.html (para producción con frontend en /public)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  const fs = require('fs');
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
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'callship-server' });
});

(async () => {
  try {
    await db.init();

    // Rutas (se registran DESPUÉS de inicializar la DB)
    app.use('/api/auth', require('./routes/auth'));
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
    app.use('/api/admin', require('./routes/admin'));

    app.listen(PORT, () => {
      console.log('API CallShip escuchando en http://localhost:' + PORT);
    });
  } catch (err) {
    console.error('Error iniciando la base de datos:', err);
    process.exit(1);
  }
})();
