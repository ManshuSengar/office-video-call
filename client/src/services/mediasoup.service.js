// src/services/mediasoup.service.js
import * as mediasoupClient from 'mediasoup-client';
import socketService from './socket.service';

class MediasoupService {
  constructor() {
    this.device = null;
    this.sendTransport = null;
    this.recvTransport = null;
    this.producers = new Map();   // 'audio' | 'video' → Producer
    this.consumers = new Map();   // consumerId → Consumer
    this.localStream = null;
  }

  // ─── Device ───────────────────────────────────────────────────────────────

  async loadDevice(routerRtpCapabilities) {
    this.device = new mediasoupClient.Device();
    await this.device.load({ routerRtpCapabilities });
    console.log('[Mediasoup] Device loaded');
    return this.device;
  }

  // ─── Transports ───────────────────────────────────────────────────────────

  async createSendTransport() {
    const { transport: serverTransport } = await socketService.emit('createTransport', {
      direction: 'send',
    });

    this.sendTransport = this.device.createSendTransport(serverTransport);

    this.sendTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
      try {
        await socketService.emit('connectTransport', {
          transportId: this.sendTransport.id,
          dtlsParameters,
        });
        callback();
      } catch (err) {
        errback(err);
      }
    });

    this.sendTransport.on('produce', async ({ kind, rtpParameters, appData }, callback, errback) => {
      try {
        const { producerId } = await socketService.emit('produce', {
          transportId: this.sendTransport.id,
          kind,
          rtpParameters,
          appData,
        });
        callback({ id: producerId });
      } catch (err) {
        errback(err);
      }
    });

    this.sendTransport.on('connectionstatechange', (state) => {
      console.log('[SendTransport] State:', state);
    });

    return this.sendTransport;
  }

  async createRecvTransport() {
    const { transport: serverTransport } = await socketService.emit('createTransport', {
      direction: 'recv',
    });

    this.recvTransport = this.device.createRecvTransport(serverTransport);

    this.recvTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
      try {
        await socketService.emit('connectTransport', {
          transportId: this.recvTransport.id,
          dtlsParameters,
        });
        callback();
      } catch (err) {
        errback(err);
      }
    });

    this.recvTransport.on('connectionstatechange', (state) => {
      console.log('[RecvTransport] State:', state);
    });

    return this.recvTransport;
  }

  // ─── Local Media ──────────────────────────────────────────────────────────

  async getUserMedia({ video = true, audio = true } = {}) {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: video ? { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } } : false,
        audio: audio ? { echoCancellation: true, noiseSuppression: true, autoGainControl: true } : false,
      });
      return this.localStream;
    } catch (err) {
      console.error('[Mediasoup] getUserMedia failed:', err);
      throw err;
    }
  }

  // ─── Producing ────────────────────────────────────────────────────────────

  async produceVideo(stream) {
    if (!this.sendTransport) await this.createSendTransport();
    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) throw new Error('No video track in stream');

    const producer = await this.sendTransport.produce({
      track: videoTrack,
      encodings: [
        { maxBitrate: 100000, scaleResolutionDownBy: 4 },  // low quality
        { maxBitrate: 300000, scaleResolutionDownBy: 2 },  // mid quality
        { maxBitrate: 900000, scaleResolutionDownBy: 1 },  // high quality
      ],
      codecOptions: { videoGoogleStartBitrate: 1000 },
      appData: { kind: 'video' },
    });

    this.producers.set('video', producer);
    return producer;
  }

  async produceAudio(stream) {
    if (!this.sendTransport) await this.createSendTransport();
    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) throw new Error('No audio track in stream');

    const producer = await this.sendTransport.produce({
      track: audioTrack,
      appData: { kind: 'audio' },
    });

    this.producers.set('audio', producer);
    return producer;
  }

  // ─── Consuming ────────────────────────────────────────────────────────────

  async consume(producerPeerId, producerId, kind) {
    if (!this.recvTransport) await this.createRecvTransport();

    const { consumer: serverConsumer } = await socketService.emit('consume', {
      producerPeerId,
      producerId,
      rtpCapabilities: this.device.rtpCapabilities,
    });

    const consumer = await this.recvTransport.consume({
      id: serverConsumer.id,
      producerId: serverConsumer.producerId,
      kind: serverConsumer.kind,
      rtpParameters: serverConsumer.rtpParameters,
    });

    this.consumers.set(consumer.id, consumer);

    // Resume consumer on server
    await socketService.emit('resumeConsumer', { consumerId: consumer.id });

    return consumer;
  }

  // ─── Mute / Unmute ────────────────────────────────────────────────────────

  toggleAudio(enabled) {
    const producer = this.producers.get('audio');
    if (!producer) return;
    if (enabled) {
      producer.resume();
    } else {
      producer.pause();
    }
    socketService.socket.emit('mediaStateChanged', { kind: 'audio', enabled });
  }

  toggleVideo(enabled) {
    const producer = this.producers.get('video');
    if (!producer) return;
    if (enabled) {
      producer.resume();
    } else {
      producer.pause();
    }
    socketService.socket.emit('mediaStateChanged', { kind: 'video', enabled });
  }

  // ─── Cleanup ──────────────────────────────────────────────────────────────

  closeProducer(kind) {
    const producer = this.producers.get(kind);
    if (producer) {
      socketService.emit('closeProducer', { producerId: producer.id }).catch(() => {});
      producer.close();
      this.producers.delete(kind);
    }
  }

  close() {
    this.producers.forEach((p) => p.close());
    this.consumers.forEach((c) => c.close());
    this.producers.clear();
    this.consumers.clear();

    if (this.sendTransport) { this.sendTransport.close(); this.sendTransport = null; }
    if (this.recvTransport) { this.recvTransport.close(); this.recvTransport = null; }

    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }

    this.device = null;
  }
}

export default new MediasoupService();
