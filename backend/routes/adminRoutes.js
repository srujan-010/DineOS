const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const Order = require('../models/Order');
const Config = require('../models/Config');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { protect, admin } = require('../middleware/auth');

// @route POST /api/admin/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Seed initial admin if none exists
    const adminCount = await Admin.countDocuments();
    if (adminCount === 0) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);
      await Admin.create({ username: 'admin', password: hashedPassword, role: 'admin', name: 'System Admin' });
    }

    const user = await Admin.findOne({ username });
    if (user && (await bcrypt.compare(password, user.password))) {
      res.json({
        _id: user._id,
        username: user.username,
        role: user.role,
        name: user.name,
        token: jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '30d' })
      });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route GET /api/admin/staff
// @desc Get all staff members
// @access Admin
router.get('/staff', protect, admin, async (req, res) => {
  try {
    const staff = await Admin.find({ role: { $ne: 'admin' } }).select('-password');
    res.json(staff);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route POST /api/admin/staff
// @desc Create new staff member (Waiter / Kitchen)
// @access Admin
router.post('/staff', protect, admin, async (req, res) => {
  try {
    const { username, password, name, role } = req.body;
    
    const userExists = await Admin.findOne({ username });
    if (userExists) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const staff = await Admin.create({
      username,
      password: hashedPassword,
      name,
      role
    });

    res.status(201).json({
      _id: staff._id,
      username: staff.username,
      name: staff.name,
      role: staff.role
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// @route GET /api/admin/history
// @desc Get payment collection history
// @access Admin
router.get('/history', protect, admin, async (req, res) => {
  try {
    const history = await Order.find({ status: 'Paid' })
      .populate('collectedBy', 'name username')
      .populate('items.menuItem')
      .sort({ updatedAt: -1 });
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route GET /api/admin/config/upi
// @desc Get UPI Config (Public)
router.get('/config/upi', async (req, res) => {
  try {
    let config = await Config.findOne({ key: 'upi_details' });
    if (!config) {
      config = await Config.create({
        key: 'upi_details',
        value: { upiId: 'cafe@upi', upiName: 'Cafe OS' }
      });
    }
    res.json(config.value);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route POST /api/admin/config/upi
// @desc Update UPI Config
// @access Admin
router.post('/config/upi', protect, admin, async (req, res) => {
  try {
    const { upiId, upiName } = req.body;
    let config = await Config.findOneAndUpdate(
      { key: 'upi_details' },
      { value: { upiId, upiName } },
      { new: true, upsert: true }
    );
    res.json(config.value);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
