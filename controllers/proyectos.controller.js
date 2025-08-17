// controllers/proyectos.controller.js
const Proyecto = require('../models/proyecto.model');
const Equipo   = require('../models/equipo.model');   // {_id, nombre, id_proyecto:"p001", miembros:["u001",...]} IDs string

// ===== Helpers de permisos (ajusta a tu auth real) =====
function isAdminOrProf(u){
  const r = (u?.rolNombre || '').toLowerCase();
  return r === 'administrador' || r === 'profesor';
}
function canManage(u){ return isAdminOrProf(u); }

// ====== LISTADO POR ROL (para tablas con permisos) ======
exports.listadoPorRol = async (req, res) => {
  try{
    if(!req.user) return res.status(401).json({ error: 'No autenticado' });

    const rol = (req.user.rolNombre || '').toLowerCase();
    let filter = {};

    if(rol === 'estudiante'){
      // Proyectos en los que el usuario participa vía algún equipo
      const equipos = await Equipo.find({ miembros: String(req.user._id) }, { id_proyecto:1 }).lean();
      const ids = [...new Set(equipos.map(e => e.id_proyecto).filter(Boolean))];
      filter = ids.length ? { _id: { $in: ids } } : { _id: '__none__' }; // vacío
    }else{
      // Admin/Profesor: opcionalmente permitir ?id_curso=&estado=&q=
      const { id_curso, estado, q } = req.query || {};
      if(id_curso) filter.id_curso = String(id_curso);
      if(estado)   filter.estado   = String(estado);
      if(q){
        filter.$or = [
          { nombre:      new RegExp(q, 'i') },
          { descripcion: new RegExp(q, 'i') }
        ];
      }
    }

    const proyectos = await Proyecto.find(filter).sort({ nombre: 1 }).lean();
    const payload = proyectos.map(p => ({
      id: p._id,
      nombre: p.nombre,
      descripcion: p.descripcion || '',
      estado: p.estado || 'activo',
      id_curso: p.id_curso || null,
      fecha_creacion: p.fecha_creacion || null
    }));

    res.json({
      canCreate: canManage(req.user),
      canEdit:   canManage(req.user),
      canDelete: canManage(req.user),
      proyectos: payload
    });
  }catch(e){
    console.error('proyectos.listadoPorRol', e);
    res.status(500).send('No se pudo cargar el listado');
  }
};

// ====== LISTAR (simple con filtros, sin permisos) ======
exports.listar = async (req, res) => {
  try{
    const { id_curso, estado, q } = req.query || {};
    const filter = {};
    if(id_curso) filter.id_curso = String(id_curso);
    if(estado)   filter.estado   = String(estado);
    if(q){
      filter.$or = [
        { nombre:      new RegExp(q, 'i') },
        { descripcion: new RegExp(q, 'i') }
      ];
    }

    const proyectos = await Proyecto.find(filter).sort({ nombre: 1 }).lean();
    res.json(proyectos);
  }catch(e){
    res.status(500).json({ error: 'No se pudieron listar los proyectos' });
  }
};

// ====== OBTENER UNO ======
exports.getUno = async (req, res) => {
  try{
    const p = await Proyecto.findById(String(req.params.id)).lean();
    if(!p) return res.status(404).json({ error: 'Proyecto no encontrado' });

    // Si quisieras restringir a estudiante solo si está en algún equipo del proyecto:
    if(req.user && (req.user.rolNombre||'').toLowerCase()==='estudiante'){
      const hasTeam = await Equipo.exists({ id_proyecto: p._id, miembros: String(req.user._id) });
      if(!hasTeam) return res.status(403).json({ error: 'Sin permiso' });
    }

    res.json(p);
  }catch(e){
    res.status(500).json({ error: 'No se pudo obtener el proyecto' });
  }
};

// ====== CREAR ======
exports.crear = async (req, res) => {
  try{
    if(!req.user || !canManage(req.user)) return res.status(403).json({ error: 'Sin permiso' });

    let { _id, nombre, descripcion, fecha_creacion, id_curso, estado } = req.body || {};
    if(!nombre) return res.status(400).json({ error: 'El nombre es obligatorio' });

    const newId = _id || ('p' + Date.now());
    const doc = {
      _id: String(newId),
      nombre: String(nombre).trim(),
      descripcion: descripcion ? String(descripcion).trim() : '',
      id_curso: id_curso ? String(id_curso) : undefined,
      estado: estado ? String(estado) : 'activo'
    };

    if(fecha_creacion){
      const d = new Date(fecha_creacion);
      if(!isNaN(d)) doc.fecha_creacion = d;
    }

    await Proyecto.create(doc);
    res.json({ message: 'Proyecto creado', id: newId });
  }catch(e){
    if(e?.code === 11000) return res.status(409).json({ error: 'Ya existe un proyecto con ese _id' });
    res.status(500).json({ error: 'No se pudo crear el proyecto' });
  }
};

// ====== ACTUALIZAR ======
exports.actualizar = async (req, res) => {
  try{
    if(!req.user || !canManage(req.user)) return res.status(403).json({ error: 'Sin permiso' });

    const { nombre, descripcion, fecha_creacion, id_curso, estado } = req.body || {};
    const update = {};
    if(nombre)        update.nombre = String(nombre).trim();
    if(descripcion!=null) update.descripcion = String(descripcion).trim();
    if(id_curso!=null)    update.id_curso = String(id_curso);
    if(estado)        update.estado = String(estado);

    if(fecha_creacion){
      const d = new Date(fecha_creacion);
      if(!isNaN(d)) update.fecha_creacion = d;
    }

    const p = await Proyecto.findByIdAndUpdate(String(req.params.id), update, { new:true, runValidators:true }).lean();
    if(!p) return res.status(404).json({ error: 'Proyecto no encontrado' });

    res.json({ message: 'Actualizado', id: p._id });
  }catch(e){
    res.status(500).json({ error: 'No se pudo actualizar el proyecto' });
  }
};

// ====== ELIMINAR ======
exports.eliminar = async (req, res) => {
  try{
    if(!req.user || !canManage(req.user)) return res.status(403).json({ error: 'Sin permiso' });

    // (opcional) Validar que no existan equipos asociados
    const inUse = await Equipo.exists({ id_proyecto: String(req.params.id) });
    if(inUse) return res.status(409).json({ error: 'No se puede eliminar: hay equipos asociados' });

    const del = await Proyecto.findByIdAndDelete(String(req.params.id)).lean();
    if(!del) return res.status(404).json({ error: 'Proyecto no encontrado' });

    res.json({ message: 'Proyecto eliminado' });
  }catch(e){
    res.status(500).json({ error: 'No se pudo eliminar el proyecto' });
  }
};

// ====== CATÁLOGO (para combos: _id + nombre) ======
exports.catalogo = async (_req, res) => {
  try{
    const proyectos = await Proyecto.find({}, { _id:1, nombre:1 }).sort({ nombre:1 }).lean();
    res.json({ proyectos });
  }catch(e){
    res.status(500).json({ error: 'No se pudo cargar el catálogo' });
  }
};
