import { useState } from 'react';
import CanvasBillsBackground from './CanvasBillsBackground';

const API = '/api';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isRegister, setIsRegister] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const url = isRegister ? `${API}/auth/register` : `${API}/auth/login`;
    const body = { username, password };
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
          setError('No se pudo conectar a la API. Arranca el servidor: en la carpeta "server" ejecuta "npm run dev" y espera a ver "escuchando en http://localhost:4000".');
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
      setError('No se pudo conectar al servidor. ¿Está la API en marcha? (puerto 4000)');
    }
  };

  return (
    <div className={`cs-login ${isRegister ? 'cs-is-register' : ''}`}>
      <CanvasBillsBackground count={85} opacity={0.78} />
      <div className="cs-login-card cs-login-hero">
        <div className="cs-login-badge" />

        <div className="cs-login-clip">
          <div className="cs-login-hero-top">
            <div className="kicker">CallShip Dialer</div>
            <div className="title">CallShip</div>
            <div className="subtitle">{isRegister ? 'Crear cuenta' : 'Acceso al panel'}</div>
          </div>

          <div className="cs-login-hero-inner">
            <div className="cs-login-panel">
              <form onSubmit={submit}>
                <div className="cs-login-field" style={{ marginBottom: 10 }}>
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" stroke="currentColor" strokeWidth="2" />
                    <path d="M4 20c1.6-3.4 5-5 8-5s6.4 1.6 8 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Usuario"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>

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

                {success && <p className="cs-msg-ok">{success}</p>}
                {error && <p className="cs-msg-err">{error}</p>}

                <div className="cs-login-cta">
                  <button type="submit" className="cs-btn cs-btn-primary">
                    {isRegister ? 'Registrarse' : 'Entrar'}
                  </button>
                </div>
              </form>

              <div className="cs-login-actions" style={{ marginTop: 8 }}>
                <button
                  type="button"
                  className="cs-link"
                  onClick={() => { setIsRegister(!isRegister); setError(''); setSuccess(''); }}
                >
                  {isRegister ? 'Ya tengo cuenta' : 'Crear cuenta'}
                </button>
                <span style={{ color: 'rgba(229,231,235,0.55)', fontSize: 12 }}>
                  {isRegister ? 'Crea tu acceso en segundos' : 'Accede a tu panel'}
                </span>
              </div>
            </div>

            <div className="cs-login-footer">
              Contacto principal
              <div className="line">
                <span className="dot" />
                <span>Soporte: WhatsApp / Email</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
