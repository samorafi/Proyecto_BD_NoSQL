const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  _id: { type: String},
  accion: { type: String},
  usuario: { type: String },
  detalle: { type: String },
  fecha: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Log', logSchema);
