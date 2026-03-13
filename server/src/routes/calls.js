/**
 * Rutas de llamadas - tu lógica original del dialer
 */
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

// Registrar llamada (tu POST /calls, ahora con user del token)
router.post('/', async (req, res) => {
  const { customer, phone, status, notes } = req.body || {};
  const userId = req.user.userId;
  const cust = customer == null ? '' : String(customer).trim().slice(0, 300);
  const ph = phone == null ? null : String(phone).trim().slice(0, 40);
  const note = notes == null ? null : String(notes).trim().slice(0, 2000);

  if (!cust) {
    return res.status(400).json({ ok: false, message: 'Faltan datos (customer)' });
  }

  try {
    const result = await db.pool.query(
      `INSERT INTO calls (user_id, customer, phone, status, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, user_id, customer, phone, status, notes, created_at`,
      [userId, cust, ph, (status && String(status).trim().slice(0, 50)) || 'nueva', note]
    );
    res.status(201).json({ ok: true, call: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: safeError(err) });
  }
});

// Listar llamadas (paginado: ?limit=50&offset=0 o ?page=1&limit=50)
router.get('/', async (req, res) => {
  const userId = req.user.userId;
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit || '50', 10) || 50));
  const page = Math.max(1, parseInt(req.query.page || '1', 10) || 1);
  const offset = req.query.offset != null ? Math.max(0, parseInt(req.query.offset, 10) || 0) : (page - 1) * limit;
  try {
    const countResult = await db.pool.query(
      'SELECT COUNT(*) AS total FROM calls WHERE user_id = $1',
      [userId]
    );
    const total = parseInt(countResult.rows[0]?.total || 0, 10);
    const result = await db.pool.query(
      `SELECT c.id, u.username, c.customer, c.phone, c.status, c.notes, c.created_at
       FROM calls c
       LEFT JOIN users u ON c.user_id = u.id
       WHERE c.user_id = $1
       ORDER BY c.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    res.json({
      ok: true,
      calls: result.rows,
      pagination: { total, limit, offset, page: offset === (page - 1) * limit ? page : Math.floor(offset / limit) + 1 },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: safeError(err) });
  }
});

// Actualizar llamada (status / notes / phone / customer)
router.put('/:id', async (req, res) => {
  const userId = req.user.userId;
  const id = parseInt(req.params.id, 10);
  const { customer, phone, status, notes } = req.body || {};
  if (!id) return res.status(400).json({ ok: false, message: 'ID inválido' });
  const cust = customer == null ? undefined : String(customer).trim().slice(0, 300);
  const ph = phone == null ? undefined : String(phone).trim().slice(0, 40);
  const note = notes == null ? undefined : String(notes).trim().slice(0, 2000);
  const st = status == null ? undefined : String(status).trim().slice(0, 50);

  try {
    const existing = await db.pool.query('SELECT id FROM calls WHERE id = $1 AND user_id = $2', [id, userId]);
    if (existing.rows.length === 0) return res.status(404).json({ ok: false, message: 'Llamada no encontrada' });

    const updated = await db.pool.query(
      `UPDATE calls
       SET customer = COALESCE($1, customer),
           phone = COALESCE($2, phone),
           status = COALESCE($3, status),
           notes = COALESCE($4, notes)
       WHERE id = $5 AND user_id = $6
       RETURNING id, user_id, customer, phone, status, notes, created_at`,
      [
        cust ?? null,
        ph ?? null,
        st ?? null,
        note ?? null,
        id,
        userId,
      ]
    );
    res.json({ ok: true, call: updated.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: safeError(err) });
  }
});

module.exports = router;
