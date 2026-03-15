/**
 * Configuración centralizada. Usar en todas las rutas para no repetir JWT_SECRET ni filtrar errores.
 */
const isProd = process.env.NODE_ENV === 'production';

const JWT_SECRET = process.env.JWT_SECRET || 'cambiar-en-produccion';
const ADMIN_USERS = (process.env.ADMIN_USERS || 'medinax6').split(',').map((s) => s.trim()).filter(Boolean);

/** Dominio/servidor SIP del dialer (tu marca). Los clientes usan este valor en MicroSIP; no ven al proveedor. Ej: callship.com, sip.callship.com */
const DEFAULT_SIP_SERVER = (process.env.CALLSHIP_SIP_SERVER || process.env.DEFAULT_SIP_SERVER || '').trim();

/** En producción no exponer err.message al cliente; en desarrollo sí para depurar. */
function safeError(err) {
  if (isProd) return 'Error en el servidor';
  return err && typeof err.message === 'string' ? err.message : 'Error en el servidor';
}

module.exports = {
  isProd,
  JWT_SECRET,
  ADMIN_USERS,
  DEFAULT_SIP_SERVER,
  safeError,
};
