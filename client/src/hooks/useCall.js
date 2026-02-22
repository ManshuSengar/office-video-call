// src/hooks/useCall.js
import { useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import socketService from '../services/socket.service';
import mediasoupService from '../services/mediasoup.service';
import { useRoom } from '../context/RoomContext';

const useCall = () => {
  const navigate = useNavigate();
  const {
    roomId, displayName,
    addPeer, removePeer, addConsumerTrack,
    updatePeerMediaState, setLocalStream,
    setJoined, setError, toggleAudio, toggleVideo,
    addChatMessage, reset,
    audioEnabled, videoEnabled,
  } = useRoom();

  const joinedRef = useRef(false);

  // ─── Socket Event Listeners ───────────────────────────────────────────────

  useEffect(() => {
    if (!roomId) return;

    const socket = socketService.socket;

    // A new peer joined → add them
    const onPeerJoined = ({ peerId, displayName: name }) => {
      console.log('[Call] Peer joined:', name);
      addPeer(peerId, name);
    };

    // A peer left
    const onPeerLeft = ({ peerId }) => {
      console.log('[Call] Peer left:', peerId);
      removePeer(peerId);
    };

    // New producer from a peer → consume it
    const onNewProducer = async ({ producerId, peerId, kind }) => {
      try {
        const consumer = await mediasoupService.consume(peerId, producerId, kind);
        addConsumerTrack(peerId, consumer);
      } catch (err) {
        console.error('[Call] Failed to consume producer:', err);
      }
    };

    // Producer closed on remote peer
    const onProducerClosed = ({ peerId }) => {
      removePeer(peerId); // simplified - you could also just remove the track
    };

    // Peer muted/unmuted
    const onPeerMediaStateChanged = ({ peerId, kind, enabled }) => {
      updatePeerMediaState(peerId, kind, enabled);
    };

    // Chat message
    const onChatMessage = (msg) => {
      addChatMessage(msg);
    };

    socket.on('peerJoined', onPeerJoined);
    socket.on('peerLeft', onPeerLeft);
    socket.on('newProducer', onNewProducer);
    socket.on('producerClosed', onProducerClosed);
    socket.on('peerMediaStateChanged', onPeerMediaStateChanged);
    socket.on('chatMessage', onChatMessage);

    return () => {
      socket.off('peerJoined', onPeerJoined);
      socket.off('peerLeft', onPeerLeft);
      socket.off('newProducer', onNewProducer);
      socket.off('producerClosed', onProducerClosed);
      socket.off('peerMediaStateChanged', onPeerMediaStateChanged);
      socket.off('chatMessage', onChatMessage);
    };
  }, [roomId, addPeer, removePeer, addConsumerTrack, updatePeerMediaState, addChatMessage]);

  // ─── Join Room ────────────────────────────────────────────────────────────

  const joinRoom = useCallback(async (roomIdParam, displayNameParam) => {
    if (joinedRef.current) return;
    joinedRef.current = true;

    try {
      socketService.connect();
      
      // Wait for socket to be connected before proceeding
      await socketService.waitForConnection(5000);

      // Join room on server
      const { routerRtpCapabilities, existingPeers } = await socketService.emit('joinRoom', {
        roomId: roomIdParam,
        displayName: displayNameParam,
      });

      // Load mediasoup device with server RTP capabilities
      await mediasoupService.loadDevice(routerRtpCapabilities);

      // Add existing peers to state
      for (const peer of existingPeers) {
        addPeer(peer.id, peer.displayName);
      }

      // Get local media
      let localStream;
      try {
        localStream = await mediasoupService.getUserMedia({ video: true, audio: true });
      } catch {
        // Fallback: audio only if camera fails
        localStream = await mediasoupService.getUserMedia({ video: false, audio: true });
      }
      setLocalStream(localStream);

      // Create send transport and produce
      await mediasoupService.createSendTransport();

      if (localStream.getVideoTracks().length > 0) {
        await mediasoupService.produceVideo(localStream);
      }
      if (localStream.getAudioTracks().length > 0) {
        await mediasoupService.produceAudio(localStream);
      }

      // Create recv transport for consuming others
      await mediasoupService.createRecvTransport();

      // Consume existing peers' producers
      for (const peer of existingPeers) {
        for (const producerId of peer.producers) {
          try {
            const consumer = await mediasoupService.consume(peer.id, producerId);
            addConsumerTrack(peer.id, consumer);
          } catch (err) {
            console.error('[Call] Failed to consume existing peer:', err);
          }
        }
      }

      setJoined(true);
    } catch (err) {
      console.error('[Call] joinRoom failed:', err);
      setError(err.message);
      joinedRef.current = false;
    }
  }, [addPeer, addConsumerTrack, setLocalStream, setJoined, setError]);

  // ─── Controls ─────────────────────────────────────────────────────────────

  const handleToggleAudio = useCallback(() => {
    const newState = !audioEnabled;
    mediasoupService.toggleAudio(newState);
    toggleAudio(newState);
  }, [audioEnabled, toggleAudio]);

  const handleToggleVideo = useCallback(() => {
    const newState = !videoEnabled;
    mediasoupService.toggleVideo(newState);
    toggleVideo(newState);
  }, [videoEnabled, toggleVideo]);

  const sendChatMessage = useCallback((message) => {
    socketService.socket?.emit('chatMessage', { message });
  }, []);

  const leaveRoom = useCallback(() => {
    socketService.socket?.emit('leaveRoom');
    mediasoupService.close();
    socketService.disconnect();
    reset();
    joinedRef.current = false;
    navigate('/');
  }, [navigate, reset]);

  return {
    joinRoom,
    leaveRoom,
    handleToggleAudio,
    handleToggleVideo,
    sendChatMessage,
  };
};

export default useCall;
