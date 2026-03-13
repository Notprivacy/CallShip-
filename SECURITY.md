# Seguridad de CallShip

Recomendaciones para proteger la web y la base de datos frente a ataques (competencia, bots, etc.).

---

## Implementar ahora en Railway

Para activar toda la protección en producción:

1. Entra en **Railway** → tu proyecto CallShip → **Variables**.
2. Añade o revisa estas variables:

| Variable        | Valor (ejemplo) |
|-----------------|-----------------|
| `NODE_ENV`      | `production`    |
| `JWT_SECRET`    | Una cadena larga y aleatoria (ej. 32+ caracteres). **Nunca** dejar `cambiar-en-produccion`. |
| `ALLOWED_ORIGIN` | `https://www.callship.us` (tu dominio exacto) |

3. Guarda y deja que Railway redespliegue.
4. Comprueba que la web carga bien y que el login funciona (si pusiste `ALLOWED_ORIGIN`, la petición debe venir de esa URL).

Con eso, la seguridad queda activa: rate limit, cabeceras, CORS restringido y aviso si falta JWT_SECRET.

---

## Lo que ya está aplicado en el código

- **Rate limiting**: API 100 req/min por IP en producción; login/registro 6 intentos cada 15 min por IP; admin 40 req/min por IP. Reduce DDoS y brute force.
- **Trust proxy**: el servidor confía en la IP que envía Railway/proxy para que el rate limit use la IP real del cliente.
- **Helmet**: cabeceras de seguridad (XSS, clickjacking, MIME sniffing) y **CSP** (Content-Security-Policy) básica: `default-src 'self'`, scripts y estilos desde el mismo origen, imágenes desde `self`/data/https. Además: `Referrer-Policy`, `Cross-Origin-Resource-Policy`.
- **CORS opcional**: si defines `ALLOWED_ORIGIN` en producción, solo ese origen puede llamar a la API desde el navegador.
- **Body size limit**: máximo 512 KB por petición JSON para evitar payloads enormes.
- **Queries parametrizadas**: todas las consultas usan parámetros (`$1`, `$2`), no concatenación; reduce inyección SQL.
- **Límites de longitud en inputs**: usuario y contraseña (registro/login y cambio de contraseña), perfil (nombre, email, dirección, etc.), llamadas (customer, phone, notes) tienen máximos; evita abusos y desbordes en BD.
- **Contraseñas**: hash con bcrypt; no se guardan en claro.
- **JWT**: tokens con expiración (7 días); en producción el servidor avisa si `JWT_SECRET` no está configurado.
- **Logout ante 401**: si cualquier petición de la app devuelve 401 (token expirado o inválido), el front cierra sesión automáticamente y vuelve al login.

---

## Qué debes configurar tú (Railway y entorno)

### 1. NODE_ENV (recomendado en producción)

En **Railway → Variables** suele estar ya definido. Si no: `NODE_ENV=production`. Así se aplican el rate limit más estricto y la comprobación de JWT_SECRET.

### 2. JWT_SECRET (obligatorio en producción)

En **Railway → Variables** define:

- `JWT_SECRET`: una cadena larga y aleatoria (por ejemplo 32+ caracteres). **No uses** `cambiar-en-produccion`.

Si no lo pones, alguien podría generar tokens falsos y suplantar usuarios.

### 3. CORS: restringir quién puede llamar a tu API

En **Railway → Variables** puedes añadir:

- `ALLOWED_ORIGIN`: `https://www.callship.us` (o la URL exacta de tu front).

Así solo peticiones desde ese origen (tu web) serán aceptadas por CORS. Si no lo defines, cualquier sitio puede llamar a tu API desde el navegador (útil en desarrollo, menos seguro en producción).

### 4. Base de datos

- **PostgreSQL en Railway**: la conexión ya va por SSL si Railway lo ofrece. No expongas la URL de la DB (`DATABASE_URL`) en el front ni en repos públicos.
- **Variables sensibles**: `OXAPAY_MERCHANT_API_KEY`, `JWT_SECRET`, `ADMIN_USERS`, etc. solo en Variables de Railway (o `.env` local), nunca en el código.

### 5. HTTPS

En producción usa siempre **HTTPS** (Railway suele darlo por defecto). Así el token y las contraseñas van cifrados.

### 6. Admin

- `ADMIN_USERS`: en Railway pon solo los usuarios que son admin, separados por coma (ej. `medinax6`). No incluyas cuentas de prueba o de terceros.

### 7. Webhook OxaPay (recomendado en producción)

- El callback `/api/oxapay/callback` recibe notificaciones de pago. Si defines **`OXAPAY_WEBHOOK_SECRET`** en Railway, el servidor exige ese valor en el header **`X-Webhook-Secret`** o en el body como `webhook_secret`; si no coincide, responde 403. Configura en OxaPay el mismo secreto para que nadie pueda falsificar un “pago recibido”.

### 8. Backups de base de datos

- En Railway, activa backups automáticos de PostgreSQL si está disponible en tu plan, para poder recuperar datos ante fallos o borrados accidentales.

---

## Resumen rápido

| Acción | Dónde |
|--------|--------|
| Definir `JWT_SECRET` largo y aleatorio | Railway → Variables |
| Opcional: `ALLOWED_ORIGIN` = tu dominio | Railway → Variables |
| No subir `.env` ni claves al repo | Siempre |
| Revisar `ADMIN_USERS` | Railway → Variables |
| Mantener dependencias actualizadas | `npm audit` en server/ |

Si un competidor intenta:

- **Saturar la web (DDoS)** → el rate limit limita peticiones por IP.
- **Adivinar contraseñas (brute force)** → el límite en login/registro reduce intentos por IP.
- **Inyectar SQL** → las consultas parametrizadas mitigan ese riesgo.
- **Suplantar sesiones** → con `JWT_SECRET` fuerte y en HTTPS es mucho más difícil.

Para dudas concretas (por ejemplo cómo generar un `JWT_SECRET` o qué valor poner en `ALLOWED_ORIGIN`), dime tu dominio y te indico los valores exactos.
