// src/socket/socketHandler.js
const roomManager = require('../rooms/RoomManager');

/**
 * All socket events follow a request/response pattern using callbacks:
 *   client → emit('event', data, callback)
 *   server → callback({ success, ...data }) or callback({ error })
 */

const socketHandler = (io) => {
  io.on('connection', (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    // Track which room this socket is in
    let currentRoomId = null;
    let currentDisplayName = null;

    // ─── Room Join ─────────────────────────────────────────────────────────

    socket.on('joinRoom', async ({ roomId, displayName }, callback) => {
      try {
        const room = await roomManager.getOrCreateRoom(roomId);
        const peer = room.addPeer(socket.id, displayName || 'Anonymous');

        currentRoomId = roomId;
        currentDisplayName = displayName || 'Anonymous';

        socket.join(roomId);

        // Get existing peers (excluding self)
        const existingPeers = room.getPeersExcept(socket.id).map((p) => p.toJSON());

        // Notify others in room
        socket.to(roomId).emit('peerJoined', {
          peerId: socket.id,
          displayName: peer.displayName,
        });

        callback({
          success: true,
          routerRtpCapabilities: room.getRtpCapabilities(),
          existingPeers,
        });

        console.log(`[Room ${roomId}] ${displayName} joined. Peers: ${room.peerCount}`);
      } catch (err) {
        console.error('[joinRoom] Error:', err);
        callback({ error: err.message });
      }
    });

    // ─── WebRTC Transport ──────────────────────────────────────────────────

    socket.on('createTransport', async ({ direction }, callback) => {
      try {
        const room = roomManager.getRoom(currentRoomId);
        if (!room) throw new Error('Room not found');

        const transport = await room.createWebRtcTransport(socket.id);

        // Store direction in appData so Room.consume() can find recv transport
        transport.appData = { direction };

        callback({
          success: true,
          transport: {
            id: transport.id,
            iceParameters: transport.iceParameters,
            iceCandidates: transport.iceCandidates,
            dtlsParameters: transport.dtlsParameters,
          },
        });
      } catch (err) {
        console.error('[createTransport] Error:', err);
        callback({ error: err.message });
      }
    });

    socket.on('connectTransport', async ({ transportId, dtlsParameters }, callback) => {
      try {
        const room = roomManager.getRoom(currentRoomId);
        if (!room) throw new Error('Room not found');
        await room.connectTransport(socket.id, transportId, dtlsParameters);
        callback({ success: true });
      } catch (err) {
        console.error('[connectTransport] Error:', err);
        callback({ error: err.message });
      }
    });

    // ─── Producing ─────────────────────────────────────────────────────────

    socket.on('produce', async ({ transportId, kind, rtpParameters, appData }, callback) => {
      try {
        const room = roomManager.getRoom(currentRoomId);
        if (!room) throw new Error('Room not found');

        const producer = await room.produce(
          socket.id,
          transportId,
          kind,
          rtpParameters,
          appData
        );

        // Notify all other peers that a new producer is available
        socket.to(currentRoomId).emit('newProducer', {
          producerId: producer.id,
          peerId: socket.id,
          kind: producer.kind,
          appData: producer.appData,
        });

        callback({ success: true, producerId: producer.id });
      } catch (err) {
        console.error('[produce] Error:', err);
        callback({ error: err.message });
      }
    });

    socket.on('closeProducer', async ({ producerId }, callback) => {
      try {
        const room = roomManager.getRoom(currentRoomId);
        if (!room) throw new Error('Room not found');
        await room.closeProducer(socket.id, producerId);

        socket.to(currentRoomId).emit('producerClosed', {
          producerId,
          peerId: socket.id,
        });

        callback({ success: true });
      } catch (err) {
        callback({ error: err.message });
      }
    });

    // ─── Consuming ─────────────────────────────────────────────────────────

    socket.on('consume', async ({ producerPeerId, producerId, rtpCapabilities }, callback) => {
      try {
        const room = roomManager.getRoom(currentRoomId);
        if (!room) throw new Error('Room not found');

        const consumer = await room.consume(
          socket.id,
          producerPeerId,
          producerId,
          rtpCapabilities
        );

        callback({
          success: true,
          consumer: {
            id: consumer.id,
            producerId: consumer.producerId,
            kind: consumer.kind,
            rtpParameters: consumer.rtpParameters,
          },
        });
      } catch (err) {
        console.error('[consume] Error:', err);
        callback({ error: err.message });
      }
    });

    socket.on('resumeConsumer', async ({ consumerId }, callback) => {
      try {
        const room = roomManager.getRoom(currentRoomId);
        if (!room) throw new Error('Room not found');
        const peer = room.getPeer(socket.id);
        if (!peer) throw new Error('Peer not found');

        const consumer = peer.consumers.get(consumerId);
        if (!consumer) throw new Error(`Consumer ${consumerId} not found`);
        await consumer.resume();
        callback({ success: true });
      } catch (err) {
        console.error('[resumeConsumer] Error:', err);
        callback({ error: err.message });
      }
    });

    // ─── Chat ──────────────────────────────────────────────────────────────

    socket.on('chatMessage', ({ message }) => {
      if (!currentRoomId || !message?.trim()) return;

      const payload = {
        id: `${socket.id}-${Date.now()}`,
        senderId: socket.id,
        senderName: currentDisplayName,
        message: message.trim().slice(0, 1000), // Sanitize length
        timestamp: new Date().toISOString(),
      };

      // Broadcast to everyone in room including sender
      io.to(currentRoomId).emit('chatMessage', payload);
    });

    // ─── Media State (mute/unmute cam/mic) ─────────────────────────────────

    socket.on('mediaStateChanged', ({ kind, enabled }) => {
      if (!currentRoomId) return;
      socket.to(currentRoomId).emit('peerMediaStateChanged', {
        peerId: socket.id,
        kind,
        enabled,
      });
    });

    // ─── Disconnect ────────────────────────────────────────────────────────

    socket.on('disconnect', () => {
      if (!currentRoomId) return;

      roomManager.removePeerFromRoom(currentRoomId, socket.id);

      io.to(currentRoomId).emit('peerLeft', {
        peerId: socket.id,
        displayName: currentDisplayName,
      });

      console.log(
        `[Socket] Disconnected: ${socket.id} from room ${currentRoomId}`
      );
    });

    socket.on('leaveRoom', () => {
      if (!currentRoomId) return;

      roomManager.removePeerFromRoom(currentRoomId, socket.id);
      socket.to(currentRoomId).emit('peerLeft', {
        peerId: socket.id,
        displayName: currentDisplayName,
      });
      socket.leave(currentRoomId);
      currentRoomId = null;
    });
  });
};

module.exports = socketHandler;
