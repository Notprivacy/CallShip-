# Resumen: desplegar CallShip en callship.us

**Última actualización:** para retomar cuando vuelvas.

---

## Lo que ya hicimos

1. **Dominio:** Compraste **callship.us** en **Namecheap** (con SSL).
2. **Dónde alojar:** Elegimos **Railway** (railway.com) para subir la app.
3. **GitHub:**
   - Creaste el repositorio **CallShip** (no DIALER) en GitHub.
   - Instalaste **Git** en tu PC y configuraste nombre y email.
   - Conectaste Cursor con GitHub (Sign in with browser).
   - Corregimos el remoto: `git remote set-url origin https://github.com/Notprivacy/CallShip.git`
   - Subiste el código con `git push -u origin main` (el código de CallShip ya está en GitHub).
4. **Railway:**
   - Entraste a Railway → Create New Project.
   - Elegiste **Deploy a GitHub Repository**.
   - Te salió instalar **Railway on GitHub** → lo hiciste (autorizaste Railway para ver tus repos).

---

## Por dónde te quedaste (próximos pasos)

1. **En Railway:** Después de instalar Railway on GitHub, vuelve a Railway. Deberías ver la **lista de tus repos**.  
   → **Elige el repo "CallShip"** (un clic en él para desplegarlo).

2. **Configuración del proyecto en Railway (si te lo pide):**
   - **Root Directory:** déjalo en blanco (raíz del repo).
   - **Build Command:** `npm run build` (desde la raíz; el script ya construye el dialer y lo copia a `server/public`).
   - **Start Command:** `cd server && npm start` (o **Start Command:** `node server/src/index.js` si prefieres).
   - **Variables de entorno:** Si el servidor usa `.env` (base de datos, JWT, etc.), añádelas en Railway → proyecto → Variables (por ejemplo `PORT`, `DATABASE_URL`, `JWT_SECRET`, etc.).

3. **Cuando Railway termine de desplegar:** Te dará una **URL pública**, tipo `callship-production.up.railway.app` o similar. **Cópiala.**

4. **Conectar el dominio callship.us (Namecheap):**
   - Entra a Namecheap → tu dominio **callship.us** → **Advanced DNS**.
   - Añade un registro **CNAME**:
     - **Host:** `www` (para www.callship.us) o el que Railway te indique.
     - **Value / Target:** la **URL de Railway** (ej. `callship-production.up.railway.app`), **sin** `https://`.
   - Guarda. En unos minutos u horas callship.us (o www.callship.us) abrirá tu CallShip.

5. **(Opcional)** En Railway, en la configuración del servicio, puedes añadir un **Custom Domain**: `callship.us` o `www.callship.us`. Railway te dirá si necesitas algún registro DNS adicional.

---

## Datos importantes (para no olvidar)

| Qué | Dónde / Valor |
|-----|----------------|
| Dominio | **callship.us** |
| Registrador | **Namecheap** (Advanced DNS para los registros) |
| Repo de código | **GitHub:** Notprivacy/CallShip (repo **CallShip**) |
| Hosting | **Railway** (railway.com) |
| Proyecto local | `C:\Users\Shipe\OneDrive\Escritorio\CallShip` |
| Build para producción | En la raíz: `npm run build` (genera `server/public` y sirve desde el servidor Node) |

---

## Si algo falla

- **Railway no lista el repo CallShip:** Comprueba en GitHub que Railway tenga acceso al repo (Settings → Applications → Railway).
- **Build falla en Railway:** Revisa que en la raíz exista `package.json` con el script `"build": "cd dialer && npm run build && node ../scripts/copy-dialer-build.js"` y que `server/package.json` tenga `"start": "node src/index.js"`.
- **callship.us no abre:** Espera propagación DNS (hasta 24–48 h) y que el CNAME apunte exactamente a la URL que te dio Railway (sin https://).

Cuando vuelvas, abre este archivo (**PROGRESO-DESPLIEGUE.md**) y sigue desde “Por dónde te quedaste”. ¡Buen descanso!
