const mongoose = require('mongoose');

const tableSchema = new mongoose.Schema({
  tableNumber: {
    type: Number,
    required: true,
    unique: true,
  },
  qrCode: {
    type: String, // could be URL or base64 image
  },
  currentSessionId: {
    type: String,
    default: null,
  }
}, { timestamps: true });

module.exports = mongoose.model('Table', tableSchema);
