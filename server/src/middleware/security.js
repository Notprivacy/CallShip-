/**
 * Medidas de seguridad para CallShip: rate limit, cabeceras, validación de entorno.
 * Ayuda a proteger frente a ataques de competencia (brute force, DDoS, etc.).
 */
const rateLimit = require('express-rate-limit');

const isProd = process.env.NODE_ENV === 'production';

// --- Rate limit general: limita peticiones por IP para toda la API (anti-DDoS) ---
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: isProd ? 100 : 300,  // producción: 100 req/min por IP; desarrollo más holgado
  message: { ok: false, message: 'Demasiadas peticiones. Espera un momento.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// --- Rate limit estricto para login y registro: anti brute force ---
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 6, // máx 6 intentos de login/registro por IP cada 15 min
  message: { ok: false, message: 'Demasiados intentos. Intenta más tarde.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// --- Rate limit para webhook OxaPay (callback): evita abuso ---
const oxapayCallbackLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  message: { ok: false, message: 'Rate limit' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Admin: límite más estricto para proteger datos sensibles
const adminLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: isProd ? 40 : 100,
  message: { ok: false, error: 'Demasiadas peticiones. Espera un momento.' },
  standardHeaders: true,
  legacyHeaders: false,
});

function checkJwtSecret() {
  const secret = process.env.JWT_SECRET || '';
  const defaultSecret = 'cambiar-en-produccion';
  if (isProd && (!secret || secret === defaultSecret)) {
    console.error('[SECURITY] En producción JWT_SECRET debe estar definido y ser distinto de "cambiar-en-produccion".');
    console.error('[SECURITY] Configura JWT_SECRET en Railway (Variables) con un valor largo y aleatorio.');
  }
}

module.exports = {
  apiLimiter,
  authLimiter,
  adminLimiter,
  oxapayCallbackLimiter,
  checkJwtSecret,
  isProd,
};
