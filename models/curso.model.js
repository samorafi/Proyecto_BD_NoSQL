// models/curso.model.js
const { Schema, model } = require('mongoose');

const CursoSchema = new Schema({
  _id:         { type: String },                 
  codigo:      { type: String, required: true, unique: true },
  nombre:      { type: String, required: true },
  profesor_id: { type: String, required: true }, 
  carrera:     { type: String },                 
}, { collection: 'cursos', versionKey: false });

module.exports = model('Curso', CursoSchema);