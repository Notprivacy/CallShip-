# Configurar OxaPay en CallShip (Railway)

Para que el botón **Crypto (OxaPay)** funcione en Billing, configura lo siguiente.

---

## 1. Obtener la Merchant API Key en OxaPay

1. Entra en **https://oxapay.com** (o el panel que uses) e inicia sesión.
2. Ve a **Merchant** / **Settings** → **API** (o **API Keys**).
3. Crea o copia la **Merchant API Key** (no uses la Payout API Key).
4. Si OxaPay tiene **Allowed IPs** (IPs permitidas):
   - En CallShip, en Billing, pulsa **"Ver IP del servidor"** y copia la IP que sale.
   - En OxaPay → API → **Allowed IPs**, añade esa IP para que el servidor pueda llamar a la API.

---

## 2. Variables en Railway

En **Railway** → proyecto **CallShip** → servicio de la **web** (www.callship.us) → **Variables**, añade:

| Variable | Valor | Notas |
|----------|--------|--------|
| `OXAPAY_MERCHANT_API_KEY` | Tu Merchant API Key de OxaPay | Obligatoria. Sin espacios extra. |
| `OXAPAY_RETURN_URL` | `https://www.callship.us` | Donde vuelve el usuario tras pagar. |
| `OXAPAY_CALLBACK_URL` | `https://www.callship.us/api/oxapay/callback` | Webhook: OxaPay notifica aquí el pago. |
| `OXAPAY_SANDBOX` | `false` | `true` = pruebas sin dinero real; `false` = pagos reales. |

Guarda y haz **Redeploy** del servicio.

---

## 3. Comprobar

- En **www.callship.us** → **Billing** → indica un monto → **Crypto (OxaPay)**.
- Debería abrirse (o generarse) la URL de pago de OxaPay. Si sale error de clave o IP, revisa la API Key y las Allowed IPs en OxaPay y que las variables estén bien en Railway.
