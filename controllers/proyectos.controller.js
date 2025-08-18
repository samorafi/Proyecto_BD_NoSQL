const Proyecto = require('../models/proyecto.model');
const Curso     = require('../models/curso.model');
const Equipo    = require('../models/equipo.model');
const Usuario   = require('../models/usuario.model');
const Rol       = require('../models/rol.model');

function isAdminOrProf(user){
  const r = (user?.rolNombre || '').toLowerCase();
  return r === 'administrador' || r === 'profesor';
}
function isStudent(user){
  return (user?.rolNombre || '').toLowerCase() === 'estudiante';
}

// Genera pNNN siguiente
async function nextProjectId(){
  const docs = await Proyecto.find({}, { _id:1 }).lean();
  let max = 0;
  for (const d of docs){
    const m = String(d._id || '').match(/^p(\d+)$/i);
    if (m) max = Math.max(max, parseInt(m[1],10));
  }
  const n = (max+1).toString().padStart(3,'0');
  return `p${n}`;
}

// =================== Catálogo cursos ===================
exports.cursosCatalogo = async (_req, res) => {
  try {
    const cursos = await Curso.find({}, { _id:1, nombre:1, codigo:1, carrera:1 }).lean();
    res.json({ cursos });
  } catch (e) {
    console.error('cursosCatalogo', e);
    res.status(500).json({ error: 'No se pudo cargar el catálogo de cursos' });
  }
};

// =================== Listados ==========================
exports.listar = async (_req, res) => {
  try {
    const proys = await Proyecto.find({}).lean();
    res.json({ proyectos: proys });
  } catch (e) {
    console.error('proyectos.listar', e);
    res.status(500).json({ error: 'No se pudo listar' });
  }
};

// Listado por rol (igual concepto que Equipos)
exports.listadoPorRol = async (req, res) => {
  try {
    let ids = [];
    if (isStudent(req.user)) {
      const eqs = await Equipo.find({ miembros: String(req.user._id) }, { id_proyecto:1 }).lean();
      ids = [...new Set(eqs.map(e => String(e.id_proyecto)))];
    }

    const q = isStudent(req.user) ? { _id: { $in: ids } } : {};
    const proyectos = await Proyecto.find(q).lean();

    // Join curso, equipos, miembros
    const cursoIds = [...new Set(proyectos.map(p => String(p.id_curso)).filter(Boolean))];
    const cursos = await Curso.find({ _id: { $in: cursoIds } }, { _id:1, nombre:1, codigo:1 }).lean();
    const cursoMap = new Map(cursos.map(c => [String(c._id), c]));

    const pIds = proyectos.map(p => String(p._id));
    const equipos = await Equipo.find({ id_proyecto: { $in: pIds } }, { id_proyecto:1, miembros:1 }).lean();

    const eqsByProj = new Map();
    for (const e of equipos){
      const k = String(e.id_proyecto);
      if(!eqsByProj.has(k)) eqsByProj.set(k, []);
      eqsByProj.get(k).push(e);
    }

    const payload = proyectos.map(p => {
      const eqs = eqsByProj.get(String(p._id)) || [];
      const miembroIds = [...new Set(eqs.flatMap(e => e.miembros || []).map(String))];
      return {
        _id: String(p._id),
        nombre: p.nombre,
        estado: p.estado || 'activo',
        fecha_creacion: p.fecha_creacion,
        curso: cursoMap.get(String(p.id_curso)) || null,
        equiposCount: eqs.length,
        miembrosCount: miembroIds.length
      };
    });

    res.json({
      canCreate: isAdminOrProf(req.user),
      canEdit:   isAdminOrProf(req.user),
      canDelete: isAdminOrProf(req.user),
      proyectos: payload
    });
  } catch (e) {
    console.error('proyectos.listadoPorRol', e);
    res.status(500).json({ error: 'No se pudo cargar el listado' });
  }
};

