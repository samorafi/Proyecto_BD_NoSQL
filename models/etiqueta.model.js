const mongoose = require('mongoose');

const etiquetaSchema = new mongoose.Schema({
  _id: { type: String},
  nombre: { type: String},
  color: { type: String },
});

module.exports = mongoose.model('Etiqueta', etiquetaSchema);
