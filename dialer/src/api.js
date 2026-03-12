/**
 * URL base de la API.
 * - En el navegador: si la página es de callship.us, la API está en el mismo origen → usar /api.
 * - Si no, usar VITE_API_URL o /api (en dev el proxy de Vite apunta a localhost:4000).
 */
function getBase() {
  if (typeof window !== 'undefined' && window.location.hostname.includes('callship')) return '';
  return (import.meta.env.VITE_API_URL || '').toString().replace(/\/$/, '');
}
const base = getBase();
export const API = base || '/api';
