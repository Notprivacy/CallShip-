# Configurar Railway para que los cambios SÍ se apliquen

Si **www.callship.us** sigue mostrando lo mismo (Clientes visible para clientes, "Recarga aplicada correctamente" sin pagar), es porque Railway está desplegando **solo la carpeta server** con un frontend viejo.

---

## Qué hacer UNA vez en Railway

### 1. Entra a tu proyecto en Railway

**CallShip** → servicio que tiene **www.callship.us** (el de la API).

### 2. Abre **Settings** (Configuración)

### 3. Busca **"Root Directory"** (o "Source Root")

- Si pone **`server`** o **`./server`**, **bórralo** y déjalo **vacío**.
- Así Railway usará la **raíz del repo** (donde están `dialer/`, `server/`, `package.json`, `railway.toml`).

### 4. Comprueba **Build** y **Start**

Con el archivo **`railway.toml`** en la raíz del repo, Railway usará:

- **Build:** `npm install && npm run build`  
  (instala dependencias, construye el dialer y lo copia a `server/public`)
- **Start:** `npm start`  
  (arranca el servidor desde `server/`)

No hace falta que los escribas a mano si ya está el `railway.toml`; solo asegúrate de que **Root Directory** esté vacío.

### 5. Guarda y redeploy

Guarda los cambios en Settings y haz **Redeploy** del último deployment (o espera al siguiente push).

---

## Después de esto

En cada **push** a la rama que conectaste (por ejemplo `main`):

1. Railway usa la **raíz** del repo.
2. Ejecuta **Build** → se genera el frontend nuevo y se copia a `server/public`.
3. Ejecuta **Start** → se inicia el servidor con ese frontend.

Así **no dependes de subir `server/public` a mano** y los cambios del dialer (ocultar Clientes, recarga manual con cripto, etc.) se aplican en **www.callship.us** en cada deploy.

---

## Resumen

| Antes (mal)              | Después (bien)                    |
|--------------------------|------------------------------------|
| Root Directory = `server`| Root Directory = **vacío**        |
| Solo se desplegaba server | Se despliega raíz → build → server |
| Frontend viejo en public  | Frontend nuevo en cada deploy     |

Cuando lo cambies, haz un **push** (aunque sea un cambio pequeño) o **Redeploy** y espera a que termine. Luego abre **www.callship.us** con **Ctrl+F5** y prueba con **nicol2** y con **medinax6**.
