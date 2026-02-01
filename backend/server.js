const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
// In production CORS only allows the deployed frontend origin.
// Locally (no env set) it allows everything so localhost:3000 works.
app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// Temporary directory for code files
const TEMP_DIR = path.join(__dirname, 'temp');
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Language configurations
const languageConfig = {
    javascript: {
        extension: '.js',
        command: (filePath) => `node "${filePath}"`
    },
    python: {
        extension: '.py',
        command: (filePath) => `python3 "${filePath}"`
    },
    java: {
        extension: '.java',
        command: (filePath) => {
            const className = path.basename(filePath, '.java');
            const dir = path.dirname(filePath);
            return `cd "${dir}" && javac "${filePath}" && java ${className}`;
        }
    },
    cpp: {
        extension: '.cpp',
        command: (filePath) => {
            const outputPath = filePath.replace('.cpp', '');
            return `g++ "${filePath}" -o "${outputPath}" && "${outputPath}"`;
        }
    },
    c: {
        extension: '.c',
        command: (filePath) => {
            const outputPath = filePath.replace('.c', '');
            return `gcc "${filePath}" -o "${outputPath}" && "${outputPath}"`;
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

    if (!languageConfig[language]) {
        return res.status(400).json({
            success: false,
            error: `Language "${language}" is not supported`
        });
    }

    const config = languageConfig[language];
    const fileId = uuidv4();
    const fileName = language === 'java' ? 'Main' + config.extension : fileId + config.extension;
    const filePath = path.join(TEMP_DIR, fileName);

    try {
        // Write code to file
        fs.writeFileSync(filePath, code);

        // Execute the code
        const command = config.command(filePath);
        const startTime = Date.now();

        exec(command, {
            timeout: 5000, // 5 seconds timeout
            maxBuffer: 1024 * 1024 // 1MB buffer
        }, (error, stdout, stderr) => {
            const executionTime = Date.now() - startTime;

            // Cleanup
            try {
                fs.unlinkSync(filePath);
                // Clean up compiled files
                if (language === 'java') {
                    const classFile = path.join(TEMP_DIR, 'Main.class');
                    if (fs.existsSync(classFile)) fs.unlinkSync(classFile);
                } else if (language === 'cpp' || language === 'c') {
                    const outputFile = filePath.replace(config.extension, '');
                    if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
                }
            } catch (cleanupError) {
                console.error('Cleanup error:', cleanupError);
            }

            if (error) {
                return res.json({
                    success: false,
                    output: '',
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
        console.error('Execution error:', err);
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

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
