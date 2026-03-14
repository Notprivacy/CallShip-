import { useState } from 'react';
import CanvasBillsBackground from './CanvasBillsBackground';
import { API } from './api';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [isForgot, setIsForgot] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [backupCodeToShow, setBackupCodeToShow] = useState(null);
  const [showRegistrationSuccess, setShowRegistrationSuccess] = useState(false);
  const [backupCodeInput, setBackupCodeInput] = useState('');
  const [backupResetToken, setBackupResetToken] = useState('');
  const [backupStep, setBackupStep] = useState('code');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const userTrim = String(username).trim();
    const passTrim = String(password).trim();

    if (isForgot) {
      if (backupStep === 'password') {
        const passTrim = String(newPassword).trim();
        const passConfirm = String(newPasswordConfirm).trim();
        if (passTrim.length < 6) {
          setError('La contraseña debe tener al menos 6 caracteres.');
          return;
        }
        if (passTrim !== passConfirm) {
          setError('Las contraseñas no coinciden.');
          return;
        }
        setSubmitting(true);
        try {
          const res = await fetch(`${API}/auth/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: backupResetToken, password: passTrim }),
          });
          const data = await res.json().catch(() => ({}));
          setSubmitting(false);
          if (!res.ok) {
            setError(data.message || data.error || 'El enlace ha caducado o no es válido.');
            return;
          }
          setBackupResetToken('');
          setBackupStep('code');
          setBackupCodeInput('');
          setNewPassword('');
          setNewPasswordConfirm('');
          setIsForgot(false);
          setError('');
          setSuccess('Contraseña actualizada. Ya puedes entrar con tu nueva contraseña.');
          return;
        } catch {
          setError('No se pudo conectar al servidor.');
          setSubmitting(false);
          return;
        }
      }
      const userTrim = String(username).trim();
      const codeTrim = String(backupCodeInput).trim().replace(/\s/g, '');
      if (!userTrim || !codeTrim) {
        setError('Indica tu usuario y el código de respaldo de 25 caracteres.');
        return;
      }
      setSubmitting(true);
      try {
        const res = await fetch(`${API}/auth/verify-backup-code`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: userTrim, backupCode: codeTrim }),
        });
        const data = await res.json().catch(() => ({}));
        setSubmitting(false);
        if (!res.ok || !data.resetToken) {
          setError(data.message || data.error || 'Código inválido o ya utilizado.');
          return;
        }
        setBackupResetToken(data.resetToken);
        setBackupStep('password');
        setError('');
        setSuccess('');
        return;
      } catch {
        setError('No se pudo conectar al servidor.');
        setSubmitting(false);
        return;
      }
    }

    setSubmitting(true);
    const url = isRegister ? `${API}/auth/register` : `${API}/auth/login`;
    const body = { username: userTrim, password: passTrim };
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSubmitting(false);
        if (res.status === 429) {
          setError('Demasiados intentos. Espera unos 15 minutos antes de volver a intentar.');
          return;
        }
        const connectionFailed = res.status === 0 || res.status === 502 || res.status === 503 || res.status === 504;
        const apiMessage = data.error || data.message;
        if (connectionFailed || (res.status >= 500 && !apiMessage)) {
          setError('No se pudo conectar a la API. Comprueba que el servidor esté en marcha o que VITE_API_URL apunte a tu backend en producción.');
          return;
        }
        setError(apiMessage || 'Error');
        return;
      }
      if (isRegister) {
        const code = data.backupCode ?? data.backup_code;
        if (code && typeof code === 'string') {
          setBackupCodeToShow(code);
        } else {
          setIsRegister(false);
          setShowRegistrationSuccess(true);
        }
        setSubmitting(false);
        return;
      }
      if (!data.token || !data.user) {
        setError('La API no devolvió sesión. Revisa el servidor.');
        setSubmitting(false);
        return;
      }
      onLogin(data.token, data.user);
    } catch {
      setError('No se pudo conectar al servidor. ¿Está la API en marcha?');
      setSubmitting(false);
    }
  };

  const copyBackupCode = () => {
    if (!backupCodeToShow) return;
    navigator.clipboard.writeText(backupCodeToShow).then(() => {
      setSuccess('Código copiado al portapapeles.');
      setTimeout(() => setSuccess(''), 2500);
    }).catch(() => setError('No se pudo copiar. Cópialo manualmente.'));
  };

  const dismissBackupCode = () => {
    setBackupCodeToShow(null);
    setIsRegister(false);
    setShowRegistrationSuccess(true);
  };

  const showBackupPanel = !!backupCodeToShow;
  const showRecoveryPasswordStep = isForgot && backupStep === 'password';
  const showRecoveryCodeStep = isForgot && backupStep === 'code';
  const showMainForm = !showBackupPanel && !isForgot && !showRegistrationSuccess;

  return (
    <div className={`cs-login ${isRegister ? 'cs-is-register' : ''} ${isForgot ? 'cs-is-forgot' : ''} ${showBackupPanel ? 'cs-backup-panel' : ''}`}>
      <CanvasBillsBackground count={85} opacity={0.78} />
      <div className="cs-login-card cs-login-hero">
        <div className="cs-login-badge" />

        <div className="cs-login-clip">
          <div className="cs-login-hero-top">
            <div className="kicker">CallShip Dialer</div>
            <div className="title cs-login-title">
              <span className="cs-brand-azul">Call</span><span className="cs-brand-blanco">S</span><span className="cs-brand-rojo">hip</span>
            </div>
            <div className="subtitle">
              {showBackupPanel ? 'Guarda tu código de respaldo' : showRegistrationSuccess ? '¡Bienvenido a CallShip!' : isForgot ? (backupStep === 'password' ? 'Nueva contraseña' : 'Recuperar contraseña') : isRegister ? 'Crear cuenta' : 'Acceso al panel'}
            </div>
          </div>

          <div className="cs-login-hero-inner">
            <div className="cs-login-panel">
              {showBackupPanel && (
                <div className="cs-backup-code-panel">
                  <div className="cs-backup-warning" role="alert">
                    <span className="cs-backup-warning-icon" aria-hidden>⚠️</span>
                    <strong>⚠️ ADVERTENCIA — LEE Y GUARDA ESTE CÓDIGO</strong>
                    <p>Copia y guarda este código en un lugar seguro. Es de <strong>un solo uso</strong>. Si olvidas tu contraseña, podrás usarlo para recuperar el acceso.</p>
                    <p className="cs-backup-warning-danger"><strong>Si pierdes u olvidas este código, podrías perder el acceso permanente a tu cuenta.</strong> No podremos recuperarlo por ti.</p>
                  </div>
                  <div className="cs-backup-code-box">
                    <code className="cs-backup-code-text" aria-label="Código de respaldo de 25 caracteres">{backupCodeToShow}</code>
                    <button type="button" className="cs-btn cs-btn-secondary cs-backup-copy" onClick={copyBackupCode}>
                      Copiar código
                    </button>
                  </div>
                  <button type="button" className="cs-btn cs-btn-primary" onClick={dismissBackupCode}>
                    Entendido, ir al login
                  </button>
                </div>
              )}

              {showRegistrationSuccess && (
                <div className="cs-registration-success-panel">
                  <div className="cs-registration-success-icon" aria-hidden>✓</div>
                  <h2 className="cs-registration-success-title">¡Registro exitoso!</h2>
                  <p className="cs-registration-success-text">Tu cuenta ha sido creada correctamente. Ya puedes iniciar sesión con tu usuario y contraseña.</p>
                  <button type="button" className="cs-btn cs-btn-primary cs-registration-success-btn" onClick={() => setShowRegistrationSuccess(false)}>
                    Entrar
                  </button>
                </div>
              )}

              {!showBackupPanel && !showRegistrationSuccess && (
              <form onSubmit={submit}>
                {(showMainForm || showRecoveryCodeStep) && (
                  <div className="cs-login-field" style={{ marginBottom: showRecoveryCodeStep ? 12 : 10 }}>
                    <svg viewBox="0 0 24 24" fill="none">
                      <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" stroke="currentColor" strokeWidth="2" />
                      <path d="M4 20c1.6-3.4 5-5 8-5s6.4 1.6 8 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    <input
                      type="text"
                      placeholder={showRecoveryCodeStep ? 'Usuario' : 'Usuario'}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required={showMainForm || showRecoveryCodeStep}
                      autoComplete="username"
                    />
                  </div>
                )}

                {showRecoveryCodeStep && (
                  <div className="cs-login-field" style={{ marginBottom: 12 }}>
                    <svg viewBox="0 0 24 24" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    <input
                      type="text"
                      placeholder="Código de respaldo (25 caracteres)"
                      value={backupCodeInput}
                      onChange={(e) => setBackupCodeInput(e.target.value)}
                      maxLength={30}
                      autoComplete="one-time-code"
                    />
                  </div>
                )}

                {showRecoveryPasswordStep && (
                  <>
                    <div className="cs-login-field" style={{ marginBottom: 10 }}>
                      <svg viewBox="0 0 24 24" fill="none"><path d="M7 11V8a5 5 0 0 1 10 0v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M6 11h12v9H6z" stroke="currentColor" strokeWidth="2" /></svg>
                      <input
                        type="password"
                        placeholder="Nueva contraseña (mín. 6 caracteres)"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        minLength={6}
                        autoComplete="new-password"
                      />
                    </div>
                    <div className="cs-login-field" style={{ marginBottom: 10 }}>
                      <svg viewBox="0 0 24 24" fill="none"><path d="M7 11V8a5 5 0 0 1 10 0v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M6 11h12v9H6z" stroke="currentColor" strokeWidth="2" /></svg>
                      <input
                        type="password"
                        placeholder="Confirmar nueva contraseña"
                        value={newPasswordConfirm}
                        onChange={(e) => setNewPasswordConfirm(e.target.value)}
                        minLength={6}
                        autoComplete="new-password"
                      />
                    </div>
                  </>
                )}

                {showMainForm && (
                  <div className="cs-login-field" style={{ marginBottom: 6 }}>
                    <svg viewBox="0 0 24 24" fill="none"><path d="M7 11V8a5 5 0 0 1 10 0v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M6 11h12v9H6z" stroke="currentColor" strokeWidth="2" /></svg>
                    <input type="password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  </div>
                )}

                {success && <p className="cs-msg-ok">{success}</p>}
                {error && <p className="cs-msg-err">{error}</p>}

                <div className="cs-login-cta">
                  <button type="submit" className="cs-btn cs-btn-primary" disabled={submitting}>
                    {submitting ? (isForgot ? 'Verificando…' : 'Entrando…') : backupStep === 'password' ? 'Cambiar contraseña' : isForgot ? 'Verificar código' : isRegister ? 'Registrarse' : 'Entrar'}
                  </button>
                </div>
                {showMainForm && (
                  <p style={{ marginTop: 12, marginBottom: 0, textAlign: 'center' }}>
                    <button type="button" className="cs-link" onClick={() => { setIsForgot(true); setError(''); setSuccess(''); }} style={{ fontSize: 13 }}>
                      ¿Olvidaste tu contraseña?
                    </button>
                  </p>
                )}
              </form>
              )}

              <div className="cs-login-actions" style={{ marginTop: 8 }}>
                {!showBackupPanel && !showRegistrationSuccess && !isForgot && (
                  <button type="button" className="cs-link" onClick={() => { setIsRegister(!isRegister); setError(''); setSuccess(''); }}>
                    {isRegister ? 'Ya tengo cuenta' : 'Crear cuenta'}
                  </button>
                )}
                {isForgot && (
                  <button type="button" className="cs-link" onClick={() => { setIsForgot(false); setBackupStep('code'); setBackupResetToken(''); setBackupCodeInput(''); setNewPassword(''); setNewPasswordConfirm(''); setError(''); setSuccess(''); }}>
                    Volver al login
                  </button>
                )}
                {!showBackupPanel && !showRegistrationSuccess && !isForgot && (
                  <span style={{ color: 'rgba(229,231,235,0.55)', fontSize: 12 }}>
                    {isRegister ? 'Crea tu acceso en segundos' : 'Accede a tu panel'}
                  </span>
                )}
              </div>
            </div>

            <div className="cs-login-footer">
              <div className="cs-login-footer-title">Contacto oficial (único)</div>
              <div className="cs-login-contactos">
                <a href="https://wa.me/18093167188" target="_blank" rel="noopener noreferrer" className="cs-login-contact-link cs-contact-wa" title="WhatsApp oficial">
                  <span className="cs-login-contact-icon">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  </span>
                  <span>+1 (809) 316-7188</span>
                </a>
                <a href="https://t.me/ShippedX" target="_blank" rel="noopener noreferrer" className="cs-login-contact-link cs-contact-tg" title="Telegram oficial @ShippedX">
                  <span className="cs-login-contact-icon">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                  </span>
                  <span>@ShippedX</span>
                </a>
              </div>
              <p className="cs-login-footer-hint">Solo estos canales son oficiales. Desconfía de quien pida pago o se haga pasar por nosotros.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="cs-login-scam-banner">
        <span className="cs-login-scam-icon" aria-hidden>⚠</span>
        <strong>ADVERTENCIA DE ESTAFA</strong>
        <span> Personas se hacen pasar por nosotros para ofrecer cuentas VoIP. </span>
        <strong>NO COBRO NADA por contacto oficial.</strong>
        <span> Es estafa si piden pago. Contacto único: </span>
        <a href="https://wa.me/18093167188" target="_blank" rel="noopener noreferrer" className="cs-login-scam-wa">WhatsApp +1 (809) 316-7188</a>
        <span> o </span>
        <a href="https://t.me/ShippedX" target="_blank" rel="noopener noreferrer" className="cs-login-scam-tg">Telegram @ShippedX</a>
      </div>
    </div>
  );
}
