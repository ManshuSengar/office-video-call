// src/components/Chat/ChatPanel.jsx
import React, { useState, useRef, useEffect } from 'react';
import {
  Box, Typography, TextField, IconButton, Paper, Divider,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';
import { useRoom } from '../../context/RoomContext';

const ChatMessage = ({ msg, isOwn }) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: isOwn ? 'flex-end' : 'flex-start',
      mb: 1.5,
    }}
  >
    {!isOwn && (
      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', mb: 0.25, px: 0.5 }}>
        {msg.senderName}
      </Typography>
    )}
    <Box
      sx={{
        maxWidth: '85%',
        bgcolor: isOwn ? '#3b82f6' : 'rgba(255,255,255,0.1)',
        borderRadius: isOwn ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        px: 1.5,
        py: 0.75,
      }}
    >
      <Typography variant="body2" sx={{ color: '#fff', wordBreak: 'break-word' }}>
        {msg.message}
      </Typography>
    </Box>
    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)', mt: 0.25, px: 0.5 }}>
      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
    </Typography>
  </Box>
);

const ChatPanel = ({ onSendMessage }) => {
  const { chatMessages, toggleChat } = useRoom();
  const socketId = useRef(null);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    import('../../services/socket.service').then(({ default: s }) => {
      socketId.current = s.id;
    });
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        width: 300,
        height: '100%',
        bgcolor: 'rgba(20, 20, 40, 0.97)',
        borderLeft: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <Typography variant="subtitle2" sx={{ color: '#fff', fontWeight: 600 }}>
          In-call messages
        </Typography>
        <IconButton size="small" onClick={toggleChat} sx={{ color: 'rgba(255,255,255,0.5)' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Messages */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column' }}>
        {chatMessages.length === 0 ? (
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
              No messages yet. Say hello! 👋
            </Typography>
          </Box>
        ) : (
          chatMessages.map((msg) => (
            <ChatMessage
              key={msg.id}
              msg={msg}
              isOwn={msg.senderId === socketId.current}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* Input */}
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />
      <Box sx={{ p: 1.5, display: 'flex', gap: 1, alignItems: 'flex-end' }}>
        <TextField
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          multiline
          maxRows={3}
          size="small"
          fullWidth
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: 'rgba(255,255,255,0.07)',
              borderRadius: 2,
              color: '#fff',
              fontSize: '0.875rem',
              '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' },
              '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
              '&.Mui-focused fieldset': { borderColor: '#3b82f6' },
            },
            '& .MuiInputBase-input::placeholder': { color: 'rgba(255,255,255,0.3)' },
          }}
        />
        <IconButton
          onClick={handleSend}
          disabled={!input.trim()}
          sx={{
            bgcolor: '#3b82f6',
            color: '#fff',
            width: 36,
            height: 36,
            '&:hover': { bgcolor: '#2563eb' },
            '&.Mui-disabled': { bgcolor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.3)' },
          }}
        >
          <SendIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>
    </Paper>
  );
};

export default ChatPanel;
