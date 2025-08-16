const express = require('express');
const { auth } = require('../middleware/auth');
const Usuario = require('../models/usuario.model');
const Rol = require('../models/rol.model');

const router = express.Router();

router.use(auth(true), (req, res, next) => {
  if ((req.user?.rolNombre || '').toLowerCase() !== 'administrador') {
    return res.status(403).json({ error: 'No autorizado' });
  }
  next();
});

router.get('/roles', async (_req, res) => {
  try {
    const roles = await Rol.find({}, { _id: 1, nombre: 1 }).lean();
    res.json({ roles });
  } catch (e) {
    console.error('GET /api/admin/roles', e);
    res.status(500).json({ error: 'Error obteniendo roles' });
  }
});

router.get('/users', async (req, res) => {
  try {
    const { q } = req.query;
    const filter = {};
    if (q && q.trim()) {
      const rx = new RegExp(q.trim(), 'i');
      filter.$or = [{ nombre: rx }, { correo: rx }, { carrera: rx }, { rol_id: rx }];
    }
    const users = await Usuario.find(filter).lean();
    res.json({ users });
  } catch (e) {
    console.error('GET /api/admin/users', e);
    res.status(500).json({ error: 'Error listando usuarios' });
  }
});

router.get('/users/:id', async (req, res) => {
  try {
    const user = await Usuario.findById(req.params.id).lean();
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ user });
  } catch (e) {
    console.error('GET /api/admin/users/:id', e);
    res.status(500).json({ error: 'Error obteniendo usuario' });
  }
});

router.put('/users/:id', async (req, res) => {
  try {
    const { nombre, correo, rol_id, carrera, activo, password } = req.body;
    const u = await Usuario.findById(req.params.id);
    if (!u) return res.status(404).json({ error: 'Usuario no encontrado' });

    if (typeof nombre === 'string') u.nombre = nombre.trim();
    if (typeof correo === 'string') u.correo = correo.trim().toLowerCase();
    if (typeof rol_id === 'string') u.rol_id = rol_id.trim();
    if (typeof carrera === 'string') u.carrera = carrera.trim();
    if (typeof activo === 'boolean') u.activo = activo;
    if (typeof password === 'string' && password.trim() !== '') u.password = password.trim();

    await u.save();
    res.json({ ok: true });
  } catch (e) {
    if (e?.code === 11000 && e?.keyPattern?.correo) {
      return res.status(409).json({ error: 'El correo ya está registrado' });
    }
    console.error('PUT /api/admin/users/:id', e);
    res.status(500).json({ error: 'Error actualizando usuario' });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    const r = await Usuario.deleteOne({ _id: req.params.id });
    if (r.deletedCount === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/admin/users/:id', e);
    res.status(500).json({ error: 'Error eliminando usuario' });
  }
});

module.exports = router;
