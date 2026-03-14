# Build corre pero no se ven cambios: verificar repo y caché

Si **/api/build-info** muestra `ok: true`, `hasPublic: true` y una fecha reciente (ej. 2026-03-13 19:38) pero en la web **siguen** viendo el toggle morado y ningún cambio, entonces el build **sí se ejecuta** pero está construyendo **código viejo**.

---

## 1. Comprobar si la UI nueva está desplegada

En **My Account / SIP Devices**, al lado del título debería aparecer un badge rojo **"UI v2"**.

- **Si ves "UI v2"** → La versión nueva está desplegada. Si el toggle sigue morado, puede ser caché del navegador: prueba **Ctrl+Shift+R** o **ventana de incógnito**.
- **Si NO ves "UI v2"** → El frontend que sirve Railway es una versión antigua. Sigue los pasos siguientes.

---

## 2. Confirmar que los cambios están en el repo que usa Railway

Railway construye desde el **repo y rama** que tengas configurados (por ejemplo GitHub).

En **PowerShell** (en la carpeta del proyecto):

```powershell
cd "c:\Users\Shipe\OneDrive\Escritorio\CallShip"
git status
git log -1 --oneline
```

- Si `git status` muestra archivos modificados sin commit (p. ej. `Dialer.jsx`, `index.css`), **esos cambios no están en el repo** y Railway no los puede desplegar. Haz commit y push:

```powershell
git add -A
git commit -m "UI v2: toggle SIP rojo, badge, cache no-store"
git push
```

- Revisa en **GitHub** (o donde esté el repo) que en la rama que usa Railway existan:
  - En `dialer/src/Dialer.jsx`: el texto `cs-sip-status-toggle` o `UI v2`.
  - En `dialer/src/index.css`: `.cs-sip-status-toggle` o `.cs-ui-badge`.

Si no están, el push no se hizo desde esta carpeta o se hizo a otra rama/repo.

---

## 3. Borrar caché de build en Railway

A veces Railway reutiliza una capa cacheada del build y no reconstruye el frontend.

1. Railway → tu proyecto → servicio de la app.
2. **Settings** → busca **"Build"** o **"Build Cache"**.
3. Si hay opción **"Clear build cache"** o **"Rebuild from scratch"**, úsala.
4. Lanza un **nuevo deploy** (Redeploy o push).

---

## 4. Comprobar rama en Railway

En **Settings** del servicio, revisa **"Branch"** (o "Source Branch"). Debe ser la misma rama donde haces `git push` (normalmente `main` o `master`). Si Railway está en otra rama, no verá tus últimos commits.

---

## Resumen

| Lo que ves | Qué hacer |
|------------|-----------|
| **No ves el badge "UI v2"** | Los cambios no están en el código que Railway está construyendo. Commit + push desde la carpeta correcta, revisar rama y, si hace falta, limpiar build cache y volver a desplegar. |
| **Ves "UI v2" pero el toggle sigue morado** | La nueva versión ya está; es caché del navegador. Prueba Ctrl+Shift+R o otra ventana/incógnito. |

Después de un push correcto y un deploy con caché limpia, en el siguiente build deberías ver **"UI v2"** y el **toggle rojo**.
