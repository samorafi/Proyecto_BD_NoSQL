const mongoose = require('mongoose');

const comentarioSchema = new mongoose.Schema({
  id_tarea: { type: mongoose.Schema.Types.ObjectId, ref: 'Tarea', required: true },
  autor: { type: String, required: true }, // puede ser el id o el nombre del usuario
  contenido: { type: String, required: true },
  fecha: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Comentario', comentarioSchema);