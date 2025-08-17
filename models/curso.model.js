// models/curso.model.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const CursoSchema = new Schema({
  _id:        { type: String, default: () => new mongoose.Types.ObjectId().toString() },
  codigo:     { type: String, required: true, unique: true },
  nombre:     { type: String, required: true },

  // Opción A: carrera como referencia (recomendado)
  carrera_id: { type: String, ref: 'Carrera' },

  // Opción B (opcional): cache como texto si quieres
  carrera:    { type: String },

  // Profesor titular
  profesor_id: { type: String, ref: 'Usuario' },

  // (opcional) varios profesores
  // profesores: [{ type: String, ref: 'Usuario' }],
}, { collection: 'cursos', versionKey: false });

module.exports = mongoose.model('Curso', CursoSchema);
