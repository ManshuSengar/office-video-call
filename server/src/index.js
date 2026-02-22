// src/index.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const roomManager = require('./rooms/RoomManager');
const socketHandler = require('./socket/socketHandler');

const PORT = process.env.PORT || 5001;

// ─── Express App ────────────────────────────────────────────────────────────

const app = express();
const httpServer = http.createServer(app);

app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  methods: ['GET', 'POST'],
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', ...roomManager.getStats() });
});

// Room info (optional debug endpoint)
app.get('/api/rooms/:roomId', (req, res) => {
  const room = roomManager.getRoom(req.params.roomId);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  res.json(room.toJSON());
});

// ─── Socket.io ──────────────────────────────────────────────────────────────

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
});

socketHandler(io);

// ─── Start ───────────────────────────────────────────────────────────────────

const start = async () => {
  try {
    await roomManager.init();
    httpServer.listen(PORT, () => {
      console.log(`\n🚀 Server running on port ${PORT}`);
      console.log(`   Health: http://localhost:${PORT}/health`);
      console.log(`   Environment: ${process.env.NODE_ENV || 'development'}\n`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n[Server] Shutting down gracefully...');
  await roomManager.close();
  process.exit(0);
});

start();
