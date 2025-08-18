const Estadistica = require('../models/estadistica.model');

const getEstadisticasApi = async (req, res) => {
  try {
    const estadisticas = await Estadistica.find().sort({ ultima_actividad: -1 });

    const formatted = estadisticas.map(stat => ({
      _id: stat._id,
      usuario_id: stat.usuario_id,
      tareas_creadas: stat.tareas_creadas,
      tareas_completadas: stat.tareas_completadas,
      comentarios_realizados: stat.comentarios_realizados,
      archivos_subidos: stat.archivos_subidos,
      ultima_actividad: stat.ultima_actividad
    }));

    res.json(formatted);
  } catch (error) {
    console.error("❌ Error en getEstadisticasApi:", error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
};

module.exports = { getEstadisticasApi };
