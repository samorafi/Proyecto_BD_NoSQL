// ... (resto del archivo igual al que ya te pasé antes)
const Equipo = require('../models/equipo.model');

// =======================================================
// GET /api/proyectos/:id  (detalle)  ← ACTUALIZADO para incluir equipos
// =======================================================
exports.getById = async (req, res) => {
  try {
    const p = await Proyecto.findById(req.params.id).lean();
    if (!p) return res.status(404).json({ message: 'Proyecto no encontrado' });

    const rol = getRol(req);
    const uid = getUserId(req);
    if (!isAdmin(req)){
      const permitidos = await cursosPermitidosIds(req);
      const esMiembro = (p.miembros||[]).some(m => m.user_id === String(uid));
      const esCreador = String(p.creado_por) === String(uid);
      if (permitidos && !permitidos.includes(String(p.id_curso)) && !esMiembro && !esCreador){
        return res.status(403).json({ message: 'No autorizado para ver este proyecto' });
      }
    }

    const cursoMap = await buildCursoMap([p]);

    // ==== NUEVO: cargar equipos del proyecto ====
    const equipos = await Equipo.find({ id_proyecto: String(p._id) }).lean();
    const allUserIds = [...new Set([
      p.creado_por,
      ...(p.miembros||[]).map(m => m.user_id),
      ...equipos.flatMap(e => e.miembros || [])
    ])];
    const usuarioMap = await buildUsuarioMap(allUserIds);

    const base = normalizeProyecto(p, cursoMap, usuarioMap);
    base.equipos = equipos.map(e => ({
      id: String(e._id),
      nombre: e.nombre,
      miembros: (e.miembros||[]).map(uid => ({
        user_id: uid,
        nombre: usuarioMap[String(uid)]?.nombre || uid
      }))
    }));
    base.equipos_count = base.equipos.length;
    // ============================================

    res.json(base);
  } catch (err) {
    console.error('proyectos.getById error:', err);
    res.status(500).json({ message: 'Error obteniendo proyecto' });
  }
};
