const Etiqueta = require('../models/etiqueta.model');

const getEtiquetasApi = async (req, res) => {
    try {
        const etiquetas = await Etiqueta.find();
        res.json(etiquetas);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener etiquetas' });
    }
};

const deleteEtiquetaApi = async (req, res) => {
  try {
    await Etiqueta.findByIdAndDelete(req.params.id);
    res.json({ message: "Etiqueta eliminada correctamente" });
  } catch (error) {
    res.status(500).json({ error: "Error al eliminar etiqueta" });
  }
};

module.exports = { getEtiquetasApi, deleteEtiquetaApi };
