const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'cambiar-en-produccion';

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, message: 'Token requerido' });
  }
  try {
    const token = header.slice(7);
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ ok: false, message: 'Token inválido' });
  }
}

router.use(authMiddleware);

// MVP: settings “mock” (luego lo guardamos en DB)
router.get('/', (req, res) => {
  res.json({
    ok: true,
    settings: {
      sip: { host: 'sip.tu-dominio.com', username: req.user.username, password: '••••••••' },
      dialer: { timezone: 'America/Santo_Domingo', language: 'es' },
      security: { twoFactor: false },
    },
  });
});

module.exports = router;

