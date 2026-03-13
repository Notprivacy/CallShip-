/**
 * Envío de correo (recuperar contraseña, etc.) vía SMTP.
 * Variables: SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, EMAIL_FROM, FRONTEND_URL
 */
const nodemailer = require('nodemailer');

const FRONTEND_URL = (process.env.FRONTEND_URL || process.env.ALLOWED_ORIGIN || 'https://www.callship.us').replace(/\/$/, '');
const FROM = process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@callship.us';

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || process.env.SMTP_SECURE === '1';
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    return null;
  }
  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
  return transporter;
}

/**
 * Envía el correo de recuperación de contraseña.
 * @param {string} to - Correo del destinatario
 * @param {string} resetToken - Token para el enlace
 * @param {string} [userName] - Nombre de usuario (opcional, para personalizar)
 * @returns {Promise<{ sent: boolean, error?: string }>}
 */
async function sendPasswordResetEmail(to, resetToken, userName = '') {
  const trans = getTransporter();
  if (!trans) {
    console.warn('[email] SMTP no configurado (SMTP_HOST, SMTP_USER, SMTP_PASS). No se envía correo.');
    return { sent: false, error: 'Servidor de correo no configurado' };
  }
  const resetLink = `${FRONTEND_URL}/reset-password?token=${encodeURIComponent(resetToken)}`;
  const subject = 'CallShip – Restablecer tu contraseña';
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Restablecer contraseña</title></head>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #1f2937; max-width: 520px; margin: 0 auto; padding: 24px;">
  <div style="margin-bottom: 24px;">
    <strong style="color: #CE1126;">Call</strong><strong style="color: #1e3a5f;">Ship</strong>
  </div>
  <h2 style="color: #111; font-size: 1.25rem;">Restablecer contraseña</h2>
  <p>${userName ? `Hola, ${userName}.` : 'Hola.'}</p>
  <p>Has solicitado restablecer la contraseña de tu cuenta en CallShip. Haz clic en el enlace siguiente para elegir una nueva contraseña (válido durante 1 hora):</p>
  <p style="margin: 20px 0;">
    <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background: #CE1126; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600;">Restablecer contraseña</a>
  </p>
  <p style="font-size: 0.875rem; color: #6b7280;">Si no solicitaste este cambio, ignora este correo. Tu contraseña no se modificará.</p>
  <p style="font-size: 0.875rem; color: #9ca3af; margin-top: 32px;">CallShip Dialer</p>
</body>
</html>`;
  const text = `Restablecer contraseña en CallShip\n\nHaz clic en el siguiente enlace (válido 1 hora):\n${resetLink}\n\nSi no solicitaste este cambio, ignora este correo.`;
  try {
    await trans.sendMail({
      from: FROM,
      to,
      subject,
      text,
      html,
    });
    return { sent: true };
  } catch (err) {
    console.error('[email] Error enviando correo:', err.message);
    return { sent: false, error: err.message };
  }
}

module.exports = { sendPasswordResetEmail, getTransporter };
