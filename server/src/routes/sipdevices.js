const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, safeError } = require('../config');

const MASKED_PASSWORD = '••••••••';

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

/** No exponer contraseña SIP al cliente; devolver enmascarada */
function maskDevice(device) {
  if (!device) return device;
  const { sip_password, ...rest } = device;
  return { ...rest, sip_password: sip_password ? MASKED_PASSWORD : null };
}

router.get('/', async (req, res) => {
  try {
    const r = await db.pool.query(
      'SELECT id, name, sip_username, sip_server, sip_password, caller_name, caller_number, voicemail, status, created_at, modified_at FROM sip_devices WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.userId]
    );
    const devices = (r.rows || []).map(maskDevice);
    res.json({ ok: true, devices });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: safeError(err) });
  }
});

router.post('/', async (req, res) => {
  const { sip_username, sip_password, caller_name, caller_number, voicemail, status, sip_server } = req.body || {};
  if (!sip_username || !String(sip_username).trim()) {
    return res.status(400).json({ ok: false, error: 'Username es obligatorio' });
  }
  try {
    const username = String(sip_username).trim();
    const r = await db.pool.query(
      `INSERT INTO sip_devices (user_id, name, sip_username, sip_server, sip_password, caller_name, caller_number, voicemail, status, modified_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
       RETURNING id, name, sip_username, sip_server, sip_password, caller_name, caller_number, voicemail, status, created_at, modified_at`,
      [
        req.user.userId,
        username,
        username,
        sip_server || null,
        sip_password || null,
        caller_name || null,
        caller_number || null,
        voicemail == null ? 1 : (voicemail ? 1 : 0),
        status == null ? 1 : (status ? 1 : 0),
      ]
    );
    res.status(201).json({ ok: true, device: maskDevice(r.rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: safeError(err) });
  }
});

router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ ok: false, error: 'ID inválido' });
  const { sip_username, sip_password, caller_name, caller_number, voicemail, status, sip_server } = req.body || {};
  const newPassword = (sip_password && String(sip_password).trim() && String(sip_password).trim() !== MASKED_PASSWORD) ? String(sip_password).trim() : null;
  try {
    const existing = await db.pool.query('SELECT id, sip_password FROM sip_devices WHERE id = $1 AND user_id = $2', [id, req.user.userId]);
    if (existing.rows.length === 0) return res.status(404).json({ ok: false, error: 'Dispositivo no encontrado' });
    const passwordToSet = newPassword !== null ? newPassword : existing.rows[0].sip_password;

    const r = await db.pool.query(
      `UPDATE sip_devices
       SET name = COALESCE($1, name),
           sip_username = COALESCE($2, sip_username),
           sip_server = COALESCE($3, sip_server),
           sip_password = $4,
           caller_name = COALESCE($5, caller_name),
           caller_number = COALESCE($6, caller_number),
           voicemail = COALESCE($7, voicemail),
           status = COALESCE($8, status),
           modified_at = CURRENT_TIMESTAMP
       WHERE id = $9 AND user_id = $10
       RETURNING id, name, sip_username, sip_server, sip_password, caller_name, caller_number, voicemail, status, created_at, modified_at`,
      [
        sip_username ? String(sip_username).trim() : null,
        sip_username ? String(sip_username).trim() : null,
        sip_server ?? null,
        passwordToSet,
        caller_name ?? null,
        caller_number ?? null,
        voicemail == null ? null : (voicemail ? 1 : 0),
        status == null ? null : (status ? 1 : 0),
        id,
        req.user.userId,
      ]
    );
    res.json({ ok: true, device: maskDevice(r.rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: safeError(err) });
  }
});

router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ ok: false, error: 'ID inválido' });
  try {
    const r = await db.pool.query('DELETE FROM sip_devices WHERE id = $1 AND user_id = $2 RETURNING id', [id, req.user.userId]);
    if (r.rows.length === 0) return res.status(404).json({ ok: false, error: 'Dispositivo no encontrado' });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: safeError(err) });
  }
});

module.exports = router;
