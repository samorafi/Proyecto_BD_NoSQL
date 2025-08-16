const mongoose = require('mongoose');

const RolSchema = new mongoose.Schema({
  _id: { type: String },
  nombre: { type: String, required: true },
  permisos: [{ type: String }]
}, { collection: 'roles', versionKey: false });

module.exports = mongoose.model('Rol', RolSchema);
