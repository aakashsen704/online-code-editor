// ═══════════════════════════════════════════════════════════════════════
// COLLABORATIVE ROOM COMPONENT - IMPROVED MOBILE VERSION
// Better button placement, upload/save functionality, professional styling
// ═══════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import Editor from '@monaco-editor/react';
import axios from 'axios';
import './CollabRoom.css';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000');

function CollabRoom() {
  // ... (Keep all the existing state and hooks - lines 1-230 from original)
  // [Previous state management code stays the same]
  
  const [socket, setSocket] = useState(null);
  const [roomId, setRoomId] = useState('');
  const [username, setUsername] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [inRoom, setInRoom] = useState(false);
  
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [executionTime, setExecutionTime] = useState(null);
  const [hasError, setHasError] = useState(false);
  
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [remoteCursors, setRemoteCursors] = useState(new Map());
  
  const [messages, setMessages] = useState([]);
  const [chatMessage, setChatMessage] = useState('');
  const [showChat, setShowChat] = useState(true);
  
  const [latency, setLatency] = useState(null);
  
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const lastCodeRef = useRef('');
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // ... (Keep all useEffects and handlers from original - lines 50-320)
  // WebSocket initialization, event listeners, etc.
  
  useEffect(() => {
    const newSocket = io(API_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });
    
    setSocket(newSocket);
    
    newSocket.on('connect', () => {
      console.log('[WebSocket] Connected:', newSocket.id);
      setIsConnected(true);
    });
    
    newSocket.on('disconnect', () => {
      console.log('[WebSocket] Disconnected');
      setIsConnected(false);
    });
    
    newSocket.on('connect_error', (error) => {
      console.error('[WebSocket] Connection error:', error);
    });
    
    return () => {
      newSocket.close();
    };
  }, []);
  
  useEffect(() => {
    if (!socket) return;
    
    socket.on('room-created', (data) => {
      console.log('[ROOM] Created:', data.roomId);
      setRoomId(data.roomId);
      setCode(data.code);
      setLanguage(data.language);
      setInput(data.input || '');
      setCurrentUser(data.user);
      setUsers(data.users);
      setInRoom(true);
      lastCodeRef.current = data.code;
      addSystemMessage(`Room created! Share this ID: ${data.roomId}`);
    });
    
    socket.on('room-joined', (data) => {
      console.log('[ROOM] Joined:', data.roomId);
      setRoomId(data.roomId);
      setCode(data.code);
      setLanguage(data.language);
      setInput(data.input || '');
      setCurrentUser(data.user);
      setUsers(data.users);
      setInRoom(true);
      lastCodeRef.current = data.code;
      addSystemMessage(`Joined room: ${data.roomId}`);
    });
    
    socket.on('room-error', (data) => {
      alert(data.message);
    });
    
    socket.on('user-joined', (data) => {
      console.log('[ROOM] User joined:', data.user.username);
      setUsers(data.users);
      addSystemMessage(`${data.user.username} joined the room`);
    });
    
    socket.on('user-left', (data) => {
      console.log('[ROOM] User left:', data.username);
      setUsers(data.users);
      setRemoteCursors(prev => {
        const updated = new Map(prev);
        updated.delete(data.userId);
        return updated;
      });
      addSystemMessage(`${data.username} left the room`);
    });
    
    socket.on('code-update', (data) => {
      console.log('[SYNC] Code updated by:', data.username);
      setCode(data.code);
      lastCodeRef.current = data.code;
      
      if (data.cursorPosition) {
        setRemoteCursors(prev => new Map(prev).set(data.userId, {
          username: data.username,
          position: data.cursorPosition
        }));
      }
    });
    
    socket.on('cursor-update', (data) => {
      setRemoteCursors(prev => new Map(prev).set(data.userId, {
        username: data.username,
        color: data.color,
        position: data.position
      }));
    });
    
    socket.on('language-update', (data) => {
      setLanguage(data.language);
      setCode(data.code);
      lastCodeRef.current = data.code;
      addSystemMessage(`Language changed to ${data.language}`);
    });
    
    socket.on('input-update', (data) => {
      setInput(data.input);
    });
    
    socket.on('chat-message', (data) => {
      setMessages(prev => [...prev, data]);
    });
    
    socket.on('pong', (data) => {
      const rtt = Date.now() - data.clientTimestamp;
      setLatency(rtt);
    });
    
    return () => {
      socket.off('room-created');
      socket.off('room-joined');
      socket.off('room-error');
      socket.off('user-joined');
      socket.off('user-left');
      socket.off('code-update');
      socket.off('cursor-update');
      socket.off('language-update');
      socket.off('input-update');
      socket.off('chat-message');
      socket.off('pong');
    };
  }, [socket]);
  
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  useEffect(() => {
    if (!socket || !inRoom) return;
    
    const interval = setInterval(() => {
      socket.emit('ping', { timestamp: Date.now() });
    }, 5000);
    
    return () => clearInterval(interval);
  }, [socket, inRoom]);
  
  const createRoom = () => {
    if (!username.trim()) {
      alert('Please enter your name');
      return;
    }
    socket.emit('create-room', { username, language });
  };
  
  const joinRoom = () => {
    if (!username.trim() || !roomId.trim()) {
      alert('Please enter your name and room ID');
      return;
    }
    socket.emit('join-room', { roomId: roomId.toUpperCase(), username });
  };
  
  const leaveRoom = () => {
    window.location.reload();
  };
  
  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    addSystemMessage('Room ID copied to clipboard!');
  };
  
  // NEW: Upload file handler
  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };
  
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const fileContent = event.target.result;
      setCode(fileContent);
      lastCodeRef.current = fileContent;
      
      if (socket && inRoom) {
        const position = editorRef.current?.getPosition();
        const cursorPosition = position ? {
          line: position.lineNumber,
          column: position.column
        } : null;
        socket.emit('code-change', { roomId, code: fileContent, cursorPosition });
      }
      
      addSystemMessage(`Uploaded file: ${file.name}`);
    };
    reader.readAsText(file);
  };
  
  // NEW: Download file handler
  const handleDownload = () => {
    const extensions = {
      javascript: '.js',
      python: '.py',
      java: '.java',
      cpp: '.cpp',
      c: '.c'
    };
    
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `code${extensions[language] || '.txt'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    addSystemMessage('File downloaded');
  };
  
  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    
    editor.onDidChangeCursorPosition((e) => {
      if (!socket || !inRoom) return;
      
      const position = {
        line: e.position.lineNumber,
        column: e.position.column
      };
      
      socket.emit('cursor-move', { roomId, position });
    });
  };
  
  const handleCodeChange = (value) => {
    if (!socket || !inRoom) return;
    
    setCode(value);
    
    if (value !== lastCodeRef.current) {
      lastCodeRef.current = value;
      
      const position = editorRef.current?.getPosition();
      const cursorPosition = position ? {
        line: position.lineNumber,
        column: position.column
      } : null;
      
      socket.emit('code-change', { roomId, code: value, cursorPosition });
    }
  };
  
  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    if (socket && inRoom) {
      socket.emit('language-change', { roomId, language: newLang });
    }
  };
  
  const handleInputChange = (e) => {
    const newInput = e.target.value;
    setInput(newInput);
    if (socket && inRoom) {
      socket.emit('input-change', { roomId, input: newInput });
    }
  };
  
  const runCode = async () => {
    setIsRunning(true);
    setOutput('Running...');
    setHasError(false);
    
    try {
      const response = await axios.post(`${API_URL}/api/execute`, {
        code,
        language,
        input
      });
      
      if (response.data.success) {
        setOutput(response.data.output || '(No output)');
        setHasError(false);
      } else {
        setOutput(response.data.error || 'Execution failed');
        setHasError(true);
      }
      
      setExecutionTime(response.data.executionTime);
    } catch (error) {
      setOutput('Error: ' + error.message);
      setHasError(true);
    } finally {
      setIsRunning(false);
    }
  };
  
  const sendMessage = (e) => {
    e.preventDefault();
    if (!chatMessage.trim() || !socket || !inRoom) return;
    
    socket.emit('chat-message', { roomId, message: chatMessage });
    setChatMessage('');
  };
  
  const addSystemMessage = (text) => {
    setMessages(prev => [...prev, {
      id: Date.now(),
      type: 'system',
      message: text,
      timestamp: Date.now()
    }]);
  };
  
  // ═══════════════════════════════════════════════════════════════════
  // RENDER: JOIN SCREEN (Keep same as original)
  // ═══════════════════════════════════════════════════════════════════
  
  if (!inRoom) {
    return (
      <div className="join-screen">
        <div className="join-card">
          <h1>🚀 CodeCollab</h1>
          <p>Real-Time Collaborative Code Editor</p>
          
          <div className="connection-status">
            {isConnected ? (
              <span className="status-connected">● Connected</span>
            ) : (
              <span className="status-disconnected">● Disconnected</span>
            )}
          </div>
          
          <input
            type="text"
            placeholder="Enter your name"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="join-input"
          />
          
          <div className="join-actions">
            <button onClick={createRoom} className="btn btn-primary" disabled={!isConnected}>
              Create New Room
            </button>
            
            <div className="join-divider">OR</div>
            
            <input
              type="text"
              placeholder="Enter Room ID"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value.toUpperCase())}
              className="join-input"
              maxLength={6}
            />
            <button onClick={joinRoom} className="btn btn-secondary" disabled={!isConnected}>
              Join Room
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // ═══════════════════════════════════════════════════════════════════
  // RENDER: COLLABORATIVE EDITOR - IMPROVED HEADER
  // ═══════════════════════════════════════════════════════════════════
  
  return (
    <div className="collab-room">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".js,.py,.java,.cpp,.c,.txt"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
      
      {/* IMPROVED HEADER WITH BETTER MOBILE LAYOUT */}
      <header className="room-header">
        <div className="header-top">
          <div className="header-left">
            <h1 className="app-title">🚀 CodeCollab</h1>
            <div className="room-info">
              <span className="room-id" onClick={copyRoomId} title="Click to copy">
                Room: {roomId}
              </span>
              {latency && <span className="latency">⚡ {latency}ms</span>}
            </div>
          </div>
          
          <button onClick={leaveRoom} className="leave-button-mobile">
            Leave
          </button>
        </div>
        
        <div className="header-controls">
          {/* Language Selector */}
          <div className="control-group">
            <select value={language} onChange={handleLanguageChange} className="language-select">
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
              <option value="c">C</option>
            </select>
          </div>
          
          {/* File Actions */}
          <div className="control-group file-actions">
            <button onClick={handleFileUpload} className="icon-btn" title="Upload File">
              📁 <span className="btn-text">Upload</span>
            </button>
            <button onClick={handleDownload} className="icon-btn" title="Download File">
              💾 <span className="btn-text">Save</span>
            </button>
          </div>
          
          {/* Run Button */}
          <button onClick={runCode} disabled={isRunning} className="run-button">
            {isRunning ? '⏳' : '▶'} <span className="btn-text">{isRunning ? 'Running...' : 'Run'}</span>
          </button>
        </div>
      </header>
      
      {/* Users Panel */}
      <div className="users-panel">
        <div className="users-header">👥 Online ({users.length})</div>
        <div className="users-list">
          {users.map(user => (
            <div key={user.id} className="user-badge" style={{ borderLeft: `3px solid ${user.color}` }}>
              <span className="user-indicator" style={{ backgroundColor: user.color }}></span>
              {user.username}
              {user.id === currentUser?.id && ' (You)'}
            </div>
          ))}
        </div>
      </div>
      
      {/* Main Content */}
      <div className="room-content">
        {/* Editor */}
        <div className="editor-panel">
          <Editor
            height="100%"
            language={language}
            value={code}
            onChange={handleCodeChange}
            onMount={handleEditorDidMount}
            theme="vs-dark"
            options={{
              fontSize: 14,
              fontFamily: "'JetBrains Mono', monospace",
              minimap: { enabled: true },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              wordWrap: 'on'
            }}
          />
        </div>
        
        {/* Right Sidebar */}
        <div className="right-sidebar">
          {/* Input */}
          <div className="input-panel">
            <div className="panel-header">📥 Input (stdin)</div>
            <textarea
              value={input}
              onChange={handleInputChange}
              placeholder="Enter input for your program..."
              className="input-textarea"
            />
          </div>
          
          {/* Output */}
          <div className="output-panel">
            <div className="panel-header">
              🖥️ Output
              {executionTime && <span className="exec-time">⏱️ {executionTime}ms</span>}
            </div>
            <pre className={`output-content ${hasError ? 'output-error' : ''}`}>
              {output || '// Output will appear here'}
            </pre>
          </div>
          
          {/* Chat */}
          {showChat && (
            <div className="chat-panel">
              <div className="panel-header">
                💬 Chat
                <button onClick={() => setShowChat(false)} className="close-chat">✕</button>
              </div>
              <div className="chat-messages">
                {messages.map(msg => (
                  <div key={msg.id} className={`chat-message ${msg.type === 'system' ? 'system-message' : ''}`}>
                    {msg.type === 'system' ? (
                      <span className="system-text">{msg.message}</span>
                    ) : (
                      <>
                        <span className="message-user" style={{ color: msg.color }}>
                          {msg.username}:
                        </span>
                        <span className="message-text">{msg.message}</span>
                      </>
                    )}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <form onSubmit={sendMessage} className="chat-input-form">
                <input
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="chat-input"
                />
                <button type="submit" className="chat-send">Send</button>
              </form>
            </div>
          )}
          
          {!showChat && (
            <button onClick={() => setShowChat(true)} className="show-chat-btn">
              💬 Show Chat
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default CollabRoom;