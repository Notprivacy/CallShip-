import { useState, useEffect } from 'react';
import CanvasBillsBackground from './CanvasBillsBackground';
import { API } from './api';

export default function ResetPassword({ token: tokenProp, onDone }) {
  const [token, setToken] = useState(tokenProp || '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!tokenProp && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      setToken(params.get('token') || '');
    } else if (tokenProp) {
      setToken(tokenProp);
    }
  }, [tokenProp]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const pass = String(password).trim();
    const conf = String(confirm).trim();
    if (!token.trim()) {
      setError('Falta el enlace de restablecimiento. Usa el enlace que recibiste por correo.');
      return;
    }
    if (pass.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (pass !== conf) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim(), password: pass }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || 'Enlace inválido o expirado');
        setLoading(false);
        return;
      }
      setSuccess(true);
    } catch {
      setError('No se pudo conectar al servidor.');
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="cs-login">
        <CanvasBillsBackground count={85} opacity={0.78} />
        <div className="cs-login-card cs-login-hero">
          <div className="cs-login-badge" />
          <div className="cs-login-clip">
            <div className="cs-login-hero-top">
              <div className="title cs-login-title">
                <span className="cs-brand-azul">Call</span><span className="cs-brand-blanco">S</span><span className="cs-brand-rojo">hip</span>
              </div>
              <div className="subtitle">Contraseña actualizada</div>
            </div>
            <div className="cs-login-hero-inner">
              <div className="cs-login-panel">
                <p className="cs-msg-ok">Listo. Ya puedes iniciar sesión con tu nueva contraseña.</p>
                <div className="cs-login-cta" style={{ marginTop: 16 }}>
                  <button type="button" className="cs-btn cs-btn-primary" onClick={onDone}>
                    Ir al login
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cs-login cs-is-forgot">
      <CanvasBillsBackground count={85} opacity={0.78} />
      <div className="cs-login-card cs-login-hero">
        <div className="cs-login-badge" />
        <div className="cs-login-clip">
          <div className="cs-login-hero-top">
            <div className="kicker">CallShip Dialer</div>
            <div className="title cs-login-title">
              <span className="cs-brand-azul">Call</span><span className="cs-brand-blanco">S</span><span className="cs-brand-rojo">hip</span>
            </div>
            <div className="subtitle">Nueva contraseña</div>
          </div>
          <div className="cs-login-hero-inner">
            <div className="cs-login-panel">
              <form onSubmit={submit}>
                {!tokenProp && (
                  <div className="cs-login-field" style={{ marginBottom: 10 }}>
                    <svg viewBox="0 0 24 24" fill="none">
                      <path d="M12 2a4 4 0 0 0-4 4v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2h-2V6a4 4 0 0 0-4-4z" stroke="currentColor" strokeWidth="2" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Token (pega el enlace o el código)"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                    />
                  </div>
                )}
                <div className="cs-login-field" style={{ marginBottom: 10 }}>
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M7 11V8a5 5 0 0 1 10 0v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <path d="M6 11h12v9H6z" stroke="currentColor" strokeWidth="2" />
                  </svg>
                  <input
                    type="password"
                    placeholder="Nueva contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <div className="cs-login-field" style={{ marginBottom: 16 }}>
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M7 11V8a5 5 0 0 1 10 0v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <path d="M6 11h12v9H6z" stroke="currentColor" strokeWidth="2" />
                  </svg>
                  <input
                    type="password"
                    placeholder="Repetir contraseña"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                {error && <p className="cs-msg-err">{error}</p>}
                <div className="cs-login-cta">
                  <button type="submit" className="cs-btn cs-btn-primary" disabled={loading}>
                    {loading ? 'Guardando…' : 'Restablecer contraseña'}
                  </button>
                </div>
              </form>
              <div className="cs-login-actions" style={{ marginTop: 12 }}>
                <button type="button" className="cs-link" onClick={onDone}>
                  Volver al login
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
