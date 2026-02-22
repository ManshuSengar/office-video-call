// src/components/UI/LobbyPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Paper, Typography, TextField, Button, Divider, InputAdornment,
} from '@mui/material';
import VideoCallIcon from '@mui/icons-material/VideoCall';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import PersonIcon from '@mui/icons-material/Person';
import LinkIcon from '@mui/icons-material/Link';
import { v4 as uuidv4 } from 'uuid';

const LobbyPage = () => {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!displayName.trim()) e.name = 'Please enter your name';
    return e;
  };

  const startNewRoom = () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    const roomId = uuidv4().replace(/-/g, '').slice(0, 10);
    sessionStorage.setItem('displayName', displayName.trim());
    navigate(`/room/${roomId}`);
  };

  const joinExistingRoom = () => {
    const errs = validate();
    if (!roomCode.trim()) errs.room = 'Please enter a room code or paste an invite link';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    // Support both room code and full URL paste
    let finalRoomId = roomCode.trim();
    if (finalRoomId.includes('/room/')) {
      finalRoomId = finalRoomId.split('/room/')[1].split('/')[0].split('?')[0];
    }

    sessionStorage.setItem('displayName', displayName.trim());
    navigate(`/room/${finalRoomId}`);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#0a0a1a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        background: 'radial-gradient(ellipse at 50% 0%, rgba(59,130,246,0.15) 0%, #0a0a1a 70%)',
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 440 }}>
        {/* Logo */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <Box sx={{ bgcolor: '#3b82f6', borderRadius: 2, p: 1, display: 'flex' }}>
              <VideoCallIcon sx={{ color: '#fff', fontSize: 28 }} />
            </Box>
            <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700 }}>
              NexCall
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
            Free group video calling for up to 50+ people
          </Typography>
        </Box>

        <Paper
          elevation={0}
          sx={{
            bgcolor: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 3,
            p: 3,
          }}
        >
          {/* Name field */}
          <Typography variant="subtitle2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 1 }}>
            Your name
          </Typography>
          <TextField
            fullWidth
            placeholder="Enter your display name"
            value={displayName}
            onChange={(e) => { setDisplayName(e.target.value); setErrors((p) => ({ ...p, name: '' })); }}
            error={!!errors.name}
            helperText={errors.name}
            sx={textFieldSx}
            InputProps={{
              startAdornment: <InputAdornment position="start"><PersonIcon sx={{ color: 'rgba(255,255,255,0.3)', fontSize: 20 }} /></InputAdornment>,
            }}
          />

          {/* Start new room */}
          <Button
            fullWidth
            variant="contained"
            size="large"
            startIcon={<VideoCallIcon />}
            onClick={startNewRoom}
            sx={{
              mt: 3,
              py: 1.5,
              bgcolor: '#3b82f6',
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '1rem',
              '&:hover': { bgcolor: '#2563eb' },
            }}
          >
            Start new meeting
          </Button>

          <Divider sx={{ my: 2.5, borderColor: 'rgba(255,255,255,0.08)', '&::before,&::after': { borderColor: 'rgba(255,255,255,0.08)' } }}>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)', px: 1 }}>
              OR JOIN EXISTING
            </Typography>
          </Divider>

          {/* Join by room code */}
          <Typography variant="subtitle2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 1 }}>
            Room code or invite link
          </Typography>
          <TextField
            fullWidth
            placeholder="abc1234xyz or paste invite URL"
            value={roomCode}
            onChange={(e) => { setRoomCode(e.target.value); setErrors((p) => ({ ...p, room: '' })); }}
            error={!!errors.room}
            helperText={errors.room}
            sx={textFieldSx}
            InputProps={{
              startAdornment: <InputAdornment position="start"><LinkIcon sx={{ color: 'rgba(255,255,255,0.3)', fontSize: 20 }} /></InputAdornment>,
            }}
          />

          <Button
            fullWidth
            variant="outlined"
            size="large"
            startIcon={<MeetingRoomIcon />}
            onClick={joinExistingRoom}
            sx={{
              mt: 2,
              py: 1.5,
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '1rem',
              borderColor: 'rgba(255,255,255,0.2)',
              color: '#fff',
              '&:hover': { borderColor: '#3b82f6', bgcolor: 'rgba(59,130,246,0.1)' },
            }}
          >
            Join meeting
          </Button>
        </Paper>

        <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 2, color: 'rgba(255,255,255,0.25)' }}>
          No account required · Completely free
        </Typography>
      </Box>
    </Box>
  );
};

const textFieldSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: 'rgba(255,255,255,0.05)',
    borderRadius: 2,
    color: '#fff',
    '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' },
    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
    '&.Mui-focused fieldset': { borderColor: '#3b82f6' },
  },
  '& .MuiInputBase-input::placeholder': { color: 'rgba(255,255,255,0.3)' },
  '& .MuiFormHelperText-root': { color: '#f87171' },
};

export default LobbyPage;
