const Tarea = require('../models/tarea.model');
const Comentario = require('../models/comentario.model');
const Etiqueta = require('../models/etiqueta.model');
const Usuario = require('../models/usuario.model');

// POST /api/tareas
const crearTarea = async (req, res) => {
  try {
    const {
      titulo,
      descripcion,
      id_proyecto,
      responsables,
      fecha_limite,
      prioridad,
      etiquetas
    } = req.body;

    const nuevaTarea = new Tarea({
      titulo,
      descripcion,
      id_proyecto,
      responsables,
      fecha_limite,
      prioridad,
      etiquetas
    });

    const tareaGuardada = await nuevaTarea.save();
    res.status(201).json({ mensaje: 'Tarea creada exitosamente', tarea: tareaGuardada });
  } catch (error) {
    console.error('Error al crear tarea:', error);
    res.status(500).json({ mensaje: 'Error al crear tarea' });
  }
};

// GET /api/tareas/usuario/:id
const obtenerTareasPorUsuario = async (req, res) => {
  try {
    const usuarioId = req.params.id;
    const tareas = await Tarea.find({ responsables: usuarioId });
    res.status(200).json({ tareas });
  } catch (error) {
    console.error('Error al obtener tareas por usuario:', error);
    res.status(500).json({ mensaje: 'Error al obtener tareas' });
  }
};

// GET /api/tareas/:id
const obtenerTareaPorId = async (req, res) => {
  try {
    const tareaId = req.params.id;
    const tarea = await Tarea.findById(tareaId);

    if (!tarea) {
      return res.status(404).json({ mensaje: 'Tarea no encontrada' });
    }

    res.status(200).json({ tarea });
  } catch (error) {
    console.error('Error al obtener tarea por ID:', error);
    res.status(500).json({ mensaje: 'Error al obtener la tarea' });
  }
};

// PATCH /api/tareas/:id/estado
const actualizarEstadoTarea = async (req, res) => {
  try {
    const tareaId = req.params.id;
    const { nuevoEstado } = req.body;

    const estadosValidos = ['pendiente', 'en_proceso', 'finalizada'];
    if (!estadosValidos.includes(nuevoEstado)) {
      return res.status(400).json({ mensaje: 'Estado no válido' });
    }

    const tareaActualizada = await Tarea.findByIdAndUpdate(
      tareaId,
      { estado: nuevoEstado },
      { new: true }
    );

    if (!tareaActualizada) {
      return res.status(404).json({ mensaje: 'Tarea no encontrada' });
    }

    res.status(200).json({ mensaje: 'Estado actualizado', tarea: tareaActualizada });
  } catch (error) {
    console.error('Error al actualizar estado de la tarea:', error);
    res.status(500).json({ mensaje: 'Error al actualizar el estado' });
  }
};

// PATCH /api/tareas/:id
const editarTarea = async (req, res) => {
  try {
    const tareaId = req.params.id;
    const {
      titulo,
      descripcion,
      responsables,
      fecha_limite,
      prioridad,
      etiquetas
    } = req.body;

    const camposActualizados = {
      ...(titulo && { titulo }),
      ...(descripcion && { descripcion }),
      ...(responsables && { responsables }),
      ...(fecha_limite && { fecha_limite }),
      ...(prioridad && { prioridad }),
      ...(etiquetas && { etiquetas })
    };

    const tareaActualizada = await Tarea.findByIdAndUpdate(
      tareaId,
      { $set: camposActualizados },
      { new: true, runValidators: true }
    );

    if (!tareaActualizada) {
      return res.status(404).json({ mensaje: 'Tarea no encontrada' });
    }

    res.status(200).json({ mensaje: 'Tarea actualizada', tarea: tareaActualizada });
  } catch (error) {
    console.error('Error al editar tarea:', error);
    res.status(500).json({ mensaje: 'Error al editar la tarea' });
  }
};

