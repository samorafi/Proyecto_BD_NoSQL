const express = require('express');
const router = express.Router();
const tareasController = require('../controllers/tareas.controller');
const { auth, requireRole } = require('../middleware/auth');
const Tarea = require('../models/tarea.model');

// ===== Helpers de autorización =====
function isElevated(user) {
  return user && (user.rolNombre === 'profesor' || user.rolNombre === 'administrador');
}

async function participantOrElevated(req, res, next) {
  try {
    const { id } = req.params;
    const tarea = await Tarea.findById(id).lean();
    if (!tarea) return res.status(404).json({ error: 'Tarea no encontrada' });

    const uid = req.user?._id;
    const esParticipante = Array.isArray(tarea.responsables) && tarea.responsables.includes(uid);

    if (esParticipante || isElevated(req.user)) return next();
    return res.status(403).json({ error: 'No autorizado' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Error verificando permisos' });
  }
}

// Para GET /usuario/:id — estudiante solo puede ver lo propio, profesor/admin pueden ver cualquiera
function sameUserOrElevated(req, res, next) {
  const requestId = req.params.id;
  if (isElevated(req.user) || req.user?._id === requestId) return next();
  return res.status(403).json({ error: 'No autorizado' });
}

// Todas las rutas requieren autenticación
router.use(auth(true));

// ===== Rutas =====

// Crear una nueva tarea (permitido a cualquier autenticado)
router.post('/', tareasController.crearTarea);

// Obtener tareas de un usuario
router.get('/usuario/:id', sameUserOrElevated, tareasController.obtenerTareasPorUsuario);

// Obtener etiquetas (cualquiera autenticado)
router.get('/extras/etiquetas', tareasController.obtenerEtiquetas);

// Obtener usuarios activos (solo profesor/admin)
router.get('/extras/usuarios', requireRole('profesor', 'administrador'), tareasController.obtenerUsuarios);

// Obtener tareas por filtro
router.get('/', tareasController.filtrarTareas);

// Obtener una tarea por ID (participante o rol elevado)
router.get('/:id', participantOrElevated, tareasController.obtenerTareaPorId);

// Actualizar estado de una tarea (participante o rol elevado)
router.patch('/:id/estado', participantOrElevated, tareasController.actualizarEstadoTarea);

// Editar tarea (fecha, prioridad, etc.) (participante o rol elevado)
router.patch('/:id', participantOrElevated, tareasController.editarTarea);

// Agregar comentario (participante o rol elevado)
router.post('/:id/comentario', participantOrElevated, tareasController.agregarComentario);

// Obtener detalle de tarea con comentario (participante o rol elevado)
router.get('/comentarios/tarea/:id', participantOrElevated, tareasController.obtenerComentariosPorTarea);

// Eliminar Tareas (participante o rol elevado)
router.delete('/:id', participantOrElevated, tareasController.eliminarTarea);

// Eliminar comentarios (roles elevados — o implementa verificación de autor del comentario si tienes ese dato)
router.delete('/comentarios/:id', requireRole('profesor', 'administrador'), tareasController.eliminarComentario);

module.exports = router;
