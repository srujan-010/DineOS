const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Socket.io integration
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-table', (tableNumber) => {
    socket.join(`table-${tableNumber}`);
    console.log(`Socket ${socket.id} joined table-${tableNumber}`);
  });

  socket.on('join-kitchen', () => {
    socket.join('kitchen');
    console.log(`Socket ${socket.id} joined kitchen`);
  });

  socket.on('join-waiter', () => {
    socket.join('waiter');
    console.log(`Socket ${socket.id} joined waiter`);
  });

  socket.on('call-waiter', (data) => {
    io.to('kitchen').to('waiter').emit('waiter-called', data);
  });

  socket.on('request-bill', (data) => {
    io.to('kitchen').to('waiter').emit('bill-requested', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Pass io to routes by storing it in app locals
app.set('io', io);

// Routes
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/menu', require('./routes/menuRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/tables', require('./routes/tableRoutes'));

app.get('/', (req, res) => res.send('Cafe API is running'));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