// =================== Detalle (enriquecido) ============
exports.getUno = async (req, res) => {
  try {
    const id = String(req.params.id);
    const p = await Proyecto.findById(id).lean();
    if (!p) return res.status(404).json({ error: 'Proyecto no encontrado' });

    if (isStudent(req.user)) {
      const inTeam = await Equipo.exists({ id_proyecto: id, miembros: String(req.user._id) });
      if (!inTeam) return res.status(403).json({ error: 'Sin permiso' });
    }

    let curso = null;
    if (p.id_curso) {
      const c = await Curso.findById(String(p.id_curso), { _id:1, nombre:1, codigo:1, carrera:1 }).lean();
      if (c) curso = { _id: String(c._id), nombre: c.nombre, codigo: c.codigo, carrera: c.carrera };
    }

    const eqs = await Equipo.find({ id_proyecto: id }).lean();
    const miembroIds = [...new Set(eqs.flatMap(e => e.miembros || []).map(String))];

    const usuarios = miembroIds.length
      ? await Usuario.find({ _id: { $in: miembroIds } }, { _id:1, nombre:1, rol_id:1 }).lean()
      : [];
    const roles = await Rol.find({}, { _id:1, nombre:1 }).lean();
    const rolMap = new Map(roles.map(r => [String(r._id), r.nombre]));
    const userMap = new Map(usuarios.map(u => [String(u._id), u]));

    const equipos = eqs.map(e => ({
      _id: String(e._id),
      nombre: e.nombre,
      miembros: (e.miembros || [])
        .map(uid => {
          const u = userMap.get(String(uid));
          return u ? { _id: String(u._id), nombre: u.nombre } : null;
        })
        .filter(Boolean)
    }));

    const miembros = miembroIds.map(uid => {
      const u = userMap.get(uid);
      return u ? { user_id: uid, nombre: u.nombre, rol: rolMap.get(String(u.rol_id)) || '' } : null;
    }).filter(Boolean);

    res.json({
      _id: String(p._id),
      nombre: p.nombre,
      descripcion: p.descripcion || '',
      estado: p.estado || 'activo',
      fecha_creacion: p.fecha_creacion,
      curso,
      equipos,
      miembros
    });
  } catch (e) {
    console.error('proyectos.getUno', e);
    res.status(500).json({ error: 'No se pudo obtener el proyecto' });
  }
};

// =================== Crear / Actualizar / Eliminar ====
exports.crear = async (req, res) => {
  try {
    if (!isAdminOrProf(req.user)) return res.status(403).json({ error: 'No autorizado' });

    let { nombre, id_curso, descripcion, estado } = req.body;
    nombre = (nombre||'').trim();
    id_curso = (id_curso||'').trim();
    descripcion = (descripcion||'').trim();
    estado = (estado||'activo').trim();

    if (!nombre || !id_curso) return res.status(400).json({ error: 'Nombre y curso son obligatorios' });

    const curso = await Curso.findById(id_curso).lean();
    if (!curso) return res.status(400).json({ error: 'Curso inválido' });

    const _id = await nextProjectId();
    const nuevo = await Proyecto.create({
      _id, nombre, id_curso, descripcion, estado, fecha_creacion: new Date()
    });
    res.json({ ok:true, proyecto: { _id: nuevo._id } });
  } catch (e) {
    console.error('proyectos.crear', e);
    res.status(500).json({ error: 'No se pudo crear' });
  }
};

exports.actualizar = async (req, res) => {
  try {
    if (!isAdminOrProf(req.user)) return res.status(403).json({ error: 'No autorizado' });
    const id = String(req.params.id);
    const p = await Proyecto.findById(id);
    if (!p) return res.status(404).json({ error: 'Proyecto no encontrado' });

    const { nombre, id_curso, descripcion, estado } = req.body;

    if (typeof nombre === 'string') p.nombre = nombre.trim();
    if (typeof descripcion === 'string') p.descripcion = descripcion.trim();
    if (typeof estado === 'string') p.estado = estado.trim();
    if (typeof id_curso === 'string' && id_curso.trim()) {
      const ok = await Curso.exists({ _id: id_curso.trim() });
      if (!ok) return res.status(400).json({ error: 'Curso inválido' });
      p.id_curso = id_curso.trim();
    }

    await p.save();
    res.json({ ok:true });
  } catch (e) {
    console.error('proyectos.actualizar', e);
    res.status(500).json({ error: 'No se pudo actualizar' });
  }
};

exports.eliminar = async (req, res) => {
  try {
    if (!isAdminOrProf(req.user)) return res.status(403).json({ error: 'No autorizado' });
    const id = String(req.params.id);

    const hasTeams = await Equipo.exists({ id_proyecto: id });
    if (hasTeams) return res.status(400).json({ error: 'No se puede eliminar: hay equipos asociados' });

    const r = await Proyecto.deleteOne({ _id: id });
    if (!r.deletedCount) return res.status(404).json({ error: 'Proyecto no encontrado' });
    res.json({ ok:true });
  } catch (e) {
    console.error('proyectos.eliminar', e);
    res.status(500).json({ error: 'No se pudo eliminar' });
  }
};
