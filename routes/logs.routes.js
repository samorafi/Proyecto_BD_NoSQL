// routes/logs.routes.js
const express = require('express');
const router = express.Router();
const { getLogsApi, deleteLogApi } = require('../controllers/logs.controller');

router.get('/', getLogsApi);
router.delete('/:id', deleteLogApi);

module.exports = router;
