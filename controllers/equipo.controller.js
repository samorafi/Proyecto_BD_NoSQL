// controllers/equipo.controller.js
const Equipo   = require('../models/equipo.model');
// Usa tus modelos actuales; solo deben tener _id como string
const Proyecto = require('../models/proyecto.model');   // {_id:"p001", nombre: "...", ...}
const Usuario  = require('../models/usuario.model');    // {_id:"u001", nombre:"...", rolNombre:"..."}

// ===== helpers de auth/permisos (ajusta a tu middleware real) =====
function isAdminOrProf(u) {
  const r = (u?.rolNombre || '').toLowerCase();
  return r === 'administrador' || r === 'profesor';
}
function canManage(u) { return isAdminOrProf(u); }

// ===================== LISTADO POR ROL =====================
exports.listadoPorRol = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'No autenticado' });

    const rolUser = (req.user.rolNombre || '').toLowerCase();
    const match = {};
    if (req.query.proyecto_id) match.id_proyecto = String(req.query.proyecto_id);
    if (rolUser === 'estudiante') match.miembros = String(req.user._id);

    const equipos = await Equipo.find(match).lean();

    // join proyectos
    const projIds = [...new Set(equipos.map(e => e.id_proyecto).filter(Boolean))];
    const proyectos = await Proyecto.find({ _id: { $in: projIds } }, { _id:1, nombre:1 }).lean();
    const projMap = new Map(proyectos.map(p => [p._id, p.nombre]));

    // join usuarios (miembros)
    const memberIds = [...new Set(equipos.flatMap(e => e.miembros || []))];
    const usuarios = memberIds.length
      ? await Usuario.find({ _id: { $in: memberIds } }, { _id:1, nombre:1, rolNombre:1 }).lean()
      : [];
    const userMap = new Map(usuarios.map(u => [u._id, { _id: u._id, nombre: u.nombre, rol: u.rolNombre }]));

    const payload = equipos.map(e => ({
      id: e._id,
      nombre: e.nombre,
      proyecto: projMap.get(e.id_proyecto) || '—',
      id_proyecto: e.id_proyecto,
      miembros: (e.miembros || []).map(uid => userMap.get(uid)).filter(Boolean) // [{_id, nombre, rol}]
    }));

    res.json({
      canCreate: canManage(req.user),
      canEdit:   canManage(req.user),
      canDelete: canManage(req.user),
      equipos: payload
    });
  } catch (e) {
    console.error('listado-por-rol equipos:', e);
    res.status(500).send('No se pudo cargar el listado');
  }
};

// ===================== OBTENER UNO =====================
exports.getUno = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'No autenticado' });

    const e = await Equipo.findById(String(req.params.id)).lean();
    if (!e) return res.status(404).json({ error: 'Equipo no encontrado' });

    const rol = (req.user.rolNombre || '').toLowerCase();
    if (rol === 'estudiante' && !(e.miembros || []).includes(String(req.user._id))) {
      return res.status(403).json({ error: 'Sin permiso' });
    }

    const p = e.id_proyecto
      ? await Proyecto.findById(e.id_proyecto, { _id:1, nombre:1 }).lean()
      : null;

    const users = (e.miembros || []).length
      ? await Usuario.find({ _id: { $in: e.miembros } }, { _id:1, nombre:1, rolNombre:1 }).lean()
      : [];

    res.json({
      _id: e._id,
      nombre: e.nombre,
      id_proyecto: e.id_proyecto,
      proyecto: p?.nombre || '',
      miembros: users.map(u => ({ _id: u._id, nombre: u.nombre, rol: u.rolNombre }))
    });
  } catch (e) {
    res.status(500).json({ error: 'No se pudo obtener el equipo' });
  }
};

// ===================== CATÁLOGOS =====================
exports.getProyectos = async (_req, res) => {
  try {
    const proyectos = await Proyecto.find({}, { _id:1, nombre:1 }).sort({ nombre:1 }).lean();
    res.json({ proyectos });
  } catch (e) {
    res.status(500).json({ error: 'No se pudieron cargar los proyectos' });
  }
};

