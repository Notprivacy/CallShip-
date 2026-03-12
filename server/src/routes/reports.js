const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'cambiar-en-produccion';

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, message: 'Token requerido' });
  }
  try {
    const token = header.slice(7);
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ ok: false, message: 'Token inválido' });
  }
}

router.use(authMiddleware);

// Reporte simple por día (últimos N días)
router.get('/calls-by-day', async (req, res) => {
  const days = Math.min(90, Math.max(7, parseInt(req.query.days || '14', 10)));
  try {
    // Compatible: en SQLite y Postgres usamos substr(created_at,1,10) / to_char
    const isSqlite = process.env.USE_SQLITE === '1' || process.env.USE_SQLITE === 'true';
    const sql = isSqlite
      ? `SELECT substr(created_at, 1, 10) AS day, COUNT(*) AS calls
         FROM calls
         WHERE user_id = $1
         GROUP BY substr(created_at, 1, 10)
         ORDER BY day DESC
         LIMIT $2`
      : `SELECT to_char(created_at, 'YYYY-MM-DD') AS day, COUNT(*) AS calls
         FROM calls
         WHERE user_id = $1
         GROUP BY to_char(created_at, 'YYYY-MM-DD')
         ORDER BY day DESC
         LIMIT $2`;
    const r = await db.pool.query(sql, [req.user.userId, days]);
    res.json({ ok: true, rows: r.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: 'Error en reporte' });
  }
});

module.exports = router;

