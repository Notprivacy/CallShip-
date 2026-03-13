/**
 * Rastrea depósitos manuales (cripto) por hash en la blockchain y, al confirmarse, acredita el monto automáticamente.
 * Redes soportadas: Ethereum/ERC20, BSC/BEP20, TRON/TRC20.
 */
const db = require('./db');
const { applyReloadWithLoyalty } = require('./loyalty');

const CHECK_INTERVAL_MS = 3 * 60 * 1000; // cada 3 minutos

function normalizeTxHash(hash, network) {
  const h = String(hash || '').trim();
  const isTron = /TRC20|TRON|TRX/i.test(String(network || ''));
  if (isTron && h.startsWith('0x')) return h.slice(2);
  return h;
}

async function checkEthereumLikeTx(txHash, apiBaseUrl) {
  const url = `${apiBaseUrl}?module=proxy&action=eth_getTransactionReceipt&txhash=${encodeURIComponent(txHash)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  const data = await res.json().catch(() => ({}));
  const r = data.result;
  if (!r || r.blockNumber == null) return { confirmed: false };
  return { confirmed: true, success: r.status === '0x1' };
}

async function checkTronTx(txHash) {
  const hash = txHash.startsWith('0x') ? txHash.slice(2) : txHash;
  const url = `https://apilist.tronscanapi.com/api/transaction-info?hash=${encodeURIComponent(hash)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  const data = await res.json().catch(() => ({}));
  if (!data.hash) return { confirmed: false };
  return { confirmed: true, success: (data.contractRet || data.result) === 'SUCCESS' };
}

async function isTransactionConfirmed(network, txHash) {
  const net = String(network || '').toUpperCase();
  const hash = normalizeTxHash(txHash, network);
  if (!hash) return { confirmed: false };

  try {
    if (/TRC20|TRON|TRX/.test(net)) {
      return await checkTronTx(hash);
    }
    if (/BEP20|BSC|BNB|BEP-20/.test(net)) {
      return await checkEthereumLikeTx(hash, 'https://api.bscscan.com/api');
    }
    if (/ERC20|ETH|ETHEREUM|ERC-20/.test(net)) {
      return await checkEthereumLikeTx(hash, 'https://api.etherscan.io/api');
    }
    return { confirmed: false };
  } catch (err) {
    console.warn('[cryptoDepositChecker]', network, txHash?.slice(0, 18) + '...', err.message);
    return { confirmed: false };
  }
}

async function processPendingDeposits() {
  if (!db.pool) return;
  let rows = [];
  try {
    const r = await db.pool.query(
      `SELECT id, user_id, amount_usd, currency, network, tx_hash
       FROM pending_manual_deposits
       WHERE status = 'pending' AND tx_hash IS NOT NULL AND TRIM(tx_hash) != ''
       ORDER BY created_at ASC
       LIMIT 50`
    );
    rows = r.rows || [];
  } catch (err) {
    console.error('[cryptoDepositChecker] query', err.message);
    return;
  }

  for (const row of rows) {
    try {
      const { confirmed, success } = await isTransactionConfirmed(row.network, row.tx_hash);
      if (!confirmed) continue;
      if (!success) {
        console.warn('[cryptoDepositChecker] tx fallida en red:', row.network, 'id:', row.id);
        continue;
      }

      await applyReloadWithLoyalty(row.user_id, row.amount_usd);
      await db.pool.query(
        `INSERT INTO payments (user_id, amount_usd, method, reference) VALUES ($1, $2, $3, $4)`,
        [row.user_id, row.amount_usd, 'manual_crypto', `Depósito manual confirmado (tx ${(row.tx_hash || '').slice(0, 16)}...)`]
      );
      await db.pool.query(
        `UPDATE pending_manual_deposits SET status = 'confirmed', confirmed_at = NOW() WHERE id = $1`,
        [row.id]
      );
      console.log('[cryptoDepositChecker] Acreditado automáticamente:', row.amount_usd, 'USD, user_id:', row.user_id, 'deposit_id:', row.id);
    } catch (err) {
      console.error('[cryptoDepositChecker] process id', row.id, err.message);
    }
  }
}

function start() {
  processPendingDeposits();
  setInterval(processPendingDeposits, CHECK_INTERVAL_MS);
  console.log('[cryptoDepositChecker] Iniciado: verificación cada', CHECK_INTERVAL_MS / 60000, 'minutos');
}

module.exports = { start, isTransactionConfirmed, processPendingDeposits };
