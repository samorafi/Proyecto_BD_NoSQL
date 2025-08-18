// routes/etiquetas.routes.js
const express = require('express');
const router = express.Router();
const { getEtiquetasApi, deleteEtiquetaApi } = require('../controllers/etiquetas.controller');

router.get('/', getEtiquetasApi);
router.delete('/:id', deleteEtiquetaApi);

module.exports = router;
