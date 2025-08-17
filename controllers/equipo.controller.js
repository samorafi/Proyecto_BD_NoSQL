// controllers/equipo.controller.js
const mongoose = require('mongoose');
const Equipo   = require('../models/equipo.model');
const Proyecto = require('../models/proyecto.model');
const Usuario  = require('../models/usuario.model');
const Rol      = require('../models/rol.model');

async function fetchEquiposAnyCollection(match) {
  let equipos = await Equipo.find(match).lean();
  if (Array.isArray(equipos) && equipos.length) {
    return { equipos, fuente: 'equipos' };
  }

  const colNames = await mongoose.connection.db.listCollections().toArray();
  const hasSingular = colNames.some(c => c.name === 'equipo');
  if (!hasSingular) return { equipos: [], fuente: 'equipos' };

  const raw = await mongoose.connection.db.collection('equipo')
    .find(match || {})
    .toArray();
  const normalizados = raw.map(d => ({
    _id: String(d._id),
    nombre: d.nombre || d.equipo || '',
    id_proyecto: d.id_proyecto ? String(d.id_proyecto) : (d.proyecto_id ? String(d.proyecto_id) : ''),
    miembros: Array.isArray(d.miembros) ? d.miembros.map(String)
             : Array.isArray(d.integrantes) ? d.integrantes.map(String) : []
  }));
  return { equipos: normalizados, fuente: 'equipo' };
}

function isAdminOrProf(u){
  const r=(u?.rolNombre||'').toLowerCase();
  return r==='administrador'||r==='profesor';
}
function canManage(u){ return isAdminOrProf(u); }

// cache sencillo de ids de roles
let ROLE_CACHE = null;
async function getRoleIds() {
  if (ROLE_CACHE) return ROLE_CACHE;
  const roles = await Rol.find({}, { _id:1, nombre:1 }).lean();
  const byName = Object.fromEntries(roles.map(r => [(r.nombre||'').toLowerCase(), String(r._id)]));
  ROLE_CACHE = {
    estudiante: byName['estudiante'] || 'r001',
    profesor:   byName['profesor']   || 'r002',
    admin:      byName['administrador'] || 'r003'
  };
  return ROLE_CACHE;
}


// por defecto, solo estudiantes como miembros de equipo
const ALLOWED_MEMBER_ROLES = ['estudiante'];

// =========== LISTADO POR ROL ===========
exports.listadoPorRol = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'No autenticado' });

    const match = {};
    if (req.query.proyecto_id) match.id_proyecto = String(req.query.proyecto_id);

    const rolUser = (req.user.rolNombre || '').toLowerCase();
    if (rolUser === 'estudiante') match.miembros = String(req.user._id);

    // lee de "equipos" y si no hubiera, intenta "equipo"
    const { equipos, fuente } = await fetchEquiposAnyCollection(match);

    // join Proyectos
    const projIds = [...new Set(equipos.map(e => e.id_proyecto).filter(Boolean))];
    let proyectos = [];
    if (projIds.length) {
      const idsStr = projIds.map(String);
      const idsObj = idsStr.filter(mongoose.Types.ObjectId.isValid)
                           .map(id => new mongoose.Types.ObjectId(id));
      const or = [];
      if (idsStr.length) or.push({ _id: { $in: idsStr } });
      if (idsObj.length) or.push({ _id: { $in: idsObj } });
      proyectos = or.length ? await Proyecto.find({ $or: or }, { _id:1, nombre:1 }).lean() : [];
    }
    const projMap = new Map(proyectos.map(p => [String(p._id), p.nombre]));

    // join Usuarios
    const memberIds = [...new Set(equipos.flatMap(e => e.miembros || []).map(String))];
    let usuarios = [];
    if (memberIds.length) {
      const idsStr = memberIds;
      const idsObj = idsStr.filter(mongoose.Types.ObjectId.isValid)
                           .map(id => new mongoose.Types.ObjectId(id));
      const or = [];
      if (idsStr.length) or.push({ _id: { $in: idsStr } });
      if (idsObj.length) or.push({ _id: { $in: idsObj } });
      usuarios = or.length ? await Usuario.find({ $or: or }, { _id:1, nombre:1, rol_id:1 }).lean() : [];
    }
    const userMap = new Map(usuarios.map(u => [String(u._id), u]));

    const roles = await Rol.find({}, { _id:1, nombre:1 }).lean();
    const rolMap = new Map(roles.map(r => [String(r._id), r.nombre]));

    const payload = equipos.map(e => ({
      id: String(e._id),
      nombre: e.nombre,
      id_proyecto: String(e.id_proyecto || ''),
      proyecto: projMap.get(String(e.id_proyecto)) || '—',
      miembros: (e.miembros || [])
        .map(uid => {
          const u = userMap.get(String(uid));
          return u ? { _id: String(u._id), nombre: u.nombre, rol: rolMap.get(String(u.rol_id)) || '' } : null;
        })
        .filter(Boolean)
    }));

    res.json({
      fuente,
      canCreate: isAdminOrProf(req.user),
      canEdit:   isAdminOrProf(req.user),
      canDelete: isAdminOrProf(req.user),
      equipos: payload
    });
  } catch (e) {
    console.error('listado-por-rol equipos:', e);
    res.status(500).send('No se pudo cargar el listado');
  }
};

