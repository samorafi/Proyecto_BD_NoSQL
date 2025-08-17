// models/proyecto.model.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const ProyectoSchema = new Schema({
  _id:           { type: String },                 // p001, p002...
  nombre:        { type: String, required: true, trim: true },
  descripcion:   { type: String, default: '' },
  fecha_creacion:{ type: Date },                   // ISO en tu insertMany
  id_curso:      { type: String },                 // c001...
  estado:        { type: String, default: 'activo', enum: ['activo','inactivo'] }
}, {
  versionKey: false,
  timestamps: false                                 // ya traes fecha_creacion
});

ProyectoSchema.index({ nombre: 1 });
ProyectoSchema.index({ id_curso: 1 });

module.exports = mongoose.model('Proyecto', ProyectoSchema, 'proyectos');
