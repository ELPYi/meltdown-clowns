import React from 'react';
import { useConnectionStore } from './stores/connection-store.js';
import { useGameStore } from './stores/game-store.js';
import { useLobbyStore } from './stores/lobby-store.js';
import { LobbyBrowser } from './screens/LobbyBrowser.js';
import { RoomWaiting } from './screens/RoomWaiting.js';
import { GameScreen } from './screens/GameScreen.js';
import { GameOver } from './screens/GameOver.js';
import './styles.css';

type Screen = 'lobby' | 'room' | 'game' | 'gameover';

export function App() {
  const connected = useConnectionStore(s => s.connected);
  const inRoom = useLobbyStore(s => s.currentRoom !== null);
  const inGame = useGameStore(s => s.inGame);
  const gameOver = useGameStore(s => s.gameOver);

  let screen: Screen = 'lobby';
  if (gameOver) screen = 'gameover';
  else if (inGame) screen = 'game';
  else if (inRoom) screen = 'room';

  return (
    <div className="app">
      {!connected && (
        <div className="connection-overlay">
          <div className="connection-modal">
            <div className="spinner" />
            <p>Connecting to reactor control network...</p>
          </div>
        </div>
      )}
      {screen === 'lobby' && <LobbyBrowser />}
      {screen === 'room' && <RoomWaiting />}
      {screen === 'game' && <GameScreen />}
      {screen === 'gameover' && <GameOver />}
    </div>
  );
}
