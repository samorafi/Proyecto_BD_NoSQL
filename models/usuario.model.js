const mongoose = require('mongoose');

const usuarioSchema = new mongoose.Schema({
  _id: { type: String },
  nombre: { type: String, required: true },
  rol: { type: String, enum: ['estudiante', 'profesor', 'admin'], required: true },
  activo: { type: Boolean, default: 'true' }
});

module.exports = mongoose.model('Usuario', usuarioSchema);