exports.getMiembrosCandidatos = async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const filter = { rolNombre: { $in: ['profesor', 'estudiante'] } };
    if (q) filter.$or = [{ nombre: new RegExp(q, 'i') }, { email: new RegExp(q, 'i') }];
    const usuarios = await Usuario.find(filter, { _id:1, nombre:1, rolNombre:1 })
                                  .sort({ nombre:1 }).limit(300).lean();
    res.json({ usuarios });
  } catch (e) {
    res.status(500).json({ error: 'No se pudieron cargar los usuarios' });
  }
};

// ===================== CRUD BÁSICO =====================
exports.crear = async (req, res) => {
  try {
    if (!req.user || !canManage(req.user)) return res.status(403).json({ error: 'Sin permiso' });
    const { _id, nombre, id_proyecto, miembros } = req.body || {};
    if (!nombre || !id_proyecto) return res.status(400).json({ error: 'Faltan campos obligatorios' });

    // valida proyecto existe
    const p = await Proyecto.findById(String(id_proyecto), { _id:1 }).lean();
    if (!p) return res.status(400).json({ error: 'Proyecto inválido' });

    // filtra miembros permitidos
    let memberIds = [];
    if (Array.isArray(miembros) && miembros.length) {
      const users = await Usuario.find({ _id: { $in: miembros } }, { _id:1, rolNombre:1 }).lean();
      memberIds = users.filter(u => ['profesor','estudiante'].includes((u.rolNombre||'').toLowerCase())).map(u => u._id);
    }

    const eqId = _id || ('eq' + Date.now());
    await Equipo.create({
      _id: eqId,
      nombre: String(nombre).trim(),
      id_proyecto: String(id_proyecto),
      miembros: memberIds,
      creadoPor: String(req.user._id),
      actualizadoPor: String(req.user._id)
    });

    res.json({ message: 'Equipo creado', id: eqId });
  } catch (e) {
    if (e?.code === 11000) return res.status(409).json({ error: 'Ya existe un equipo con ese nombre en el proyecto' });
    res.status(500).json({ error: 'No se pudo crear el equipo' });
  }
};

exports.actualizar = async (req, res) => {
  try {
    if (!req.user || !canManage(req.user)) return res.status(403).json({ error: 'Sin permiso' });
    const { nombre, id_proyecto, miembros } = req.body || {};
    const update = { actualizadoPor: String(req.user._id) };
    if (nombre) update.nombre = String(nombre).trim();
    if (id_proyecto) update.id_proyecto = String(id_proyecto);
    if (Array.isArray(miembros)) {
      const users = await Usuario.find({ _id: { $in: miembros } }, { _id:1, rolNombre:1 }).lean();
      update.miembros = users.filter(u => ['profesor','estudiante'].includes((u.rolNombre||'').toLowerCase())).map(u => u._id);
    }
    const eq = await Equipo.findByIdAndUpdate(String(req.params.id), update, { new:true, runValidators:true }).lean();
    if (!eq) return res.status(404).json({ error: 'Equipo no encontrado' });
    res.json({ message: 'Actualizado', id: eq._id });
  } catch (e) {
    if (e?.code === 11000) return res.status(409).json({ error: 'Ya existe un equipo con ese nombre en el proyecto' });
    res.status(500).json({ error: 'No se pudo actualizar' });
  }
};

exports.eliminar = async (req, res) => {
  try {
    if (!req.user || !canManage(req.user)) return res.status(403).json({ error: 'Sin permiso' });
    const del = await Equipo.findByIdAndDelete(String(req.params.id)).lean();
    if (!del) return res.status(404).json({ error: 'Equipo no encontrado' });
    res.json({ message: 'Equipo eliminado' });
  } catch (e) {
    res.status(500).json({ error: 'No se pudo eliminar' });
  }
};