// POST /api/tareas/:id/comentario
const agregarComentario = async (req, res) => {
  try {
    const tareaId = req.params.id;
    const autor = req.user._id; // <-- Cambiado de autorId a autor
    const { contenido } = req.body;

    if (!autor || !contenido) {
      return res.status(400).json({ mensaje: 'Autor y contenido son obligatorios.' });
    }

    const nuevoComentario = new Comentario({
      id_tarea: tareaId,
      autor, // <-- ¡Ahora el nombre coincide con el del esquema!
      contenido,
      fecha: new Date()
    });

    const comentarioGuardado = await nuevoComentario.save();

    res.status(201).json({
      mensaje: 'Comentario agregado exitosamente',
      comentario: comentarioGuardado
    });
  } catch (error) {
    console.error('Error al agregar comentario:', error);
    res.status(500).json({ mensaje: 'Error al agregar el comentario' });
  }
};

// GET /api/tareas?estado&etiqueta&responsable
const filtrarTareas = async (req, res) => {
  try {
    const { estado, etiqueta, responsable } = req.query;

    const filtro = {};
    if (estado) filtro.estado = estado;
    if (etiqueta) filtro.etiquetas = etiqueta;
    if (responsable) filtro.responsables = responsable;

    const tareas = await Tarea.find(filtro);
    res.status(200).json({ tareas });
  } catch (error) {
    console.error('Error al filtrar tareas:', error);
    res.status(500).json({ mensaje: 'Error al filtrar tareas' });
  }
};

// GET /api/tareas/extras/etiquetas
const obtenerEtiquetas = async (req, res) => {
  try {
    const etiquetas = await Etiqueta.find({});
    res.status(200).json({ etiquetas });
  } catch (error) {
    console.error('Error al obtener etiquetas:', error);
    res.status(500).json({ mensaje: 'Error al obtener las etiquetas' });
  }
};

// GET /api/tareas/extras/usuarios
const obtenerUsuarios = async (req, res) => {
  try {
    const usuarios = await Usuario.find({ activo: true }).select('_id nombre rol_id');
    res.status(200).json({ usuarios });
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ mensaje: 'Error al obtener los usuarios' });
  }
};

// GET /api/tareas/:id/comentarios
const obtenerComentariosPorTarea = async (req, res) => {
  try {
    const comentarios = await Comentario.find({ id_tarea: req.params.id })
  .sort({ fecha: -1 })
  .populate({ path: '_id', select: 'nombre rol' });
    res.status(200).json({ comentarios });
  } catch (error) {
    console.error('Error al obtener comentarios:', error);
    res.status(500).json({ mensaje: 'Error al obtener comentarios' });
  }
};

// DELETE /api/tareas/:id
const eliminarTarea = async (req, res) => {
  try {
    const tareaId = req.params.id;
    const tareaEliminada = await Tarea.findByIdAndDelete(tareaId);

    if (!tareaEliminada) {
      return res.status(404).json({ mensaje: 'Tarea no encontrada' });
    }

    res.status(200).json({ mensaje: 'Tarea eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar tarea:', error);
    res.status(500).json({ mensaje: 'Error al eliminar la tarea' });
  }
};

// DELETE /api/comentarios/:id
const eliminarComentario = async (req, res) => {
  try {
    const comentarioId = req.params.id;
    const eliminado = await Comentario.findByIdAndDelete(comentarioId);

    if (!eliminado) {
      return res.status(404).json({ mensaje: 'Comentario no encontrado' });
    }

    res.status(200).json({ mensaje: 'Comentario eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar comentario:', error);
    res.status(500).json({ mensaje: 'Error al eliminar el comentario' });
  }
};

module.exports = {
  crearTarea,
  obtenerTareasPorUsuario,
  obtenerTareaPorId,
  actualizarEstadoTarea,
  editarTarea,
  agregarComentario,
  filtrarTareas,
  obtenerEtiquetas,
  obtenerUsuarios,
  obtenerComentariosPorTarea,
  eliminarTarea,
  eliminarComentario
};
