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

// Listar productos del usuario
router.get('/', async (req, res) => {
  try {
    const r = await db.pool.query(
      `SELECT id, name, category, price_usd, setup_fee_usd, status, bill_type, bill_days, created_at
       FROM products WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user.userId]
    );
    res.json({ ok: true, products: r.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: 'Error al listar productos' });
  }
});

// Crear producto (MVP)
router.post('/', async (req, res) => {
  const { name, category, price_usd, setup_fee_usd, bill_type, bill_days, status } = req.body || {};
  if (!name) return res.status(400).json({ ok: false, message: 'Falta name' });
  try {
    const r = await db.pool.query(
      `INSERT INTO products (user_id, name, category, price_usd, setup_fee_usd, status, bill_type, bill_days)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id, name, category, price_usd, setup_fee_usd, status, bill_type, bill_days, created_at`,
      [
        req.user.userId,
        name,
        category || null,
        price_usd ?? 0,
        setup_fee_usd ?? 0,
        status || 'active',
        bill_type || 'subscription',
        bill_days ?? 30,
      ]
    );
    res.status(201).json({ ok: true, product: r.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: 'Error al crear producto' });
  }
});

module.exports = router;

