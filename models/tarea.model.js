const mongoose = require('mongoose');

const tareaSchema = new mongoose.Schema({
  titulo: { type: String, required: true },
  descripcion: { type: String },
  id_proyecto: { type: String, required: true },
  responsables: [{ type: String, ref: 'Usuario' }],
  fecha_limite: { type: Date },
  prioridad: { type: String, enum: ['alta', 'media', 'baja'], default: 'media' },
  estado: { type: String, enum: ['pendiente', 'en_proceso', 'finalizada'], default: 'pendiente' },
  etiquetas: [{ type: String }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Tarea', tareaSchema);
