// controllers/cursos.controller.js
const mongoose = require('mongoose');
const Curso    = require('../models/curso.model');
const Usuario  = require('../models/usuario.model');
const Rol      = require('../models/rol.model');

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

async function nextCodigoCUR() {
  const last = await Curso.findOne(
    { codigo: /^CUR-\d{3,}$/ },
  ).sort({ codigo: -1 }).lean();

  const lastNum = last ? parseInt(String(last.codigo).slice(4), 10) : 0;
  const next = (Number.isFinite(lastNum) ? lastNum : 0) + 1;
  return `CUR-${String(next).padStart(3, '0')}`;
}

// Listado de carreras (para el dropdown de la vista)
exports.listarCarreras = async (_req, res) => {
  try {
    const carreras = await mongoose.connection
      .collection('carreras')
      .find({}, { projection: { _id: 1, nombre: 1 } })
      .sort({ nombre: 1 })
      .toArray();

    res.json({ carreras });
  } catch (e) {
    console.error('listarCarreras error:', e);
    res.status(500).json({ message: 'Error listando carreras' });
  }
};

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

exports.listarProfesores = async (req, res) => {
  try {
    const Usuario = require('../models/usuario.model');
    const carrera = (req.query.carrera || '').trim();

    const filter = { activo: true, rol_id: 'r002' };
    if (carrera) filter.carrera = carrera;

    const profesores = await Usuario.find(
      filter,
      { _id: 1, nombre: 1, correo: 1, carrera: 1 }
    )
      .collation({ locale: 'es', strength: 1 })
      .sort({ nombre: 1 })
      .lean();

    return res.json({ profesores });
  } catch (e) {
    console.error('listarProfesores error:', e);
    return res.status(500).json({ message: 'Error listando profesores' });
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

async function resolverNombreCarrera({ carrera_id, carreraNombre }) {
  const coll = mongoose.connection.collection('carreras');

  if (carreraNombre && carreraNombre.trim()) {
    return carreraNombre.trim();
  }

  if (!carrera_id) return null;

  let car = await coll.findOne(
    { _id: carrera_id },
    { projection: { nombre: 1 } }
  );

  if (!car && mongoose.Types.ObjectId.isValid(carrera_id)) {
    car = await coll.findOne(
      { _id: new mongoose.Types.ObjectId(carrera_id) },
      { projection: { nombre: 1 } }
    );
  }

  if (!car) {
    car = await coll.findOne(
      { nombre: carrera_id },
      { projection: { nombre: 1 }, collation: { locale: 'es', strength: 1 } }
    );
  }

  return car ? car.nombre : null;
}

exports.create = async (req, res) => {
  try {
    if ((req.user?.rolNombre || '').toLowerCase() !== 'administrador') {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const { _id, nombre, profesor_id, carrera_id, carrera } = req.body;
    if (!nombre || !profesor_id || (!carrera_id && !carrera)) {
      return res.status(400).json({ message: 'Faltan campos obligatorios (nombre, profesor_id, carrera/carrera_id)' });
    }

    const carreraNombre = await resolverNombreCarrera({
      carrera_id,
      carreraNombre: carrera
    });

    if (!carreraNombre) {
      return res.status(400).json({ message: 'Carrera no existe' });
    }

    const prof = await Usuario.findById(profesor_id).lean();
    if (!prof) return res.status(400).json({ message: 'Profesor no existe' });

    const codigo = await nextCodigoCUR();

    const created = await Curso.create({
      _id: _id || undefined,
      codigo,
      nombre,
      profesor_id,
      carrera: carreraNombre
    });

    return res.status(201).json({
      id: String(created._id),
      codigo: created.codigo,
      nombre: created.nombre,
      carrera: created.carrera,
      profesor: prof.nombre || prof._id
    });
  } catch (err) {
    console.error('create error:', err);
    return res.status(500).json({ message: 'Error creando curso' });
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

// Buscar cursos por nombre de carrera
exports.buscarPorCarreraNombre = async (req, res) => {
  try {
    const nombre = (req.query.nombre || req.query.q || '').trim();
    if (!nombre) return res.status(400).json({ message: 'Falta el nombre de la carrera (q o nombre)' });

    const cursos = await Curso.find({ carrera: nombre })
                              .collation({ locale: 'es', strength: 1 })
                              .lean();

    const map = await buildProfesorNameMap(cursos);
    res.json((cursos || []).map(c => normalizeCurso(c, map)));
  } catch (err) {
    console.error('buscarPorCarreraNombre error:', err);
    res.status(500).json({ message: 'Error buscando cursos por carrera' });
  }
};

