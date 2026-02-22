// src/components/Room/RoomPage.jsx
import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Alert, CircularProgress, Typography } from '@mui/material';
import { useRoom } from '../../context/RoomContext';
import useCall from '../../hooks/useCall';
import VideoGrid from './VideoGrid';
import ControlsBar from '../Controls/ControlsBar';
import ChatPanel from '../Chat/ChatPanel';

const RoomPage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { joined, error, chatOpen, displayName, setRoom } = useRoom();
  const { joinRoom, leaveRoom, handleToggleAudio, handleToggleVideo, sendChatMessage } = useCall();

  useEffect(() => {
    // Get display name from session storage (set on lobby page)
    const name = sessionStorage.getItem('displayName') || 'Guest';
    setRoom(roomId, name);
    joinRoom(roomId, name);
  }, [roomId]); // eslint-disable-line

  if (error) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', bgcolor: '#0a0a1a' }}>
        <Alert severity="error" sx={{ maxWidth: 400 }}>
          {error}. <a href="/" style={{ color: 'inherit' }}>Go back</a>
        </Alert>
      </Box>
    );
  }

  if (!joined) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', bgcolor: '#0a0a1a', gap: 2 }}>
        <CircularProgress sx={{ color: '#3b82f6' }} />
        <Typography sx={{ color: 'rgba(255,255,255,0.7)' }}>Joining room...</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        bgcolor: '#0a0a1a',
        overflow: 'hidden',
      }}
    >
      {/* Main content area */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Video grid */}
        <VideoGrid />

        {/* Chat panel */}
        {chatOpen && (
          <ChatPanel onSendMessage={sendChatMessage} />
        )}
      </Box>

      {/* Controls */}
      <ControlsBar
        onToggleAudio={handleToggleAudio}
        onToggleVideo={handleToggleVideo}
        onLeave={leaveRoom}
      />
    </Box>
  );
};

export default RoomPage;
