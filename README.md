# 💻 Online Code Editor & Compiler

A modern, full-stack online code editor and compiler that supports multiple programming languages with real-time code execution.

## ✨ Features

- **Multi-Language Support**: JavaScript, Python, Java, C++, and C
- **Monaco Editor**: Professional code editor with syntax highlighting and IntelliSense
- **Real-Time Execution**: Run code and see output instantly
- **Theme Support**: Dark, Light, and High Contrast themes
- **Execution Time Tracking**: See how long your code takes to run
- **Clean UI**: Modern, responsive interface that works on all devices
- **Terminal Output**: View program output in a terminal-style interface

## 🛠️ Tech Stack

### Frontend
- React 18
- Vite (Build tool)
- Monaco Editor (VS Code's editor)
- Axios (HTTP client)

### Backend
- Node.js
- Express.js
- Child Process (Code execution)

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Python 3** (for Python code execution)
- **GCC** (for C/C++ code execution)
- **Java JDK** (for Java code execution)

### Installing Compilers/Interpreters

**On Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install python3 gcc g++ default-jdk
```

**On macOS:**
```bash
brew install python gcc openjdk
```

**On Windows:**
- Install [Python](https://www.python.org/downloads/)
- Install [MinGW](https://www.mingw-w64.org/) for GCC/G++
- Install [Java JDK](https://www.oracle.com/java/technologies/downloads/)

## 🚀 Installation & Setup

### 1. Clone or Download the Project

```bash
git clone <your-repo-url>
cd online-code-editor
```

### 2. Setup Backend

```bash
cd backend
npm install
```

### 3. Setup Frontend

```bash
cd ../frontend
npm install
```

## ▶️ Running the Application

You need to run both backend and frontend servers:

### Terminal 1 - Start Backend Server

```bash
cd backend
npm start
```

The backend will run on `http://localhost:5000`

### Terminal 2 - Start Frontend Development Server

```bash
cd frontend
npm run dev
```

The frontend will run on `http://localhost:3000` and open automatically in your browser.

## 📁 Project Structure

```
online-code-editor/
├── backend/
│   ├── server.js           # Main Express server
│   ├── package.json        # Backend dependencies
│   └── temp/              # Temporary files for code execution
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx        # Main React component
│   │   ├── App.css        # Component styles
│   │   ├── main.jsx       # React entry point
│   │   └── index.css      # Global styles
│   ├── index.html         # HTML template
│   ├── vite.config.js     # Vite configuration
│   └── package.json       # Frontend dependencies
│
└── README.md
```

## 🎯 Usage

1. **Select Language**: Choose from JavaScript, Python, Java, C++, or C
2. **Write Code**: Use the Monaco editor to write your code
3. **Change Theme**: Switch between Dark, Light, or High Contrast themes
4. **Run Code**: Click the "Run Code" button
5. **View Output**: See the execution output and time in the terminal panel
6. **Clear Output**: Click the "Clear" button to reset the output

## 🔧 API Endpoints

### POST `/api/execute`
Execute code in the specified language.

**Request Body:**
```json
{
  "code": "console.log('Hello World');",
  "language": "javascript"
}
```

**Response:**
```json
{
  "success": true,
  "output": "Hello World\n",
  "error": "",
  "executionTime": 45
}
```

### GET `/api/languages`
Get list of supported languages.

### GET `/api/health`
Health check endpoint.

## ⚙️ Configuration

### Backend Port
Change the backend port in `backend/server.js`:
```javascript
const PORT = process.env.PORT || 5000;
```

### Frontend Port
Change the frontend port in `frontend/vite.config.js`:
```javascript
server: {
  port: 3000
}
```

### API URL
If you change the backend port, update the API URL in `frontend/src/App.jsx`:
```javascript
const API_URL = 'http://localhost:5000/api';
```

### Execution Timeout
Modify timeout in `backend/server.js`:
```javascript
exec(command, {
  timeout: 5000, // Change this value (in milliseconds)
  maxBuffer: 1024 * 1024
}, ...)
```

## 🔒 Security Considerations

⚠️ **Important**: This is a basic implementation for learning purposes. For production use, consider:

1. **Sandboxing**: Use Docker containers or VMs to isolate code execution
2. **Rate Limiting**: Prevent abuse by limiting requests per user
3. **Input Validation**: Sanitize and validate all user inputs
4. **Resource Limits**: Set CPU and memory limits for code execution
5. **Authentication**: Add user authentication and authorization
6. **HTTPS**: Use SSL/TLS in production

## 🐛 Troubleshooting

### "Cannot find module" errors
```bash
cd backend
npm install
cd ../frontend
npm install
```

### Backend not connecting
- Check if backend is running on port 5000
- Verify the API_URL in `frontend/src/App.jsx`
- Check for CORS errors in browser console

### Compiler not found
- Install the required compiler/interpreter for the language
- Ensure it's in your system PATH

### Port already in use
```bash
# Kill process on port 5000 (backend)
lsof -ti:5000 | xargs kill -9

# Kill process on port 3000 (frontend)
lsof -ti:3000 | xargs kill -9
```

## 🚀 Future Enhancements

- [ ] User authentication and saved projects
- [ ] Code sharing functionality
- [ ] Multiple file support
- [ ] Syntax error highlighting
- [ ] Code formatting
- [ ] Input passing to programs
- [ ] More language support (Ruby, Go, Rust, etc.)
- [ ] Collaborative editing
- [ ] Code templates library
- [ ] Performance benchmarking

## 📝 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Contributions are welcome! Feel free to submit issues and pull requests.

## 📧 Contact

For questions or support, please open an issue in the repository.

---

**Happy Coding! 🎉**
