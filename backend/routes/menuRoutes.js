const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const MenuItem = require('../models/MenuItem');
const { protect, admin } = require('../middleware/auth');

// @route GET /api/menu
// @desc Get all categories with their active menu items
// @access Public
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find().sort({ sortOrder: 1 });
    const items = await MenuItem.find({ isAvailable: true }).populate('category');
    
    const menuData = categories.map(cat => ({
      ...cat.toObject(),
      items: items.filter(item => item.category._id.toString() === cat._id.toString())
    }));
    
    res.json(menuData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route POST /api/menu/category
// @access Admin
router.post('/category', protect, admin, async (req, res) => {
  try {
    const category = await Category.create(req.body);
    res.status(201).json(category);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// @route POST /api/menu/item
// @access Admin
router.post('/item', protect, admin, async (req, res) => {
  try {
    const item = await MenuItem.create(req.body);
    res.status(201).json(item);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// @route PUT /api/menu/item/:id
// @access Admin
router.put('/item/:id', protect, admin, async (req, res) => {
  try {
    const item = await MenuItem.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(item);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
