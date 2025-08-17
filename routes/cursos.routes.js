// routes/cursos.routes.js
const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const cursosCtrl = require('../controllers/cursos.controller');

router.use(auth(true));

// Diagnóstico de uso Express Router
console.log('[cursos.routes] usando express.Router():', typeof router.use);

router.get('/carreras', cursosCtrl.listarCarreras);
router.get('/profes',   cursosCtrl.listarProfesores);

//auth(true) debe devolver una función de Middleware
router.use((req, res, next) => auth(true)(req, res, next));

// sanity check para aislar errores de wiring
router.get('/_ping', (req, res) => res.json({ ok: true }));

// Rutas reales
router.get('/por-carrera', cursosCtrl.buscarPorCarreraNombre);
router.get('/listado-por-rol', cursosCtrl.listadoPorRol);
router.get('/',                cursosCtrl.getAll);
router.get('/:id',             cursosCtrl.getById);
router.post('/',               cursosCtrl.create);   // admin validado en controller
router.put('/:id',             cursosCtrl.update);   // admin validado en controller
router.delete('/:id',          cursosCtrl.remove);   // admin validado en controller

module.exports = router;

 