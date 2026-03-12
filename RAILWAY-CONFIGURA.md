# Cómo aplicar los cambios en www.callship.us

Si pusiste **Root Directory vacío** en Railway, el build falla ("Failed to build an image").  
Usa **Root Directory = server** y sube el frontend nuevo dentro de `server/public`.

---

## Paso 1: En Railway (para que el deploy vuelva a funcionar)

1. Entra a **Railway** → proyecto **CallShip** → servicio de **www.callship.us**.
2. Ve a **Settings**.
3. En **Root Directory** pon: **`server`** (y guarda).

Así Railway vuelve a desplegar solo la carpeta `server` y el deploy debería pasar a verde.

---

## Paso 2: En tu PC (generar el frontend nuevo y subirlo)

Abre **Git Bash** o la terminal en la **raíz del proyecto** (carpeta CallShip):

```bash
cd /c/Users/Shipe/OneDrive/Escritorio/CallShip
npm run build
```

Eso genera el dialer y lo copia a **server/public**. Luego:

```bash
git add server/public
git status
```

Tienes que ver cambios en **server/public** (p. ej. `index.html`, `assets/index-XXXXX.js`). Si no ves nada, el build no se copió; dime y lo revisamos.

```bash
git add .
git commit -m "Frontend: ocultar Clientes a no-admin, recarga manual sin abonar"
git push
```

---

## Paso 3: Deploy en Railway

Cuando termine el push, Railway hará un **nuevo deploy** (con Root = server). Ese deploy **sí** debe salir en verde porque solo construye el servidor.

Cuando esté **Success**, abre **www.callship.us**, recarga con **Ctrl+F5** y prueba con **nicol2** y **medinax6**.

---

## Resumen

| Qué hacer | Dónde |
|-----------|--------|
| Root Directory = **server** | Railway → Settings |
| `npm run build` | Tu PC (raíz CallShip) |
| `git add server/public` y push | Tu PC |
| Probar con Ctrl+F5 | www.callship.us |
