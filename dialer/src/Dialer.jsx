import { useMemo, useState, useEffect, useRef } from 'react';

const API = '/api';
const YOUTUBE_BG_VIDEO_ID = 'O5Vd-I1gd7Y';
const YOUTUBE_BG_LOOP_END_SEC = 4;

export default function Dialer({ user, token, onLogout }) {
  const [customer, setCustomer] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('');
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [kpis, setKpis] = useState({ today: 0, total: 0, pending: 0, notes: 0 });
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [savingId, setSavingId] = useState(null);
  const [active, setActive] = useState('dashboard');
  const [products, setProducts] = useState([]);
  const [rates, setRates] = useState([]);
  const [ratesQ, setRatesQ] = useState('');
  const [balance, setBalance] = useState(0);
  const [payments, setPayments] = useState([]);
  const [topupAmount, setTopupAmount] = useState('');
  const [serverIpHint, setServerIpHint] = useState('');
  const [reportDays, setReportDays] = useState(14);
  const [callsByDay, setCallsByDay] = useState([]);
  const [settings, setSettings] = useState(null);
  const [adminCustomers, setAdminCustomers] = useState([]);
  const [adminCustomersQ, setAdminCustomersQ] = useState('');
  const [adminSelectedCustomer, setAdminSelectedCustomer] = useState(null);
  const [adminTopupAmount, setAdminTopupAmount] = useState('');
  const [adminStatusMsg, setAdminStatusMsg] = useState('');
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [sipDevices, setSipDevices] = useState([]);
  const [sipForm, setSipForm] = useState({ name: '', sip_username: '', sip_server: '', sip_password: '' });
  const [changePw, setChangePw] = useState({ current: '', new: '', confirm: '' });
  const [accountMsg, setAccountMsg] = useState('');
  const [sipQ, setSipQ] = useState('');
  const [sipSelected, setSipSelected] = useState({});
  const [sipModalOpen, setSipModalOpen] = useState(false);
  const [sipEditing, setSipEditing] = useState(null);
  const [sipEdit, setSipEdit] = useState({
    sip_username: '',
    sip_password: '',
    caller_name: '',
    caller_number: '',
    status: true,
    voicemail: true,
    mail_to: '',
    attach_file: true,
    local_after_email: true,
    send_all_message: true,
    sip_server: '',
    code: '',
  });
  const [profileForm, setProfileForm] = useState({
    account_number: '', company: '', first_name: '', last_name: '', telephone1: '', telephone2: '',
    email: '', address1: '', address2: '', city: '', province_state: '', zip_postal_code: '', country: '', timezone: '', fax_number: '',
  });
  const [profileSaving, setProfileSaving] = useState(false);

  const loadCalls = () => {
    fetch(`${API}/calls`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        if (!data.ok) return;
        const list = data.calls || [];
        setCalls(list);
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const today = list.filter((c) => new Date(c.created_at) >= startOfDay).length;
        const pending = list.filter((c) => (c.status || '').toLowerCase().includes('nueva')).length;
        const notesCount = list.filter((c) => (c.notes || '').trim().length > 0).length;
        setKpis({ today, total: list.length, pending, notes: notesCount });
      })
      .catch(() => setCalls([]));
  };

  const filteredCalls = calls
    .filter((c) => {
      const q = filter.trim().toLowerCase();
      if (!q) return true;
      return (
        String(c.customer || '').toLowerCase().includes(q) ||
        String(c.phone || '').toLowerCase().includes(q) ||
        String(c.notes || '').toLowerCase().includes(q) ||
        String(c.status || '').toLowerCase().includes(q)
      );
    })
    .filter((c) => {
      if (statusFilter === 'all') return true;
      return String(c.status || '').toLowerCase() === statusFilter;
    });

  const updateCall = async (id, patch) => {
    setSavingId(id);
    try {
      const res = await fetch(`${API}/calls/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(patch),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setStatus(data.message || 'No se pudo actualizar');
        return;
      }
      setCalls((prev) => prev.map((c) => (c.id === id ? data.call : c)));
    } catch {
      setStatus('Error de conexión');
    } finally {
      setSavingId(null);
    }
  };

  useEffect(() => {
    loadCalls();
  }, [token]);

  // Pre-cargar datos para KPIs (balance/productos) en el dashboard
  useEffect(() => {
    loadBilling();
    loadProducts();
    // rates/report/settings se cargan al abrir su pestaña
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const apiGet = (path) =>
    fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json());

  const loadProducts = async () => {
    const data = await apiGet('/products').catch(() => ({ ok: false }));
    if (data.ok) setProducts(data.products || []);
  };

  const loadRates = async (q = '') => {
    const qs = q ? `?q=${encodeURIComponent(q)}` : '';
    const data = await apiGet(`/rates${qs}`).catch(() => ({ ok: false }));
    if (data.ok) setRates(data.rates || []);
  };

  const loadBilling = async () => {
    const b = await apiGet('/billing/balance').catch(() => ({ ok: false }));
    const p = await apiGet('/billing/payments').catch(() => ({ ok: false }));
    if (b.ok) setBalance(Number(b.balance_usd || 0));
    if (p.ok) setPayments(p.payments || []);
  };

  const startOxaPayTopup = async () => {
    const amt = Number(topupAmount);
    if (!amt || amt <= 0) {
      setStatus('Pon un monto válido.');
      return;
    }
    setStatus('');
    try {
      const res = await fetch(`${API}/billing/oxapay/invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount_usd: amt }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        const msg = data.message || 'No se pudo crear el pago';
        const hint = /invalid|api key|key|ip|merchant/i.test(msg)
          ? ' Usa Recarga manual mientras configuras OxaPay.'
          : '';
        setStatus(msg + hint);
        return;
      }
      window.location.href = data.payment_url;
    } catch {
      setStatus('Error de conexión. Usa Recarga manual si hace falta.');
    }
  };

  const doManualTopup = async () => {
    const amt = Number(topupAmount);
    if (!amt || amt <= 0) {
      setStatus('Pon un monto válido.');
      return;
    }
    setStatus('');
    try {
      const res = await fetch(`${API}/billing/topup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount_usd: amt, method: 'manual', reference: '' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setStatus(data.message || 'Error al recargar');
        return;
      }
      setTopupAmount('');
      setStatus('Recarga aplicada correctamente.');
      loadBilling();
    } catch {
      setStatus('Error de conexión.');
    }
  };

  const fetchServerIp = async () => {
    setServerIpHint('...');
    try {
      const res = await fetch(`${API}/billing/oxapay/server-ip`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json().catch(() => ({}));
      if (data.ok && data.ip) setServerIpHint(`IP del servidor: ${data.ip} — Añádela en OxaPay → Settings → API → Allowed IPs`);
      else setServerIpHint(data.hint || 'No se pudo obtener la IP');
    } catch {
      setServerIpHint('Error al obtener la IP');
    }
  };

  const loadReports = async () => {
    const data = await apiGet(`/reports/calls-by-day?days=${reportDays}`).catch(() => ({ ok: false }));
    if (data.ok) setCallsByDay(data.rows || []);
  };

  const loadSettings = async () => {
    const data = await apiGet('/settings').catch(() => ({ ok: false }));
    if (data.ok) setSettings(data.settings || null);
  };

  const loadAdminCustomers = async () => {
    setAdminStatusMsg('');
    const qs = adminCustomersQ ? `?q=${encodeURIComponent(adminCustomersQ)}` : '';
    const data = await apiGet(`/admin/customers${qs}`).catch(() => ({ ok: false }));
    if (data.ok) setAdminCustomers(data.customers || []);
  };

  const loadAdminCustomerDetail = async (id) => {
    setAdminStatusMsg('');
    const data = await apiGet(`/admin/customers/${id}`).catch(() => ({ ok: false }));
    if (data.ok) {
      setAdminSelectedCustomer({ ...data.customer, topups: data.topups || [] });
      setAdminTopupAmount('');
    }
  };

  const adminDoTopup = async () => {
    if (!adminSelectedCustomer) return;
    const amt = Number(adminTopupAmount);
    if (!amt || amt <= 0) {
      setAdminStatusMsg('Pon un monto válido.');
      return;
    }
    try {
      const res = await fetch(`${API}/admin/customers/${adminSelectedCustomer.id}/topup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount_usd: amt, note: 'Topup manual desde panel admin' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setAdminStatusMsg(data.error || 'No se pudo aplicar la recarga');
        return;
      }
      setAdminStatusMsg('Recarga aplicada.');
      setAdminTopupAmount('');
      await loadAdminCustomerDetail(adminSelectedCustomer.id);
      await loadAdminCustomers();
    } catch {
      setAdminStatusMsg('Error de conexión.');
    }
  };

  const adminChangeStatus = async (statusValue) => {
    if (!adminSelectedCustomer) return;
    try {
      const res = await fetch(`${API}/admin/customers/${adminSelectedCustomer.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: statusValue }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setAdminStatusMsg(data.error || 'No se pudo cambiar el estado');
        return;
      }
      setAdminStatusMsg(statusValue === 'suspended' ? 'Cliente suspendido.' : 'Cliente reactivado.');
      await loadAdminCustomerDetail(adminSelectedCustomer.id);
      await loadAdminCustomers();
    } catch {
      setAdminStatusMsg('Error de conexión.');
    }
  };

  const loadProfile = async () => {
    const data = await apiGet('/users/me').catch(() => ({}));
    if (data && data.id) {
      setProfileData(data);
      setProfileForm({
        account_number: data.account_number || String(data.id),
        company: data.company || '',
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        telephone1: data.telephone1 || '',
        telephone2: data.telephone2 || '',
        email: data.email || '',
        address1: data.address1 || '',
        address2: data.address2 || '',
        city: data.city || '',
        province_state: data.province_state || '',
        zip_postal_code: data.zip_postal_code || '',
        country: data.country || '',
        timezone: data.timezone || 'Europe/Madrid',
        fax_number: data.fax_number || '',
      });
    }
  };
  const loadSipDevices = async () => {
    const data = await apiGet('/sip-devices').catch(() => ({}));
    if (data?.ok) setSipDevices(data.devices || []);
  };

  useEffect(() => {
    loadProfile();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (active === 'products') loadProducts();
    if (active === 'rates') loadRates(ratesQ);
    if (active === 'billing') loadBilling();
    if (active === 'reports') loadReports();
    if (active === 'settings') loadSettings();
    if (active === 'admin-customers') loadAdminCustomers();
    if (active === 'account-profile') loadProfile();
    if (active === 'account-sipdevices') loadSipDevices();
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (active === 'reports') loadReports();
  }, [reportDays]); // eslint-disable-line react-hooks/exhaustive-deps

  const kpiBalance = useMemo(() => Number(balance || 0).toFixed(2), [balance]);
  const kpiPaymentToday = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const sum = (payments || [])
      .filter((p) => p?.created_at && new Date(p.created_at) >= start)
      .reduce((acc, p) => acc + Number(p.amount_usd || 0), 0);
    return sum.toFixed(2);
  }, [payments]);
  const kpiLastPayment = useMemo(() => {
    const p = (payments || [])[0];
    if (!p) return null;
    const amt = Number(p.amount_usd || 0).toFixed(2);
    return `$${amt} · ${p.method || 'manual'}`;
  }, [payments]);

  const handleRegisterCall = async (e) => {
    e?.preventDefault();
    if (!customer.trim()) return;
    setLoading(true);
    setStatus('');
    try {
      const res = await fetch(`${API}/calls`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          customer: customer.trim(),
          phone: phone.trim() || null,
          status: 'nueva',
          notes: notes.trim() || null,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setStatus('Llamada registrada.');
        setCustomer('');
        setPhone('');
        setNotes('');
        loadCalls();
      } else {
        setStatus(data.message || 'Error al registrar');
      }
    } catch (err) {
      setStatus('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const youtubePlayerRef = useRef(null);
  const youtubeContainerRef = useRef(null);
  const youtubeLoopIntervalRef = useRef(null);

  useEffect(() => {
    if (!youtubeContainerRef.current) return;
    const LOOP_END = YOUTUBE_BG_LOOP_END_SEC;
    const SEEK_BACK_AT = LOOP_END - 0.2;

    const loadYouTubeApi = () => {
      if (window.YT && window.YT.Player) {
        const player = new window.YT.Player(youtubeContainerRef.current, {
          videoId: YOUTUBE_BG_VIDEO_ID,
          playerVars: {
            autoplay: 1,
            mute: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            showinfo: 0,
            rel: 0,
            playsinline: 1,
            start: 0,
            iv_load_policy: 3,
          },
          events: {
            onReady: (event) => {
              youtubePlayerRef.current = event.target;
              event.target.mute();
              event.target.playVideo();
              youtubeLoopIntervalRef.current = setInterval(() => {
                try {
                  const t = event.target.getCurrentTime();
                  if (typeof t === 'number' && t >= SEEK_BACK_AT) {
                    event.target.seekTo(0, true);
                    event.target.playVideo();
                  }
                } catch (_) {}
              }, 80);
            },
          },
        });
        return () => {
          if (youtubeLoopIntervalRef.current) clearInterval(youtubeLoopIntervalRef.current);
          youtubeLoopIntervalRef.current = null;
          if (player && player.destroy) player.destroy();
        };
      }
    };
    if (window.YT && window.YT.Player) {
      const cleanup = loadYouTubeApi();
      return () => { if (cleanup) cleanup(); };
    }
    window.onYouTubeIframeAPIReady = () => loadYouTubeApi();
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScript = document.getElementsByTagName('script')[0];
    firstScript.parentNode.insertBefore(tag, firstScript);
    return () => {
      if (youtubeLoopIntervalRef.current) clearInterval(youtubeLoopIntervalRef.current);
      youtubeLoopIntervalRef.current = null;
      if (youtubePlayerRef.current && youtubePlayerRef.current.destroy) youtubePlayerRef.current.destroy();
    };
  }, []);

  return (
    <div className="cs-panel-with-bg">
      <div className="cs-bg-video-wrap">
        <div ref={youtubeContainerRef} id="yt-bg-player" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
      </div>
      <div className="cs-bg-overlay" />
      <div className="cs-shell">
      <aside className="cs-sidebar">
        <div className="cs-brand">
          <div className="cs-logo" />
          <div>
            <h1>CallShip</h1>
            <p>Panel de llamadas</p>
          </div>
        </div>
        <nav className="cs-nav">
          <a href="#" className={active === 'dashboard' ? 'cs-active' : ''} onClick={(e) => { e.preventDefault(); setActive('dashboard'); }}>
            <span>Dashboard</span> <span className="cs-badge">Live</span>
          </a>
          <a href="#" className={active === 'products' ? 'cs-active' : ''} onClick={(e) => { e.preventDefault(); setActive('products'); }}>
            <span>Productos</span> <span className="cs-badge">{products.length || 0}</span>
          </a>
          <a href="#" className={active === 'calls' ? 'cs-active' : ''} onClick={(e) => { e.preventDefault(); setActive('calls'); }}>
            <span>Llamadas</span> <span className="cs-badge">{kpis.total}</span>
          </a>
          <a href="#" className={active === 'cdr' ? 'cs-active' : ''} onClick={(e) => { e.preventDefault(); setActive('cdr'); loadCalls(); }}>
            <span>Registro CDR</span> <span className="cs-badge">CDR</span>
          </a>
          <a href="#" className={active === 'rates' ? 'cs-active' : ''} onClick={(e) => { e.preventDefault(); setActive('rates'); }}>
            <span>Rates</span> <span className="cs-badge">{rates.length || 0}</span>
          </a>
          <a href="#" className={active === 'billing' ? 'cs-active' : ''} onClick={(e) => { e.preventDefault(); setActive('billing'); }}>
            <span>Billing</span> <span className="cs-badge">$</span>
          </a>
          <a href="#" className={active === 'reports' ? 'cs-active' : ''} onClick={(e) => { e.preventDefault(); setActive('reports'); }}>
            <span>Reportes</span> <span className="cs-badge">MVP</span>
          </a>
          <a href="#" className={active === 'settings' ? 'cs-active' : ''} onClick={(e) => { e.preventDefault(); setActive('settings'); }}>
            <span>Settings</span> <span className="cs-badge">MVP</span>
          </a>
          <a href="#" className={active === 'admin-customers' ? 'cs-active' : ''} onClick={(e) => { e.preventDefault(); setActive('admin-customers'); }}>
            <span>Clientes</span> <span className="cs-badge">Admin</span>
          </a>
        </nav>
        <div className="cs-divider" />
        <div style={{ padding: 12, marginTop: 14 }}>
          <div className="cs-card" style={{ padding: 12 }}>
            <div style={{ color: 'rgba(229,231,235,0.72)', fontSize: 12 }}>Sesión</div>
            <div style={{ marginTop: 6, fontWeight: 700 }}>{user?.username}</div>
            <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
              <button className="cs-btn" onClick={onLogout} style={{ width: '100%' }}>
                Salir
              </button>
            </div>
          </div>
        </div>
      </aside>

      <main className="cs-main">
        <div className="cs-topbar">
          <div>
            <h2>{active === 'account-profile' ? 'My Profile' : active === 'account-sipdevices' ? 'SIP Devices' : active === 'account-changepassword' ? 'Change Password' : active === 'cdr' ? 'Registro CDR' : active === 'calls' ? 'Llamadas' : active === 'billing' ? 'Billing' : active === 'rates' ? 'Rates' : active === 'reports' ? 'Reportes' : active === 'settings' ? 'Settings' : active === 'products' ? 'Productos' : active === 'admin-customers' ? 'Clientes (Admin)' : 'Dashboard'}</h2>
            <div style={{ marginTop: 4, color: 'rgba(229,231,235,0.55)', fontSize: 12 }}>
              {active === 'account-profile'
                ? 'Tu perfil y datos de cuenta'
                : active === 'account-sipdevices'
                ? 'Dispositivos SIP para llamadas'
                : active === 'account-changepassword'
                ? 'Cambiar tu contraseña'
                : active === 'cdr'
                ? 'Registro de llamadas con fecha, hora, duración y disposición'
                : active === 'admin-customers'
                ? 'Gestión de clientes: saldo, estado y datos de contacto'
                : 'Resumen rápido y registro de actividad'}
            </div>
          </div>
          <div className="cs-user" style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
            <span className="cs-pill">Servidor: OK</span>
            <span className="cs-pill">Modo: Operador</span>
            <button
              type="button"
              className="cs-btn"
              style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6 }}
              onClick={() => setAccountMenuOpen((o) => !o)}
            >
              My Account
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
            </button>
            {accountMenuOpen && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setAccountMenuOpen(false)} />
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: 8,
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: 12,
                    minWidth: 220,
                    boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
                    zIndex: 11,
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid #334155', fontWeight: 700, fontSize: 14, color: '#ffffff', letterSpacing: '0.02em' }}>
                    My Account
                  </div>
                  <button
                    type="button"
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '12px 16px', border: 'none', background: 'transparent', color: '#f1f5f9', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#1e293b'; e.currentTarget.style.color = '#ffffff'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#f1f5f9'; }}
                    onClick={() => { setActive('account-profile'); setAccountMenuOpen(false); }}
                  >
                    Profile
                  </button>
                  <button
                    type="button"
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '12px 16px', border: 'none', background: 'transparent', color: '#f1f5f9', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#1e293b'; e.currentTarget.style.color = '#ffffff'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#f1f5f9'; }}
                    onClick={() => { setActive('account-sipdevices'); setAccountMenuOpen(false); }}
                  >
                    SIP Devices
                  </button>
                  <button
                    type="button"
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '12px 16px', border: 'none', background: 'transparent', color: '#f1f5f9', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#1e293b'; e.currentTarget.style.color = '#ffffff'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#f1f5f9'; }}
                    onClick={() => { setActive('account-changepassword'); setAccountMenuOpen(false); }}
                  >
                    Change Password
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {accountMenuOpen && <div style={{ height: 190 }} />}

        {!active.startsWith('account-') && (
        <div className="cs-kpis cs-kpis-5">
          <div className="cs-kpi cs-kpi-color cs-kpi-usa-flag">
            <div className="cs-kpi-top">
              <div className="label">Mis productos</div>
              <div className="cs-kpi-icon" title="Productos">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M7 7V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v2M6 7v13h12V7"/></svg>
              </div>
            </div>
            <div className="value">1</div>
            <div className="hint">CallShip Dialer</div>
          </div>

          <button
            type="button"
            className="cs-kpi cs-kpi-color cs-kpi-usa-flag"
            style={{ textAlign: 'left', cursor: 'pointer' }}
            onClick={() => { setActive('cdr'); loadCalls(); }}
          >
            <div className="cs-kpi-top">
              <div className="label">Llamadas hoy</div>
              <div className="cs-kpi-icon" title="Llamadas">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2A19.8 19.8 0 0 1 3 5.2 2 2 0 0 1 5 3h3a2 2 0 0 1 2 1.7c.2 1 .5 2.1.9 3a2 2 0 0 1-.5 2.1L9.9 11a16 16 0 0 0 3.1 3.1l1.2-1.2a2 2 0 0 1 2.1-.5c.9.4 2 .7 3 .9A2 2 0 0 1 22 16.9Z"/></svg>
              </div>
            </div>
            <div className="value">{kpis.today}</div>
            <div className="hint">Clic para ver registro (CDR)</div>
          </button>

          <div className="cs-kpi cs-kpi-color cs-kpi-usa-flag">
            <div className="cs-kpi-top">
              <div className="label">Pendientes</div>
              <div className="cs-kpi-icon" title="Pendientes">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
              </div>
            </div>
            <div className="value">{kpis.pending}</div>
            <div className="hint">Estado “nueva”</div>
          </div>

          <button
            type="button"
            className="cs-kpi cs-kpi-color cs-kpi-usa-flag"
            style={{ textAlign: 'left', cursor: 'pointer' }}
            onClick={() => { setActive('billing'); loadBilling(); }}
          >
            <div className="cs-kpi-top">
              <div className="label">Payment</div>
              <div className="cs-kpi-icon" title="Pago">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
              </div>
            </div>
            <div className="value">${kpiPaymentToday}</div>
            <div className="hint">{kpiLastPayment ? `Último: ${kpiLastPayment}` : 'Sin pagos aún'}</div>
          </button>

          <div className="cs-kpi cs-kpi-color cs-kpi-usa-flag">
            <div className="cs-kpi-top">
              <div className="label">Balance</div>
              <div className="cs-kpi-icon" title="Balance">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4h-4z"/></svg>
              </div>
            </div>
            <div className="value">${kpiBalance}</div>
            <div className="hint">Balance (MVP)</div>
          </div>
        </div>
        )}

        {active === 'dashboard' && (
        <div className="cs-split" style={{ marginTop: 16 }}>
          <section className="cs-card">
            <div className="cs-section-head">
              <h3>Active Products</h3>
              <button className="cs-link-btn" type="button" onClick={() => { setActive('products'); loadProducts(); }}>Ver todo</button>
            </div>
            <div className="cs-muted" style={{ marginBottom: 10 }}>
              Productos activos en tu cuenta (panel demo).
            </div>
            <table className="cs-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Categoría</th>
                  <th>Precio</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {(products.length ? products : [{ id: 'demo', name: 'CallShip Dialer', category: 'Dialer', price_usd: 0, status: 'active' }]).slice(0, 5).map((p) => (
                  <tr key={p.id}>
                    <td><strong>{p.name}</strong></td>
                    <td>{p.category || '—'}</td>
                    <td>${Number(p.price_usd || 0).toFixed(2)}</td>
                    <td><span className="cs-tag cs-tag-new">{p.status || 'active'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="cs-help" style={{ marginTop: 10 }}>
              Luego conectamos pagos/planes reales y múltiples productos.
            </p>
          </section>

          <section className="cs-card">
            <div className="cs-section-head">
              <h3>Registrar llamada</h3>
              <button className="cs-link-btn" type="button" onClick={loadCalls}>Refrescar</button>
            </div>
            <form onSubmit={handleRegisterCall}>
              <input
                type="text"
                placeholder="Cliente / contacto"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                className="cs-field"
                style={{ marginBottom: 10 }}
              />
              <div className="cs-row">
                <input
                  type="tel"
                  placeholder="Teléfono"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="cs-field"
                />
                <input
                  type="text"
                  placeholder="Estado (por defecto: nueva)"
                  value="nueva"
                  readOnly
                  className="cs-field"
                />
              </div>
              <input
                type="text"
                placeholder="Notas (opcional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="cs-field"
                style={{ marginTop: 10 }}
              />
              <div style={{ display: 'flex', gap: 10, marginTop: 12, alignItems: 'center' }}>
                <button type="submit" disabled={loading} className="cs-btn cs-btn-primary">
                  {loading ? 'Guardando…' : 'Registrar'}
                </button>
                {status && <span style={{ color: 'rgba(229,231,235,0.65)', fontSize: 13 }}>{status}</span>}
              </div>
              <p className="cs-help">
                Esto registra la llamada en tu base. La marcación real (VoIP) se integra después (Masterking / SIP / Twilio).
              </p>
            </form>
          </section>
        </div>
        )}

        {active === 'calls' && (
        <section className="cs-card" style={{ marginTop: 16 }}>
          <div className="cs-section-head">
            <h3>Recent Calls</h3>
            <button className="cs-link-btn" type="button" onClick={loadCalls}>Refrescar</button>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', margin: '10px 0 12px 0', flexWrap: 'wrap' }}>
            <input
              className="cs-field"
              placeholder="Buscar (cliente, teléfono, estado, notas)…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{ maxWidth: 420 }}
            />
            <select
              className="cs-field"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ width: 200 }}
            >
              <option value="all">Todos los estados</option>
              <option value="nueva">Nueva</option>
              <option value="en progreso">En progreso</option>
              <option value="cerrada">Cerrada</option>
            </select>
            <span style={{ color: 'rgba(229,231,235,0.55)', fontSize: 12 }}>
              Mostrando {Math.min(filteredCalls.length, 25)} de {filteredCalls.length}
            </span>
          </div>
          {calls.length === 0 ? (
            <p style={{ color: 'rgba(229,231,235,0.55)', margin: 0 }}>Aún no hay llamadas.</p>
          ) : (
            <table className="cs-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Caller ID</th>
                  <th>Called Number</th>
                  <th>Destino</th>
                  <th>Disposición</th>
                  <th>Dirección</th>
                  <th>Notas</th>
                </tr>
              </thead>
              <tbody>
                {filteredCalls.slice(0, 25).map((c) => (
                  <tr key={c.id}>
                    <td style={{ color: 'rgba(229,231,235,0.65)' }}>{new Date(c.created_at).toLocaleString()}</td>
                    <td>{user?.username}</td>
                    <td>{c.phone || <span style={{ color: 'rgba(229,231,235,0.45)' }}>—</span>}</td>
                    <td><strong>{c.customer}</strong></td>
                    <td>
                      <select
                        className="cs-field"
                        value={(c.status || 'nueva').toLowerCase()}
                        onChange={(e) => updateCall(c.id, { status: e.target.value })}
                        disabled={savingId === c.id}
                        style={{ width: 160, padding: '8px 10px', borderRadius: 10 }}
                      >
                        <option value="nueva">Nueva</option>
                        <option value="en progreso">En progreso</option>
                        <option value="cerrada">Cerrada</option>
                      </select>
                    </td>
                    <td><span className="cs-tag cs-tag-note">Outbound</span></td>
                    <td><span className="cs-tag">Standard</span></td>
                    <td>
                      <input
                        className="cs-field"
                        defaultValue={c.notes || ''}
                        placeholder="Agregar nota…"
                        onBlur={(e) => updateCall(c.id, { notes: e.target.value })}
                        disabled={savingId === c.id}
                        style={{ padding: '8px 10px', borderRadius: 10 }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="cs-help" style={{ marginTop: 12 }}>
            Mostrando los últimos 25 registros. Luego añadimos paginación y filtros.
          </p>
        </section>
        )}

        {active === 'cdr' && (
          <section className="cs-card" style={{ marginTop: 16 }}>
            <div className="cs-section-head" style={{ flexWrap: 'wrap', gap: 12 }}>
              <h3 style={{ margin: 0 }}>CDR — Registro de llamadas</h3>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button className="cs-link-btn" type="button" onClick={loadCalls}>Refrescar</button>
                <button
                  className="cs-btn"
                  type="button"
                  onClick={() => {
                    const head = ['From', 'Caller ID', 'Called Number', 'SIP User', 'Destination', 'Duration', 'Credit used', 'Disposition', 'Reason', 'Recording'];
                    const fmt = (d) => (d ? new Date(d).toISOString().slice(0, 19).replace('T', ' ') : '');
                    const disp = (s) => (s === 'cerrada' ? 'Answered' : (s === 'nueva' ? 'No answer' : (s || '—')));
                    const rows = calls.map((c) => [fmt(c.created_at), c.customer || '—', c.phone || '—', c.username || user?.username || '—', c.status || '—', '—', '0.0000', disp(c.status), c.notes || '—', '—'].join(','));
                    const csv = [head.join(','), ...rows].join('\n');
                    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = `callship-cdr-${new Date().toISOString().slice(0, 10)}.csv`;
                    a.click();
                    URL.revokeObjectURL(a.href);
                  }}
                >
                  Report (CSV)
                </button>
              </div>
            </div>
            <p style={{ color: 'rgba(229,231,235,0.6)', fontSize: 12, marginTop: 4, marginBottom: 12 }}>
              Registro certero con fecha, hora, duración y disposición. Clic en «Llamadas hoy» en el Dashboard para abrir esta vista.
            </p>
            {calls.length === 0 ? (
              <p style={{ color: 'rgba(229,231,235,0.55)', margin: 0 }}>Aún no hay llamadas registradas.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="cs-table">
                  <thead>
                    <tr>
                      <th>From</th>
                      <th>Caller ID</th>
                      <th>Called Number</th>
                      <th>SIP User</th>
                      <th>Destination</th>
                      <th>Duration</th>
                      <th>Credit used</th>
                      <th>Disposition</th>
                      <th>Reason</th>
                      <th>Recording</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calls.map((c) => {
                      const created = c.created_at ? new Date(c.created_at) : null;
                      const fromStr = created ? created.toISOString().slice(0, 19).replace('T', ' ') : '—';
                      const disposition = (c.status || '').toLowerCase() === 'cerrada' ? 'Answered' : (c.status || '').toLowerCase() === 'nueva' ? 'No answer' : (c.status || '—');
                      return (
                        <tr key={c.id}>
                          <td style={{ color: 'rgba(229,231,235,0.8)', whiteSpace: 'nowrap' }}>{fromStr}</td>
                          <td>{c.customer || '—'}</td>
                          <td>{c.phone || '—'}</td>
                          <td>{c.username || user?.username || '—'}</td>
                          <td>{c.status || '—'}</td>
                          <td>—</td>
                          <td>0.0000</td>
                          <td><span className="cs-tag">{disposition}</span></td>
                          <td style={{ maxWidth: 200 }}>{c.notes || '—'}</td>
                          <td style={{ color: 'rgba(229,231,235,0.45)' }}>—</td>
                        </tr>
                      );
                    })}
                    <tr style={{ borderTop: '2px solid rgba(255,255,255,0.12)', fontWeight: 700 }}>
                      <td colSpan={5}>General total</td>
                      <td>0.00</td>
                      <td>0.0000</td>
                      <td colSpan={3} />
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
            <p style={{ color: 'rgba(229,231,235,0.5)', fontSize: 11, marginTop: 12 }}>
              {calls.length} registro(s). Duration y Credit used se rellenarán cuando se integre con telefonía.
            </p>
          </section>
        )}

        {active === 'products' && (
          <section className="cs-card" style={{ marginTop: 16 }}>
            <div className="cs-section-head">
              <h3>My Products</h3>
              <button className="cs-link-btn" type="button" onClick={loadProducts}>Refrescar</button>
            </div>
            <table className="cs-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Categoría</th>
                  <th>Precio (USD)</th>
                  <th>Setup Fee</th>
                  <th>Bill Type</th>
                  <th>Bill Days</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(products.length ? products : [{ id: 'demo', name: 'CallShip Dialer', category: 'Dialer', price_usd: 0, setup_fee_usd: 0, bill_type: 'subscription', bill_days: 30, status: 'active' }]).map((p) => (
                  <tr key={p.id}>
                    <td><strong>{p.name}</strong></td>
                    <td>{p.category || '—'}</td>
                    <td>${Number(p.price_usd || 0).toFixed(2)}</td>
                    <td>${Number(p.setup_fee_usd || 0).toFixed(2)}</td>
                    <td>{p.bill_type || '—'}</td>
                    <td>{p.bill_days || '—'}</td>
                    <td><span className="cs-tag cs-tag-new">{p.status || 'active'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {active === 'rates' && (
          <section className="cs-card" style={{ marginTop: 16 }}>
            <div className="cs-section-head">
              <h3>Rates</h3>
              <button className="cs-link-btn" type="button" onClick={() => loadRates(ratesQ)}>Buscar</button>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
              <input className="cs-field" value={ratesQ} onChange={(e) => setRatesQ(e.target.value)} placeholder="Buscar destino o prefijo…" style={{ maxWidth: 420 }} />
              <button className="cs-btn" type="button" onClick={() => loadRates(ratesQ)}>Actualizar</button>
            </div>
            <table className="cs-table">
              <thead>
                <tr>
                  <th>Prefix</th>
                  <th>Destination</th>
                  <th>Rate (USD)</th>
                </tr>
              </thead>
              <tbody>
                {rates.length === 0 ? (
                  <tr><td colSpan="3" className="cs-muted">No hay rates todavía.</td></tr>
                ) : rates.slice(0, 300).map((r) => (
                  <tr key={r.id}>
                    <td>{r.prefix}</td>
                    <td><strong>{r.destination}</strong></td>
                    <td>${Number(r.rate_usd).toFixed(6)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {active === 'billing' && (
          <div style={{ marginTop: 16 }} className="cs-center">
            <div className="cs-topup-wrap">
              <div className="cs-topup-card">
                <div className="cs-topup-head">
                  <div className="coin">₿</div>
                  <h3>TopUp</h3>
                  <p>Recarga tu balance: Crypto (OxaPay) o Recarga manual (sin OxaPay).</p>
                </div>
                <div className="cs-topup-body">
                  <div className="cs-topup-amount">
                    <div className="sym">$</div>
                    <input
                      value={topupAmount}
                      onChange={(e) => setTopupAmount(e.target.value)}
                      placeholder="Enter amount (USD)"
                      inputMode="decimal"
                    />
                  </div>

                  <div className="cs-topup-summary">
                    <div className="row"><span>Amount</span><strong>${Number(topupAmount || 0).toFixed(2)}</strong></div>
                    <div className="row"><span>Fee</span><strong>Payer</strong></div>
                    <div className="row"><span>Balance actual</span><strong>${kpiBalance}</strong></div>
                  </div>

                  {status && <div className={status.includes('aplicada') ? 'cs-msg-ok' : 'cs-msg-err'} style={{ marginTop: 12 }}>{status}</div>}

                  <div className="cs-topup-actions" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <button className="cs-btn cs-btn-primary" type="button" onClick={startOxaPayTopup}>
                      Crypto (OxaPay)
                    </button>
                    <button className="cs-btn" type="button" onClick={doManualTopup} style={{ border: '1px solid rgba(255,255,255,0.3)' }}>
                      Recarga manual
                    </button>
                  </div>
                  <p style={{ marginTop: 12, fontSize: 12, color: 'rgba(229,231,235,0.6)' }}>
                    Si OxaPay da error de clave: usa <strong>Merchant API Key</strong> (no Payout) y añade la IP del servidor.{' '}
                    <button type="button" className="cs-link-btn" style={{ padding: 0, fontSize: 12 }} onClick={fetchServerIp}>
                      Ver IP del servidor
                    </button>
                  </p>
                  {serverIpHint && <div className="cs-msg-ok" style={{ marginTop: 8, wordBreak: 'break-all' }}>{serverIpHint}</div>}
                  <div style={{ marginTop: 16 }}>
                    <div className="cs-section-head">
                      <h3 style={{ margin: 0 }}>Payments</h3>
                      <button className="cs-link-btn" type="button" onClick={loadBilling}>Refrescar</button>
                    </div>
                    <table className="cs-table">
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th>Método</th>
                          <th>Referencia</th>
                          <th>Monto (USD)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.length === 0 ? (
                          <tr><td colSpan="4" className="cs-muted">Aún no hay pagos.</td></tr>
                        ) : payments.map((p) => (
                          <tr key={p.id}>
                            <td style={{ color: 'rgba(229,231,235,0.65)' }}>{new Date(p.created_at).toLocaleString()}</td>
                            <td>{p.method || '—'}</td>
                            <td>{p.reference || '—'}</td>
                            <td><strong>${Number(p.amount_usd).toFixed(2)}</strong></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {active === 'reports' && (
          <section className="cs-card" style={{ marginTop: 16 }}>
            <div className="cs-section-head">
              <h3>Reports</h3>
              <button className="cs-link-btn" type="button" onClick={loadReports}>Refrescar</button>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
              <span className="cs-muted">Días:</span>
              <select className="cs-field" value={reportDays} onChange={(e) => setReportDays(Number(e.target.value))} style={{ width: 160 }}>
                <option value={7}>7</option>
                <option value={14}>14</option>
                <option value={30}>30</option>
                <option value={60}>60</option>
              </select>
            </div>
            <table className="cs-table">
              <thead>
                <tr>
                  <th>Día</th>
                  <th>Llamadas</th>
                </tr>
              </thead>
              <tbody>
                {callsByDay.length === 0 ? (
                  <tr><td colSpan="2" className="cs-muted">Sin datos todavía.</td></tr>
                ) : callsByDay.map((r) => (
                  <tr key={r.day}>
                    <td><strong>{r.day}</strong></td>
                    <td>{r.calls}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {active === 'settings' && (
          <section className="cs-card" style={{ marginTop: 16 }}>
            <div className="cs-section-head">
              <h3>Settings</h3>
              <button className="cs-link-btn" type="button" onClick={loadSettings}>Refrescar</button>
            </div>
            {!settings ? (
              <div className="cs-muted">Cargando settings…</div>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                <div className="cs-card" style={{ padding: 12, background: 'rgba(255,255,255,0.04)' }}>
                  <div style={{ fontWeight: 800, marginBottom: 6 }}>SIP</div>
                  <div className="cs-muted">Host: <strong>{settings.sip?.host}</strong></div>
                  <div className="cs-muted">Usuario: <strong>{settings.sip?.username}</strong></div>
                </div>
                <div className="cs-card" style={{ padding: 12, background: 'rgba(255,255,255,0.04)' }}>
                  <div style={{ fontWeight: 800, marginBottom: 6 }}>Dialer</div>
                  <div className="cs-muted">Timezone: <strong>{settings.dialer?.timezone}</strong></div>
                  <div className="cs-muted">Idioma: <strong>{settings.dialer?.language}</strong></div>
                </div>
              </div>
            )}
          </section>
        )}

        {active === 'admin-customers' && (
          <section className="cs-card" style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'minmax(0, 2.2fr) minmax(0, 1.8fr)', gap: 20 }}>
            <div>
              <div className="cs-section-head">
                <h3>Clientes</h3>
                <button className="cs-link-btn" type="button" onClick={loadAdminCustomers}>Refrescar</button>
              </div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <input
                  className="cs-field"
                  value={adminCustomersQ}
                  onChange={(e) => setAdminCustomersQ(e.target.value)}
                  placeholder="Buscar por usuario, empresa o email…"
                />
                <button className="cs-btn" type="button" onClick={loadAdminCustomers}>Buscar</button>
              </div>
              <div style={{ maxHeight: 420, overflow: 'auto' }}>
                <table className="cs-table">
                  <thead>
                    <tr>
                      <th>Usuario</th>
                      <th>Empresa</th>
                      <th>Email</th>
                      <th>País</th>
                      <th>Saldo</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminCustomers.length === 0 ? (
                      <tr><td colSpan="6" className="cs-muted">No hay clientes todavía.</td></tr>
                    ) : (
                      adminCustomers.map((c) => (
                        <tr
                          key={c.id}
                          style={{ cursor: 'pointer', background: adminSelectedCustomer?.id === c.id ? 'rgba(59,130,246,0.18)' : 'transparent' }}
                          onClick={() => loadAdminCustomerDetail(c.id)}
                        >
                          <td><strong>{c.username}</strong></td>
                          <td>{c.company || '—'}</td>
                          <td>{c.email || '—'}</td>
                          <td>{c.country || '—'}</td>
                          <td>${Number(c.balance_usd || 0).toFixed(2)}</td>
                          <td>
                            <span className={`cs-tag ${String(c.status || 'active') === 'active' ? 'cs-tag-new' : 'cs-tag-danger'}`}>
                              {c.status || 'active'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <div className="cs-section-head">
                <h3>Detalle del cliente</h3>
              </div>
              {!adminSelectedCustomer ? (
                <p className="cs-muted">Selecciona un cliente en la lista para ver sus detalles y gestionar su saldo.</p>
              ) : (
                <>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 12, color: 'rgba(148,163,184,0.9)' }}>Usuario</div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{adminSelectedCustomer.username}</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10, marginBottom: 16, fontSize: 13 }}>
                    <div><span className="cs-muted">Empresa</span><br /><strong>{adminSelectedCustomer.company || '—'}</strong></div>
                    <div><span className="cs-muted">Nombre</span><br /><strong>{[adminSelectedCustomer.first_name, adminSelectedCustomer.last_name].filter(Boolean).join(' ') || '—'}</strong></div>
                    <div><span className="cs-muted">Email</span><br /><strong>{adminSelectedCustomer.email || '—'}</strong></div>
                    <div><span className="cs-muted">País</span><br /><strong>{adminSelectedCustomer.country || '—'}</strong></div>
                    <div><span className="cs-muted">Saldo</span><br /><strong>${Number(adminSelectedCustomer.balance_usd || 0).toFixed(2)}</strong></div>
                    <div><span className="cs-muted">Estado</span><br />
                      <span className={`cs-tag ${String(adminSelectedCustomer.status || 'active') === 'active' ? 'cs-tag-new' : 'cs-tag-danger'}`}>
                        {adminSelectedCustomer.status || 'active'}
                      </span>
                    </div>
                  </div>

                  <div className="cs-topup-card" style={{ marginBottom: 16 }}>
                    <div className="cs-topup-head">
                      <h3 style={{ margin: 0 }}>Agregar saldo a este cliente</h3>
                      <p style={{ marginTop: 4, fontSize: 12, color: 'rgba(148,163,184,0.9)' }}>Topup manual (no pasa por OxaPay).</p>
                    </div>
                    <div className="cs-topup-body">
                      <div className="cs-topup-amount">
                        <div className="sym">$</div>
                        <input
                          value={adminTopupAmount}
                          onChange={(e) => setAdminTopupAmount(e.target.value)}
                          placeholder="Monto en USD"
                          inputMode="decimal"
                        />
                      </div>
                      <div className="cs-topup-summary">
                        <div className="row"><span>Nuevo saldo aprox.</span><strong>${(Number(adminSelectedCustomer.balance_usd || 0) + Number(adminTopupAmount || 0)).toFixed(2)}</strong></div>
                      </div>
                      <div style={{ marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <button className="cs-btn cs-btn-primary" type="button" onClick={adminDoTopup}>Aplicar recarga</button>
                      </div>
                    </div>
                  </div>

                  <div className="cs-card" style={{ marginBottom: 16 }}>
                    <h3 style={{ marginTop: 0 }}>Estado del cliente</h3>
                    <p className="cs-muted" style={{ marginBottom: 10 }}>Puedes suspender el acceso de este cliente al panel o reactivarlo.</p>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <button
                        className="cs-btn"
                        type="button"
                        style={{ border: '1px solid rgba(239,68,68,0.7)', color: 'rgb(248,113,113)' }}
                        onClick={() => adminChangeStatus('suspended')}
                      >
                        Suspender cliente
                      </button>
                      <button
                        className="cs-btn"
                        type="button"
                        style={{ border: '1px solid rgba(34,197,94,0.7)', color: 'rgb(74,222,128)' }}
                        onClick={() => adminChangeStatus('active')}
                      >
                        Reactivar cliente
                      </button>
                    </div>
                  </div>

                  <div className="cs-card">
                    <h3 style={{ marginTop: 0 }}>Últimas recargas</h3>
                    {(!adminSelectedCustomer.topups || adminSelectedCustomer.topups.length === 0) ? (
                      <p className="cs-muted">Este cliente aún no tiene recargas registradas.</p>
                    ) : (
                      <table className="cs-table">
                        <thead>
                          <tr>
                            <th>Fecha</th>
                            <th>Monto (USD)</th>
                            <th>Nota</th>
                          </tr>
                        </thead>
                        <tbody>
                          {adminSelectedCustomer.topups.map((t) => (
                            <tr key={t.id}>
                              <td>{t.created_at}</td>
                              <td>${Number(t.amount_usd || 0).toFixed(2)}</td>
                              <td>{t.note || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                  {adminStatusMsg && (
                    <div style={{ marginTop: 12 }} className={adminStatusMsg.toLowerCase().includes('error') ? 'cs-msg-err' : 'cs-msg-ok'}>
                      {adminStatusMsg}
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        )}

        {active === 'account-profile' && (
          <section className="cs-card cs-profile-form" style={{ marginTop: 16 }}>
            <p style={{ color: 'rgba(229,231,235,0.6)', fontSize: 12, marginBottom: 8 }}>My Account / My Profile</p>
            <h3 style={{ marginTop: 0, marginBottom: 20, color: 'rgba(229,231,235,0.9)', fontWeight: 600 }}>User Profile</h3>
            {!profileData ? (
              <p className="cs-muted">Cargando perfil…</p>
            ) : (
              <form onSubmit={(e) => e.preventDefault()} style={{ maxWidth: 720 }}>
                {[
                  { key: 'account_number', label: 'Account Number', required: false },
                  { key: 'company', label: 'Company', required: false },
                  { key: 'first_name', label: 'First Name*', required: true },
                  { key: 'last_name', label: 'Last Name', required: false },
                  { key: 'telephone1', label: 'Telephone 1', required: false },
                  { key: 'telephone2', label: 'Telephone 2', required: false },
                  { key: 'email', label: 'Email*', required: true },
                  { key: 'address1', label: 'Address 1', required: false },
                  { key: 'address2', label: 'Address 2', required: false },
                  { key: 'city', label: 'City', required: false },
                  { key: 'province_state', label: 'Province/State', required: false },
                  { key: 'zip_postal_code', label: 'Zip/Postal Code', required: false },
                  { key: 'country', label: 'Country', required: false, type: 'select', options: ['', 'INDIA', 'United States', 'Mexico', 'Spain', 'Colombia', 'Argentina', 'Chile', 'Peru', 'Ecuador'] },
                  { key: 'timezone', label: 'Timezone', required: false, type: 'select', options: ['', 'Europe/Madrid', 'Europe/Sarajevo', 'America/New_York', 'America/Mexico_City', 'America/Bogota', 'America/Argentina/Buenos_Aires', 'Europe/London', 'UTC'] },
                  { key: 'fax_number', label: 'Fax Number', required: false },
                ].map(({ key, label, required, type, options }) => (
                  <div key={key} className="cs-profile-row">
                    <label style={{ flex: '0 0 180px', color: 'rgba(229,231,235,0.85)', fontSize: 13 }}>{label}</label>
                    {type === 'select' ? (
                      <select
                        className="cs-field"
                        value={profileForm[key] || ''}
                        onChange={(e) => setProfileForm((f) => ({ ...f, [key]: e.target.value }))}
                        style={{ flex: 1, maxWidth: 320 }}
                      >
                        {options.map((opt) => (
                          <option key={opt} value={opt}>{opt || '—'}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={key === 'email' ? 'email' : 'text'}
                        className="cs-field"
                        value={profileForm[key] || ''}
                        onChange={(e) => setProfileForm((f) => ({ ...f, [key]: e.target.value }))}
                        required={required}
                        style={{ flex: 1, maxWidth: 320 }}
                      />
                    )}
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-start' }}>
                  <button
                    type="button"
                    className="cs-btn cs-btn-primary"
                    disabled={profileSaving}
                    onClick={async () => {
                      setProfileSaving(true);
                      setAccountMsg('');
                      try {
                        const res = await fetch(`${API}/users/me`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                          body: JSON.stringify(profileForm),
                        });
                        const data = await res.json().catch(() => ({}));
                        if (!res.ok) { setAccountMsg(data.error || 'Error'); setProfileSaving(false); return; }
                        setProfileData(data.user);
                        setAccountMsg('Perfil guardado correctamente.');
                      } catch {
                        setAccountMsg('Error de conexión.');
                      }
                      setProfileSaving(false);
                    }}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className="cs-btn"
                    onClick={() => { loadProfile(); setAccountMsg(''); }}
                  >
                    Cancel
                  </button>
                </div>
                {accountMsg && <p className={accountMsg.includes('guardado') ? 'cs-msg-ok' : 'cs-msg-err'} style={{ marginTop: 12 }}>{accountMsg}</p>}
              </form>
            )}
          </section>
        )}

        {active === 'account-sipdevices' && (
          <section className="cs-card" style={{ marginTop: 16 }}>
            <div className="cs-section-head">
              <h3 style={{ margin: 0 }}>My Account / SIP Devices</h3>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginTop: 14, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <button
                  type="button"
                  className="cs-btn cs-btn-primary"
                  onClick={() => {
                    setAccountMsg('');
                    const owner = user?.username || '';
                    setSipEditing(null);
                    setSipEdit((p) => ({
                      ...p,
                      sip_username: owner,
                      caller_name: owner,
                      caller_number: '',
                      sip_password: '',
                      status: true,
                      voicemail: true,
                      sip_server: '',
                      code: '',
                      mail_to: '',
                      attach_file: true,
                      local_after_email: true,
                      send_all_message: true,
                    }));
                    setSipModalOpen(true);
                  }}
                >
                  + Create
                </button>
                <button
                  type="button"
                  className="cs-btn"
                  style={{ borderColor: 'rgba(244,63,94,0.35)', color: '#fda4af' }}
                  onClick={async () => {
                    const ids = Object.keys(sipSelected).filter((k) => sipSelected[k]);
                    if (ids.length === 0) { setAccountMsg('Selecciona al menos 1 registro.'); return; }
                    if (!confirm(`¿Eliminar ${ids.length} dispositivo(s)?`)) return;
                    for (const id of ids) {
                      await fetch(`${API}/sip-devices/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
                    }
                    setSipSelected({});
                    loadSipDevices();
                  }}
                >
                  Delete
                </button>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <button className="cs-link-btn" type="button" onClick={loadSipDevices}>Refrescar</button>
                <div style={{ position: 'relative' }}>
                  <input className="cs-field" placeholder="Search" value={sipQ} onChange={(e) => setSipQ(e.target.value)} style={{ width: 220 }} />
                </div>
              </div>
            </div>

            {accountMsg && <p className={accountMsg.includes('correctamente') || accountMsg.includes('Guardado') ? 'cs-msg-ok' : 'cs-msg-err'} style={{ marginTop: 10, marginBottom: 12 }}>{accountMsg}</p>}

            <div style={{ overflowX: 'auto', marginTop: 8 }}>
            <table className="cs-table">
              <thead>
                <tr>
                  <th style={{ width: 38 }}><input type="checkbox" onChange={(e) => {
                    const checked = e.target.checked;
                    const next = {};
                    (sipDevices || []).forEach((d) => { next[String(d.id)] = checked; });
                    setSipSelected(next);
                  }} /></th>
                  <th>User name</th>
                  <th>Password</th>
                  <th>Caller Name</th>
                  <th>Caller Number</th>
                  <th>Created Date</th>
                  <th>Modified Date</th>
                  <th>Voicemail</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(sipDevices || [])
                  .filter((d) => {
                    const q = (sipQ || '').trim().toLowerCase();
                    if (!q) return true;
                    return String(d.sip_username || '').toLowerCase().includes(q) ||
                      String(d.caller_name || '').toLowerCase().includes(q) ||
                      String(d.caller_number || '').toLowerCase().includes(q);
                  })
                  .map((d) => {
                    const created = d.created_at ? new Date(d.created_at).toLocaleString() : '—';
                    const modified = d.modified_at ? new Date(d.modified_at).toLocaleString() : '—';
                    const vm = (d.voicemail === 0 || d.voicemail === '0') ? false : true;
                    const st = (d.status === 0 || d.status === '0') ? false : true;
                    return (
                      <tr key={d.id}>
                        <td><input type="checkbox" checked={!!sipSelected[String(d.id)]} onChange={(e) => setSipSelected((s) => ({ ...s, [String(d.id)]: e.target.checked }))} /></td>
                        <td>
                          <button
                            type="button"
                            className="cs-link-btn"
                            style={{ padding: 0, fontWeight: 700 }}
                            onClick={() => {
                              setAccountMsg('');
                              setSipEditing(d);
                              setSipEdit((p) => ({
                                ...p,
                                sip_username: d.sip_username || '',
                                sip_password: d.sip_password || '',
                                caller_name: d.caller_name || d.sip_username || '',
                                caller_number: d.caller_number || '',
                                voicemail: vm,
                                status: st,
                                sip_server: d.sip_server || '',
                              }));
                              setSipModalOpen(true);
                            }}
                          >
                            {d.sip_username || '—'}
                          </button>
                        </td>
                        <td>{d.sip_password ? String(d.sip_password) : '—'}</td>
                        <td>{d.caller_name || '—'}</td>
                        <td>{d.caller_number || '—'}</td>
                        <td>{created}</td>
                        <td>{modified}</td>
                        <td style={{ textAlign: 'center' }}>{vm ? '✓' : '—'}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ display: 'inline-flex', width: 42, height: 22, borderRadius: 999, border: '1px solid rgba(255,255,255,0.14)', background: st ? 'rgba(167,139,250,0.35)' : 'rgba(255,255,255,0.06)', padding: 2, alignItems: 'center' }}>
                            <span style={{ width: 18, height: 18, borderRadius: 999, background: st ? '#a78bfa' : 'rgba(255,255,255,0.35)', transform: `translateX(${st ? 18 : 0}px)`, transition: 'transform 160ms ease' }} />
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                {(sipDevices || []).length === 0 && <tr><td colSpan="9" className="cs-muted">Aún no hay dispositivos SIP.</td></tr>}
              </tbody>
            </table>
            </div>

            {sipModalOpen && (
              <>
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 50 }} onClick={() => setSipModalOpen(false)} />
                <div style={{ position: 'fixed', top: '10%', left: '50%', transform: 'translateX(-50%)', width: 'min(820px, 92vw)', background: '#0b1220', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 14, zIndex: 51, boxShadow: '0 30px 90px rgba(0,0,0,0.7)' }}>
                  <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 700 }}>Edit SIP device</div>
                    <button type="button" className="cs-link-btn" onClick={() => setSipModalOpen(false)}>✕</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, padding: 16 }}>
                    <div style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: 14 }}>
                      <div style={{ fontWeight: 700, marginBottom: 12 }}>Device Information</div>
                      <div style={{ display: 'grid', gap: 10 }}>
                        <div><div style={{ fontSize: 12, color: 'rgba(229,231,235,0.65)' }}>Username *</div><input className="cs-field" value={sipEdit.sip_username} onChange={(e) => setSipEdit((p) => ({ ...p, sip_username: e.target.value }))} /></div>
                        <div><div style={{ fontSize: 12, color: 'rgba(229,231,235,0.65)' }}>Password *</div><input className="cs-field" value={sipEdit.sip_password} onChange={(e) => setSipEdit((p) => ({ ...p, sip_password: e.target.value }))} /></div>
                        <div><div style={{ fontSize: 12, color: 'rgba(229,231,235,0.65)' }}>Caller Name</div><input className="cs-field" value={sipEdit.caller_name} onChange={(e) => setSipEdit((p) => ({ ...p, caller_name: e.target.value }))} /></div>
                        <div><div style={{ fontSize: 12, color: 'rgba(229,231,235,0.65)' }}>Caller Number</div><input className="cs-field" value={sipEdit.caller_number} onChange={(e) => setSipEdit((p) => ({ ...p, caller_number: e.target.value }))} /></div>
                        <div>
                          <div style={{ fontSize: 12, color: 'rgba(229,231,235,0.65)' }}>Status</div>
                          <select className="cs-field" value={sipEdit.status ? 'Active' : 'Inactive'} onChange={(e) => setSipEdit((p) => ({ ...p, status: e.target.value === 'Active' }))}>
                            <option>Active</option>
                            <option>Inactive</option>
                          </select>
                        </div>
                        <div><div style={{ fontSize: 12, color: 'rgba(229,231,235,0.65)' }}>Code</div><input className="cs-field" value={sipEdit.code} onChange={(e) => setSipEdit((p) => ({ ...p, code: e.target.value }))} /></div>
                      </div>
                    </div>
                    <div style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: 14 }}>
                      <div style={{ fontWeight: 700, marginBottom: 12 }}>Voicemail Options</div>
                      <div style={{ display: 'grid', gap: 10 }}>
                        <div>
                          <div style={{ fontSize: 12, color: 'rgba(229,231,235,0.65)' }}>Enable</div>
                          <select className="cs-field" value={sipEdit.voicemail ? 'True' : 'False'} onChange={(e) => setSipEdit((p) => ({ ...p, voicemail: e.target.value === 'True' }))}>
                            <option>True</option>
                            <option>False</option>
                          </select>
                        </div>
                        <div><div style={{ fontSize: 12, color: 'rgba(229,231,235,0.65)' }}>Password</div><input className="cs-field" value={sipEdit.voicemail ? (sipEdit.sip_password || '') : ''} readOnly /></div>
                        <div><div style={{ fontSize: 12, color: 'rgba(229,231,235,0.65)' }}>Mail To</div><input className="cs-field" value={sipEdit.mail_to} onChange={(e) => setSipEdit((p) => ({ ...p, mail_to: e.target.value }))} /></div>
                        <div>
                          <div style={{ fontSize: 12, color: 'rgba(229,231,235,0.65)' }}>Attach File</div>
                          <select className="cs-field" value={sipEdit.attach_file ? 'True' : 'False'} onChange={(e) => setSipEdit((p) => ({ ...p, attach_file: e.target.value === 'True' }))}>
                            <option>True</option>
                            <option>False</option>
                          </select>
                        </div>
                        <div>
                          <div style={{ fontSize: 12, color: 'rgba(229,231,235,0.65)' }}>Local After Email</div>
                          <select className="cs-field" value={sipEdit.local_after_email ? 'True' : 'False'} onChange={(e) => setSipEdit((p) => ({ ...p, local_after_email: e.target.value === 'True' }))}>
                            <option>True</option>
                            <option>False</option>
                          </select>
                        </div>
                        <div>
                          <div style={{ fontSize: 12, color: 'rgba(229,231,235,0.65)' }}>Send All Message</div>
                          <select className="cs-field" value={sipEdit.send_all_message ? 'True' : 'False'} onChange={(e) => setSipEdit((p) => ({ ...p, send_all_message: e.target.value === 'True' }))}>
                            <option>True</option>
                            <option>False</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: 16, display: 'flex', justifyContent: 'center', gap: 14, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <button
                      type="button"
                      className="cs-btn cs-btn-primary"
                      onClick={async () => {
                        setAccountMsg('');
                        try {
                          const payload = {
                            sip_username: sipEdit.sip_username,
                            sip_password: sipEdit.sip_password,
                            caller_name: sipEdit.caller_name,
                            caller_number: sipEdit.caller_number,
                            voicemail: !!sipEdit.voicemail,
                            status: !!sipEdit.status,
                            sip_server: sipEdit.sip_server,
                          };
                          const url = sipEditing ? `${API}/sip-devices/${sipEditing.id}` : `${API}/sip-devices`;
                          const method = sipEditing ? 'PUT' : 'POST';
                          const res = await fetch(url, {
                            method,
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                            body: JSON.stringify(payload),
                          });
                          const data = await res.json().catch(() => ({}));
                          if (!res.ok) { setAccountMsg(data.error || 'Error'); return; }
                          setSipModalOpen(false);
                          loadSipDevices();
                          setAccountMsg('Guardado correctamente.');
                        } catch {
                          setAccountMsg('Error de conexión.');
                        }
                      }}
                    >
                      Save
                    </button>
                    <button type="button" className="cs-link-btn" onClick={() => setSipModalOpen(false)}>Close</button>
                  </div>
                </div>
              </>
            )}
          </section>
        )}

        {active === 'account-changepassword' && (
          <section className="cs-card" style={{ marginTop: 16 }}>
            <h3 style={{ marginTop: 0 }}>Change Password</h3>
            <p style={{ color: 'rgba(229,231,235,0.6)', marginBottom: 16 }}>Introduce tu contraseña actual y la nueva (mínimo 6 caracteres).</p>
            <div style={{ display: 'grid', gap: 12, maxWidth: 360 }}>
              <input className="cs-field" type="password" placeholder="Contraseña actual" value={changePw.current} onChange={(e) => setChangePw((p) => ({ ...p, current: e.target.value }))} />
              <input className="cs-field" type="password" placeholder="Nueva contraseña" value={changePw.new} onChange={(e) => setChangePw((p) => ({ ...p, new: e.target.value }))} />
              <input className="cs-field" type="password" placeholder="Repetir nueva contraseña" value={changePw.confirm} onChange={(e) => setChangePw((p) => ({ ...p, confirm: e.target.value }))} />
              <button
                className="cs-btn cs-btn-primary"
                type="button"
                onClick={async () => {
                  setAccountMsg('');
                  if (changePw.new !== changePw.confirm) { setAccountMsg('La nueva contraseña y la repetición no coinciden.'); return; }
                  if (changePw.new.length < 6) { setAccountMsg('La nueva contraseña debe tener al menos 6 caracteres.'); return; }
                  try {
                    const res = await fetch(`${API}/users/change-password`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                      body: JSON.stringify({ current_password: changePw.current, new_password: changePw.new }),
                    });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) { setAccountMsg(data.error || 'Error'); return; }
                    setChangePw({ current: '', new: '', confirm: '' });
                    setAccountMsg('Contraseña actualizada correctamente.');
                  } catch {
                    setAccountMsg('Error de conexión.');
                  }
                }}
              >
                Cambiar contraseña
              </button>
            </div>
            {accountMsg && <p className={accountMsg.includes('actualizada') ? 'cs-msg-ok' : 'cs-msg-err'} style={{ marginTop: 12 }}>{accountMsg}</p>}
          </section>
        )}
      </main>
      </div>
    </div>
  );
}
