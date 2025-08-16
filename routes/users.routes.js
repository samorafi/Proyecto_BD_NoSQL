const express = require('express');
const { auth } = require('../middleware/auth');
const Usuario = require('../models/usuario.model');
const Rol = require('../models/rol.model');

const router = express.Router();

// GET perfil
router.get('/me', auth(true), async (req, res) => {
  try {
    const user = await Usuario.findById(req.user._id).lean();
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    const rol = await Rol.findById(user.rol_id).lean();
    res.json({
      _id: user._id,
      nombre: user.nombre,
      correo: user.correo,
      carrera: user.carrera || '',
      rol_id: user.rol_id,
      rolNombre: rol?.nombre || req.user.rolNombre || ''
    });
  } catch (e) {
    console.error('GET /api/users/me', e);
    res.status(500).json({ error: 'Error obteniendo perfil' });
  }
});

// PUT perfil
router.put('/me', auth(true), async (req, res) => {
  try {
    const { nombre, carrera, currentPassword, newPassword } = req.body;
    const u = await Usuario.findById(req.user._id);
    if (!u) return res.status(404).json({ error: 'Usuario no encontrado' });

    if (typeof nombre === 'string') u.nombre = nombre.trim();
    if (typeof carrera === 'string') u.carrera = carrera.trim();

    if (newPassword && newPassword.trim()) {
      if (!currentPassword) return res.status(400).json({ error: 'Debes ingresar tu contraseña actual' });
      if (u.password !== currentPassword) return res.status(401).json({ error: 'Contraseña actual incorrecta' });
      if (newPassword.trim().length < 3) return res.status(400).json({ error: 'La nueva contraseña es muy corta (mínimo 3)' });
      u.password = newPassword.trim();
    }

    await u.save();
    res.json({ ok: true });
  } catch (e) {
    console.error('PUT /api/users/me', e);
    res.status(500).json({ error: 'Error actualizando perfil' });
  }
});

module.exports = router;
