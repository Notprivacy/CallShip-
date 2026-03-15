# CallShip

**Dialer de llamadas** con servidor propio para vender el programa a usuarios (SaaS o licencias).

## Objetivo

- **Dialer**: aplicación para realizar llamadas (listas de contactos, marcar, historial).
- **Servidor**: API, autenticación, gestión de usuarios y licencias.
- **Venta**: modelo por usuario/suscripción o licencia perpetua.

## Estructura del proyecto

```
CallShip/
├── server/          # API, auth, usuarios, licencias
├── dialer/          # Cliente del dialer (web o escritorio)
├── shared/          # Tipos/contratos compartidos (opcional)
└── docs/            # Documentación técnica y de negocio
```

## Stack propuesto

| Parte     | Tecnología              | Notas                          |
|----------|--------------------------|--------------------------------|
| Servidor | Node.js + Express        | API REST, JWT, base de datos   |
| Base de datos | SQLite → PostgreSQL | Empezar con SQLite, escalar después |
| Dialer   | React (web) o Electron   | UI del marcador y listas       |
| Llamadas | Twilio / VoIP propio     | Según presupuesto y alcance    |

## Modelo de venta a usuarios

1. **Registro**: usuario se registra en tu servidor (o en una web de ventas).
2. **Licencia / suscripción**: 
   - Por tiempo (mensual/anual) o 
   - Licencia perpetua con límite de puestos.
3. **Servidor valida**: cada cliente (dialer) se autentica contra tu API y comprueba que la licencia esté activa.
4. **Uso**: el dialer hace llamadas usando tu infra (Twilio u otro) o la del cliente, según el modelo.

## Próximos pasos

- [x] Servidor (auth, usuarios, verificación de licencia, API).
- [x] Cliente dialer (login, SIP devices, Caller ID, historial de llamadas).
- [x] Servidor SIP por defecto = tu dominio (variable `CALLSHIP_SIP_SERVER`; el cliente no ve al proveedor).
- [ ] Montar tu servidor SIP (Asterisk/FreeSWITCH) en tu dominio y tronco al proveedor (ver doc de admin).
- [ ] Pasarela de pago (Stripe, PayPal) para vender licencias/suscripciones.

## Cómo ejecutar (cuando esté implementado)

- **Servidor**: `cd server && npm install && npm run dev`
- **Dialer**: `cd dialer && npm install && npm run dev`

## Administrador: proveedor de minutos (callspoofing.org)

Si el proveedor de minutos es callspoofing.org, ver **[docs/ADMIN_PROVEEDOR_CALLSPOOFING.md](docs/ADMIN_PROVEEDOR_CALLSPOOFING.md)** para:

- Cómo es la conexión con el proveedor (tu dominio como en Mastersking).
- Ejemplo paso a paso (tú, María, callspoofing.org).
- **Flujo completo de implementación**: variable de entorno `CALLSHIP_SIP_SERVER`, tu servidor SIP (Asterisk/FreeSWITCH) en tu dominio y tronco al proveedor. Los clientes solo usan el dialer y MicroSIP; no ven al proveedor.
