// src/components/Room/VideoTile.jsx
import React, { useRef, useEffect } from 'react';
import { Box, Typography, Avatar } from '@mui/material';
import MicOffIcon from '@mui/icons-material/MicOff';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';

const VideoTile = ({ stream, displayName, isLocal = false, audioEnabled = true, videoEnabled = true, size = 'normal' }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const initials = displayName
    ? displayName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        bgcolor: '#1a1a2e',
        borderRadius: 2,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: isLocal ? 'scaleX(-1)' : 'none', // Mirror local video
          display: videoEnabled && stream ? 'block' : 'none',
        }}
      />

      {/* Avatar when video off */}
      {(!videoEnabled || !stream) && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <Avatar
            sx={{
              width: size === 'large' ? 96 : 56,
              height: size === 'large' ? 96 : 56,
              fontSize: size === 'large' ? '2.5rem' : '1.5rem',
              bgcolor: stringToColor(displayName),
              fontWeight: 700,
            }}
          >
            {initials}
          </Avatar>
        </Box>
      )}

      {/* Name badge */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 8,
          left: 8,
          bgcolor: 'rgba(0,0,0,0.6)',
          borderRadius: 1,
          px: 1,
          py: 0.25,
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          backdropFilter: 'blur(4px)',
        }}
      >
        {!audioEnabled && (
          <MicOffIcon sx={{ fontSize: 14, color: '#f44336' }} />
        )}
        {!videoEnabled && (
          <VideocamOffIcon sx={{ fontSize: 14, color: '#f44336' }} />
        )}
        <Typography variant="caption" sx={{ color: '#fff', fontWeight: 500 }}>
          {isLocal ? `${displayName} (You)` : displayName}
        </Typography>
      </Box>
    </Box>
  );
};

// Deterministic color from name string
const stringToColor = (str = '') => {
  const colors = ['#7c3aed', '#2563eb', '#059669', '#d97706', '#dc2626', '#db2777'];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export default VideoTile;
