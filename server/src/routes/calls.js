/**
 * Rutas de llamadas - tu lógica original del dialer
 */
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

// Registrar llamada (tu POST /calls, ahora con user del token)
router.post('/', async (req, res) => {
  const { customer, phone, status, notes } = req.body || {};
  const userId = req.user.userId;

  if (!customer) {
    return res.status(400).json({ ok: false, message: 'Faltan datos (customer)' });
  }

  try {
    const result = await db.pool.query(
      `INSERT INTO calls (user_id, customer, phone, status, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, user_id, customer, phone, status, notes, created_at`,
      [userId, customer, phone || null, status || 'nueva', notes || null]
    );
    res.status(201).json({ ok: true, call: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: 'Error al registrar llamada' });
  }
});

// Listar llamadas (tu GET /calls: las del usuario logueado)
router.get('/', async (req, res) => {
  const userId = req.user.userId;
  try {
    const result = await db.pool.query(
      `SELECT c.id, u.username, c.customer, c.phone, c.status, c.notes, c.created_at
       FROM calls c
       LEFT JOIN users u ON c.user_id = u.id
       WHERE c.user_id = $1
       ORDER BY c.created_at DESC`,
      [userId]
    );
    res.json({ ok: true, calls: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: 'Error al listar llamadas' });
  }
});

// Actualizar llamada (status / notes / phone / customer)
router.put('/:id', async (req, res) => {
  const userId = req.user.userId;
  const id = parseInt(req.params.id, 10);
  const { customer, phone, status, notes } = req.body || {};
  if (!id) return res.status(400).json({ ok: false, message: 'ID inválido' });

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
        customer ?? null,
        phone ?? null,
        status ?? null,
        notes ?? null,
        id,
        userId,
      ]
    );
    res.json({ ok: true, call: updated.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: 'Error al actualizar llamada' });
  }
});

module.exports = router;
