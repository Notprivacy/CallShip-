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

// Listar rates (global, MVP)
router.get('/', async (req, res) => {
  const q = String(req.query.q || '').trim();
  try {
    if (q) {
      const r = await db.pool.query(
        `SELECT id, prefix, destination, rate_usd, created_at
         FROM rates
         WHERE prefix LIKE $1 OR destination LIKE $1
         ORDER BY destination ASC LIMIT 300`,
        [`%${q}%`]
      );
      return res.json({ ok: true, rates: r.rows });
    }
    const r = await db.pool.query(
      `SELECT id, prefix, destination, rate_usd, created_at
       FROM rates ORDER BY destination ASC LIMIT 300`
    );
    res.json({ ok: true, rates: r.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: 'Error al listar rates' });
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
    res.status(500).json({ ok: false, message: 'Error al crear rate' });
  }
});

module.exports = router;

