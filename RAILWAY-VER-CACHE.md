# Si en Railway no ves la advertencia ni el código de respaldo al registrarte

Suele pasar por **caché del navegador** o porque **Railway aún no ha desplegado la última versión**.

## 1. Forzar un nuevo deploy en Railway

- Entra en [railway.app](https://railway.app) → tu proyecto → servicio de la app.
- **Deployments** → en el último deployment, menú (⋯) → **Redeploy** (o **Redeploy from latest commit**).
- Espera a que el build termine (Build → Deploy → Active).

## 2. Forzar que el navegador cargue la versión nueva

- **Windows:** `Ctrl + Shift + R` o `Ctrl + F5` en la página del login.
- O: F12 (DevTools) → pestaña **Application** (o **Almacenamiento**) → **Clear site data** / **Borrar datos del sitio** para tu dominio de Railway.

Así se cargarán el nuevo HTML y JS (código de respaldo, advertencia y mensaje “¡Registro exitoso!”).

## 3. Subir de nuevo el código (si no habías pusheado)

En PowerShell, desde la carpeta del proyecto:

```powershell
cd "c:\Users\Shipe\OneDrive\Escritorio\CallShip"
git add -A
git commit -m "Login: código respaldo, registro exitoso, backend robusto"
git push
```

Luego en Railway espera el nuevo deploy y en el navegador haz **Ctrl+Shift+R** en la página de login.

## Comprobar que es la versión nueva

Después de registrarte deberías ver:

1. **Pantalla de advertencia** con el texto “⚠️ ADVERTENCIA — LEE Y GUARDA ESTE CÓDIGO” y un **código de 25 caracteres** con botón “Copiar código”.
2. Al pulsar “Entendido, ir al login”, la pantalla **“¡Registro exitoso!”** con el botón “Entrar”.

Si sigues viendo solo el mensaje verde “Registro exitoso. Ahora puedes iniciar sesión.”, sigue siendo la versión antigua: repite redeploy + **Ctrl+Shift+R** (o borrar datos del sitio).
