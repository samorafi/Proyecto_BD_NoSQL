const mongoose = require('mongoose');

const UsuarioSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => new mongoose.Types.ObjectId().toString()
  },
  nombre: { type: String, required: true },
  correo: { type: String, required: true, unique: true, lowercase: true, trim: true },
  rol_id: { type: String, ref: 'Rol', required: true },
  activo: { type: Boolean, default: true },
  carrera: { type: String },
  password: { type: String, required: true },
  cursos_ids: { type: [String], default: [] }
}, { collection: 'usuarios', versionKey: false });

module.exports = mongoose.model('Usuario', UsuarioSchema);
