/**
 * URL base de la API.
 * - En producción (www.callship.us): define VITE_API_URL al construir (ej. https://tu-backend.railway.app/api).
 * - Si no se define o en desarrollo: usa '/api' (misma origen; en dev el proxy de Vite apunta a localhost:4000).
 */
const base = (import.meta.env.VITE_API_URL || '').toString().replace(/\/$/, '');
export const API = base || '/api';
