const mongoose = require('mongoose');

const comentarioSchema = new mongoose.Schema({
  id_tarea: { type: String, required: true, ref: 'Tarea' }, // 🔥 ahora es String
  autor: { type: String, required: true, ref: 'Usuario' },  // también como string (ej: "u001")
  contenido: { type: String, required: true },
  fecha: { type: Date, default: Date.now }
}, {
  timestamps: true
});

module.exports = mongoose.model('Comentario', comentarioSchema);
