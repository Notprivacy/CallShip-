const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'cambiar-en-produccion';
const ADMIN_USERS = (process.env.ADMIN_USERS || 'medinax6').split(',').map((s) => s.trim()).filter(Boolean);

function authAdmin(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, error: 'Token requerido' });
  }
  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, JWT_SECRET);
    if (!ADMIN_USERS.includes(payload.username)) {
      return res.status(403).json({ ok: false, error: 'Solo admin' });
    }
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ ok: false, error: 'Token inválido' });
  }
}

router.use(authAdmin);

// Listar clientes con búsqueda y paginación ligera
router.get('/customers', async (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  const page = Math.max(parseInt(req.query.page || '1', 10), 1);
  const pageSize = Math.max(Math.min(parseInt(req.query.pageSize || '20', 10), 100), 1);
  const offset = (page - 1) * pageSize;

  try {
    const params = [];
    let where = '1=1';
    if (q) {
      params.push(`%${q}%`);
      params.push(`%${q}%`);
      params.push(`%${q}%`);
      where = `(LOWER(u.username) LIKE $1 OR LOWER(COALESCE(p.company, '')) LIKE $2 OR LOWER(COALESCE(p.email, '')) LIKE $3)`;
    }

    const sql = `
      SELECT
        u.id,
        u.username,
        u.created_at,
        COALESCE(u.balance_usd, 0) AS balance_usd,
        COALESCE(u.status, 'active') AS status,
        p.company,
        p.first_name,
        p.last_name,
        p.email,
        p.country
      FROM users u
      LEFT JOIN user_profiles p ON p.user_id = u.id
      WHERE ${where}
      ORDER BY u.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    params.push(pageSize, offset);

    const r = await db.pool.query(sql, params);
    res.json({ ok: true, customers: r.rows, page, pageSize });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Detalle de un cliente
router.get('/customers/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ ok: false, error: 'ID inválido' });
  try {
    const r = await db.pool.query(
      `SELECT
        u.id,
        u.username,
        u.created_at,
        COALESCE(u.balance_usd, 0) AS balance_usd,
        COALESCE(u.status, 'active') AS status,
        p.account_number,
        p.company,
        p.first_name,
        p.last_name,
        p.telephone1,
        p.telephone2,
        p.email,
        p.address1,
        p.address2,
        p.city,
        p.province_state,
        p.zip_postal_code,
        p.country,
        p.timezone,
        p.fax_number
      FROM users u
      LEFT JOIN user_profiles p ON p.user_id = u.id
      WHERE u.id = $1`,
      [id]
    );
    if (!r.rows.length) return res.status(404).json({ ok: false, error: 'Cliente no encontrado' });

    const topups = await db.pool.query(
      `SELECT id, amount_usd, note, created_at
       FROM user_topups
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [id]
    );

    res.json({ ok: true, customer: r.rows[0], topups: topups.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Agregar saldo a un cliente
router.post('/customers/:id/topup', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const amount = Number(req.body?.amount_usd || 0);
  const note = (req.body?.note || '').slice(0, 255);

  if (!id) return res.status(400).json({ ok: false, error: 'ID inválido' });
  if (!amount || amount <= 0) return res.status(400).json({ ok: false, error: 'Monto inválido' });

  try {
    await db.pool.query(
      `INSERT INTO user_topups (user_id, amount_usd, note)
       VALUES ($1, $2, $3)`,
      [id, amount, note || null]
    );
    const r = await db.pool.query(
      `UPDATE users
       SET balance_usd = COALESCE(balance_usd, 0) + $1
       WHERE id = $2
       RETURNING id, username, balance_usd, status`,
      [amount, id]
    );
    if (!r.rows.length) return res.status(404).json({ ok: false, error: 'Cliente no encontrado' });
    res.status(201).json({ ok: true, customer: r.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Cambiar estado (active / suspended)
router.post('/customers/:id/status', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const status = String(req.body?.status || '').toLowerCase();
  if (!id) return res.status(400).json({ ok: false, error: 'ID inválido' });
  if (!['active', 'suspended'].includes(status)) {
    return res.status(400).json({ ok: false, error: 'Estado inválido' });
  }
  try {
    const r = await db.pool.query(
      `UPDATE users
       SET status = $1
       WHERE id = $2
       RETURNING id, username, balance_usd, status`,
      [status, id]
    );
    if (!r.rows.length) return res.status(404).json({ ok: false, error: 'Cliente no encontrado' });
    res.json({ ok: true, customer: r.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;

