// routes/equipo.routes.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/equipo.controller');

// si tienes un middleware de auth global, puedes omitir require por ruta
router.get('/listado-por-rol', ctrl.listadoPorRol);
router.get('/proyectos',        ctrl.getProyectos);
router.get('/miembros-candidatos', ctrl.getMiembrosCandidatos);

router.get('/:id',  ctrl.getUno);
router.post('/',    ctrl.crear);
router.put('/:id',  ctrl.actualizar);
router.delete('/:id', ctrl.eliminar);

module.exports = router;
