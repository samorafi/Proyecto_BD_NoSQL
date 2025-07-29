const express = require('express');
const router = express.Router();
const tareasController = require('../controllers/tareas.controller');

// Crear una nueva tarea
router.post('/', tareasController.crearTarea);

// Obtener tareas de un usuario
router.get('/usuario/:id', tareasController.obtenerTareasPorUsuario);

// Obtener una tarea por ID
router.get('/:id', tareasController.obtenerTareaPorId);

// Actualizar estado de una tarea
router.patch('/:id/estado', tareasController.actualizarEstadoTarea);

// Editar tarea (fecha, prioridad, etc.)
router.patch('/:id', tareasController.editarTarea);

// Agregar comentario
router.post('/:id/comentario', tareasController.agregarComentario);

// Obtener tareas por filtro
router.get('/', tareasController.filtrarTareas);

// Obtener etiquetas
router.get('/extras/etiquetas', tareasController.obtenerEtiquetas);

// Obtener usuarios activos
router.get('/extras/usuarios', tareasController.obtenerUsuarios);

//Obtener detalle de tarea con comentario
router.get('/comentarios/tarea/:id', tareasController.obtenerComentariosPorTarea);

//Eliminar Tareas
router.delete('/:id', tareasController.eliminarTarea);

//Eliminar comentarios
router.delete('/comentarios/:id', tareasController.eliminarComentario);

module.exports = router;
