// src/components/Controls/ControlsBar.jsx
import React, { useState } from 'react';
import {
  Box, IconButton, Tooltip, Badge, Typography, Divider, Chip,
} from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import CallEndIcon from '@mui/icons-material/CallEnd';
import ChatIcon from '@mui/icons-material/Chat';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PeopleIcon from '@mui/icons-material/People';
import { useRoom } from '../../context/RoomContext';

const ControlsBar = ({ onToggleAudio, onToggleVideo, onLeave }) => {
  const { audioEnabled, videoEnabled, roomId, peers, unreadCount, toggleChat } = useRoom();
  const [copied, setCopied] = useState(false);

  const peerCount = Object.keys(peers).length + 1;

  const copyLink = () => {
    const link = `${window.location.origin}/room/${roomId}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const ControlButton = ({ icon, label, onClick, color = 'default', active = false, danger = false }) => (
    <Tooltip title={label} arrow>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
        <IconButton
          onClick={onClick}
          sx={{
            width: 48,
            height: 48,
            bgcolor: danger
              ? '#ef4444'
              : active
              ? 'rgba(255,255,255,0.15)'
              : 'rgba(255,255,255,0.08)',
            color: '#fff',
            transition: 'all 0.2s',
            '&:hover': {
              bgcolor: danger ? '#dc2626' : 'rgba(255,255,255,0.2)',
              transform: 'scale(1.05)',
            },
          }}
        >
          {icon}
        </IconButton>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.65rem' }}>
          {label}
        </Typography>
      </Box>
    </Tooltip>
  );

  return (
    <Box
      sx={{
        height: 80,
        bgcolor: 'rgba(15, 15, 30, 0.95)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 3,
      }}
    >
      {/* Room info */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 200 }}>
        <Chip
          icon={<PeopleIcon sx={{ fontSize: 16 }} />}
          label={`${peerCount} participant${peerCount !== 1 ? 's' : ''}`}
          size="small"
          sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none' }}
        />
        <Tooltip title={copied ? 'Copied!' : 'Copy invite link'} arrow>
          <Chip
            icon={<ContentCopyIcon sx={{ fontSize: 16 }} />}
            label={copied ? 'Copied!' : 'Copy link'}
            size="small"
            onClick={copyLink}
            clickable
            sx={{
              bgcolor: copied ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.08)',
              color: copied ? '#4ade80' : 'rgba(255,255,255,0.7)',
              cursor: 'pointer',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' },
            }}
          />
        </Tooltip>
      </Box>

      {/* Main controls */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        <ControlButton
          icon={audioEnabled ? <MicIcon /> : <MicOffIcon sx={{ color: '#f87171' }} />}
          label={audioEnabled ? 'Mute' : 'Unmute'}
          onClick={onToggleAudio}
          active={audioEnabled}
        />
        <ControlButton
          icon={videoEnabled ? <VideocamIcon /> : <VideocamOffIcon sx={{ color: '#f87171' }} />}
          label={videoEnabled ? 'Stop video' : 'Start video'}
          onClick={onToggleVideo}
          active={videoEnabled}
        />
        <ControlButton
          icon={<CallEndIcon />}
          label="Leave"
          onClick={onLeave}
          danger
        />
      </Box>

      {/* Right side */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 200, justifyContent: 'flex-end' }}>
        <ControlButton
          icon={
            <Badge badgeContent={unreadCount} color="error" max={9}>
              <ChatIcon />
            </Badge>
          }
          label="Chat"
          onClick={toggleChat}
        />
      </Box>
    </Box>
  );
};

export default ControlsBar;
