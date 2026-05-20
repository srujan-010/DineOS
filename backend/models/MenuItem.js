const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  price: {
    type: Number,
    required: true,
  },
  image: {
    type: String,
    required: true,
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
  },
  type: {
    type: String,
    enum: ['veg', 'non-veg'],
    required: true,
  },
  isAvailable: {
    type: Boolean,
    default: true,
  },
  prepTime: {
    type: Number, // in minutes
    default: 15,
  },
  popular: {
    type: Boolean,
    default: false,
  }
}, { timestamps: true });

module.exports = mongoose.model('MenuItem', menuItemSchema);
