const express = require('express');
const router = express.Router();
const Table = require('../models/Table');
const { protect, admin } = require('../middleware/auth');

// @route GET /api/tables
// @desc Get all tables
// @access Admin
router.get('/', protect, admin, async (req, res) => {
  try {
    const tables = await Table.find().sort({ tableNumber: 1 });
    res.json(tables);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route POST /api/tables
// @desc Create a new table
// @access Admin
router.post('/', protect, admin, async (req, res) => {
  try {
    const table = await Table.create(req.body);
    res.status(201).json(table);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// @route POST /api/tables/:tableNumber/session
// @desc Generate/Validate a session for a table (Public when scanning QR)
router.post('/:tableNumber/session', async (req, res) => {
  try {
    const { tableNumber } = req.params;
    let table = await Table.findOne({ tableNumber });
    
    // Auto-create table for demo purposes if it doesn't exist
    if (!table) {
      table = await Table.create({ tableNumber });
    }

    // A real app might check if the table is currently "paid" or "empty" to reset session
    // For simplicity, we just generate a new session if none exists, or keep the current one.
    if (!table.currentSessionId) {
      table.currentSessionId = Math.random().toString(36).substring(2, 15);
      await table.save();

      const io = req.app.get('io');
      if (io) {
        io.emit('table-status-updated', { tableNumber: table.tableNumber, status: 'Occupied' });
      }
    }

    res.json({ sessionId: table.currentSessionId, tableNumber: table.tableNumber });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route POST /api/tables/:tableNumber/clear
// @desc Clear table session (when paid/completed)
// @access Admin/Kitchen
router.post('/:tableNumber/clear', protect, async (req, res) => {
  try {
    const table = await Table.findOneAndUpdate(
      { tableNumber: req.params.tableNumber },
      { currentSessionId: null },
      { new: true }
    );
    
    // Also mark all active orders for this table as Paid with payment details
    const Order = require('../models/Order');
    const paymentMethod = req.body.paymentMethod || 'Cash';
    
    await Order.updateMany(
      { tableNumber: req.params.tableNumber, status: { $ne: 'Paid' } },
      { 
        status: 'Paid',
        paymentStatus: 'Completed',
        paymentMethod: paymentMethod,
        collectedBy: req.user.id
      }
    );

    // Emit live sync event to all active dashboards
    const io = req.app.get('io');
    if (io) {
      io.emit('table-status-updated', { tableNumber: req.params.tableNumber, status: 'Available' });
    }

    res.json(table);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
