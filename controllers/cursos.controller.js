// controllers/cursos.controller.js
// Reglas:
// - admin: ve todos (puede crear/editar/eliminar)
// - profesor: solo cursos donde profesor_id === su _id
// - estudiante: solo cursos donde curso.carrera == usuario.carrera (por NOMBRE; case/acentos-insensible)
//   Si la carrera no viene en req.user, se obtiene desde la BD.

const Curso = require('../models/curso.model');
const Usuario = require('../models/usuario.model');

// ===== Helpers =====
function isAdmin(req) {
  return (req.user?.rolNombre || '').toLowerCase() === 'administrador';
}
function getRol(req) {
  return (req.user?.rolNombre || 'estudiante').toLowerCase();
}

// Mapa { userId: nombre } para mostrar profesor por nombre
async function buildProfesorNameMap(cursos) {
  const ids = [...new Set((cursos || []).map(c => c.profesor_id).filter(Boolean))];
  if (!ids.length) return {};
  const profesores = await Usuario.find({ _id: { $in: ids } }, { _id: 1, nombre: 1 }).lean();
  const map = {};
  for (const p of profesores) map[String(p._id)] = p.nombre || String(p._id);
  return map;
}

// Normaliza el curso para la UI
function normalizeCurso(c, nameById) {
  return {
    id: String(c._id),
    carrera: c.carrera || '—',          // string en el documento del curso
    nombre: c.nombre || '',
    codigo: c.codigo || '',
    profesor: nameById?.[String(c.profesor_id)] || String(c.profesor_id || '—'),
  };
}

// =====================
// Listado por rol (para la vista)
// =====================
exports.listadoPorRol = async (req, res) => {
  try {
    const rol = (req.user?.rolNombre || 'estudiante').toLowerCase();
    const user = req.user || {};
    let filter = {};
    let useCollation = false;

    if (rol === 'profesor') {
      const uid = user._id || user.id || user.uid;
      filter = { profesor_id: uid };
    } else if (rol === 'estudiante') {
      // 1) carrera desde token o query
      let carreraUser = (user.carrera || req.query.carrera || '').trim();

      // 2) si no vino, intenta leer de la BD por _id o por correo
      if (!carreraUser) {
        const uid = user._id || user.id || user.uid;
        const correo = user.correo || user.email;
        let u = null;
        if (uid) u = await Usuario.findOne({ _id: uid }, { carrera: 1 }).lean();
        if (!u && correo) u = await Usuario.findOne({ correo }, { carrera: 1 }).lean();
        carreraUser = (u?.carrera || '').trim();
      }

      if (carreraUser) {
        // Igualdad por NOMBRE con collation español (ignora tildes/mayúsculas)
        filter = { carrera: carreraUser };
        useCollation = true;
      } else {
        // Evita mostrar todo por error
        filter = { _id: { $exists: false } };
      }
    }

    let q = Curso.find(filter);
    if (useCollation) q = q.collation({ locale: 'es', strength: 1 });
    const cursos = await q.lean();

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
// CRUD (admin)
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

    const { _id, codigo, nombre, profesor_id, carrera } = req.body; // carrera STRING
    const created = await Curso.create({
      _id: _id || undefined,
      codigo,
      nombre,
      profesor_id,
      ...(carrera !== undefined ? { carrera: (carrera || '').trim() } : {}),
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
    const { codigo, nombre, profesor_id, carrera } = req.body;

    const updated = await Curso.findByIdAndUpdate(
      id,
      {
        ...(codigo !== undefined && { codigo }),
        ...(nombre !== undefined && { nombre }),
        ...(profesor_id !== undefined && { profesor_id }),
        ...(carrera !== undefined && { carrera: (carrera || '').trim() }),
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
