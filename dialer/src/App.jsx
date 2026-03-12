import { useState, useEffect } from 'react';
import Login from './Login';
import Dialer from './Dialer';
import CanvasBillsBackground from './CanvasBillsBackground';
import { API } from './api';

const DIALER_TITLE = 'CallShip Dialer';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = DIALER_TITLE;
  }, []);

  const [token, setToken] = useState(() => localStorage.getItem('callship_token'));
  const [serverError, setServerError] = useState(false);

  const checkSession = () => {
    setServerError(false);
    setLoading(true);
    if (!token) {
      setLoading(false);
      return;
    }
    fetch(`${API}/users/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        return { ok: r.ok, status: r.status, user: r.ok ? data : null };
      })
      .catch(() => ({ ok: false, status: 0, user: null }))
      .then((me) => {
        if (me.status === 401) {
          localStorage.removeItem('callship_token');
          setUser(null);
          setLicense(null);
          setServerError(false);
          return;
        }
        if (me.status === 0 || !me.ok) {
          setServerError(true);
          setUser(null);
          return;
        }
        setServerError(false);
        setUser(me.user);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    checkSession();
  }, [token]);

  const onLogin = (newToken, userData) => {
    localStorage.setItem('callship_token', newToken);
    setToken(newToken);
    setUser(userData);
  };

  const onLogout = () => {
    localStorage.removeItem('callship_token');
    setToken(null);
    setUser(null);
  };

  if (loading) return <div className="cs-login"><CanvasBillsBackground count={85} opacity={0.78} /><div className="cs-login-card">Cargando…</div></div>;
  if (!token) return <Login onLogin={onLogin} />;
  if (!user && serverError) {
    return (
      <div className="cs-login">
        <CanvasBillsBackground count={85} opacity={0.78} />
        <div className="cs-login-card">
          <div className="cs-login-head">
            <div className="cs-logo" />
            <div>
              <h1>CallShip</h1>
              <p className="cs-login-sub">Servidor no disponible</p>
            </div>
          </div>
          <p style={{ color: 'rgba(229,231,235,0.75)', marginTop: 0 }}>
            No se pudo conectar al servidor.{' '}
            {API.startsWith('http') ? (
              <>Comprueba que el backend esté en marcha: <strong>{API}</strong></>
            ) : (
              <>Comprueba que el backend esté en marcha (por ejemplo abre <a href="/api/health" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>/api/health</a> en esta pestaña). Si responde, pulsa Reintentar.</>
            )}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
            <button className="cs-btn cs-btn-primary" onClick={checkSession}>
              Reintentar
            </button>
            <button className="cs-btn" onClick={onLogout}>
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    );
  }
  if (!user) {
    return (
      <div className="cs-login">
        <CanvasBillsBackground count={85} opacity={0.78} />
        <div className="cs-login-card">
          <div className="cs-login-head">
            <div className="cs-logo" />
            <div>
              <h1>CallShip</h1>
              <p className="cs-login-sub">Sesión inválida</p>
            </div>
          </div>
          <p style={{ color: 'rgba(229,231,235,0.65)', marginTop: 0 }}>
            No pudimos validar tu sesión. Vuelve a iniciar.
          </p>
          <button className="cs-btn cs-btn-primary" onClick={onLogout} style={{ width: '100%' }}>
            Volver al login
          </button>
        </div>
      </div>
    );
  }

  return <Dialer user={user} token={token} onLogout={onLogout} />;
}
