const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const { protect } = require('../middleware/auth'); // assuming protect allows both admin/kitchen roles

// @route POST /api/orders
// @desc Create a new order (Public for customers)
router.post('/', async (req, res) => {
  try {
    const { tableNumber, sessionId, items, totalAmount } = req.body;
    
    const order = await Order.create({
      tableNumber,
      sessionId,
      items,
      totalAmount
    });

    // Populate item details before emitting
    await order.populate('items.menuItem');

    // Emit socket event to kitchen and waiters
    const io = req.app.get('io');
    if (io) {
      io.to('kitchen').to('waiter').emit('new-order', order);
    }

    res.status(201).json(order);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// @route GET /api/orders/kitchen
// @desc Get active orders for kitchen
// @access Kitchen/Admin
router.get('/kitchen', protect, async (req, res) => {
  try {
    const activeOrders = await Order.find({ status: { $ne: 'Paid' } })
      .populate('items.menuItem')
      .sort({ createdAt: 1 });
    res.json(activeOrders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route PUT /api/orders/:id/status
// @desc Update order status
// @access Kitchen/Admin
router.put('/:id/status', protect, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true })
      .populate('items.menuItem');
      
    // Notify the specific table
    const io = req.app.get('io');
    if (io && order) {
      io.to(`table-${order.tableNumber}`).emit('status-update', order);
      // Also notify kitchen and waiters to update their boards
      io.to('kitchen').to('waiter').emit('order-updated', order);
    }
    
    res.json(order);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// @route GET /api/orders/table/:tableNumber
// @desc Get active orders for a specific table (Public for customers at table)
router.get('/table/:tableNumber', async (req, res) => {
  try {
    const { sessionId } = req.query;
    const query = { tableNumber: req.params.tableNumber, status: { $ne: 'Paid' } };
    if (sessionId) query.sessionId = sessionId;

    const orders = await Order.find(query).populate('items.menuItem');
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
