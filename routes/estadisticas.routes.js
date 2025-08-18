// routes/estadisticas.routes.js
const express = require('express');
const router = express.Router();
const { getEstadisticasApi } = require('../controllers/estadisticas.controller');

router.get('/', getEstadisticasApi);

module.exports = router;
