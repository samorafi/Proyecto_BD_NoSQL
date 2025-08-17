const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');              
const Usuario = require('../models/usuario.model');
const Rol = require('../models/rol.model');
const { auth } = require('../middleware/auth');

const router = express.Router();

function signToken(user, rolNombre) {
  const payload = {
    _id: user._id,
    nombre: user.nombre,
    correo: user.correo,
    rol_id: user.rol_id,
    rolNombre
  };
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: `${process.env.JWT_EXPIRES_IN_DAYS || 7}d`
  });
}

router.get('/carreras', async (_req, res) => {
  try {
    const carreras = await mongoose.connection
      .collection('carreras')
      .find({}, { projection: { _id: 1, nombre: 1 } })
      .sort({ nombre: 1 })
      .toArray();
    res.json({ carreras });
  } catch (e) {
    console.error('GET /api/auth/carreras', e);
    res.status(500).json({ error: 'Error obteniendo carreras' });
  }
});

router.get('/roles', async (_req, res) => {
  try {
    const roles = await Rol.find(
      { nombre: { $in: [/^estudiante$/i, /^profesor$/i] } },
      { _id: 1, nombre: 1 }
    ).lean();
    return res.json({ roles });
  } catch (e) {
    console.error('Error /api/auth/roles:', e);
    return res.status(500).json({ error: 'Error obteniendo roles' });
  }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    let { _id, nombre, correo, rol_id, password, carrera } = req.body;

    nombre = (nombre || '').trim();
    correo = (correo || '').trim().toLowerCase();
    password = (password || '').trim();
    carrera = (carrera || '').trim();

    if (!nombre || !correo || !password) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    if (!rol_id) {
      const rolEst = await Rol.findOne({ nombre: /^estudiante$/i }).lean();
      rol_id = rolEst?._id || 'r001';
    } else {
      const rol = await Rol.findById(rol_id).lean();
      if (!rol || !/^estudiante$|^profesor$/i.test(rol.nombre)) {
        return res.status(403).json({ error: 'Rol no permitido para auto-registro' });
      }
    }

    if (!_id) _id = new mongoose.Types.ObjectId().toString();

    const nuevo = await Usuario.create({
      _id, nombre, correo, rol_id, password, activo: true, carrera
    });

    const rolDoc = await Rol.findById(nuevo.rol_id).lean();
    const payload = { _id: nuevo._id, nombre: nuevo.nombre, correo: nuevo.correo, rol_id: nuevo.rol_id, rolNombre: rolDoc?.nombre || 'estudiante' };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: `${process.env.JWT_EXPIRES_IN_DAYS || 7}d` });

    res.cookie('token', token, {
      httpOnly: true, sameSite: 'lax', secure: false,
      maxAge: 1000 * 60 * 60 * 24 * (process.env.JWT_EXPIRES_IN_DAYS || 7)
    });

    return res.json({ ok: true, redirectUrl: '/dashboard' });

  } catch (e) {
    if (e?.code === 11000 && e?.keyPattern?.correo) {
      return res.status(409).json({ error: 'El correo ya está registrado' });
    }
    console.error('Error en registro:', e);
    return res.status(500).json({ error: 'Error en registro' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { correo, password } = req.body;
    const user = await Usuario.findOne({ correo, activo: true });
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const rol = await Rol.findById(user.rol_id);
    const rolNombre = rol ? rol.nombre : 'estudiante';
    const token = signToken(user, rolNombre);

    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 1000 * 60 * 60 * 24 * (process.env.JWT_EXPIRES_IN_DAYS || 7)
    });

    res.json({ ok: true, redirectUrl: '/dashboard' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error en login' });
  }
});

// GET /api/auth/me
router.get('/me', auth(false), async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'No autenticado' });
  try {
    let { rolNombre } = req.user;
    if (!rolNombre) {
      const rol = await Rol.findById(req.user.rol_id).lean().catch(() => null);
      rolNombre = rol?.nombre || 'estudiante';
    }
    return res.json({ user: { ...req.user, rolNombre } });
  } catch (e) {
    console.error('GET /api/auth/me', e);
    return res.status(500).json({ error: 'Error obteniendo sesión' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token', { httpOnly: true, sameSite: 'lax', secure: false });
  res.json({ ok: true });
});

module.exports = router;
