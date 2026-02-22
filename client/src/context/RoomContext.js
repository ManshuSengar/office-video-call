// src/context/RoomContext.js
import React, { createContext, useContext, useReducer, useCallback, useRef } from 'react';

const RoomContext = createContext(null);

const initialState = {
  roomId: null,
  displayName: '',
  peers: {},         // peerId → { id, displayName, audioConsumerId, videoConsumerId, stream, audioEnabled, videoEnabled }
  localStream: null,
  audioEnabled: true,
  videoEnabled: true,
  joined: false,
  error: null,
  chatMessages: [],
  chatOpen: false,
  unreadCount: 0,
};

const ACTION = {
  SET_ROOM: 'SET_ROOM',
  SET_LOCAL_STREAM: 'SET_LOCAL_STREAM',
  SET_JOINED: 'SET_JOINED',
  ADD_PEER: 'ADD_PEER',
  REMOVE_PEER: 'REMOVE_PEER',
  UPDATE_PEER_STREAM: 'UPDATE_PEER_STREAM',
  UPDATE_PEER_MEDIA_STATE: 'UPDATE_PEER_MEDIA_STATE',
  TOGGLE_AUDIO: 'TOGGLE_AUDIO',
  TOGGLE_VIDEO: 'TOGGLE_VIDEO',
  ADD_CHAT_MESSAGE: 'ADD_CHAT_MESSAGE',
  TOGGLE_CHAT: 'TOGGLE_CHAT',
  SET_ERROR: 'SET_ERROR',
  RESET: 'RESET',
};

const reducer = (state, { type, payload }) => {
  switch (type) {
    case ACTION.SET_ROOM:
      return { ...state, roomId: payload.roomId, displayName: payload.displayName };

    case ACTION.SET_LOCAL_STREAM:
      return { ...state, localStream: payload };

    case ACTION.SET_JOINED:
      return { ...state, joined: payload };

    case ACTION.ADD_PEER:
      return {
        ...state,
        peers: {
          ...state.peers,
          [payload.id]: {
            id: payload.id,
            displayName: payload.displayName,
            stream: null,
            audioEnabled: true,
            videoEnabled: true,
            consumers: {},
          },
        },
      };

    case ACTION.REMOVE_PEER: {
      const peers = { ...state.peers };
      delete peers[payload];
      return { ...state, peers };
    }

    case ACTION.UPDATE_PEER_STREAM: {
      const peer = state.peers[payload.peerId];
      if (!peer) return state;
      return {
        ...state,
        peers: {
          ...state.peers,
          [payload.peerId]: {
            ...peer,
            stream: payload.stream,
            consumers: { ...peer.consumers, [payload.kind]: payload.consumerId },
          },
        },
      };
    }

    case ACTION.UPDATE_PEER_MEDIA_STATE: {
      const peer = state.peers[payload.peerId];
      if (!peer) return state;
      return {
        ...state,
        peers: {
          ...state.peers,
          [payload.peerId]: {
            ...peer,
            [`${payload.kind}Enabled`]: payload.enabled,
          },
        },
      };
    }

    case ACTION.TOGGLE_AUDIO:
      return { ...state, audioEnabled: payload };

    case ACTION.TOGGLE_VIDEO:
      return { ...state, videoEnabled: payload };

    case ACTION.ADD_CHAT_MESSAGE:
      return {
        ...state,
        chatMessages: [...state.chatMessages, payload],
        unreadCount: state.chatOpen ? 0 : state.unreadCount + 1,
      };

    case ACTION.TOGGLE_CHAT:
      return {
        ...state,
        chatOpen: !state.chatOpen,
        unreadCount: !state.chatOpen ? 0 : state.unreadCount,
      };

    case ACTION.SET_ERROR:
      return { ...state, error: payload };

    case ACTION.RESET:
      return initialState;

    default:
      return state;
  }
};

export const RoomProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  // Ref to peer streams for adding tracks without re-render issues
  const peerStreamsRef = useRef({});

  const setRoom = useCallback((roomId, displayName) => {
    dispatch({ type: ACTION.SET_ROOM, payload: { roomId, displayName } });
  }, []);

  const setLocalStream = useCallback((stream) => {
    dispatch({ type: ACTION.SET_LOCAL_STREAM, payload: stream });
  }, []);

  const setJoined = useCallback((val) => {
    dispatch({ type: ACTION.SET_JOINED, payload: val });
  }, []);

  const addPeer = useCallback((id, displayName) => {
    peerStreamsRef.current[id] = new MediaStream();
    dispatch({ type: ACTION.ADD_PEER, payload: { id, displayName } });
  }, []);

  const removePeer = useCallback((peerId) => {
    delete peerStreamsRef.current[peerId];
    dispatch({ type: ACTION.REMOVE_PEER, payload: peerId });
  }, []);

  const addConsumerTrack = useCallback((peerId, consumer) => {
    if (!peerStreamsRef.current[peerId]) {
      peerStreamsRef.current[peerId] = new MediaStream();
    }
    peerStreamsRef.current[peerId].addTrack(consumer.track);

    dispatch({
      type: ACTION.UPDATE_PEER_STREAM,
      payload: {
        peerId,
        stream: peerStreamsRef.current[peerId],
        kind: consumer.kind,
        consumerId: consumer.id,
      },
    });
  }, []);

  const updatePeerMediaState = useCallback((peerId, kind, enabled) => {
    dispatch({ type: ACTION.UPDATE_PEER_MEDIA_STATE, payload: { peerId, kind, enabled } });
  }, []);

  const toggleAudio = useCallback((enabled) => {
    dispatch({ type: ACTION.TOGGLE_AUDIO, payload: enabled });
  }, []);

  const toggleVideo = useCallback((enabled) => {
    dispatch({ type: ACTION.TOGGLE_VIDEO, payload: enabled });
  }, []);

  const addChatMessage = useCallback((msg) => {
    dispatch({ type: ACTION.ADD_CHAT_MESSAGE, payload: msg });
  }, []);

  const toggleChat = useCallback(() => {
    dispatch({ type: ACTION.TOGGLE_CHAT });
  }, []);

  const setError = useCallback((err) => {
    dispatch({ type: ACTION.SET_ERROR, payload: err });
  }, []);

  const reset = useCallback(() => {
    peerStreamsRef.current = {};
    dispatch({ type: ACTION.RESET });
  }, []);

  return (
    <RoomContext.Provider
      value={{
        ...state,
        peerStreamsRef,
        setRoom,
        setLocalStream,
        setJoined,
        addPeer,
        removePeer,
        addConsumerTrack,
        updatePeerMediaState,
        toggleAudio,
        toggleVideo,
        addChatMessage,
        toggleChat,
        setError,
        reset,
      }}
    >
      {children}
    </RoomContext.Provider>
  );
};

export const useRoom = () => {
  const ctx = useContext(RoomContext);
  if (!ctx) throw new Error('useRoom must be used within RoomProvider');
  return ctx;
};
