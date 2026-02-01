#!/bin/bash

echo "🚀 Starting Online Code Editor..."
echo ""

# Check if node_modules exist
if [ ! -d "backend/node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    cd backend && npm install && cd ..
fi

if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd frontend && npm install && cd ..
fi

echo ""
echo "✅ Dependencies installed!"
echo ""
echo "Starting servers..."
echo "Backend: http://localhost:5000"
echo "Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Start backend in background
cd backend && npm start &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 2

# Start frontend
cd ../frontend && npm run dev

# When frontend is killed, also kill backend
kill $BACKEND_PID
