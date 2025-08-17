// routes/equipo.routes.js
const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const ctrl = require('../controllers/equipo.controller');

// todas requieren sesión
router.use(auth(true));
router.get('/_debug', ctrl.debugResumen);


// catálogos / listados
router.get('/listado-por-rol',     ctrl.listadoPorRol);
router.get('/proyectos',           ctrl.getProyectos);
router.get('/miembros-candidatos', ctrl.getMiembrosCandidatos);

// crud
router.get('/:id',    ctrl.getUno);
router.post('/',      ctrl.crear);
router.put('/:id',    ctrl.actualizar);
router.delete('/:id', ctrl.eliminar);

module.exports = router;
