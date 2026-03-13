/**
 * Lealtad (lo que se muestra en Payment como X/100 +10%):
 * - Cada recarga suma solo al "balance de lealtad" (el contador 0→100 en Payment).
 * - El monto recargado se acredita al balance de llamadas (balance_usd).
 * - Al llegar a 100/100: mensaje de lealtad, se acreditan 10 USD al BALANCE DE LLAMADAS
 *   (no al de lealtad), y el balance de lealtad se reinicia a 0/100 para repetir el ciclo.
 * total_reloaded_usd = acumulado de recargas para el contador (solo sube con recargas).
 * loyalty_bonuses_given = cuántos bloques de 100 ya bonificamos. El display X/100 = total_reloaded_usd % 100.
 */
const db = require('./db');

/**
 * Aplica una recarga: suma al balance de llamadas (balance_usd) y al contador de lealtad (X/100).
 * Si el contador llega a 100, acredita +10 USD al balance de llamadas y reinicia el contador a 0/100.
 */
async function applyReloadWithLoyalty(userId, amountUsd) {
  const amount = Number(amountUsd) || 0;
  if (amount <= 0) return { bonusGranted: false, bonusAmount: 0 };

  const r = await db.pool.query(
    `SELECT COALESCE(total_reloaded_usd, 0) AS total_reloaded_usd,
            COALESCE(loyalty_bonuses_given, 0) AS loyalty_bonuses_given
     FROM users WHERE id = $1`,
    [userId]
  );
  if (!r.rows.length) return { bonusGranted: false, bonusAmount: 0 };

  const totalReloaded = Number(r.rows[0].total_reloaded_usd) || 0;
  const bonusesGiven = Number(r.rows[0].loyalty_bonuses_given) || 0;
  const newTotal = totalReloaded + amount;
  const newBonuses = Math.floor(newTotal / 100);
  const extraBonus = Math.max(0, (newBonuses - bonusesGiven) * 10);
  const grantNow = extraBonus > 0;

  await db.pool.query(
    `UPDATE users
     SET balance_usd = COALESCE(balance_usd, 0) + $1 + $2,
         total_reloaded_usd = $3,
         loyalty_bonuses_given = $4,
         last_loyalty_bonus_at = CASE WHEN $2 > 0 THEN NOW() ELSE last_loyalty_bonus_at END
     WHERE id = $5`,
    [amount, extraBonus, newTotal, newBonuses, userId]
  );

  return { bonusGranted: grantNow, bonusAmount: extraBonus };
}

module.exports = { applyReloadWithLoyalty };
