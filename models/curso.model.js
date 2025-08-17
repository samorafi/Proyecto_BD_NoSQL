// models/curso.model.js
const mongoose = require('mongoose');

const cursoSchema = new mongoose.Schema({
  _id:         { type: String, default: () => new mongoose.Types.ObjectId().toString() },
  codigo:      { type: String, required: true, unique: true },
  nombre:      { type: String, required: true },
  profesor_id: { type: String, ref: 'Usuario', required: true },
  carrera:     { type: String, required: true }
}, {
  collection: 'cursos',
  timestamps: true,
  versionKey: false
});

module.exports = mongoose.model('Curso', cursoSchema);
 