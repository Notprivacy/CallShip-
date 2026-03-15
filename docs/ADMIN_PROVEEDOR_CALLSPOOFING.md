# Para el administrador: poner el dialer a funcionar con callspoofing.org

Este documento es **solo para ti** (dueño de CallShip). Los clientes no ven al proveedor; solo usan el dialer, configuran Caller ID y llaman por MicroSIP.

---

## Cómo es la conexión con el proveedor de minutos (modelo real: tu dominio, como Mastersking)

En Mastersking el cliente pone **mastersking.com** como SIP Server y Domain en MicroSIP, no el servidor del proveedor. Para que CallShip sea igual hace falta **tu propio servidor SIP** en tu dominio; el cliente solo ve tu marca. Abajo el flujo correcto.

Antes de configurar nada: así encaja el proveedor en el flujo y por qué no se ve en la pantalla de SIP device.

### Quién se conecta a quién

- **Proveedor de minutos** (ej. callspoofing.org) = el que tiene el tronco SIP y los minutos. Tiene un **servidor SIP** (host/dominio, ej. `sip.callspoofing.org` o IP) donde los clientes SIP se registran.
- **Tú (reseller)** = tienes una cuenta en ese proveedor. Según el proveedor, tienes:
  - **Una cuenta** (un usuario/contraseña) y opción de **varios registros** o **subcuentas/extensiones** bajo esa cuenta.
  - Cada subcuenta/extensión = un **usuario + contraseña** distintos, todos contra el **mismo servidor SIP** del proveedor.
- **Cliente final** = usa MicroSIP (o otro softphone). En MicroSIP pone **servidor**, **usuario** y **contraseña**. Esas credenciales son las del proveedor (las que tú le das: o la cuenta común o su subcuenta). **No** pone “proveedor de minutos” en ningún lado; solo servidor + usuario + contraseña.

Por tanto la **conexión con el proveedor** es:

1. **MicroSIP del cliente** se registra a **tu servidor SIP** (tu dominio, ej. sip.callship.com) con **usuario y contraseña** de la extensión en tu servidor. El cliente no pone sip.callspoofing.org ; solo pone tu dominio.
2. **Tu servidor SIP** (Asterisk/FreeSWITCH) tiene un **tronco** hacia callspoofing.org; cuando el cliente marca, tu servidor envía la llamada por ese tronco. **CallShip** (la web) no está en medio de la llamada SIP: no recibe ni envía RTP/SIP. Solo guarda en “SIP device” los datos que el usuario debe poner en MicroSIP: servidor, usuario, contraseña, Caller ID, etc.
3. El **servidor SIP** que guardas en cada dispositivo (o como valor por defecto) **debe ser tu dominio** (callship.com), no el del proveedor. Ese valor es la “conexión” con el proveedor: la tiene solo tu servidor SIP, no el cliente.)

### Dónde se “ve” el proveedor

- **En la UI del usuario**: no se ve. Solo ve “Edit SIP device” con Username, Password, Caller Name, Caller Number, Voicemail, Status. El hecho de que detrás haya callspoofing.org (o otro) es transparente.
- **A nivel sistema (tú)**:
  - El **servidor SIP** que el cliente ve debe ser **tu dominio** (ej. sip.callship.com), no sip.callspoofing.org. Puede ser único para todos los dispositivos si solo usas un proveedor. Entonces puede estar en un solo sitio: por ejemplo un valor por defecto al crear un SIP device o una configuración global “SIP server por defecto”.
  - Las **credenciales por usuario** (username, password) son las de las **extensiones en tu servidor SIP**, no las del proveedor. Tú creas una extensión por cliente; esas credenciales son las que guardas en CallShip. El tronco **tu servidor ↔ callspoofing.org** solo lo configuras tú; el cliente no lo ve.

### Resumen del flujo de conexión

| Paso | Quién | Qué pasa |
|------|--------|----------|
| 1 | Tú | Tienes cuenta en callspoofing.org (para el tronco). Montas **tu** servidor SIP en tu dominio (ej. sip.callship.com) y creas **extensiones** (usuario/contraseña) por cliente. |
| 2 | CallShip | Guarda por dispositivo: servidor (del proveedor), usuario, contraseña, Caller Name, Caller Number, etc. El “proveedor” no es un campo; está implícito en el **servidor** que usas. |
| 3 | Cliente | En “SIP Devices” ve/edita solo su dispositivo (username, password, Caller ID, voicemail). No ve “proveedor”. |
| 4 | MicroSIP | Se registra a **tu servidor** (callship.com). La conexión con callspoofing.org la hace **tu servidor**, no el cliente. |
| 5 | Llamada | Ruta: MicroSIP → **tu servidor SIP** → callspoofing.org (tronco) → red. El cliente solo ve tu marca. |

