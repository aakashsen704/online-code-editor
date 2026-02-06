import React, { useState } from 'react';
import SoloEditor from './SoloEditor';
import CollabRoom from './CollabRoom';
import './App.css';

function App() {
  const [mode, setMode] = useState('solo'); // 'solo' or 'collab'

  if (mode === 'collab') {
    return <CollabRoom />;
  }

  return (
    <div className="app">
      {/* Mode Toggle Button - Add this at the top */}
      <div style={{
        position: 'absolute',
        top: '15px',
        left: '500px',
        zIndex: 1000
      }}>
        <button
          onClick={() => setMode('collab')}
          style={{
            padding: '10px 20px',
            background: 'linear-gradient(135deg, #00d9ff 0%, #a78bfa 100%)',
            color: '#0f0f1a',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0, 217, 255, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>👥</span>
          Switch to Collaborative Mode
        </button>
      </div>
      
      <SoloEditor />
    </div>
  );
}

export default App;