# Cómo conectar tu dominio con SSL a CallShip

Ya tienes el dominio (ej. **callship.com**) con SSL. Sigue estos pasos para que la app funcione en tu dominio.

---

## 1. Build de producción (en tu PC)

En la raíz del proyecto:

```bash
npm run build
```

Eso genera el frontend del dialer y lo deja en `server/public`. Todo queda listo en la carpeta **server**.

---

## 2. Subir el proyecto a un servidor

Necesitas un **VPS** o un **PaaS** donde corra Node.js (no hosting compartido tipo “web + WordPress”).

**Opciones:**

- **VPS:** DigitalOcean, Linode, Vultr, Contabo, etc. (desde ~5 USD/mes).
- **PaaS:** Railway, Render, Fly.io (tienen planes gratuitos o baratos).

En el servidor tendrás que:

1. Instalar **Node.js** (v18 o superior).
2. Subir la carpeta **server** (y dentro, la base de datos si usas archivo, o configurar PostgreSQL).
3. Configurar variables de entorno (`.env`: `PORT`, base de datos, JWT, etc.).
4. Arrancar con `npm start` (o con **pm2** para que no se caiga: `pm2 start src/index.js --name callship`).

Si usas **Railway** o **Render**, sueles conectar el repo de Git y ellos construyen y ejecutan el servidor; en ese caso puedes tener un script de build que genere `server/public` y ellos ejecuten `node server/src/index.js` (o lo que indique su documentación).

---

## 3. Apuntar el dominio (DNS)

En el panel de donde compraste el dominio (Namecheap, Cloudflare, GoDaddy, etc.) entra a **DNS** o **Gestión de nombres** y:

- Si tu app está en un **VPS** (tienes una IP fija):  
  Crea un registro **A** con:
  - **Nombre/host:** `@` (o en blanco) para el dominio principal (ej. callship.com).
  - **Valor/destino:** la **IP** de tu servidor.
- Si usas **Railway / Render / Fly.io**:  
  Ellos te dan una URL (ej. `tu-app.railway.app`). Crea un registro **CNAME**:
  - **Nombre:** `@` o `www` (según si quieres callship.com o www.callship.com).
  - **Valor:** la URL que te den (ej. `tu-app.railway.app`).

Guarda los cambios; la propagación puede tardar unos minutos o hasta 24–48 h.

---

## 4. SSL (HTTPS)

Dices que ya compraste el dominio **con SSL**. Depende de cómo lo hayas contratado:

- **SSL incluido en el registrador (proxy/capa extra):**  
  A veces el propio registrador (ej. Cloudflare) hace de proxy y pone el candado. En ese caso sueles **apuntar los nombres (A o CNAME) a la IP o URL que te indique el registrador**, no directamente a tu servidor. Sigue las instrucciones de “activar proxy” o “SSL” en el panel del dominio.

- **SSL solo en el servidor:**  
  Si el SSL lo gestionas tú en el servidor, ahí debes instalar un certificado (por ejemplo **Let’s Encrypt** con Certbot o con Caddy/Nginx). En ese caso el DNS debe apuntar a la **IP de tu servidor** (registro A).

Si me dices con quién registraste el dominio (Namecheap, Cloudflare, etc.) y si el SSL es “incluido en el dominio” o “en el servidor”, te puedo decir el paso exacto (A vs CNAME y dónde poner la IP o la URL).

---

## 5. Resumen rápido

| Paso | Qué hacer |
|------|-----------|
| 1 | En tu PC: `npm run build` (desde la raíz del proyecto). |
| 2 | Subir **server** (o repo con build ya generado) a un VPS o PaaS con Node.js. |
| 3 | En el DNS del dominio: **A** a la IP del servidor o **CNAME** a la URL del PaaS. |
| 4 | Ajustar SSL según si lo da el registrador o el servidor (ver arriba). |

Cuando el DNS y el SSL estén bien, al entrar a **https://tudominio.com** (ej. https://callship.com) cargará el dialer y la API en la misma dirección; no hace falta cambiar nada en el código porque la app ya usa rutas relativas `/api`.
