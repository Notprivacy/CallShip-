# Desplegar CallShip en Railway (con todo lo nuevo)

Incluye: recuperar contraseña por correo, paginación, seguridad (CSP, safeError, webhook OxaPay), etc.

---

## 1. Variables en Railway

En **Railway** → tu proyecto → **Variables**, añade o revisa estas variables.

### Obligatorias (producción)

| Variable | Valor (ejemplo) |
|----------|------------------|
| `NODE_ENV` | `production` |
| `JWT_SECRET` | Una cadena larga y aleatoria (32+ caracteres). **No** uses `cambiar-en-produccion`. |
| `DATABASE_URL` o `DATABASE_PUBLIC_URL` | Lo da el plugin **PostgreSQL** de Railway. |

### CORS y dominio

| Variable | Valor |
|----------|--------|
| `ALLOWED_ORIGIN` | `https://www.callship.us` (tu dominio exacto) |
| `FRONTEND_URL` | `https://www.callship.us` (para el enlace del correo de recuperar contraseña) |

### Correo (recuperar contraseña)

Para que **“¿Olvidaste tu contraseña?”** envíe el correo con el enlace:

| Variable | Valor |
|----------|--------|
| `SMTP_HOST` | Servidor SMTP (ej. `smtp.gmail.com`, `smtp.office365.com`, `smtp.sendgrid.net`) |
| `SMTP_PORT` | `587` (TLS) o `465` (SSL) |
| `SMTP_SECURE` | `false` si usas 587; `true` si usas 465 |
| `SMTP_USER` | Usuario/correo del SMTP |
| `SMTP_PASS` | Contraseña o “contraseña de aplicación” (Gmail/Outlook) |
| `EMAIL_FROM` | Remitente que verá el usuario (opcional; si no, se usa `SMTP_USER`) |

**Ejemplo Gmail:** crear una “Contraseña de aplicación” en la cuenta de Google y usar esa en `SMTP_PASS`.  
**Ejemplo SendGrid:** usar `smtp.sendgrid.net`, usuario `apikey`, contraseña = tu API Key.

### OxaPay

| Variable | Valor |
|----------|--------|
| `OXAPAY_MERCHANT_API_KEY` | Tu Merchant API Key de OxaPay |
| `OXAPAY_RETURN_URL` | `https://www.callship.us` |
| `OXAPAY_CALLBACK_URL` | `https://www.callship.us/api/oxapay/callback` |
| `OXAPAY_SANDBOX` | `false` en producción |
| `OXAPAY_WEBHOOK_SECRET` | (Opcional) Mismo valor que configures en OxaPay para el webhook |

### Admin

| Variable | Valor |
|----------|--------|
| `ADMIN_USERS` | Usuarios admin separados por coma (ej. `medinax6`) |

---

## 2. Código para subir a Railway (build + deploy)

Tu app en Railway tiene **root = `server`** y el front se sirve desde **`server/public`**. Hay que generar el build del dialer y copiarlo a `server/public` antes de subir.

### En tu máquina (PowerShell o CMD)

Abre la terminal en la raíz del proyecto **CallShip** (donde están las carpetas `dialer` y `server`).

```powershell
# 1) Instalar dependencias del dialer (por si faltan)
cd dialer
npm install

# 2) Build del frontend (genera dialer/dist)
npm run build

# 3) Volver a la raíz
cd ..

# 4) Copiar el build al servidor (server/public)
#    Si public no existe, créala primero.
if (-not (Test-Path server\public)) { New-Item -ItemType Directory -Path server\public }
Remove-Item -Recurse -Force server\public\* -ErrorAction SilentlyContinue
Copy-Item -Recurse -Force dialer\dist\* server\public\

# 5) (Opcional) Marcar la versión del build para ver en /api/build-info
Get-Date -Format "yyyy-MM-dd HH:mm" | Set-Content server\public\build.txt

# 6) Instalar dependencias del servidor (incluye nodemailer)
cd server
npm install

# 7) Subir a Git para que Railway despliegue
cd ..
git add .
git status
git commit -m "Deploy: recuperar contraseña por correo, paginación, seguridad, SMTP"
git push
```

Si usas **Git Bash** o **bash** en lugar de PowerShell:

```bash
cd dialer && npm install && npm run build && cd ..
mkdir -p server/public
rm -rf server/public/*
cp -r dialer/dist/* server/public/
date "+%Y-%m-%d %H:%M" > server/public/build.txt
cd server && npm install && cd ..
git add .
git commit -m "Deploy: recuperar contraseña por correo, paginación, seguridad, SMTP"
git push
```

### Qué hace Railway

- Railway detecta el push y despliega.
- Si el **Root Directory** del servicio está en **`server`**, ejecutará `npm start` (o el comando que tengas) desde `server`.
- Las variables que configuraste en Railway se inyectan como entorno.
- El front (build en `server/public`) se sirve desde la misma app (Express).

---

## 3. Comprobar después del deploy

1. **Health:** `https://www.callship.us/api/health` → `{"ok":true,"service":"callship-server"}`.
2. **Build:** `https://www.callship.us/api/build-info` → debe mostrar la fecha del `build.txt`.
3. **Login** y **“¿Olvidaste tu contraseña?”** con un correo que exista en un perfil: debe llegar el correo con el enlace (revisa spam).
4. **Enlace del correo:** abrirlo y restablecer contraseña; luego iniciar sesión con la nueva.

Si el correo no llega, revisa en Railway los logs del servicio (errores de SMTP) y que `SMTP_*` y `FRONTEND_URL` estén bien definidos.
