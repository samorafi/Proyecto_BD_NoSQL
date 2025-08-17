// models/carrera.model.js
const mongoose = require('mongoose');

const CarreraSchema = new mongoose.Schema({
  _id:   { type: String, required: true },     // p.ej. "car001"
  nombre:{ type: String, required: true },     // p.ej. "Ingeniería en Sistemas"
  codigo:{ type: String }                      // p.ej. "CARR-001"
}, { collection: 'carreras', versionKey: false });

module.exports = mongoose.model('Carrera', CarreraSchema);
