const Log = require('../models/log.model');

const getLogsApi = async (req, res) => {
    try {
        const logs = await Log.find();
        res.json(logs);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener logs' });
    }
};

const deleteLogApi = async (req, res) => {
  try {
    await Log.findByIdAndDelete(req.params.id);
    res.json({ message: "Log eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ error: "Error al eliminar log" });
  }
};

module.exports = { getLogsApi, deleteLogApi };