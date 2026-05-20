const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    default: 'Staff Member'
  },
  role: {
    type: String,
    enum: ['admin', 'kitchen', 'waiter'],
    default: 'admin',
  }
}, { timestamps: true });

module.exports = mongoose.model('Admin', adminSchema);
