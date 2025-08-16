const jwt = require('jsonwebtoken');

function getTokenFromCookies(req) {
  return req.cookies && req.cookies.token ? req.cookies.token : null;
}

function auth(required = true) {
  return (req, res, next) => {
    const token = getTokenFromCookies(req);
    if (!token) {
      if (required) return res.status(401).json({ error: 'No autenticado' });
      req.user = null;
      return next();
    }
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      req.user = payload;
      next();
    } catch (err) {
      if (required) return res.status(401).json({ error: 'Token inválido o expirado' });
      req.user = null;
      next();
    }
  };
}

function requireRole(...rolesAceptados) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'No autenticado' });
    const { rolNombre } = req.user;
    if (!rolesAceptados.includes(rolNombre)) {
      return res.status(403).json({ error: 'No autorizado' });
    }
    next();
  };
}

module.exports = { auth, requireRole };
