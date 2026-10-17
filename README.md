# 🎭 Mafia Online

A modern, real-time multiplayer Mafia web game where anyone can create or join a room with a short code, play with friends without needing a human moderator, and play subsequent games back-to-back in the same room.

Built with **Next.js 14**, **Node.js/Express + Socket.IO**, **SQLite**, and **Tailwind CSS**.

---

## ✨ Features

- **No Moderator Needed**: Fully automated game cycle and state machine.
- **No Accounts Required**: Enter your display name and hop straight into the action.
- **Room System**: 6-character room codes (`ABCD12`) with 1-click invite link copying.
- **Continuous Sessions**: Play back-to-back games in the same room with re-shuffled roles ("New Game").
- **Classic Balanced Rules**:
  - Scales automatically from 4 to 15 players (1–4 Mafias).
  - Always 1 Doctor (can self-protect & protect consecutively) and 1 Police.
  - Remaining players are Citizens.
- **Night Phase**:
  - Syndicate private chat for Mafias.
  - Rotating Mafia leader submits the final assassination target.
  - Police private investigation reports.
  - Doctor patient protection.
- **Day Phases**:
  - **Dawn Reveal**: Casualties announced; external group discussion time (voice call or in-person).
  - **Town Voting**: Mandatory ballot for all living citizens. Ties result in no elimination.
  - Eliminated player roles remain strictly secret until the game ends!
- **Spectator God View**: Eliminated players become ghosts with full visibility over all roles and live actions.
- **60s Disconnection Grace Period**: Players can reconnect using their session token without losing their place.
- **Mobile-First Noir Theme**: Cinematic dark UI optimized for mobile phones during in-person game nights.

---

## 🛠️ Project Structure

```
mafia/
├── shared/         # Shared TypeScript interfaces & Socket.IO contracts
├── server/         # Express + Socket.IO backend with SQLite persistence
│   ├── src/
│   │   ├── db/     # SQLite schema & persistence repository
│   │   ├── game/   # Mafia game state machine & role logic
│   │   └── socket/ # Socket.IO event handlers
└── client/         # Next.js 14 frontend (Tailwind CSS, dark noir UI)
```

---

## 🚀 Quick Start (Development)

### 1. Install Dependencies
```bash
npm install
```

### 2. Build Shared Package
```bash
npm run build:shared
```

### 3. Start Development Servers
Run the backend and frontend in separate terminals (or with a process manager):

**Terminal 1 — Backend (Port 4000):**
```bash
npm run dev:server
```

**Terminal 2 — Frontend (Port 3000):**
```bash
npm run dev:client
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🌐 Production & Self-Hosting

### Environment Variables

#### Backend (`server/.env` or system environment):
```env
PORT=4000
CLIENT_ORIGIN=http://your-domain.com
```

#### Frontend (`client/.env.local` or build-time environment):
```env
NEXT_PUBLIC_SOCKET_URL=http://your-domain.com:4000
```
*(If you are reverse-proxying through Nginx or Caddy on the same domain and port, configure `NEXT_PUBLIC_SOCKET_URL` to point to your public domain or leave empty for same-origin).*

### Build & Run

```bash
# 1. Build all packages
npm run build

# 2. Start Backend
npm run start:server

# 3. Start Frontend
npm run start:client
```

---

## 📜 Game Phase Flow

```
Lobby (4+ players)
  ↓ [Start Game]
Night Phase (Simultaneous secret actions)
  - Mafia Chat & Leader Kill
  - Police Investigation
  - Doctor Protection
  ↓ [All actions submitted]
Day Reveal Phase
  - Casualties or Doctor save announced
  - Town discusses (voice/in-person)
  ↓ [Proceed to Vote]
Day Voting Phase
  - Mandatory vote by all alive citizens
  - Majority eliminated (ties = safe)
  ↓
[Check Win Condition]
  ├── Mafia count >= Town count  → Mafia Wins!
  ├── All Mafias eliminated      → Town Wins!
  └── Game continues             → Next Night Phase
```
