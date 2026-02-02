const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// Temporary directory for code files
const TEMP_DIR = process.platform === 'win32'
    ? path.join(__dirname, 'temp')
    : '/tmp/code-editor';

// Create the temp directory at startup
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Language configurations
const languageConfig = {
    javascript: {
        extension: '.js',
        command: (filePath, inputData) => {
            if (inputData) {
                return `echo "${inputData.replace(/"/g, '\\"')}" | node "${filePath}"`;
            }
            return `node "${filePath}"`;
        }
    },
    python: {
        extension: '.py',
        command: (filePath, inputData) => {
            if (inputData) {
                return `echo "${inputData.replace(/"/g, '\\"')}" | python3 "${filePath}"`;
            }
            return `python3 "${filePath}"`;
        }
    },
    java: {
        extension: '.java',
        command: (filePath, inputData) => {
            const className = path.basename(filePath, '.java');
            const dir = path.dirname(filePath);
            if (inputData) {
                return `cd "${dir}" && javac "${filePath}" && echo "${inputData.replace(/"/g, '\\"')}" | java ${className}`;
            }
            return `cd "${dir}" && javac "${filePath}" && java ${className}`;
        }
    },
    cpp: {
        extension: '.cpp',
        command: (filePath, inputData) => {
            const outputPath = filePath.replace('.cpp', '');
            if (inputData) {
                return `g++ "${filePath}" -o "${outputPath}" && echo "${inputData.replace(/"/g, '\\"')}" | "${outputPath}"`;
            }
            return `g++ "${filePath}" -o "${outputPath}" && "${outputPath}"`;
        }
    },
    c: {
        extension: '.c',
        command: (filePath, inputData) => {
            const outputPath = filePath.replace('.c', '');
            if (inputData) {
                return `gcc "${filePath}" -o "${outputPath}" && echo "${inputData.replace(/"/g, '\\"')}" | "${outputPath}"`;
            }
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
        // Re-create temp dir if it somehow disappeared
        if (!fs.existsSync(TEMP_DIR)) {
            fs.mkdirSync(TEMP_DIR, { recursive: true });
        }

        // Write code to file
        fs.writeFileSync(filePath, code);

        // Execute the code with optional input
        const command = config.command(filePath, input);
        const startTime = Date.now();

        exec(command, {
            timeout: 5000,
            maxBuffer: 1024 * 1024,
            shell: '/bin/bash'
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