Así, la **conexión con el proveedor de minutos** es: **servidor SIP + usuario + contraseña**. La conexión con el proveedor la tiene solo tu servidor SIP; usuario/contraseña en el dispositivo son los de la extensión en tu servidor, que tú asignas a cada cliente (o compartes). En la pantalla de SIP device eso se traduce en campos “Servidor / Usuario / Contraseña” (y Caller ID, etc.); la conexión con el proveedor la tiene solo tu servidor SIP; el cliente solo ve tu dominio.

---

## Ejemplo paso a paso: tú, callspoofing.org y una cliente llamada María

Así encaja todo en un solo flujo, de principio a fin.

**Personas:**  
- **Tú** = dueño de CallShip, tienes cuenta en callspoofing.org.  
- **María** = una cliente tuya; usa el dialer de CallShip y MicroSIP para llamar.

---

**Paso 1 — Tú: tu servidor SIP + callspoofing.org**  
- Montas **tu propio servidor SIP** (Asterisk/FreeSWITCH, etc.) en **tu dominio** (ej. sip.callship.com). Ahí creas **extensiones** (usuario + contraseña) por cliente. Para María creas extensión: usuario = `maria.ext`, contraseña = `abc123`.  
- En ese mismo servidor configuras un **tronco** hacia callspoofing.org (con las credenciales de tu cuenta en el proveedor). Eso solo lo ves tú; el cliente no lo ve.  
- Tú anotas para María: servidor que ella verá = `callship.com` (o sip.callship.com), usuario = `maria.ext`, contraseña = `abc123`.

---

**Paso 2 — Tú y CallShip**  
- En CallShip creas (o editas) el **SIP device** de María.  
- Pones en ese dispositivo:  
  - **Servidor**: `callship.com` (o sip.callship.com) — **tu dominio**, no el del proveedor.  
  - **Usuario**: `maria.ext`.  
  - **Contraseña**: `abc123`.  
  - **Caller Name** / **Caller Number**: el número que quieres que se vea cuando María llame (ej. `02677528756`).  
- CallShip guarda esos datos. Así María nunca verá "callspoofing.org"; solo verá tu dominio.

---

**Paso 3 — María en CallShip**  
- María entra al dialer con su usuario de CallShip.  
- Va a **My Account → SIP Devices** y ve **su** dispositivo (el que tú configuraste o que ella completa con los datos que tú le diste).  
- Ahí ve (y puede editar) cosas como: Caller Name, Caller Number, voicemail, etc. **No** ve "callspoofing.org" ni "proveedor de minutos"; solo ve los campos del dispositivo.  
- Esos datos son los que debe usar en MicroSIP.

---

**Paso 4 — María en MicroSIP**  
- María abre MicroSIP y configura **una cuenta** con:  
  - **SIP Server**: `callship.com` (el mismo que está en CallShip — **tu dominio**).  
  - **Domain**: `callship.com`.  
  - **Usuario / Login**: `maria.ext`.  
  - **Contraseña**: `abc123`.  
- MicroSIP se **registra** contra **tu servidor** (callship.com). María no ve callspoofing.org en ningún lado; todo es "CallShip".  
- Cuando MicroSIP muestra "Registrado", María está conectada a **tu** servidor; tu servidor es el que tiene el tronco a callspoofing.org.

---

**Paso 5 — María hace una llamada**  
- María marca un número (desde el dialer o desde MicroSIP).  
- MicroSIP envía la llamada a **tu servidor** (callship.com), donde María está registrada.  
- **Tu servidor SIP** recibe la llamada y la envía por el **tronco** a callspoofing.org.  
- callspoofing.org descuenta minutos de tu cuenta y saca la llamada a la red; el otro teléfono suena.  
- Ruta de la voz: María ↔ **tu servidor** ↔ callspoofing.org ↔ red ↔ el otro teléfono. María solo ve "CallShip"; el proveedor queda oculto detrás de tu servidor.

