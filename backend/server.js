// ═══════════════════════════════════════════════════════════════════════
// COLLABORATIVE CODE EDITOR - BACKEND SERVER
// Computer Networking Concepts: WebSocket, Real-Time Communication, Rooms
// ═══════════════════════════════════════════════════════════════════════

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// ═══════════════════════════════════════════════════════════════════════
// SERVER INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════

const app = express();
const server = http.createServer(app);

// Socket.io setup with CORS
// This enables WebSocket connections from the frontend
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST'],
    credentials: true
  },
  // WebSocket transport configuration
  transports: ['websocket', 'polling'], // Try WebSocket first, fallback to polling
  pingTimeout: 60000, // 60 seconds before considering connection dead
  pingInterval: 25000 // Send ping every 25 seconds to keep connection alive
});

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// ═══════════════════════════════════════════════════════════════════════
// IN-MEMORY DATA STRUCTURES (For demonstration - use Redis in production)
// ═══════════════════════════════════════════════════════════════════════

// Active rooms: Map<roomId, Room>
const rooms = new Map();

// Room structure:
// {
//   id: 'abc123',
//   code: 'console.log("hello")',
//   language: 'javascript',
//   users: Map<socketId, User>,
//   createdAt: timestamp,
//   lastActivity: timestamp
// }

// User structure:
// {
//   id: socketId,
//   username: 'User1',
//   color: '#00d9ff',
//   cursorPosition: { line: 1, column: 0 },
//   joinedAt: timestamp
// }

// ═══════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════

