// routes/estadisticas.routes.js
const express = require('express');
const router = express.Router();
const { getEstadisticasApi, deleteEstadisticaApi } = require('../controllers/estadisticas.controller');

router.get('/', getEstadisticasApi);
router.delete('/:id', deleteEstadisticaApi);

module.exports = router;
