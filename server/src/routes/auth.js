const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'cambiar-en-produccion';

// Normalizar usuario: trim y mínimo 1 carácter
function normalizeUsername(val) {
  return String(val || '').trim();
}

// Registro: usuario único (comprobación explícita + trim), contraseña con trim
router.post('/register', async (req, res) => {
  const rawUsername = normalizeUsername(req.body?.username);
  const rawPassword = String(req.body?.password || '').trim();
  if (!rawUsername || !rawPassword) {
    return res.status(400).json({ ok: false, message: 'Faltan datos', error: 'Faltan usuario o contraseña' });
  }
  if (rawUsername.length < 2) {
    return res.status(400).json({ ok: false, message: 'Usuario muy corto', error: 'El usuario debe tener al menos 2 caracteres' });
  }
  try {
    // Comprobar si ya existe (insensible a mayúsculas) para devolver error claro
    const exist = await db.pool.query(
      'SELECT id FROM users WHERE LOWER(username) = LOWER($1)',
      [rawUsername]
    );
    if (exist.rows.length > 0) {
      return res.status(409).json({ ok: false, message: 'Usuario ya existe', error: 'Ese nombre de usuario ya está registrado' });
    }
    const passwordHash = await bcrypt.hash(rawPassword, 10);
    const result = await db.pool.query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username, created_at',
      [rawUsername, passwordHash]
    );
    res.status(201).json({ ok: true, user: result.rows[0], message: 'Usuario creado' });
  } catch (err) {
    const isDuplicateUser =
      err.code === '23505' ||
      (err.message && String(err.message).includes('UNIQUE constraint failed'));
    if (isDuplicateUser) {
      return res.status(409).json({ ok: false, message: 'Usuario ya existe', error: 'Ese nombre de usuario ya está registrado' });
    }
    console.error(err);
    res.status(500).json({ ok: false, message: 'Error en el servidor', error: err.message });
  }
});

// Login: usuario y contraseña con trim; búsqueda insensible a mayúsculas
router.post('/login', async (req, res) => {
  const username = normalizeUsername(req.body?.username);
  const password = String(req.body?.password || '').trim();
  if (!username || !password) {
    return res.status(400).json({ ok: false, message: 'Faltan datos', error: 'Faltan usuario o contraseña' });
  }
  try {
    const result = await db.pool.query(
      'SELECT id, username, password_hash FROM users WHERE LOWER(username) = LOWER($1)',
      [username]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ ok: false, message: 'Credenciales inválidas', error: 'Usuario o contraseña incorrectos' });
    }
    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ ok: false, message: 'Credenciales inválidas', error: 'Usuario o contraseña incorrectos' });
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
