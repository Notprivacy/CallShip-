const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { JWT_SECRET, safeError } = require('../config');

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido', ok: false });
  }
  try {
    const token = header.slice(7);
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido', ok: false });
  }
}

router.use(authMiddleware);

router.get('/check', async (req, res) => {
  try {
    const r = await db.pool.query(
      `SELECT id, plan, expires_at, active
       FROM licenses
       WHERE user_id = $1 AND active = 1
       ORDER BY created_at DESC LIMIT 1`,
      [req.user.userId]
    );
    const row = r.rows[0];
    if (!row) {
      return res.json({ valid: false, reason: 'Sin licencia' });
    }
    if (row.expires_at && new Date(row.expires_at) < new Date()) {
      return res.json({ valid: false, reason: 'Licencia expirada' });
    }
    res.json({
      valid: true,
      plan: row.plan,
      expires_at: row.expires_at || null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ valid: false, reason: safeError(err) });
  }
});

router.get('/', async (req, res) => {
  try {
    const r = await db.pool.query(
      'SELECT id, key, plan, active, expires_at, created_at FROM licenses WHERE user_id = $1',
      [req.user.userId]
    );
    res.json(r.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: safeError(err), ok: false });
  }
});

router.post('/', async (req, res) => {
  const { plan, expires_at } = req.body || {};
  const key = 'CS-' + crypto.randomBytes(8).toString('hex').toUpperCase();
  try {
    await db.pool.query(
      `INSERT INTO licenses (user_id, key, plan, active, expires_at)
       VALUES ($1, $2, $3, 1, $4)`,
      [req.user.userId, key, plan || 'basic', expires_at || null]
    );
    res.status(201).json({ key, plan: plan || 'basic', expires_at: expires_at || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: safeError(err), ok: false });
  }
});

module.exports = router;
