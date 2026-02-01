# 🚀 Quick Setup Guide

## Step 1: Prerequisites

Make sure you have these installed:
- Node.js (v16+)
- npm
- Python 3
- GCC/G++ (for C/C++)
- Java JDK

## Step 2: Install Dependencies

### Option A: Manual Setup
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Option B: Use the startup script (Linux/Mac)
```bash
chmod +x start.sh
./start.sh
```

## Step 3: Run the Application

### Option A: Run manually (2 terminals)

**Terminal 1 - Backend:**
```bash
cd backend
npm start
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### Option B: Use the startup script (Linux/Mac)
```bash
./start.sh
```

## Step 4: Access the Application

Open your browser and go to:
```
http://localhost:3000
```

## 🎉 You're Done!

Now you can:
1. Select a programming language
2. Write your code
3. Click "Run Code"
4. See the output!

## 🐛 Common Issues

**Port already in use?**
- Change ports in `backend/server.js` and `frontend/vite.config.js`

**Compiler not found?**
- Make sure Python, GCC, and Java are installed and in your PATH

**CORS errors?**
- Make sure backend is running on port 5000
- Check the API_URL in `frontend/src/App.jsx`

## 📚 Next Steps

Check out the main README.md for:
- Detailed documentation
- API endpoints
- Configuration options
- Security considerations
- Future enhancements
