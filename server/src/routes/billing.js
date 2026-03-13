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

// Balance de llamadas (balance_usd) + balance de lealtad (Payment: X/100). Al llegar a 100/100 se acreditan +10 al balance de llamadas y el de lealtad vuelve a 0/100.
router.get('/balance', async (req, res) => {
  try {
    const r = await db.pool.query(
      `SELECT COALESCE(balance_usd, 0) AS balance_usd,
              COALESCE(total_reloaded_usd, 0) AS total_reloaded_usd,
              COALESCE(loyalty_bonuses_given, 0) AS loyalty_bonuses_given,
              last_loyalty_bonus_at
       FROM users
       WHERE id = $1`,
      [req.user.userId]
    );
    const row = r.rows[0];
    const balance = Number(row?.balance_usd || 0);
    const totalReloaded = Number(row?.total_reloaded_usd || 0);
    // Progreso hacia el próximo 100: 0..100. Tras acreditar el bono, vuelve a 0/100 y se repite el ciclo.
    const paymentProgress = Number((totalReloaded % 100).toFixed(2));
    res.json({
      ok: true,
      balance_usd: balance,
      payment_progress: paymentProgress,
      payment_target: 100,
      last_loyalty_bonus_at: row?.last_loyalty_bonus_at || null,
    });
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

// Transacciones unificadas: pagos, depósitos manuales (pendientes/confirmados), invoices OxaPay (pendientes/pagados)
router.get('/transactions', async (req, res) => {
  try {
    const uid = req.user.userId;
    const [payments, manual, invoices] = await Promise.all([
      db.pool.query(
        `SELECT amount_usd, method, reference, created_at FROM payments WHERE user_id = $1 ORDER BY created_at DESC LIMIT 200`,
        [uid]
      ),
      db.pool.query(
        `SELECT amount_usd, currency, network, status, created_at FROM pending_manual_deposits WHERE user_id = $1 ORDER BY created_at DESC LIMIT 200`,
        [uid]
      ),
      db.pool.query(
        `SELECT amount_usd, track_id, status, created_at FROM oxapay_invoices WHERE user_id = $1 ORDER BY created_at DESC LIMIT 200`,
        [uid]
      ),
    ]);

    const toRow = (createdAt, amount, type, status, reference) => {
      const d = createdAt ? new Date(createdAt) : new Date();
      return {
        date: d.toISOString().slice(0, 10),
        time: d.toTimeString().slice(0, 8),
        amount_usd: Number(amount || 0),
        type,
        status,
        reference: reference || '',
      };
    };

    const rows = [
      ...payments.rows.map((r) => toRow(r.created_at, r.amount_usd, 'Pago', 'Completado', r.reference || r.method)),
      ...manual.rows.map((r) => toRow(r.created_at, r.amount_usd, 'Depósito manual', r.status === 'confirmed' ? 'Confirmado' : 'Pendiente', [r.currency, r.network].filter(Boolean).join(' '))),
      ...invoices.rows.map((r) => toRow(r.created_at, r.amount_usd, 'OxaPay', r.status === 'paid' || r.status === 'completed' ? 'Pagado' : 'Pendiente', r.track_id)),
    ].sort((a, b) => {
      const da = a.date + ' ' + a.time;
      const db = b.date + ' ' + b.time;
      return db.localeCompare(da);
    });

    res.json({ ok: true, transactions: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: 'Error al listar transacciones' });
  }
});

// Los clientes NO pueden abonarse saldo con POST /topup. Solo: Admin, OxaPay o depósito manual confirmado.
router.post('/topup', (req, res) => {
  res.status(405).json({
    ok: false,
    message: 'Recarga manual desactivada. Usa Crypto (OxaPay) o indica tu envío en "Recarga manual (cripto)" y espera la confirmación.',
  });
});

// Direcciones de billetera cripto para recarga manual (respaldo si OxaPay falla).
// Variable CRYPTO_WALLETS = JSON array: [{"currency":"BTC","network":"Bitcoin","address":"bc1...","logo":"₿"}, ...]
function getCryptoWallets() {
  try {
    const raw = process.env.CRYPTO_WALLETS;
    if (raw && raw.trim()) {
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    }
  } catch (e) {
    console.warn('CRYPTO_WALLETS inválido:', e.message);
  }
  return [
    { currency: 'BTC', network: 'Bitcoin', address: process.env.CRYPTO_BTC_ADDRESS || '', logo: '₿' },
    { currency: 'ETH', network: 'Ethereum', address: process.env.CRYPTO_ETH_ADDRESS || '', logo: 'Ξ' },
    { currency: 'USDT', network: 'TRC20', address: process.env.CRYPTO_USDT_TRC20_ADDRESS || '', logo: '₮' },
  ].filter((w) => w.address);
}

router.get('/crypto-wallets', (req, res) => {
  const wallets = getCryptoWallets();
  res.json({ ok: true, wallets });
});

// El cliente indica que envió X USD por una red; queda pendiente hasta que admin confirme.
router.post('/manual-deposit', async (req, res) => {
  const amount = Number(req.body?.amount_usd || 0);
  const currency = String(req.body?.currency || '').trim().toUpperCase();
  const txHash = String(req.body?.tx_hash || '').trim().slice(0, 255);
  const network = String(req.body?.network || '').trim().slice(0, 60);
  if (!amount || amount <= 0) return res.status(400).json({ ok: false, message: 'Monto inválido' });
  if (!currency) return res.status(400).json({ ok: false, message: 'Indica la moneda/red' });
  try {
    const r = await db.pool.query(
      `INSERT INTO pending_manual_deposits (user_id, amount_usd, currency, network, tx_hash, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       RETURNING id, amount_usd, currency, network, created_at`,
      [req.user.userId, amount, currency, network || null, txHash || null]
    );
    res.status(201).json({ ok: true, deposit: r.rows[0], message: 'Registrado. Tu saldo se actualizará cuando confirmemos la recepción.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: err.message });
  }
});

module.exports = router;

