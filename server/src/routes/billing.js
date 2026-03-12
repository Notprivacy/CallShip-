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

// Devuelve la IP pública con la que este servidor sale a internet (la que OxaPay ve).
// Úsala en OxaPay → Settings → API → Allowed IPs para que la API no devuelva "invalid key".
router.get('/oxapay/server-ip', async (req, res) => {
  try {
    const r = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(5000) });
    const data = await r.json().catch(() => ({}));
    const ip = data.ip || null;
    res.json({
      ok: true,
      ip,
      hint: ip ? 'Añade esta IP en OxaPay → Settings → API → Allowed IPs' : 'No se pudo obtener la IP',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: err.message, hint: 'Comprueba que el servidor tenga salida a internet.' });
  }
});

// Crear invoice en OxaPay y devolver payment_url
// Doc: https://docs.oxapay.com/api-reference/payment/generate-invoice
// Header requerido: merchant_api_key (Merchant API Key del panel OxaPay)
// En OxaPay: Settings → API → añade la IP pública de este servidor a IPs permitidas
router.post('/oxapay/invoice', async (req, res) => {
  const { amount_usd } = req.body || {};
  const amount = Number(amount_usd);
  if (!amount || amount <= 0) return res.status(400).json({ ok: false, message: 'amount_usd inválido' });

  const apiKey = (process.env.OXAPAY_MERCHANT_API_KEY || '').trim();
  if (!apiKey) return res.status(500).json({ ok: false, message: 'Falta OXAPAY_MERCHANT_API_KEY en el servidor' });

  const returnUrl = (process.env.OXAPAY_RETURN_URL || 'http://localhost:3000').trim();
  const callbackUrl = (process.env.OXAPAY_CALLBACK_URL || 'http://localhost:4000/api/oxapay/callback').trim();
  const sandbox = String(process.env.OXAPAY_SANDBOX || '').toLowerCase() === 'true' || process.env.OXAPAY_SANDBOX === '1';

  try {
    const orderId = `cs_${req.user.userId}_${Date.now()}`;
    const body = {
      amount,
      currency: 'USD',
      lifetime: 120,
      fee_paid_by_payer: 1,
      callback_url: callbackUrl,
      return_url: returnUrl,
      order_id: orderId,
      description: `CallShip TopUp $${amount.toFixed(2)}`,
      sandbox,
    };

    const resp = await fetch('https://api.oxapay.com/v1/payment/invoice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'merchant_api_key': apiKey,
      },
      body: JSON.stringify(body),
    });

    const json = await resp.json().catch(() => null);
    if (!resp.ok || !json || !json.data?.payment_url || !json.data?.track_id) {
      const msg = json?.message || json?.error?.message || 'Error creando invoice en OxaPay';
      const detail = json?.error ? ` (${json.error.key || ''} ${json.error.type || ''})`.trim() : '';
      console.error('[OxaPay invoice]', resp.status, msg, detail, json?.error || '');
      return res.status(resp.status >= 400 && resp.status < 600 ? resp.status : 502).json({
        ok: false,
        message: msg + detail,
        code: json?.status,
        error_key: json?.error?.key,
      });
    }

    const trackId = json.data.track_id;
    const paymentUrl = json.data.payment_url;

    await db.pool.query(
      `INSERT INTO oxapay_invoices (user_id, track_id, amount_usd, status, payment_url)
       VALUES ($1,$2,$3,'pending',$4)`,
      [req.user.userId, trackId, amount, paymentUrl]
    );

    res.json({ ok: true, track_id: trackId, payment_url: paymentUrl, expired_at: json.data.expired_at || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: err.message });
  }
});

// Balance del usuario: usamos users.balance_usd (que se actualiza con recargas admin y topups)
router.get('/balance', async (req, res) => {
  try {
    const r = await db.pool.query(
      `SELECT COALESCE(balance_usd, 0) AS balance_usd
       FROM users
       WHERE id = $1`,
      [req.user.userId]
    );
    const balance = Number(r.rows[0]?.balance_usd || 0);
    res.json({ ok: true, balance_usd: balance });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: 'Error al calcular balance' });
  }
});

// Listar pagos
router.get('/payments', async (req, res) => {
  try {
    const r = await db.pool.query(
      `SELECT id, amount_usd, method, reference, created_at
       FROM payments WHERE user_id = $1 ORDER BY created_at DESC LIMIT 200`,
      [req.user.userId]
    );
    res.json({ ok: true, payments: r.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: 'Error al listar pagos' });
  }
});

// Top-up (MVP: registra un pago)
router.post('/topup', async (req, res) => {
  const { amount_usd, method, reference } = req.body || {};
  if (amount_usd == null || Number(amount_usd) <= 0) {
    return res.status(400).json({ ok: false, message: 'amount_usd inválido' });
  }
  try {
    const r = await db.pool.query(
      `INSERT INTO payments (user_id, amount_usd, method, reference)
       VALUES ($1,$2,$3,$4)
       RETURNING id, amount_usd, method, reference, created_at`,
      [req.user.userId, Number(amount_usd), method || 'manual', reference || null]
    );
    res.status(201).json({ ok: true, payment: r.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: 'Error al registrar top-up' });
  }
});

module.exports = router;

