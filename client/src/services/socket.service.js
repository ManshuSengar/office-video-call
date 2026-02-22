// src/services/socket.service.js
import { io } from 'socket.io-client';

const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5001';

class SocketService {
  constructor() {
    this.socket = null;
  }

  connect() {
    if (this.socket?.connected) return this.socket;

    this.socket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('[Socket] Connected:', this.socket.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    this.socket.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err.message);
      console.error('[Socket] Server URL:', SERVER_URL);
    });

    return this.socket;
  }

  // Wait for connection to be established
  async waitForConnection(timeout = 5000) {
    if (this.socket?.connected) return this.socket;

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Socket connection timeout'));
      }, timeout);

      this.socket?.once('connect', () => {
        clearTimeout(timeoutId);
        resolve(this.socket);
      });

      this.socket?.once('connect_error', (err) => {
        clearTimeout(timeoutId);
        reject(new Error(`Socket connection error: ${err.message}`));
      });
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  emit(event, data) {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        return reject(new Error('Socket not connected'));
      }
      this.socket.emit(event, data, (response) => {
        if (response?.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  }

  on(event, handler) {
    this.socket?.on(event, handler);
  }

  off(event, handler) {
    this.socket?.off(event, handler);
  }

  get id() {
    return this.socket?.id;
  }

  get connected() {
    return this.socket?.connected || false;
  }
}

export default new SocketService();
