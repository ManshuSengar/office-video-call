# 🎥 NexCall — Group Video Call App

Free, scalable group video calling for 50+ participants built with **React + Node.js + mediasoup SFU**.

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     CLIENT (React)                           │
│                                                              │
│  LobbyPage → RoomPage → VideoGrid + ChatPanel + ControlsBar  │
│                    ↓                                         │
│            mediasoup-client (WebRTC)                         │
│            socket.io-client (Signaling)                      │
└────────────────────┬─────────────────────────────────────────┘
                     │ WebSocket (Socket.io)
┌────────────────────▼─────────────────────────────────────────┐
│                  NODE.JS SERVER                              │
│                                                              │
│  Express REST API + Socket.io Signaling                      │
│         ↓                                                    │
│  RoomManager → Room → Peer                                   │
│         ↓                                                    │
│  mediasoup SFU (Workers → Routers → Transports)              │
│  Producers: audio/video from each client (1 stream up)       │
│  Consumers: server forwards to all others (SFU pattern)      │
└──────────────────────────────────────────────────────────────┘
```

**Why SFU over Mesh for 50+ participants?**

| | Mesh (simple-peer) | SFU (mediasoup) |
|---|---|---|
| Client upload streams | N-1 (49 for 50 users) | 1 |
| Client download streams | N-1 | N-1 |
| Server load | None | High (worth it) |
| Max practical users | ~6 | 50-200+ |

---

## 📁 Project Structure

```
videocall/
├── server/
│   ├── src/
│   │   ├── config/
│   │   │   └── mediasoup.config.js   # Codecs, transport settings
│   │   ├── rooms/
│   │   │   ├── Room.js               # Room + Peer class (mediasoup entities)
│   │   │   └── RoomManager.js        # Worker pool + room lifecycle
│   │   ├── socket/
│   │   │   └── socketHandler.js      # All signaling events
│   │   └── index.js                  # Express + Socket.io + mediasoup init
│   ├── package.json
│   ├── render.yaml
│   └── .env.example
│
└── client/
    ├── src/
    │   ├── context/
    │   │   └── RoomContext.js         # Global call state (useReducer)
    │   ├── hooks/
    │   │   └── useCall.js             # Orchestrates join/produce/consume
    │   ├── services/
    │   │   ├── socket.service.js      # Singleton Socket.io client
    │   │   └── mediasoup.service.js   # Device, transports, producers, consumers
    │   ├── components/
    │   │   ├── Room/
    │   │   │   ├── RoomPage.jsx       # Main call view
    │   │   │   ├── VideoGrid.jsx      # Responsive video grid (auto-layout)
    │   │   │   └── VideoTile.jsx      # Single participant video tile
    │   │   ├── Controls/
    │   │   │   └── ControlsBar.jsx    # Mic/cam/leave/chat controls
    │   │   ├── Chat/
    │   │   │   └── ChatPanel.jsx      # In-call text chat
    │   │   └── UI/
    │   │       └── LobbyPage.jsx      # Join/create room landing
    │   ├── App.jsx
    │   └── index.js
    ├── public/index.html
    ├── package.json
    └── .env.example
```

---

## 🚀 Local Development Setup

### Prerequisites
- Node.js 18+
- Python 3 (mediasoup requires it for native build)
- On Linux: `sudo apt-get install -y python3 make g++`
- On Mac: Xcode Command Line Tools

### 1. Clone & Install

```bash
# Server
cd server
cp .env.example .env
npm install

# Client
cd ../client
cp .env.example .env
npm install
```

### 2. Configure Server `.env`

```env
PORT=5001
ANNOUNCED_IP=127.0.0.1    # Use local IP for LAN testing
CLIENT_URL=http://localhost:3000
```

### 3. Run

```bash
# Terminal 1 - Server
cd server && npm run dev

# Terminal 2 - Client
cd client && npm start
```

Open http://localhost:3000 — create a room, copy the link, open in another tab to test!

---

## ☁️ Free Deployment

### Backend → Render (Free Tier)

1. Push `server/` folder to GitHub
2. Go to [render.com](https://render.com) → **New Web Service**
3. Connect your repo, set:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Add environment variables:
   ```
   NODE_ENV=production
   ANNOUNCED_IP=<your-render-service-ip>   ← Found in Render dashboard
   CLIENT_URL=https://your-app.vercel.app
   RTC_MIN_PORT=10000
   RTC_MAX_PORT=10100
   ```
5. **Important**: In Render → Settings → Open port range `10000-10100` (UDP) for WebRTC

### Frontend → Vercel (Free Tier)

1. Push `client/` folder to GitHub
2. Go to [vercel.com](https://vercel.com) → **Import Project**
3. Add environment variable:
   ```
   REACT_APP_SERVER_URL=https://your-server.onrender.com
   ```
4. Deploy ✅

### ⚠️ Free Tier Limitations

| Platform | Limit | Impact |
|---|---|---|
| Render Free | Spins down after 15min idle | First join ~30s delay |
| Render Free | 512MB RAM, 0.1 CPU | ~5-10 concurrent rooms |
| Vercel Free | 100GB bandwidth | Fine for testing |

**Upgrade to Render Starter ($7/mo)** for production use (no spin-down, more resources).

---

## 📡 Socket.io Events Reference

| Event | Direction | Description |
|---|---|---|
| `joinRoom` | Client → Server | Join/create a room |
| `createTransport` | Client → Server | Create WebRTC transport |
| `connectTransport` | Client → Server | Connect transport (DTLS handshake) |
| `produce` | Client → Server | Start publishing audio/video |
| `consume` | Client → Server | Subscribe to a peer's track |
| `resumeConsumer` | Client → Server | Unpause consumer after setup |
| `closeProducer` | Client → Server | Stop publishing |
| `chatMessage` | Client ↔ Server | Text chat |
| `mediaStateChanged` | Client → Server | Mic/cam mute state |
| `peerJoined` | Server → Client | New participant joined |
| `peerLeft` | Server → Client | Participant left |
| `newProducer` | Server → Client | Peer started publishing |
| `producerClosed` | Server → Client | Peer stopped publishing |
| `peerMediaStateChanged` | Server → Client | Peer muted/unmuted |

---

## 🔧 Scaling Beyond Free Tier

For 50+ simultaneous rooms with high quality:

1. **Multiple mediasoup Workers**: Already configured (1 per CPU core)
2. **Horizontal scaling**: Add Redis adapter to Socket.io for multi-server
3. **TURN server**: Add Coturn for users behind strict firewalls (free on Oracle Cloud always-free tier)
4. **Simulcast**: Already configured in `mediasoup.service.js` (3 quality layers)

---

## 📝 Key Design Decisions

- **SFU pattern**: Each peer uploads one stream, server does selective forwarding
- **Simulcast**: 3 quality layers (100k/300k/900k) — server selects best for each consumer
- **Graceful room cleanup**: 30s grace period before empty room deletion (handles reconnects)
- **Worker restart**: Mediasoup workers auto-respawn on crash
- **Consumer start paused**: Consumers start paused server-side, only resume after client confirms setup
