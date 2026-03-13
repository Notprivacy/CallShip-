const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { JWT_SECRET, ADMIN_USERS, safeError } = require('../config');

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

router.get('/me', async (req, res) => {
  try {
    let r;
    try {
      r = await db.pool.query(
        `SELECT u.id, u.username, u.created_at,
          p.account_number, p.company, p.first_name, p.last_name,
          p.telephone1, p.telephone2, p.email, p.address1, p.address2,
          p.city, p.province_state, p.zip_postal_code, p.country, p.timezone, p.fax_number
         FROM users u
         LEFT JOIN user_profiles p ON p.user_id = u.id
         WHERE u.id = $1`,
        [req.user.userId]
      );
    } catch (joinErr) {
      if (joinErr.message && joinErr.message.includes('user_profiles')) {
        r = await db.pool.query(
          'SELECT id, username, created_at FROM users WHERE id = $1',
          [req.user.userId]
        );
        if (r.rows.length > 0) {
          const row = r.rows[0];
          return res.json({ ...row, isAdmin: ADMIN_USERS.includes(row.username) });
        }
      }
      throw joinErr;
    }
    if (r.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado', ok: false });
    const row = r.rows[0];
    res.json({ ...row, isAdmin: ADMIN_USERS.includes(row.username) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: safeError(err), ok: false });
  }
});

// Actualizar perfil (User Profile)
router.put('/me', async (req, res) => {
  const raw = req.body || {};
  const max = (s, n) => (s == null ? null : String(s).trim().slice(0, n) || null);
  const account_number = max(raw.account_number, 80);
  const company = max(raw.company, 200);
  const first_name = max(raw.first_name, 100);
  const last_name = max(raw.last_name, 100);
  const telephone1 = max(raw.telephone1, 40);
  const telephone2 = max(raw.telephone2, 40);
  const email = max(raw.email, 254);
  const address1 = max(raw.address1, 300);
  const address2 = max(raw.address2, 300);
  const city = max(raw.city, 100);
  const province_state = max(raw.province_state, 100);
  const zip_postal_code = max(raw.zip_postal_code, 20);
  const country = max(raw.country, 80);
  const timezone = max(raw.timezone, 80);
  const fax_number = max(raw.fax_number, 40);
  try {
    const uid = req.user.userId;
    await db.pool.query(
      `INSERT INTO user_profiles (user_id, account_number, company, first_name, last_name,
        telephone1, telephone2, email, address1, address2, city, province_state, zip_postal_code, country, timezone, fax_number)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       ON CONFLICT (user_id) DO UPDATE SET
        account_number = EXCLUDED.account_number,
        company = EXCLUDED.company,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        telephone1 = EXCLUDED.telephone1,
        telephone2 = EXCLUDED.telephone2,
        email = EXCLUDED.email,
        address1 = EXCLUDED.address1,
        address2 = EXCLUDED.address2,
        city = EXCLUDED.city,
        province_state = EXCLUDED.province_state,
        zip_postal_code = EXCLUDED.zip_postal_code,
        country = EXCLUDED.country,
        timezone = EXCLUDED.timezone,
        fax_number = EXCLUDED.fax_number,
        updated_at = CURRENT_TIMESTAMP`,
      [uid, account_number, company, first_name, last_name,
        telephone1, telephone2, email, address1, address2,
        city, province_state, zip_postal_code, country, timezone, fax_number]
    );
    const r = await db.pool.query(
      `SELECT u.id, u.username, u.created_at,
        p.account_number, p.company, p.first_name, p.last_name,
        p.telephone1, p.telephone2, p.email, p.address1, p.address2,
        p.city, p.province_state, p.zip_postal_code, p.country, p.timezone, p.fax_number
       FROM users u LEFT JOIN user_profiles p ON p.user_id = u.id WHERE u.id = $1`,
      [uid]
    );
    res.json({ ok: true, user: r.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: safeError(err) });
  }
});

// Cambiar contraseña
router.post('/change-password', async (req, res) => {
  const { current_password, new_password } = req.body || {};
  if (!current_password || !new_password) {
    return res.status(400).json({ ok: false, error: 'Faltan contraseña actual o nueva' });
  }
  if (new_password.length < 6) {
    return res.status(400).json({ ok: false, error: 'La nueva contraseña debe tener al menos 6 caracteres' });
  }
  if (new_password.length > 128) {
    return res.status(400).json({ ok: false, error: 'Contraseña demasiado larga' });
  }
  try {
    const r = await db.pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.userId]);
    if (r.rows.length === 0) return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
    const match = await bcrypt.compare(current_password, r.rows[0].password_hash);
    if (!match) return res.status(401).json({ ok: false, error: 'Contraseña actual incorrecta' });
    const hash = await bcrypt.hash(new_password, 10);
    await db.pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user.userId]);
    res.json({ ok: true, message: 'Contraseña actualizada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: safeError(err) });
  }
});

module.exports = router;
