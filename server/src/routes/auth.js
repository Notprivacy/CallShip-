const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { JWT_SECRET, ADMIN_USERS, safeError } = require('../config');
const { sendPasswordResetEmail } = require('../email');

const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hora

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
  if (rawUsername.length > 64) {
    return res.status(400).json({ ok: false, message: 'Usuario demasiado largo', error: 'Máximo 64 caracteres' });
  }
  if (rawPassword.length > 128) {
    return res.status(400).json({ ok: false, message: 'Contraseña demasiado larga', error: 'Máximo 128 caracteres' });
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
    res.status(500).json({ ok: false, message: 'Error en el servidor', error: safeError(err) });
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
    const hash = user.password_hash;
    if (!hash || typeof hash !== 'string') {
      return res.status(500).json({ ok: false, message: 'Error en la cuenta', error: 'Contacta al soporte para restablecer tu contraseña' });
    }
    const match = await bcrypt.compare(password, hash);
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
      user: { id: user.id, username: user.username, isAdmin: ADMIN_USERS.includes(user.username) },
      message: 'OK',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: 'Error en el servidor', error: safeError(err) });
  }
});

// Recuperar contraseña por correo: busca cuenta por email, si existe envía enlace; si no, "Cuenta no encontrada"
router.post('/forgot-password', async (req, res) => {
  const emailRaw = String(req.body?.email || '').trim();
  if (!emailRaw) {
    return res.status(400).json({ ok: false, message: 'Indica tu correo electrónico' });
  }
  if (emailRaw.length > 254) {
    return res.status(400).json({ ok: false, message: 'Correo no válido' });
  }
  try {
    const isPg = !(process.env.USE_SQLITE === '1' || process.env.USE_SQLITE === 'true');
    const emailNorm = emailRaw.toLowerCase();
    const r = await db.pool.query(
      `SELECT p.user_id, p.email, u.username
       FROM user_profiles p
       INNER JOIN users u ON u.id = p.user_id
       WHERE LOWER(TRIM(p.email)) = $1 AND p.email IS NOT NULL AND TRIM(p.email) != ''`,
      [emailNorm]
    );
    if (r.rows.length === 0) {
      return res.status(404).json({ ok: false, message: 'Cuenta no encontrada', code: 'ACCOUNT_NOT_FOUND' });
    }
    const row = r.rows[0];
    const userId = row.user_id;
    const toEmail = row.email;
    const userName = row.username || '';

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);
    if (isPg) {
      await db.pool.query(
        'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
        [userId, token, expiresAt]
      );
    } else {
      await db.pool.query(
        'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
        [userId, token, expiresAt.toISOString()]
      );
    }

    const { sent, error: mailError } = await sendPasswordResetEmail(toEmail, token, userName);
    if (!sent) {
      console.error('[forgot-password] No se pudo enviar el correo:', mailError);
      return res.status(503).json({
        ok: false,
        message: 'La cuenta existe pero no pudimos enviar el correo. Intenta más tarde o contacta al soporte.',
        code: 'EMAIL_FAILED',
      });
    }

    res.json({
      ok: true,
      message: 'Se ha enviado un correo con el enlace para restablecer tu contraseña. Revisa tu bandeja de entrada (y spam).',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: safeError(err) });
  }
});

// Restablecer contraseña con el token recibido (por email o canal seguro)
router.post('/reset-password', async (req, res) => {
  const token = String(req.body?.token || '').trim();
  const newPassword = String(req.body?.password || '').trim();
  if (!token || !newPassword) {
    return res.status(400).json({ ok: false, message: 'Faltan token o nueva contraseña' });
  }
  if (newPassword.length > 128) {
    return res.status(400).json({ ok: false, message: 'Contraseña demasiado larga' });
  }
  try {
    const now = new Date();
    const isPg = !(process.env.USE_SQLITE === '1' || process.env.USE_SQLITE === 'true');
    const expCompare = isPg ? now : now.toISOString();
    const r = await db.pool.query(
      'SELECT user_id FROM password_reset_tokens WHERE token = $1 AND expires_at > $2',
      [token, expCompare]
    );
    if (r.rows.length === 0) {
      return res.status(400).json({ ok: false, message: 'Enlace inválido o expirado' });
    }
    const userId = r.rows[0].user_id;
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, userId]);
    await db.pool.query('DELETE FROM password_reset_tokens WHERE token = $1', [token]);
    res.json({ ok: true, message: 'Contraseña actualizada. Ya puedes iniciar sesión' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: safeError(err) });
  }
});

module.exports = router;
