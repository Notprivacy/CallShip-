import { useState, useEffect } from 'react';
import Login from './Login';
import Dialer from './Dialer';
import CanvasBillsBackground from './CanvasBillsBackground';

const API = '/api';

const DIALER_TITLE = 'CallShip Dialer';

export default function App() {
  const [user, setUser] = useState(null);
  const [license, setLicense] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = DIALER_TITLE;
  }, []);
  const [activating, setActivating] = useState(false);
  const [activateMsg, setActivateMsg] = useState('');

  const [token, setToken] = useState(() => localStorage.getItem('callship_token'));
  const [serverError, setServerError] = useState(false);

  const checkSession = () => {
    setServerError(false);
    setLoading(true);
    if (!token) {
      setLoading(false);
      return;
    }
    Promise.all([
      fetch(`${API}/users/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then(async (r) => {
          const data = await r.json().catch(() => ({}));
          return { ok: r.ok, status: r.status, user: r.ok ? data : null };
        })
        .catch(() => ({ ok: false, status: 0, user: null })),
      fetch(`${API}/licenses/check`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json().catch(() => ({ valid: false, reason: 'Error de conexión' })))
        .catch(() => ({ valid: false, reason: 'Error de conexión' })),
    ])
      .then(([me, lic]) => {
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
          setLicense(lic);
          return;
        }
        setServerError(false);
        setUser(me.user);
        setLicense(lic);
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
    setLicense(null);
  };

  const onLogout = () => {
    localStorage.removeItem('callship_token');
    setToken(null);
    setUser(null);
    setLicense(null);
  };

  const activateDemoLicense = async () => {
    setActivating(true);
    setActivateMsg('');
    try {
      const res = await fetch(`${API}/licenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan: 'demo' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActivateMsg(data.error || data.message || 'No se pudo activar');
        return;
      }
      const lic = await fetch(`${API}/licenses/check`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json());
      setLicense(lic);
      setActivateMsg('Licencia demo activada.');
    } catch {
      setActivateMsg('Error de conexión.');
    } finally {
      setActivating(false);
    }
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
            No se pudo conectar a la API. Comprueba que el servidor esté en marcha en <strong>http://localhost:4000</strong>.
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
  if (!license?.valid) {
    return (
      <div className="cs-login">
        <CanvasBillsBackground count={85} opacity={0.78} />
        <div className="cs-login-card">
          <div className="cs-login-head">
            <div className="cs-logo" />
            <div>
              <h1>CallShip</h1>
              <p className="cs-login-sub">Licencia requerida</p>
            </div>
          </div>
          <p style={{ color: 'rgba(229,231,235,0.70)', marginTop: 0 }}>
            Tu cuenta está creada, pero necesitas una licencia activa para entrar al panel.
          </p>
          <div style={{ display: 'grid', gap: 10 }}>
            <div className="cs-card" style={{ padding: 12, background: 'rgba(255,255,255,0.04)' }}>
              <div style={{ color: 'rgba(229,231,235,0.55)', fontSize: 12 }}>Motivo</div>
              <div style={{ marginTop: 6, fontWeight: 700 }}>{license?.reason || 'Sin licencia'}</div>
              <div className="cs-help" style={{ marginTop: 8 }}>
                Para desarrollo puedes crear una licencia con el comando en la consola del navegador.
              </div>
            </div>
            <button className="cs-btn cs-btn-primary" onClick={activateDemoLicense} disabled={activating}>
              {activating ? 'Activando…' : 'Activar licencia demo'}
            </button>
            {activateMsg && <div style={{ color: 'rgba(229,231,235,0.75)', fontSize: 13, textAlign: 'center' }}>{activateMsg}</div>}
            <button className="cs-btn" onClick={onLogout}>
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <Dialer user={user} token={token} onLogout={onLogout} />;
}
