# Código del panel de login: recuperación por código de respaldo y registro exitoso

Este documento recoge el código que implementa en el panel (Login):

1. **Código de respaldo** (tras registrarse): advertencia + código de 25 caracteres + copiar.
2. **Mensaje de registro exitoso**: panel grande y llamativo con “¡Registro exitoso!” y botón Entrar.
3. **Recuperar cuenta** solo por código de respaldo (sin correo): Usuario + código → verificar → nueva contraseña → éxito.

---

## 1. Estado necesario (React useState)

```jsx
const [backupCodeToShow, setBackupCodeToShow] = useState(null);      // Código mostrado una sola vez tras registro
const [showRegistrationSuccess, setShowRegistrationSuccess] = useState(false);
const [backupCodeInput, setBackupCodeInput] = useState('');          // Input del usuario al recuperar
const [backupResetToken, setBackupResetToken] = useState('');        // Token tras verificar código
const [backupStep, setBackupStep] = useState('code');                 // 'code' | 'password'
const [newPassword, setNewPassword] = useState('');
const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
const [isForgot, setIsForgot] = useState(false);                      // true = pantalla recuperar
```

---

## 2. Tras registro: mostrar código de respaldo o pantalla de éxito

En la respuesta de `POST /auth/register`:

```jsx
if (isRegister) {
  if (data.backupCode) {
    setBackupCodeToShow(data.backupCode);
  } else {
    setIsRegister(false);
    setShowRegistrationSuccess(true);
  }
  setSubmitting(false);
  return;
}
```

---

## 3. Handlers del código de respaldo y del éxito

```jsx
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
```

---

## 4. Recuperación por código (submit cuando isForgot)

**Paso 1 – Verificar código** (`backupStep === 'code'`): enviar usuario + código a `POST /auth/verify-backup-code`. Si la respuesta trae `resetToken`, guardar token y poner `backupStep = 'password'`.

**Paso 2 – Cambiar contraseña** (`backupStep === 'password'`): enviar `token` + `password` a `POST /auth/reset-password`. Si OK, limpiar estado, salir de recuperación y mostrar mensaje de éxito.

```jsx
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
  }
  // Paso código
  const userTrim = String(username).trim();
  const codeTrim = String(backupCodeInput).trim().replace(/\s/g, '');
  if (!userTrim || !codeTrim) {
    setError('Indica tu usuario y el código de respaldo de 25 caracteres.');
    return;
  }
  setSubmitting(true);
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
}
```

---

## 5. JSX: Panel del código de respaldo (tras registro)

Solo se muestra cuando `backupCodeToShow` tiene valor (una sola vez).

```jsx
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
```

---

## 6. JSX: Panel de registro exitoso (grande y llamativo)

Se muestra cuando `showRegistrationSuccess` es true (después de “Entendido, ir al login” o si el registro no devolvió código).

```jsx
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
```

---

## 7. JSX: Formulario recuperar (usuario + código)

Solo cuando `isForgot && backupStep === 'code'`:

```jsx
{showRecoveryCodeStep && (
  <div className="cs-login-field" style={{ marginBottom: 12 }}>
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
```

(El campo Usuario se reutiliza del formulario principal cuando `showRecoveryCodeStep` es true.)

---

## 8. JSX: Formulario nueva contraseña (tras código válido)

Cuando `isForgot && backupStep === 'password'`:

```jsx
{showRecoveryPasswordStep && (
  <>
    <div className="cs-login-field" style={{ marginBottom: 10 }}>
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
```

---

## 9. Enlace “¿Olvidaste tu contraseña?” y “Volver al login”

- En pantalla principal (login): botón que pone `setIsForgot(true)` → se muestra recuperación por código (usuario + código).
- En recuperación: botón “Volver al login” que hace `setIsForgot(false)`, `setBackupStep('code')`, limpia `backupResetToken`, `backupCodeInput`, `newPassword`, `newPasswordConfirm`, `error`, `success`.

---

## 10. CSS (index.css o tu hoja del panel)

Pega estos estilos donde definas los del login/panel.

```css
/* Panel código de respaldo tras registro */
.cs-backup-code-panel{
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.cs-backup-warning{
  background: rgba(234,179,8,0.15);
  border: 1px solid rgba(234,179,8,0.5);
  border-radius: 10px;
  padding: 14px 16px;
  color: #fef3c7;
  font-size: 13px;
  line-height: 1.5;
}
.cs-backup-warning-icon{ font-size: 1.2em; }
.cs-backup-warning strong{ color: #fcd34d; }
.cs-backup-warning p{ margin: 8px 0 0; }
.cs-backup-warning p:first-of-type{ margin-top: 6px; }
.cs-backup-warning-danger{
  color: #fca5a5 !important;
  margin-top: 10px !important;
}
.cs-backup-warning-danger strong{ color: #ef4444; }
.cs-backup-code-box{
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: rgba(0,0,0,0.25);
  border-radius: 10px;
  padding: 14px;
  border: 1px solid rgba(255,255,255,0.12);
}
.cs-backup-code-text{
  font-family: ui-monospace, monospace;
  font-size: 15px;
  letter-spacing: 0.08em;
  word-break: break-all;
  color: #e5e7eb;
  user-select: all;
}
.cs-backup-copy{ margin-top: 0; }

/* Panel registro exitoso — grande y llamativo */
.cs-registration-success-panel{
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 20px 0;
  text-align: center;
}
.cs-registration-success-icon{
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  color: #fff;
  font-size: 40px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  box-shadow: 0 8px 24px rgba(34,197,94,0.4);
}
.cs-registration-success-title{
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.02em;
  text-shadow: 0 1px 2px rgba(0,0,0,0.2);
}
.cs-registration-success-text{
  margin: 0;
  font-size: 16px;
  line-height: 1.5;
  color: rgba(229,231,235,0.95);
  max-width: 320px;
}
.cs-registration-success-btn{
  margin-top: 8px;
  min-width: 180px;
  font-size: 16px;
  padding: 12px 24px;
}
```

---

## Resumen de flujos

| Acción | Qué pasa |
|--------|----------|
| Registro OK con `backupCode` | Se muestra panel de advertencia + código de 25 caracteres + “Copiar código” y “Entendido, ir al login”. |
| “Entendido, ir al login” | Se cierra el código y se muestra el panel “¡Registro exitoso!” con botón “Entrar”. |
| “Entrar” (tras éxito) | Se cierra el panel de éxito y se muestra el formulario de login. |
| “¿Olvidaste tu contraseña?” | Se muestra formulario: Usuario + Código de respaldo → “Verificar código”. |
| Código válido | Backend devuelve `resetToken` → se muestran “Nueva contraseña” y “Confirmar” → “Cambiar contraseña”. |
| Contraseña cambiada OK | Mensaje de éxito y vuelta al login para entrar con la nueva contraseña. |

El archivo donde está todo esto implementado es **`dialer/src/Login.jsx`** y los estilos en **`dialer/src/index.css`** (clases `cs-backup-*` y `cs-registration-success-*`).
