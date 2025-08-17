const { Schema, model } = require('mongoose');

const EquipoSchema = new Schema({
  _id:         { type: String },               
  nombre:      { type: String, required: true },
  id_proyecto: { type: String, required: true }, 
  miembros:    { type: [String], default: [] }   
}, { collection: 'equipos', versionKey: false });

module.exports = model('Equipo', EquipoSchema);