---

**Resumen del ejemplo**

| Paso | Quién   | Qué pasa |
|------|--------|----------|
| 1    | Tú     | Montas tu servidor SIP en tu dominio; creas extensión para María; configuras tronco a callspoofing.org. |
| 2    | Tú     | En CallShip guardas **servidor = tu dominio** (callship.com), usuario y contraseña de María, Caller ID. |
| 3    | María  | En CallShip ve su SIP device. No ve callspoofing.org. |
| 4    | María  | En MicroSIP pone **callship.com** como SIP Server y Domain, usuario y contraseña; se registra a **tu** servidor. |
| 5    | María  | Marca; la llamada va MicroSIP → **tu servidor** → callspoofing.org (tronco) → red. Solo ve tu marca. |

La **conexión con el proveedor** la tiene solo **tu servidor SIP** (tronco a callspoofing.org). María (MicroSIP) solo se conecta a **tu dominio**; nunca ve al proveedor.

---

## Qué necesitas para que el dialer funcione con callspoofing.org

### 1. Cuenta y credenciales en callspoofing.org

- **Cuenta**: tener una cuenta activa en [callspoofing.org](https://callspoofing.org) (login/signup).
- **Credenciales SIP**: del panel del proveedor necesitas:
  - **Servidor SIP** (host, ej. `sip.callspoofing.org` o la IP/host que te den).
  - **Usuario SIP** (username).
  - **Contraseña SIP** (password).
- **Minutos/saldo**: tener minutos o saldo en la cuenta para que las llamadas se completen.
- **Tarifas**: revisar [rates.php](https://callspoofing.org/rates.php) para saber costes por destino.

---

### 2. ¿Por qué subcuentas o extensiones por cliente? (o no)

Con **una sola cuenta** en callspoofing.org tienes **un solo** usuario y contraseña SIP. Depende de cómo funcione el proveedor:

- **Si solo permite 1 registro por cuenta**: si les das a todos los clientes el mismo usuario/contraseña, solo una persona podría tener MicroSIP conectado a la vez; el siguiente “tumbaría” al anterior. Para que muchos usen a la vez necesitas **varias cuentas** (subcuentas o extensiones), una por cliente.
- **Si permite varios registros con la misma cuenta**: entonces **no hace falta** crear subcuentas. Les das a todos las **mismas credenciales** (servidor, usuario, contraseña); todos se conectan con la misma cuenta. Todos comparten el mismo saldo/minutos en callspoofing.org. El Caller ID puede ser el mismo para todos o configurable según lo que permita el proveedor.

**Resumen**: Pregunta a callspoofing.org si con una sola cuenta pueden registrarse **varios dispositivos a la vez**.  
- Si **sí** → puedes dar la misma SIP a todos los clientes; no creas subcuentas.  
- Si **no** (solo 1 registro por cuenta) → necesitas una subcuenta o extensión por cliente (o un PBX en el medio).

---

### 3. Cómo lo usan los clientes en CallShip

- Cada cliente en CallShip:
  - **My Account → SIP Devices**: agrega un dispositivo con **servidor**, **usuario** y **contraseña** (las que tú les des: mismas para todos si la cuenta lo permite, o una por cliente si usas subcuentas).
  - Configura **Caller ID** (caller number/name) en ese dispositivo.
  - Usa **MicroSIP** (o otro softphone) con las **mismas credenciales**.
- Las llamadas salen: softphone → callspoofing.org → red telefónica. El dialer solo registra la llamada en CallShip (cliente, teléfono, notas); no origina la llamada por API.

**Lo que necesitas tú**  
- Tener tu cuenta en callspoofing.org con credenciales SIP y saldo.  
- Si usas **una cuenta para todos**: pasar a cada cliente las mismas credenciales (servidor, usuario, contraseña).  
- Si usas **subcuentas por cliente**: dar de alta cada cliente en el proveedor y pasarle sus propias credenciales.

---

### 4. Resumen mínimo para que “funcione”

| Quién        | Qué necesita |
|-------------|--------------|
| **Tú**      | Cuenta en callspoofing.org, credenciales SIP y minutos/saldo. Dar a cada cliente las credenciales (mismas para todos si el proveedor lo permite, o una subcuenta por cliente si no). |
| **CallShip**| No guarda credenciales del proveedor; cada cliente guarda **su** SIP en “SIP Devices”  |
| **Cliente** | Agregar SIP device en CallShip (servidor, usuario, contraseña), configurar Caller ID y usar MicroSIP con lo mismo. |

---

### 5. Si en el futuro hubiera API de llamadas

Si callspoofing.org ofreciera una **API para originar llamadas** (click-to-call desde el navegador), entonces sí haría falta:

- Guardar en el **servidor** (env o DB) API key / credenciales del proveedor.
- Implementar en el backend un endpoint que reciba “llamar a este número” y lo envíe al proveedor por API.
- El dialer podría tener un botón “Llamar” que llame por esa API en lugar de solo abrir MicroSIP.

Hoy, con solo SIP y MicroSIP, **no hace falta** guardar credenciales del proveedor en CallShip: cada cliente usa su propio SIP (que tú les das del proveedor) en el dialer y en MicroSIP.

---

## Flujo completo: variable de entorno + servidor SIP + tronco (implementación)

Para que los clientes vean solo tu dominio en MicroSIP (como Mastersking), hace falta **tres piezas** que tú configuras. Esta sección las enlaza.

### 1. Variable de entorno en el servidor de CallShip

En el backend de CallShip (Railway, VPS o donde esté la API) define:

- **`CALLSHIP_SIP_SERVER`** = el dominio que verán los clientes como SIP Server y Domain en MicroSIP.

Ejemplo: `CALLSHIP_SIP_SERVER=callship.com` o `CALLSHIP_SIP_SERVER=sip.callship.com`.

- El dialer carga los **settings** y obtiene `sip.defaultServer` (o `sip.host`) con ese valor.
- En **My Account → SIP Devices**, el campo **SIP Server / Domain** se rellena con ese valor (y si está configurado, el campo va solo lectura con la nota de usarlo en MicroSIP).
- Así todos los dispositivos usan **tu dominio** por defecto; el cliente nunca escribe sip.callspoofing.org.

### 2. Tu propio servidor SIP (Asterisk o FreeSWITCH)

- Instalas un **servidor SIP** en **tu dominio** (el mismo que pusiste en `CALLSHIP_SIP_SERVER`), por ejemplo en un VPS con IP fija y DNS apuntando a ese host (ej. `sip.callship.com` → IP del VPS).
- Software típico: **Asterisk** o **FreeSWITCH**.
- En ese servidor creas **extensiones** (usuario + contraseña) por cliente (María, etc.). Esas credenciales son las que guardas en CallShip en cada SIP device (usuario y contraseña); el **servidor** del dispositivo es tu dominio (el de la variable de entorno).

### 3. Tronco al proveedor (callspoofing.org)

- En el **mismo** servidor SIP (Asterisk/FreeSWITCH) configuras un **tronco** hacia callspoofing.org con las credenciales de tu cuenta en el proveedor (servidor SIP del proveedor, usuario, contraseña).
- Ese tronco solo lo ves tú; los clientes no lo ven. Cuando un cliente (MicroSIP) marca, tu servidor recibe la llamada y la envía por ese tronco a callspoofing.org; el proveedor saca la llamada a la red.

### Orden recomendado

| Paso | Dónde | Qué hacer |
|------|--------|-----------|
| 1 | callspoofing.org | Tener cuenta, credenciales SIP y saldo. |
| 2 | Tu VPS/servidor | Instalar Asterisk o FreeSWITCH en tu dominio (ej. sip.callship.com). |
| 3 | Tu servidor SIP | Crear extensiones por cliente; configurar tronco a callspoofing.org. |
| 4 | CallShip (backend) | Definir `CALLSHIP_SIP_SERVER=sip.callship.com` (o tu dominio). |
| 5 | CallShip (admin) | Crear/editar SIP devices con servidor = tu dominio, usuario y contraseña de cada extensión. |
| 6 | Cliente | En MicroSIP: SIP Server y Domain = tu dominio; usuario y contraseña = los del SIP device. |

Con eso el flujo queda: **MicroSIP → tu servidor (tu dominio) → tronco a callspoofing.org → red**. El cliente solo ve tu marca.

---

### Enlaces útiles (solo para ti)

- Tarifas: https://callspoofing.org/rates.php  
- Registro/Login: https://callspoofing.org/signup.php / login.php  
- Soporte: https://callspoofing.org/contact.php | Telegram: https://t.me/VIPSpoofingX  
