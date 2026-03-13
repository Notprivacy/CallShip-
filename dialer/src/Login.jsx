import { useState } from 'react';
import CanvasBillsBackground from './CanvasBillsBackground';
import { API } from './api';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [isForgot, setIsForgot] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const userTrim = String(username).trim();
    const passTrim = String(password).trim();

    if (isForgot) {
      const emailTrim = String(email).trim();
      if (!emailTrim) {
        setError('Indica tu correo electrónico');
        return;
      }
      try {
        const res = await fetch(`${API}/auth/forgot-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailTrim }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.message || 'Error al solicitar recuperación');
          return;
        }
        setSuccess(data.message || 'Revisa tu correo para restablecer tu contraseña.');
        return;
      } catch {
        setError('No se pudo conectar al servidor.');
        return;
      }
    }

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
        // Si el proxy no puede conectar al backend (ECONNREFUSED) Vite suele devolver 502 o error de red
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
        setIsRegister(false);
        setSuccess('Registro exitoso. Ahora puedes iniciar sesión.');
        return;
      }
      if (!data.token || !data.user) {
        setError('La API no devolvió sesión. Revisa el servidor.');
        return;
      }
      onLogin(data.token, data.user);
    } catch {
      setError('No se pudo conectar al servidor. ¿Está la API en marcha?');
    }
  };

  return (
    <div className={`cs-login ${isRegister ? 'cs-is-register' : ''} ${isForgot ? 'cs-is-forgot' : ''}`}>
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
              {isForgot ? 'Recuperar contraseña' : isRegister ? 'Crear cuenta' : 'Acceso al panel'}
            </div>
          </div>

          <div className="cs-login-hero-inner">
            <div className="cs-login-panel">
              <form onSubmit={submit}>
                <div className="cs-login-field" style={{ marginBottom: isForgot ? 16 : 10 }}>
                  <svg viewBox="0 0 24 24" fill="none">
                    {isForgot ? (
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="2" />
                    ) : (
                      <>
                        <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" stroke="currentColor" strokeWidth="2" />
                        <path d="M4 20c1.6-3.4 5-5 8-5s6.4 1.6 8 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </>
                    )}
                  </svg>
                  <input
                    type={isForgot ? 'email' : 'text'}
                    placeholder={isForgot ? 'Correo electrónico' : 'Usuario'}
                    value={isForgot ? email : username}
                    onChange={(e) => isForgot ? setEmail(e.target.value) : setUsername(e.target.value)}
                    required={!isForgot}
                    autoComplete={isForgot ? 'email' : 'username'}
                  />
                </div>

                {!isForgot && (
                  <div className="cs-login-field" style={{ marginBottom: 6 }}>
                    <svg viewBox="0 0 24 24" fill="none">
                      <path d="M7 11V8a5 5 0 0 1 10 0v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <path d="M6 11h12v9H6z" stroke="currentColor" strokeWidth="2" />
                    </svg>
                    <input
                      type="password"
                      placeholder="Contraseña"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                )}

                {success && <p className="cs-msg-ok">{success}</p>}
                {error && <p className="cs-msg-err">{error}</p>}

                <div className="cs-login-cta">
                  <button type="submit" className="cs-btn cs-btn-primary">
                    {isForgot ? 'Enviar solicitud' : isRegister ? 'Registrarse' : 'Entrar'}
                  </button>
                </div>
                {!isForgot && (
                  <p style={{ marginTop: 12, marginBottom: 0, textAlign: 'center' }}>
                    <button
                      type="button"
                      className="cs-link"
                      onClick={() => { setIsForgot(true); setError(''); setSuccess(''); }}
                      style={{ fontSize: 13 }}
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </p>
                )}
              </form>

              <div className="cs-login-actions" style={{ marginTop: 8 }}>
                {!isForgot && (
                  <button
                    type="button"
                    className="cs-link"
                    onClick={() => { setIsRegister(!isRegister); setError(''); setSuccess(''); }}
                  >
                    {isRegister ? 'Ya tengo cuenta' : 'Crear cuenta'}
                  </button>
                )}
                {isForgot && (
                  <button
                    type="button"
                    className="cs-link"
                    onClick={() => { setIsForgot(false); setError(''); setSuccess(''); }}
                  >
                    Volver al login
                  </button>
                )}
                {!isForgot && (
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
