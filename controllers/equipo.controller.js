const Equipo   = require('../models/equipo.model');
const Proyecto = require('../models/proyecto.model');
const Curso    = require('../models/curso.model');
const Usuario  = require('../models/usuario.model');

function getRol(req){ return (req.user?.rolNombre || 'estudiante').toLowerCase(); }
function isAdmin(req){ return getRol(req) === 'administrador'; }
function isProfesor(req){ return getRol(req) === 'profesor'; }
function getUserId(req){ return req.user?._id || req.user?.id || req.user?.uid; }

// ----- helpers (mismos criterios que en proyectos.controller) -----
async function cursosPermitidosIds(req){
  const rol = getRol(req);
  const uid = getUserId(req);

  if (rol === 'administrador') return null;
  if (rol === 'profesor') {
    const cursos = await Curso.find({ profesor_id: uid }, { _id:1 }).lean();
    return cursos.map(c => String(c._id));
  }
  // estudiante → por nombre de carrera
  let carreraUser = (req.user?.carrera || '').trim();
  if (!carreraUser && uid){
    const u = await Usuario.findById(uid, { carrera:1 }).lean();
    carreraUser = (u?.carrera || '').trim();
  }
  if (!carreraUser) return [];
  const cursos = await Curso.find({ carrera: carreraUser })
                            .collation({ locale:'es', strength:1 })
                            .select('_id').lean();
  return cursos.map(c => String(c._id));
}

// puede ver el proyecto?
async function canViewProyecto(req, proyecto){
  if (isAdmin(req)) return true;
  const uid = getUserId(req);
  const permitidos = await cursosPermitidosIds(req); // null=all, []=none
  const byCurso = permitidos ? permitidos.includes(String(proyecto.id_curso)) : true;
  const esMiembro = (proyecto.miembros||[]).some(m => String(m.user_id) === String(uid));
  const esCreador = String(proyecto.creado_por) === String(uid);
  return byCurso || esMiembro || esCreador;
}

// puede gestionar equipos de ese proyecto?
function canManageEquipo(req){
  return isAdmin(req) || isProfesor(req);
}

// Mapa {user_id: {nombre}}
async function buildUsuarioMap(ids){
  const uniq = [...new Set((ids||[]).filter(Boolean))];
  if (!uniq.length) return {};
  const users = await Usuario.find({ _id: { $in: uniq } }, { _id:1, nombre:1 }).lean();
  const map = {};
  for (const u of users) map[String(u._id)] = u;
  return map;
}

// =============================
// GET /api/equipos?proyecto=p001
// =============================
exports.listByProyecto = async (req, res) => {
  try {
    const id_proyecto = (req.query.proyecto || '').trim();
    if (!id_proyecto) return res.json([]);

    const proyecto = await Proyecto.findById(id_proyecto).lean();
    if (!proyecto) return res.status(404).json({ message: 'Proyecto no encontrado' });
    if (!(await canViewProyecto(req, proyecto))) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const equipos = await Equipo.find({ id_proyecto }).lean();
    const allMemberIds = [...new Set(equipos.flatMap(e => e.miembros||[]))];
    const uMap = await buildUsuarioMap(allMemberIds);

    const data = equipos.map(e => ({
      id: String(e._id),
      nombre: e.nombre,
      id_proyecto: e.id_proyecto,
      miembros: (e.miembros||[]).map(uid => ({
        user_id: uid,
        nombre: uMap[uid]?.nombre || uid
      }))
    }));

    res.json(data);
  } catch (err) {
    console.error('equipos.listByProyecto error:', err);
    res.status(500).json({ message: 'Error listando equipos' });
  }
};

// =============================
// GET /api/equipos/:id
// =============================
exports.getById = async (req, res) => {
  try {
    const e = await Equipo.findById(req.params.id).lean();
    if (!e) return res.status(404).json({ message: 'Equipo no encontrado' });

    const proyecto = await Proyecto.findById(e.id_proyecto).lean();
    if (!proyecto) return res.status(404).json({ message: 'Proyecto no encontrado' });
    if (!(await canViewProyecto(req, proyecto))) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const uMap = await buildUsuarioMap(e.miembros || []);
    res.json({
      id: String(e._id),
      nombre: e.nombre,
      id_proyecto: e.id_proyecto,
      miembros: (e.miembros||[]).map(uid => ({
        user_id: uid, nombre: uMap[uid]?.nombre || uid
      }))
    });
  } catch (err) {
    console.error('equipos.getById error:', err);
    res.status(500).json({ message: 'Error obteniendo equipo' });
  }
};

// =============================
// POST /api/equipos
// body: { _id?, nombre, id_proyecto, miembros?: [userId] }
// permisos: profesor/admin
// =============================
exports.create = async (req, res) => {
  try {
    if (!canManageEquipo(req)) return res.status(403).json({ message: 'No autorizado' });
    const { _id, nombre, id_proyecto, miembros } = req.body || {};
    if (!nombre || !id_proyecto) return res.status(400).json({ message: 'Faltan campos: nombre, id_proyecto' });

    const proyecto = await Proyecto.findById(id_proyecto).lean();
    if (!proyecto) return res.status(404).json({ message: 'Proyecto no encontrado' });
    if (!(await canViewProyecto(req, proyecto))) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const e = await Equipo.create({
      _id: _id || undefined,
      nombre,
      id_proyecto,
      miembros: Array.isArray(miembros) ? miembros.filter(Boolean) : []
    });

    res.status(201).json({ id: String(e._id) });
  } catch (err) {
    console.error('equipos.create error:', err);
    res.status(500).json({ message: 'Error creando equipo' });
  }
};

// =============================
// PUT /api/equipos/:id
// permisos: profesor/admin
// =============================
exports.update = async (req, res) => {
  try {
    if (!canManageEquipo(req)) return res.status(403).json({ message: 'No autorizado' });

    const e = await Equipo.findById(req.params.id).lean();
    if (!e) return res.status(404).json({ message: 'Equipo no encontrado' });

    const proyecto = await Proyecto.findById(e.id_proyecto).lean();
    if (!proyecto) return res.status(404).json({ message: 'Proyecto no encontrado' });
    if (!(await canViewProyecto(req, proyecto))) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const { nombre, miembros } = req.body || {};
    const upd = await Equipo.findByIdAndUpdate(
      req.params.id,
      {
        ...(nombre !== undefined && { nombre }),
        ...(miembros !== undefined && { miembros: Array.isArray(miembros) ? miembros.filter(Boolean) : [] })
      },
      { new: true }
    ).lean();

    res.json({ id: String(upd._id) });
  } catch (err) {
    console.error('equipos.update error:', err);
    res.status(500).json({ message: 'Error actualizando equipo' });
  }
};

// =============================
// DELETE /api/equipos/:id
// permisos: profesor/admin
// =============================
exports.remove = async (req, res) => {
  try {
    if (!canManageEquipo(req)) return res.status(403).json({ message: 'No autorizado' });

    const e = await Equipo.findById(req.params.id).lean();
    if (!e) return res.status(404).json({ message: 'Equipo no encontrado' });

    const proyecto = await Proyecto.findById(e.id_proyecto).lean();
    if (!proyecto) return res.status(404).json({ message: 'Proyecto no encontrado' });
    if (!(await canViewProyecto(req, proyecto))) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    await Equipo.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error('equipos.remove error:', err);
    res.status(500).json({ message: 'Error eliminando equipo' });
  }
};
