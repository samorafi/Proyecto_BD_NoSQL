const mongoose = require('mongoose');

const tareaSchema = new mongoose.Schema({
  _id: { type: String }, // IDs personalizados como "t001", "t002"
  titulo: { type: String, required: true },
  descripcion: { type: String },
  id_proyecto: { type: String, required: true }, // referencia a proyecto
  responsables: [{ type: String, ref: 'Usuario' }], // IDs de usuarios
  fecha_limite: { type: Date },
  prioridad: { type: String, enum: ['alta', 'media', 'baja'], default: 'media' },
  estado: { type: String, enum: ['pendiente', 'en_proceso', 'finalizada'], default: 'pendiente' },
  etiquetas: [{ type: String }] // IDs de etiquetas
}, {
  timestamps: true
});

module.exports = mongoose.model('Tarea', tareaSchema);
