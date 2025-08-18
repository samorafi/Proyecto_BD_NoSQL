const Log = require('../models/log.model');

const getLogsApi = async (req, res) => {
    try {
        const logs = await Log.find().sort({ fecha: -1 });
        res.json(logs);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener logs' });
    }
};

module.exports = { getLogsApi };
