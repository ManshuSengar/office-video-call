// src/rooms/RoomManager.js
const mediasoup = require('mediasoup');
const { Room } = require('./Room');
const config = require('../config/mediasoup.config');

class RoomManager {
  constructor() {
    this.workers = [];       // mediasoup Workers
    this.nextWorkerIdx = 0;  // round-robin index
    this.rooms = new Map();  // roomId → Room
  }

  // ─── Worker Management ────────────────────────────────────────────────────

  async init() {
    const { numWorkers, worker: workerSettings } = config;
    console.log(`[RoomManager] Creating ${numWorkers} mediasoup worker(s)...`);

    for (let i = 0; i < numWorkers; i++) {
      const worker = await mediasoup.createWorker(workerSettings);

      worker.on('died', (error) => {
        console.error(`[Worker ${worker.pid}] died:`, error);
        this.workers = this.workers.filter((w) => w !== worker);
        // Respawn worker
        this._spawnWorker();
      });

      this.workers.push(worker);
      console.log(`[RoomManager] Worker ${worker.pid} created`);
    }
  }

  async _spawnWorker() {
    try {
      const worker = await mediasoup.createWorker(config.worker);
      worker.on('died', (error) => {
        console.error(`[Worker ${worker.pid}] died:`, error);
        this.workers = this.workers.filter((w) => w !== worker);
        this._spawnWorker();
      });
      this.workers.push(worker);
      console.log(`[RoomManager] Respawned worker ${worker.pid}`);
    } catch (err) {
      console.error('[RoomManager] Failed to spawn worker:', err);
    }
  }

  _getNextWorker() {
    if (this.workers.length === 0) throw new Error('No mediasoup workers available');
    const worker = this.workers[this.nextWorkerIdx];
    this.nextWorkerIdx = (this.nextWorkerIdx + 1) % this.workers.length;
    return worker;
  }

  // ─── Room Lifecycle ───────────────────────────────────────────────────────

  async getOrCreateRoom(roomId) {
    if (this.rooms.has(roomId)) return this.rooms.get(roomId);

    const worker = this._getNextWorker();
    const router = await worker.createRouter({ mediaCodecs: config.router.mediaCodecs });

    const room = new Room(roomId, router);
    this.rooms.set(roomId, room);
    console.log(`[RoomManager] Room created: ${roomId}`);
    return room;
  }

  getRoom(roomId) {
    return this.rooms.get(roomId) || null;
  }

  deleteRoom(roomId) {
    const room = this.rooms.get(roomId);
    if (room) {
      room.close();
      this.rooms.delete(roomId);
      console.log(`[RoomManager] Room closed: ${roomId}`);
    }
  }

  // Remove peer and clean up empty rooms
  removePeerFromRoom(roomId, socketId) {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const peer = room.removePeer(socketId);

    if (room.isEmpty()) {
      // Keep room alive for a short window for reconnects
      setTimeout(() => {
        if (room.isEmpty()) {
          this.deleteRoom(roomId);
        }
      }, 30000); // 30s grace period
    }

    return peer;
  }

  // ─── Stats ────────────────────────────────────────────────────────────────

  getStats() {
    return {
      workers: this.workers.length,
      rooms: this.rooms.size,
      totalPeers: Array.from(this.rooms.values()).reduce(
        (sum, r) => sum + r.peerCount,
        0
      ),
    };
  }

  async close() {
    this.rooms.forEach((room) => room.close());
    this.rooms.clear();
    await Promise.all(this.workers.map((w) => w.close()));
    this.workers = [];
  }
}

// Singleton export
module.exports = new RoomManager();
