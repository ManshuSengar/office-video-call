// src/components/Room/VideoGrid.jsx
import React, { useMemo } from 'react';
import { Box } from '@mui/material';
import VideoTile from './VideoTile';
import { useRoom } from '../../context/RoomContext';

const getGridConfig = (count) => {
  if (count === 1) return { cols: 1, rows: 1 };
  if (count === 2) return { cols: 2, rows: 1 };
  if (count <= 4) return { cols: 2, rows: 2 };
  if (count <= 6) return { cols: 3, rows: 2 };
  if (count <= 9) return { cols: 3, rows: 3 };
  if (count <= 12) return { cols: 4, rows: 3 };
  if (count <= 16) return { cols: 4, rows: 4 };
  if (count <= 25) return { cols: 5, rows: 5 };
  return { cols: 6, rows: Math.ceil(count / 6) };
};

const VideoGrid = () => {
  const { localStream, displayName, audioEnabled, videoEnabled, peers } = useRoom();

  const peerList = useMemo(() => Object.values(peers), [peers]);
  const totalCount = peerList.length + 1; // +1 for local
  const { cols } = getGridConfig(totalCount);

  return (
    <Box
      sx={{
        flex: 1,
        p: 1,
        overflow: 'hidden',
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridAutoRows: '1fr',
        gap: 1,
      }}
    >
      {/* Local video */}
      <VideoTile
        stream={localStream}
        displayName={displayName}
        isLocal
        audioEnabled={audioEnabled}
        videoEnabled={videoEnabled}
      />

      {/* Remote peers */}
      {peerList.map((peer) => (
        <VideoTile
          key={peer.id}
          stream={peer.stream}
          displayName={peer.displayName}
          audioEnabled={peer.audioEnabled}
          videoEnabled={peer.videoEnabled}
        />
      ))}
    </Box>
  );
};

export default VideoGrid;
