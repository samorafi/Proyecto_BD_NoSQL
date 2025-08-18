// routes/logs.routes.js
const express = require('express');
const router = express.Router();
const { getLogsApi } = require('../controllers/logs.controller');

router.get('/', getLogsApi);

module.exports = router;