exports.debugResumen = async (req, res) => {
  try {
    const cols = await mongoose.connection.db.listCollections().toArray();
    const colNames = cols.map(c => c.name);
    const a = await mongoose.connection.db.collection('equipos').find({}).limit(3).toArray().catch(()=>[]);
    const b = await mongoose.connection.db.collection('equipo').find({}).limit(3).toArray().catch(()=>[]);
    res.json({
      whoami: req.user,
      collections: colNames,
      equipos_sample: a,
      equipo_sample: b
    });
  } catch (e) {
    res.status(500).json({ error: 'debug falló', detail: String(e) });
  }
};

// =========== OBTENER UNO ===========
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
      ? await Usuario.find({ _id: { $in: e.miembros } }, { _id:1, nombre:1, rol_id:1 }).lean()
      : [];

    const roles = await Rol.find({}, { _id:1, nombre:1 }).lean();
    const rolMap = new Map(roles.map(r => [String(r._id), r.nombre]));

    res.json({
      _id: String(e._id),
      nombre: e.nombre,
      id_proyecto: String(e.id_proyecto || ''),
      proyecto: p?.nombre || '',
      miembros: users.map(u => ({ _id: String(u._id), nombre: u.nombre, rol: rolMap.get(String(u.rol_id)) || '' }))
    });
  } catch (e) {
    res.status(500).json({ error: 'No se pudo obtener el equipo' });
  }
};

// =========== CATÁLOGOS ===========
exports.getProyectos = async (_req, res) => {
  try {
    const proyectos = await Proyecto.find({}, { _id:1, nombre:1 }).sort({ nombre:1 }).lean();
    res.json({ proyectos });
  } catch (e) {
    res.status(500).json({ error: 'No se pudieron cargar los proyectos' });
  }
};

// Solo ESTUDIANTES como candidatos
exports.getMiembrosCandidatos = async (req, res) => {
  try {
    const { estudiante } = await getRoleIds();
    const q = (req.query.q || '').trim();

    const filter = { rol_id: { $in: [estudiante] } };
    if (q) filter.$or = [{ nombre: new RegExp(q, 'i') }, { correo: new RegExp(q, 'i') }];

    const usuarios = await Usuario.find(filter, { _id:1, nombre:1, rol_id:1 })
                                  .sort({ nombre:1 }).limit(300).lean();

    const roles = await Rol.find({}, { _id:1, nombre:1 }).lean();
    const rolMap = new Map(roles.map(r => [String(r._id), r.nombre]));

    res.json({
      usuarios: usuarios.map(u => ({
        _id: String(u._id),
        nombre: u.nombre,
        rolNombre: rolMap.get(String(u.rol_id)) || ''
      }))
    });
  } catch (e) {
    res.status(500).json({ error: 'No se pudieron cargar los usuarios' });
  }
};

// =========== CRUD ===========
exports.crear = async (req, res) => {
  try {
    if (!req.user || !canManage(req.user)) return res.status(403).json({ error: 'Sin permiso' });

    const { nombre, id_proyecto, miembros } = req.body || {};
    if (!nombre || !id_proyecto) return res.status(400).json({ error: 'Faltan campos obligatorios' });

    const p = await Proyecto.findById(String(id_proyecto), { _id:1 }).lean();
    if (!p) return res.status(400).json({ error: 'Proyecto inválido' });

    // filtra miembros permitidos (solo estudiantes)
    const { estudiante } = await getRoleIds();
    let memberIds = [];
    if (Array.isArray(miembros) && miembros.length) {
      const users = await Usuario.find(
        { _id: { $in: miembros } },
        { _id:1, rol_id:1 }
      ).lean();
      memberIds = users
        .filter(u => String(u.rol_id) === String(estudiante))
        .map(u => String(u._id));
    }

    const eqId = 'eq' + Date.now();
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
    if (id_proyecto) {
      const p = await Proyecto.findById(String(id_proyecto), { _id:1 }).lean();
      if (!p) return res.status(400).json({ error: 'Proyecto inválido' });
      update.id_proyecto = String(id_proyecto);
    }

    if (Array.isArray(miembros)) {
      const { estudiante } = await getRoleIds();
      const users = await Usuario.find(
        { _id: { $in: miembros } },
        { _id:1, rol_id:1 }
      ).lean();
      update.miembros = users
        .filter(u => String(u.rol_id) === String(estudiante))
        .map(u => String(u._id));
    }

    const eq = await Equipo.findByIdAndUpdate(String(req.params.id), update, { new:true, runValidators:true }).lean();
    if (!eq) return res.status(404).json({ error: 'Equipo no encontrado' });
    res.json({ message: 'Actualizado', id: String(eq._id) });
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
