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
      {/* OPTION 1: Integrate into header (recommended for mobile) */}
      <CollabButton onClick={() => setMode('collab')} />
      
      <SoloEditor />
    </div>
  );
}

// Separate button component for cleaner code
function CollabButton({ onClick }) {
  return (
    <>
      <button onClick={onClick} className="collab-toggle-btn">
        <span className="btn-icon">👥</span>
        <span className="btn-text">Collaborate</span>
      </button>
      
      <style>{`
        .collab-toggle-btn {
          /* Fixed position - always visible */
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 9999;
          
          /* Styling */
          padding: 14px 24px;
          background: linear-gradient(135deg, #00d9ff 0%, #a78bfa 100%);
          color: #0f0f1a;
          border: none;
          border-radius: 50px;
          font-size: 15px;
          font-weight: 600;
          font-family: 'Inter', -apple-system, sans-serif;
          cursor: pointer;
          
          /* Effects */
          box-shadow: 0 4px 20px rgba(0, 217, 255, 0.4);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          
          /* Layout */
          display: flex;
          align-items: center;
          gap: 10px;
          white-space: nowrap;
        }
        
        .collab-toggle-btn:hover {
          transform: translateY(-3px) scale(1.02);
          box-shadow: 0 8px 30px rgba(0, 217, 255, 0.6);
        }
        
        .collab-toggle-btn:active {
          transform: translateY(-1px);
        }
        
        .btn-icon {
          font-size: 20px;
          line-height: 1;
        }
        
        .btn-text {
          font-size: 15px;
          font-weight: 600;
        }
        
        /* ═══════════════════════════════════════════════════════
           MOBILE RESPONSIVE (Tablets)
           ═══════════════════════════════════════════════════════ */
        @media (max-width: 968px) {
          .collab-toggle-btn {
            bottom: 20px;
            right: 20px;
            padding: 12px 20px;
          }
        }
        
        /* ═══════════════════════════════════════════════════════
           MOBILE RESPONSIVE (Phones)
           ═══════════════════════════════════════════════════════ */
        @media (max-width: 600px) {
          .collab-toggle-btn {
            /* Icon-only on small screens */
            bottom: 16px;
            right: 16px;
            padding: 14px;
            border-radius: 50%;
            width: 56px;
            height: 56px;
          }
          
          /* Hide text on mobile */
          .btn-text {
            display: none;
          }
          
          .btn-icon {
            font-size: 24px;
          }
        }
        
        /* Extra small phones */
        @media (max-width: 380px) {
          .collab-toggle-btn {
            bottom: 12px;
            right: 12px;
            width: 50px;
            height: 50px;
            padding: 12px;
          }
          
          .btn-icon {
            font-size: 22px;
          }
        }
        
        /* ═══════════════════════════════════════════════════════
           ACCESSIBILITY
           ═══════════════════════════════════════════════════════ */
        .collab-toggle-btn:focus {
          outline: none;
          box-shadow: 0 0 0 3px rgba(0, 217, 255, 0.3),
                      0 4px 20px rgba(0, 217, 255, 0.4);
        }
        
        /* Reduce motion for accessibility */
        @media (prefers-reduced-motion: reduce) {
          .collab-toggle-btn {
            transition: none;
          }
        }
      `}</style>
    </>
  );
}

export default App;