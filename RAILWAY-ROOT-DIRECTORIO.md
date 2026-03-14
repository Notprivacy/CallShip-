# Por qué el deployment es "successful" pero no se ven los cambios (toggle rojo, etc.)

Si el deploy en Railway sale **Success** pero en www.callship.us sigues viendo el toggle **morado** (y ningún cambio del frontend), casi siempre es por esto:

---

## Causa: Railway está usando **Root Directory = "server"**

Cuando el **Root Directory** del servicio está puesto en **`server`** (o cualquier subcarpeta):

- Railway **solo** ve la carpeta `server/`.
- El **build** que se ejecuta es el de `server/package.json` → ahí el script `build` es solo `echo No build step` → **no se construye el frontend**.
- El **start** arranca el servidor Node, que sirve la carpeta `server/public/`.
- Esa carpeta `server/public/` **no se regenera** en el build (porque el build del dialer no se ejecuta), así que se usa la que quedó de un deploy anterior o la que esté en el repo.

**Resultado:** el backend se actualiza, pero el frontend (dialer) que ves en el navegador es **siempre la versión vieja**.

---

## Qué hacer en Railway

1. Entra en [railway.app](https://railway.app) → tu proyecto → **servicio** de la app (el que hace deploy del código, no el de la base de datos).
2. Ve a **Settings** (o **Configuración**).
3. Busca **"Root Directory"** / **"Directorio raíz"**.
4. **Déjalo vacío** (o pon `.`).
   - Tiene que ser la **raíz del repo**, donde están:
     - `package.json` (el de la raíz, con el script `"build": "cd dialer && ..."`),
     - `railway.toml`,
     - las carpetas `dialer/` y `server/`.
5. Guarda y lanza un **nuevo deploy** (Redeploy o push de un commit).

Con Root Directory en blanco, Railway:

- Ejecutará `npm install && npm run build` (desde la raíz).
- Ese `npm run build` construye el **dialer** y copia el resultado a **server/public**.
- Luego `npm start` arranca el servidor, que sirve el frontend **recién generado**.

Ahí sí deberías ver el toggle rojo y el resto de cambios.

---

## Cómo comprobar que el build del frontend se está ejecutando

Después de un deploy con Root Directory vacío:

1. Abre en el navegador:  
   **https://www.callship.us/api/build-info**
2. Deberías ver algo como:  
   `{"ok":true,"build":"CallShip frontend build\n2025-03-13T...","hasPublic":true}`  
   con una **fecha/hora reciente** (del momento del deploy).
3. Si en cambio ves `hasPublic: false` o un `build` con una fecha muy antigua, el build del frontend **no se está ejecutando** → revisa de nuevo que Root Directory esté vacío y que el deploy use ese servicio.

---

## Resumen

| Root Directory en Railway | Qué pasa |
|--------------------------|----------|
| **Vacío** (o `.`)        | Se ejecuta el build de la raíz → se construye el dialer → se actualiza el frontend. |
| **`server`** (o otra carpeta) | Solo se construye/arranca el server → el frontend no se regenera → sigues viendo la versión antigua. |

Pon **Root Directory vacío**, redeploy, y en la siguiente carga (o con Ctrl+Shift+R) deberían reflejarse todos los cambios, incluido el toggle rojo.
