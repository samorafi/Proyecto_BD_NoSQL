const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const ctrl = require('../controllers/proyectos.controller');

router.use(auth(true)); // todas protegidas

// Listado según rol (estudiante ve los suyos, prof/admin todos)
router.get('/listado-por-rol', ctrl.listadoPorRol);

// Catálogo de cursos para el modal
router.get('/cursos', ctrl.cursosCatalogo);

// CRUD
router.get('/:id', ctrl.getUno);
router.get('/', ctrl.listar);
router.post('/', ctrl.crear);
router.put('/:id', ctrl.actualizar);
router.delete('/:id', ctrl.eliminar);

module.exports = router;
