// controllers/cursos.controller.js
const Curso = require('../models/curso.model');
const Usuario = require('../models/usuario.model'); // para obtener nombres de profesor

// Helpers
function isAdmin(req) {
  return (req.user?.rolNombre || '').toLowerCase() === 'administrador';
}
function getRol(req) {
  return (req.user?.rolNombre || 'estudiante').toLowerCase();
}

// Devuelve un diccionario { idUsuario: nombre }
async function buildProfesorNameMap(cursos) {
  const ids = [...new Set((cursos || []).map(c => c.profesor_id).filter(Boolean))];
  if (!ids.length) return {};
  const profesores = await Usuario.find({ _id: { $in: ids } }, { _id: 1, nombre: 1 }).lean();
  const map = {};
  for (const p of profesores) map[String(p._id)] = p.nombre || String(p._id);
  return map;
}

function normalizeCurso(c, nameById) {
  return {
    id: String(c._id),
    codigo: c.codigo || '',
    nombre: c.nombre || '',
    profesor: nameById?.[String(c.profesor_id)] || String(c.profesor_id || '—'),
  };
}

// =====================
// Listado por rol
// =====================
exports.listadoPorRol = async (req, res) => {
  try {
    const rol = getRol(req);
    const userId = req.user?._id;

    let filter = {};
    if (rol === 'profesor') {
      filter = { profesor_id: userId };
    }
    // estudiante: sin filtro (ve todos). admin: sin filtro (ve todos)

    const cursos = await Curso.find(filter).lean();
    const nameById = await buildProfesorNameMap(cursos);

    res.json({
      role: rol,
      canEdit: rol === 'administrador',
      canDelete: rol === 'administrador',
      cursos: (cursos || []).map(c => normalizeCurso(c, nameById)),
    });
  } catch (err) {
    console.error('listadoPorRol error:', err);
    res.status(500).json({ message: 'Error listando cursos' });
  }
};

// =====================
// CRUD básico (sin carrera)
// =====================
exports.getAll = async (_req, res) => {
  try {
    const cursos = await Curso.find({}).lean();
    const map = await buildProfesorNameMap(cursos);
    res.json((cursos || []).map(c => normalizeCurso(c, map)));
  } catch (err) {
    console.error('getAll error:', err);
    res.status(500).json({ message: 'Error listando cursos' });
  }
};

exports.getById = async (req, res) => {
  try {
    const c = await Curso.findById(req.params.id).lean();
    if (!c) return res.status(404).json({ message: 'Curso no encontrado' });
    const map = await buildProfesorNameMap([c]);
    res.json(normalizeCurso(c, map));
  } catch (err) {
    console.error('getById error:', err);
    res.status(500).json({ message: 'Error obteniendo curso' });
  }
};

exports.create = async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ message: 'No autorizado' });

    const { _id, codigo, nombre, profesor_id } = req.body;
    const created = await Curso.create({
      _id: _id || undefined,
      codigo,
      nombre,
      profesor_id,
    });

    const map = await buildProfesorNameMap([created]);
    res.status(201).json(normalizeCurso(created.toObject(), map));
  } catch (err) {
    console.error('create error:', err);
    res.status(500).json({ message: 'Error creando curso' });
  }
};

exports.update = async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ message: 'No autorizado' });

    const { id } = req.params;
    const { codigo, nombre, profesor_id } = req.body;
    const updated = await Curso.findByIdAndUpdate(
      id,
      {
        ...(codigo !== undefined && { codigo }),
        ...(nombre !== undefined && { nombre }),
        ...(profesor_id !== undefined && { profesor_id }),
      },
      { new: true }
    ).lean();

    if (!updated) return res.status(404).json({ message: 'Curso no encontrado' });
    const map = await buildProfesorNameMap([updated]);
    res.json(normalizeCurso(updated, map));
  } catch (err) {
    console.error('update error:', err);
    res.status(500).json({ message: 'Error actualizando curso' });
  }
};

exports.remove = async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ message: 'No autorizado' });
    const deleted = await Curso.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Curso no encontrado' });
    res.json({ ok: true });
  } catch (err) {
    console.error('remove error:', err);
    res.status(500).json({ message: 'Error eliminando curso' });
  }
};
