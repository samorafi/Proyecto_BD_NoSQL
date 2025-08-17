const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/proyectos.controller');

router.get('/listado-por-rol', ctrl.listadoPorRol);
router.get('/catalogo',        ctrl.catalogo);
router.get('/',                ctrl.listar);
router.get('/:id',             ctrl.getUno);
router.post('/',               ctrl.crear);
router.put('/:id',             ctrl.actualizar);
router.delete('/:id',          ctrl.eliminar);

module.exports = router;
// app.use('/api/proyectos', require('./routes/proyecto.routes'));
