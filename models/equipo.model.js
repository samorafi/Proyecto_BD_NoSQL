// models/equipo.model.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const EquipoSchema = new Schema({
  _id: { type: String },                    // ej. "eq001"
  nombre: { type: String, required: true },
  id_proyecto: { type: String, required: true }, // ej. "p001"
  miembros: [{ type: String }],             // ej. ["u001","u004"]
  creadoPor: { type: String },
  actualizadoPor: { type: String }
}, { timestamps: true, versionKey: false });

EquipoSchema.index({ id_proyecto: 1, nombre: 1 }, { unique: true });

module.exports = mongoose.model('Equipo', EquipoSchema, 'equipos');
