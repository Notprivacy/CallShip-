const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, safeError } = require('../config');

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

// Listar rates (paginado: ?limit=100&offset=0 o ?page=1&limit=100; búsqueda: ?q=...)
router.get('/', async (req, res) => {
  const q = String(req.query.q || '').trim();
  const limit = Math.min(500, Math.max(1, parseInt(req.query.limit || '100', 10) || 100));
  const page = Math.max(1, parseInt(req.query.page || '1', 10) || 1);
  const offset = req.query.offset != null ? Math.max(0, parseInt(req.query.offset, 10) || 0) : (page - 1) * limit;
  try {
    const countSql = q
      ? 'SELECT COUNT(*) AS total FROM rates WHERE prefix LIKE $1 OR destination LIKE $1'
      : 'SELECT COUNT(*) AS total FROM rates';
    const countParams = q ? [`%${q}%`] : [];
    const countResult = await db.pool.query(countSql, countParams);
    const total = parseInt(countResult.rows[0]?.total || 0, 10);

    if (q) {
      const r = await db.pool.query(
        `SELECT id, prefix, destination, rate_usd, created_at
         FROM rates
         WHERE prefix LIKE $1 OR destination LIKE $1
         ORDER BY destination ASC LIMIT $2 OFFSET $3`,
        [`%${q}%`, limit, offset]
      );
      return res.json({
        ok: true,
        rates: r.rows,
        pagination: { total, limit, offset, page: offset === (page - 1) * limit ? page : Math.floor(offset / limit) + 1 },
      });
    }
    const r = await db.pool.query(
      `SELECT id, prefix, destination, rate_usd, created_at
       FROM rates ORDER BY destination ASC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    res.json({
      ok: true,
      rates: r.rows,
      pagination: { total, limit, offset, page: offset === (page - 1) * limit ? page : Math.floor(offset / limit) + 1 },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: safeError(err) });
  }
});

// Crear rate (MVP / admin más adelante)
router.post('/', async (req, res) => {
  const { prefix, destination, rate_usd } = req.body || {};
  if (!prefix || !destination || rate_usd == null) {
    return res.status(400).json({ ok: false, message: 'Faltan campos (prefix, destination, rate_usd)' });
  }
  try {
    const r = await db.pool.query(
      `INSERT INTO rates (prefix, destination, rate_usd)
       VALUES ($1,$2,$3)
       RETURNING id, prefix, destination, rate_usd, created_at`,
      [String(prefix), String(destination), Number(rate_usd)]
    );
    res.status(201).json({ ok: true, rate: r.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: safeError(err) });
  }
});

module.exports = router;