// Generate random room ID (6 characters)
function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Generate random color for user
function generateUserColor() {
  const colors = [
    '#00d9ff', // Cyan
    '#ff006e', // Pink
    '#00ff88', // Green
    '#ffd60a', // Yellow
    '#a78bfa', // Purple
    '#fb923c', // Orange
    '#34d399', // Teal
    '#f472b6'  // Magenta
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Clean up inactive rooms (older than 24 hours)
function cleanupInactiveRooms() {
  const now = Date.now();
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  
  for (const [roomId, room] of rooms.entries()) {
    if (now - room.lastActivity > TWENTY_FOUR_HOURS) {
      console.log(`[CLEANUP] Removing inactive room: ${roomId}`);
      rooms.delete(roomId);
    }
  }
}

// Run cleanup every hour
setInterval(cleanupInactiveRooms, 60 * 60 * 1000);

// ═══════════════════════════════════════════════════════════════════════
// WEBSOCKET CONNECTION HANDLING
// Computer Network Concept: Persistent bidirectional communication
// ═══════════════════════════════════════════════════════════════════════

io.on('connection', (socket) => {
  console.log(`\n[WebSocket] New connection established: ${socket.id}`);
  console.log(`[Network] Transport: ${socket.conn.transport.name}`); // 'websocket' or 'polling'
  console.log(`[Network] Client IP: ${socket.handshake.address}`);
  
  // Track connection time for latency measurement
  const connectionTime = Date.now();
  
  // ───────────────────────────────────────────────────────────────────
  // EVENT: Create Room
  // ───────────────────────────────────────────────────────────────────
  socket.on('create-room', ({ username, language }) => {
    const roomId = generateRoomId();
    const userColor = generateUserColor();
    
    // Create new room
    const room = {
      id: roomId,
      code: getDefaultCode(language),
      language: language || 'javascript',
      input: '',
      users: new Map(),
      createdAt: Date.now(),
      lastActivity: Date.now()
    };
    
    // Add creator to room
    room.users.set(socket.id, {
      id: socket.id,
      username: username || 'Anonymous',
      color: userColor,
      cursorPosition: { line: 1, column: 0 },
      selection: null,
      joinedAt: Date.now()
    });
    
    rooms.set(roomId, room);
    
    // Join Socket.io room (for broadcasting)
    socket.join(roomId);
    
    console.log(`[ROOM] Created: ${roomId} by ${username || 'Anonymous'}`);
    
    // Send room info back to creator
    socket.emit('room-created', {
      roomId,
      code: room.code,
      language: room.language,
      input: room.input,
      user: room.users.get(socket.id),
      users: Array.from(room.users.values())
    });
  });
  
  // ───────────────────────────────────────────────────────────────────
  // EVENT: Join Room
  // ───────────────────────────────────────────────────────────────────
  socket.on('join-room', ({ roomId, username }) => {
    const room = rooms.get(roomId);
    
    if (!room) {
      socket.emit('room-error', { message: 'Room not found' });
      console.log(`[ROOM] Join failed: Room ${roomId} not found`);
      return;
    }
    
    const userColor = generateUserColor();
    
    // Add user to room
    const user = {
      id: socket.id,
      username: username || 'Anonymous',
      color: userColor,
      cursorPosition: { line: 1, column: 0 },
      selection: null,
      joinedAt: Date.now()
    };
    
    room.users.set(socket.id, user);
    room.lastActivity = Date.now();
    
    // Join Socket.io room
    socket.join(roomId);
    
    console.log(`[ROOM] ${username || 'Anonymous'} joined room: ${roomId}`);
    console.log(`[ROOM] Active users in ${roomId}: ${room.users.size}`);
    
    // Send current state to the new user
    socket.emit('room-joined', {
      roomId,
      code: room.code,
      language: room.language,
      input: room.input,
      user: user,
      users: Array.from(room.users.values())
    });
    
    // Notify others in the room
    socket.to(roomId).emit('user-joined', {
      user: user,
      users: Array.from(room.users.values())
    });
  });
  
  // ───────────────────────────────────────────────────────────────────
  // EVENT: Code Change
  // Computer Network Concept: Delta updates, broadcast
  // ───────────────────────────────────────────────────────────────────
  socket.on('code-change', ({ roomId, code, cursorPosition }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    
    // Update room code
    room.code = code;
    room.lastActivity = Date.now();
    
    // Update user cursor position
    const user = room.users.get(socket.id);
    if (user && cursorPosition) {
      user.cursorPosition = cursorPosition;
    }
    
    // Broadcast to all other users in the room
    // NOTE: socket.to(roomId) excludes the sender
    socket.to(roomId).emit('code-update', {
      code: code,
      userId: socket.id,
      username: user?.username,
      cursorPosition: cursorPosition,
      timestamp: Date.now()
    });
    
    console.log(`[SYNC] Code updated in room ${roomId} by ${user?.username}`);
  });
  
  // ───────────────────────────────────────────────────────────────────
  // EVENT: Cursor Movement
  // ───────────────────────────────────────────────────────────────────
  socket.on('cursor-move', ({ roomId, position }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    
    const user = room.users.get(socket.id);
    if (user) {
      user.cursorPosition = position;
    }
    
    // Broadcast cursor position to others
    socket.to(roomId).emit('cursor-update', {
      userId: socket.id,
      username: user?.username,
      color: user?.color,
      position: position
    });
  });
  
  // ───────────────────────────────────────────────────────────────────
  // EVENT: Selection Change
  // ───────────────────────────────────────────────────────────────────
  socket.on('selection-change', ({ roomId, selection }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    
    const user = room.users.get(socket.id);
    if (user) {
      user.selection = selection;
    }
    
    // Broadcast selection to others
    socket.to(roomId).emit('selection-update', {
      userId: socket.id,
      username: user?.username,
      color: user?.color,
      selection: selection
    });
  });
  
  // ───────────────────────────────────────────────────────────────────
  // EVENT: Language Change
  // ───────────────────────────────────────────────────────────────────
  socket.on('language-change', ({ roomId, language }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    
    room.language = language;
    room.code = getDefaultCode(language);
    room.lastActivity = Date.now();
    
    // Broadcast to all users including sender
    io.to(roomId).emit('language-update', {
      language: language,
      code: room.code
    });
    
    console.log(`[ROOM] Language changed to ${language} in room ${roomId}`);
  });
  
  // ───────────────────────────────────────────────────────────────────
  // EVENT: Input Change (stdin)
  // ───────────────────────────────────────────────────────────────────
  socket.on('input-change', ({ roomId, input }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    
    room.input = input;
    room.lastActivity = Date.now();
    
    // Broadcast to others
    socket.to(roomId).emit('input-update', { input });
  });
  
  // ───────────────────────────────────────────────────────────────────
  // EVENT: Chat Message
  // ───────────────────────────────────────────────────────────────────
  socket.on('chat-message', ({ roomId, message }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    
    const user = room.users.get(socket.id);
    
    const chatMessage = {
      id: uuidv4(),
      userId: socket.id,
      username: user?.username || 'Anonymous',
      color: user?.color,
      message: message,
      timestamp: Date.now()
    };
    
    // Broadcast to all users including sender
    io.to(roomId).emit('chat-message', chatMessage);
    
    console.log(`[CHAT] ${user?.username}: ${message}`);
  });
  
  // ───────────────────────────────────────────────────────────────────
  // EVENT: Typing Indicator
  // ───────────────────────────────────────────────────────────────────
  socket.on('typing', ({ roomId, isTyping }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    
    const user = room.users.get(socket.id);
    
    socket.to(roomId).emit('user-typing', {
      userId: socket.id,
      username: user?.username,
      isTyping: isTyping
    });
  });
  
  // ───────────────────────────────────────────────────────────────────
  // EVENT: Request Latency (Ping)
  // Computer Network Concept: Round-trip time measurement
  // ───────────────────────────────────────────────────────────────────
  socket.on('ping', ({ timestamp }) => {
    socket.emit('pong', {
      clientTimestamp: timestamp,
      serverTimestamp: Date.now()
    });
  });
  
  // ───────────────────────────────────────────────────────────────────
  // EVENT: Disconnect
  // ───────────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    console.log(`\n[WebSocket] Connection closed: ${socket.id}`);
    
    // Find which room the user was in
    for (const [roomId, room] of rooms.entries()) {
      if (room.users.has(socket.id)) {
        const user = room.users.get(socket.id);
        room.users.delete(socket.id);
        
        console.log(`[ROOM] ${user.username} left room: ${roomId}`);
        console.log(`[ROOM] Remaining users: ${room.users.size}`);
        
        // Notify others
        socket.to(roomId).emit('user-left', {
          userId: socket.id,
          username: user.username,
          users: Array.from(room.users.values())
        });
        
        // Delete room if empty
        if (room.users.size === 0) {
          rooms.delete(roomId);
          console.log(`[ROOM] Room ${roomId} deleted (empty)`);
        }
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
// REST API ENDPOINTS (Existing + New)
// ═══════════════════════════════════════════════════════════════════════

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Collaborative code editor server is running',
    activeRooms: rooms.size,
    timestamp: new Date().toISOString()
  });
});

// Get room info
app.get('/api/rooms/:roomId', (req, res) => {
  const { roomId } = req.params;
  const room = rooms.get(roomId);
  
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  
  res.json({
    id: room.id,
    language: room.language,
    userCount: room.users.size,
    users: Array.from(room.users.values()).map(u => ({
      username: u.username,
      color: u.color
    })),
    createdAt: room.createdAt
  });
});

// Get all active rooms (for monitoring)
app.get('/api/rooms', (req, res) => {
  const roomList = Array.from(rooms.values()).map(room => ({
    id: room.id,
    language: room.language,
    userCount: room.users.size,
    createdAt: room.createdAt,
    lastActivity: room.lastActivity
  }));
  
  res.json({ rooms: roomList, total: rooms.size });
});

// ═══════════════════════════════════════════════════════════════════════
// CODE EXECUTION (Existing functionality)
// ═══════════════════════════════════════════════════════════════════════

const TEMP_DIR = process.platform === 'win32' 
  ? path.join(__dirname, 'temp')
  : '/tmp/code-editor';

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Language configurations
const languageConfig = {
  javascript: {
    extension: '.js',
    command: (filePath, inputData) => 
      inputData ? `echo "${inputData}" | node ${filePath}` : `node ${filePath}`
  },
  python: {
    extension: '.py',
    command: (filePath, inputData) =>
      inputData ? `echo "${inputData}" | python3 ${filePath}` : `python3 ${filePath}`
  },
  java: {
    extension: '.java',
    command: (filePath, inputData) => {
      const dir = path.dirname(filePath);
      const compile = `javac ${filePath}`;
      const run = inputData 
        ? `echo "${inputData}" | java -cp ${dir} Main`
        : `java -cp ${dir} Main`;
      return `${compile} && ${run}`;
    }
  },
  cpp: {
    extension: '.cpp',
    command: (filePath, inputData) => {
      const outputPath = filePath.replace('.cpp', '');
      const compile = `g++ ${filePath} -o ${outputPath}`;
      const run = inputData
        ? `echo "${inputData}" | ${outputPath}`
        : outputPath;
      return `${compile} && ${run}`;
    }
  },
  c: {
    extension: '.c',
    command: (filePath, inputData) => {
      const outputPath = filePath.replace('.c', '');
      const compile = `gcc ${filePath} -o ${outputPath}`;
      const run = inputData
        ? `echo "${inputData}" | ${outputPath}`
        : outputPath;
      return `${compile} && ${run}`;
    }
  }
};

// Execute code endpoint
app.post('/api/execute', async (req, res) => {
  const { code, language, input = '' } = req.body;
  
  if (!code || !language) {
    return res.status(400).json({
      success: false,
      error: 'Code and language are required'
    });
  }
  
  const config = languageConfig[language];
  if (!config) {
    return res.status(400).json({
      success: false,
      error: 'Unsupported language'
    });
  }
  
  const fileName = language === 'java'
    ? 'Main.java'
    : `${uuidv4()}${config.extension}`;
  
  const filePath = path.join(TEMP_DIR, fileName);
  
  try {
    // Ensure temp directory exists
    if (!fs.existsSync(TEMP_DIR)) {
      fs.mkdirSync(TEMP_DIR, { recursive: true });
    }
    
    fs.writeFileSync(filePath, code);
    
    const startTime = Date.now();
    const command = config.command(filePath, input);
    
    exec(command, {
      timeout: 5000,
      maxBuffer: 1024 * 1024,
      shell: '/bin/bash'
    }, (error, stdout, stderr) => {
      const executionTime = Date.now() - startTime;
      
      // Clean up
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        if (language === 'cpp' || language === 'c') {
          const outputPath = filePath.replace(config.extension, '');
          if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath);
          }
        }
        if (language === 'java') {
          const classPath = filePath.replace('.java', '.class');
          if (fs.existsSync(classPath)) {
            fs.unlinkSync(classPath);
          }
        }
      } catch (cleanupError) {
        console.error('Cleanup error:', cleanupError);
      }
      
      if (error) {
        return res.json({
          success: false,
          output: stdout,
          error: stderr || error.message,
          executionTime
        });
      }
      
      res.json({
        success: true,
        output: stdout,
        error: stderr,
        executionTime
      });
    });
    
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Get supported languages
app.get('/api/languages', (req, res) => {
  res.json({
    languages: Object.keys(languageConfig)
  });
});

// ═══════════════════════════════════════════════════════════════════════
// HELPER: Default code templates
// ═══════════════════════════════════════════════════════════════════════

function getDefaultCode(language) {
  const templates = {
    javascript: `// JavaScript - Collaborative Editing
console.log("Hello from the room!");

// Try typing together with your friends
const greet = (name) => {
  return \`Welcome, \${name}!\`;
};

console.log(greet("Developer"));`,

    python: `# Python - Collaborative Editing
print("Hello from the room!")

# Try typing together with your friends
def greet(name):
    return f"Welcome, {name}!"

print(greet("Developer"))`,

    java: `// Java - Collaborative Editing
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello from the room!");
        
        // Try typing together with your friends
        String greeting = greet("Developer");
        System.out.println(greeting);
    }
    
    public static String greet(String name) {
        return "Welcome, " + name + "!";
    }
}`,

    cpp: `// C++ - Collaborative Editing
#include <iostream>
#include <string>
using namespace std;

string greet(string name) {
    return "Welcome, " + name + "!";
}

int main() {
    cout << "Hello from the room!" << endl;
    
    // Try typing together with your friends
    cout << greet("Developer") << endl;
    
    return 0;
}`,

    c: `// C - Collaborative Editing
#include <stdio.h>

int main() {
    printf("Hello from the room!\\n");
    
    // Try typing together with your friends
    char name[] = "Developer";
    printf("Welcome, %s!\\n", name);
    
    return 0;
}`
  };
  
  return templates[language] || templates.javascript;
}

// ═══════════════════════════════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════════════════════════════

server.listen(PORT, () => {
  console.log('\n' + '═'.repeat(70));
  console.log('  🚀 COLLABORATIVE CODE EDITOR SERVER');
  console.log('═'.repeat(70));
  console.log(`  Port: ${PORT}`);
  console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`  WebSocket: Enabled (Socket.io)`);
  console.log(`  Temp Directory: ${TEMP_DIR}`);
  console.log('═'.repeat(70) + '\n');
});