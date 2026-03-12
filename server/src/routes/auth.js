const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'cambiar-en-produccion';

// Registro (tu original: username + password)
router.post('/register', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ ok: false, message: 'Faltan datos', error: 'Faltan usuario o contraseña' });
  }
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await db.pool.query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username, created_at',
      [username, passwordHash]
    );
    res.status(201).json({ ok: true, user: result.rows[0], message: 'Usuario creado' });
  } catch (err) {
    // PostgreSQL: 23505 = unique_violation. SQLite: mensaje "UNIQUE constraint failed"
    const isDuplicateUser =
      err.code === '23505' ||
      (err.message && String(err.message).includes('UNIQUE constraint failed'));
    if (isDuplicateUser) {
      return res.status(409).json({ ok: false, message: 'Usuario ya existe', error: 'Usuario ya existe' });
    }
    console.error(err);
    res.status(500).json({ ok: false, message: 'Error en el servidor', error: err.message });
  }
});

// Login (tu original + JWT para el dialer)
router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ ok: false, message: 'Faltan datos', error: 'Faltan usuario o contraseña' });
  }
  try {
    const result = await db.pool.query(
      'SELECT id, username, password_hash FROM users WHERE username = $1',
      [username]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ ok: false, message: 'Credenciales inválidas', error: 'Credenciales inválidas' });
    }
    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ ok: false, message: 'Credenciales inválidas', error: 'Credenciales inválidas' });
    }
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      ok: true,
      token,
      user: { id: user.id, username: user.username },
      message: 'OK',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: 'Error en el servidor', error: err.message });
  }
});

module.exports = router;
