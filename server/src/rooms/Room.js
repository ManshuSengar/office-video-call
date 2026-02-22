// src/rooms/Room.js
const { v4: uuidv4 } = require('uuid');
const config = require('../config/mediasoup.config');

class Peer {
  constructor(socketId, displayName) {
    this.id = socketId;
    this.displayName = displayName;
    this.joinedAt = new Date();
    // transport id → Transport object
    this.transports = new Map();
    // producer id → Producer object
    this.producers = new Map();
    // consumer id → Consumer object
    this.consumers = new Map();
  }

  addTransport(transport) {
    this.transports.set(transport.id, transport);
  }

  addProducer(producer) {
    this.producers.set(producer.id, producer);
  }

  addConsumer(consumer) {
    this.consumers.set(consumer.id, consumer);
  }

  removeProducer(producerId) {
    this.producers.delete(producerId);
  }

  removeConsumer(consumerId) {
    this.consumers.delete(consumerId);
  }

  close() {
    this.transports.forEach((transport) => transport.close());
  }

  toJSON() {
    return {
      id: this.id,
      displayName: this.displayName,
      joinedAt: this.joinedAt,
      producers: Array.from(this.producers.keys()),
    };
  }
}

class Room {
  constructor(roomId, router) {
    this.id = roomId;
    this.router = router;
    this.peers = new Map(); // socketId → Peer
    this.createdAt = new Date();
    this._closed = false;
  }

  // ─── Peer Management ──────────────────────────────────────────────────────

  addPeer(socketId, displayName) {
    if (this.peers.has(socketId)) return this.peers.get(socketId);
    const peer = new Peer(socketId, displayName);
    this.peers.set(socketId, peer);
    return peer;
  }

  getPeer(socketId) {
    return this.peers.get(socketId);
  }

  removePeer(socketId) {
    const peer = this.peers.get(socketId);
    if (peer) {
      peer.close();
      this.peers.delete(socketId);
    }
    return peer;
  }

  getPeersExcept(socketId) {
    return Array.from(this.peers.values()).filter((p) => p.id !== socketId);
  }

  getAllPeers() {
    return Array.from(this.peers.values());
  }

  get peerCount() {
    return this.peers.size;
  }

  isEmpty() {
    return this.peers.size === 0;
  }

  // ─── Transport ────────────────────────────────────────────────────────────

  async createWebRtcTransport(socketId) {
    const peer = this.peers.get(socketId);
    if (!peer) throw new Error(`Peer ${socketId} not found`);

    const transport = await this.router.createWebRtcTransport(
      config.webRtcTransport
    );

    transport.on('dtlsstatechange', (dtlsState) => {
      if (dtlsState === 'closed') transport.close();
    });

    transport.on('close', () => {
      peer.transports.delete(transport.id);
    });

    peer.addTransport(transport);
    return transport;
  }

  async connectTransport(socketId, transportId, dtlsParameters) {
    const peer = this.peers.get(socketId);
    if (!peer) throw new Error(`Peer ${socketId} not found`);
    const transport = peer.transports.get(transportId);
    if (!transport) throw new Error(`Transport ${transportId} not found`);
    await transport.connect({ dtlsParameters });
  }

  // ─── Producing ────────────────────────────────────────────────────────────

  async produce(socketId, transportId, kind, rtpParameters, appData = {}) {
    const peer = this.peers.get(socketId);
    if (!peer) throw new Error(`Peer ${socketId} not found`);
    const transport = peer.transports.get(transportId);
    if (!transport) throw new Error(`Transport ${transportId} not found`);

    const producer = await transport.produce({ kind, rtpParameters, appData });

    producer.on('transportclose', () => {
      peer.removeProducer(producer.id);
    });

    peer.addProducer(producer);
    return producer;
  }

  async closeProducer(socketId, producerId) {
    const peer = this.peers.get(socketId);
    if (!peer) return;
    const producer = peer.producers.get(producerId);
    if (producer) {
      producer.close();
      peer.removeProducer(producerId);
    }
  }

  // ─── Consuming ────────────────────────────────────────────────────────────

  async consume(consumerSocketId, producerSocketId, producerId, rtpCapabilities) {
    if (!this.router.canConsume({ producerId, rtpCapabilities })) {
      throw new Error('Cannot consume: incompatible RTP capabilities');
    }

    const consumerPeer = this.peers.get(consumerSocketId);
    if (!consumerPeer) throw new Error(`Consumer peer ${consumerSocketId} not found`);

    // Find consumer's recv transport
    let recvTransport = null;
    for (const transport of consumerPeer.transports.values()) {
      if (transport.appData?.direction === 'recv') {
        recvTransport = transport;
        break;
      }
    }
    if (!recvTransport) throw new Error('No recv transport found for consumer');

    const consumer = await recvTransport.consume({
      producerId,
      rtpCapabilities,
      paused: true, // Start paused, resume after client-side setup
    });

    consumer.on('transportclose', () => {
      consumerPeer.removeConsumer(consumer.id);
    });

    consumer.on('producerclose', () => {
      consumerPeer.removeConsumer(consumer.id);
    });

    consumerPeer.addConsumer(consumer);
    return consumer;
  }

  // ─── Router RTP Capabilities ──────────────────────────────────────────────

  getRtpCapabilities() {
    return this.router.rtpCapabilities;
  }

  // ─── Room Info ────────────────────────────────────────────────────────────

  toJSON() {
    return {
      id: this.id,
      peerCount: this.peerCount,
      peers: Array.from(this.peers.values()).map((p) => p.toJSON()),
      createdAt: this.createdAt,
    };
  }

  close() {
    if (this._closed) return;
    this._closed = true;
    this.peers.forEach((peer) => peer.close());
    this.router.close();
  }
}

module.exports = { Room, Peer };
