const mongoose = require('mongoose');

const estadisticaSchema = new mongoose.Schema({
  _id: { type: String },   // <- usar String porque tus ids son "stat001"
  usuario_id: { type: String, required: true },
  tareas_creadas: { type: Number, default: 0 },
  tareas_completadas: { type: Number, default: 0 },
  comentarios_realizados: { type: Number, default: 0 },
  archivos_subidos: { type: Number, default: 0 },
  ultima_actividad: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Estadistica', estadisticaSchema);
