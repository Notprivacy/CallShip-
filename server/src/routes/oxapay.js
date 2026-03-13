const express = require('express');
const router = express.Router();
const db = require('../db');
const { applyReloadWithLoyalty } = require('../loyalty');

/**
 * Callback/webhook de OxaPay.
 * OxaPay enviará aquí el estado del pago. Validación de firma no implementada (MVP).
 */
router.post('/callback', async (req, res) => {
  const body = req.body || {};

  // Campos esperados comunes (pueden variar según el gateway)
  const trackId = body.track_id || body.trackId || body.track;
  const status = String(body.status || body.payment_status || body.state || 'unknown').toLowerCase();
  const paidAmount = body.amount != null ? Number(body.amount) : (body.paid_amount != null ? Number(body.paid_amount) : null);

  if (!trackId) {
    return res.status(400).json({ ok: false, message: 'Falta track_id' });
  }

  try {
    // Marcar invoice
    await db.pool.query(
      `UPDATE oxapay_invoices SET status = $1, paid_at = CASE WHEN $2 THEN datetime('now') ELSE paid_at END
       WHERE track_id = $3`,
      [status, status === 'paid' || status === 'completed' || status === 'success', String(trackId)]
    );

    // Si pagado, registrar en payments (si no existe)
    if (status === 'paid' || status === 'completed' || status === 'success') {
      const inv = await db.pool.query(
        `SELECT user_id, amount_usd FROM oxapay_invoices WHERE track_id = $1 LIMIT 1`,
        [String(trackId)]
      );
      const row = inv.rows[0];
      if (row) {
        const amt = paidAmount != null ? paidAmount : Number(row.amount_usd);
        // Evitar duplicados por track_id
        const exists = await db.pool.query(
          `SELECT id FROM payments WHERE reference = $1 LIMIT 1`,
          [String(trackId)]
        );
        if (!exists.rows.length) {
          await db.pool.query(
            `INSERT INTO payments (user_id, amount_usd, method, reference)
             VALUES ($1,$2,$3,$4)`,
            [row.user_id, Number(amt), 'oxapay', String(trackId)]
          );
          await applyReloadWithLoyalty(row.user_id, Number(amt));
        }
      }
    }

    // Responder OK rápido
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: err.message });
  }
});

module.exports = router;

