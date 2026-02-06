import React, { useState, useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import axios from 'axios';
import './App.css';

// ─── Default code snippets ─────────────────────────────────────────
const defaultCode = {
  javascript: `// JavaScript Code
console.log("Hello, World!");

// Try some JavaScript
const sum = (a, b) => a + b;
console.log("Sum of 5 and 3:", sum(5, 3));`,

  python: `# Python Code
print("Hello, World!")

# Try some Python
def sum(a, b):
    return a + b

print("Sum of 5 and 3:", sum(5, 3))`,

  java: `// Java Code
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
        
        // Try some Java
        int sum = sum(5, 3);
        System.out.println("Sum of 5 and 3: " + sum);
    }
    
    public static int sum(int a, int b) {
        return a + b;
    }
}`,

  cpp: `// C++ Code
#include <iostream>
using namespace std;

int sum(int a, int b) {
    return a + b;
}

int main() {
    cout << "Hello, World!" << endl;
    
    // Try some C++
    cout << "Sum of 5 and 3: " << sum(5, 3) << endl;
    
    return 0;
}`,

  c: `// C Code
#include <stdio.h>

int sum(int a, int b) {
    return a + b;
}

int main() {
    printf("Hello, World!\\n");
    
    // Try some C
    printf("Sum of 5 and 3: %d\\n", sum(5, 3));
    
    return 0;
}`
};

// ─── Language → file extension map ─────────────────────────────────
const extensionMap = {
  javascript: '.js',
  python: '.py',
  java: '.java',
  cpp: '.cpp',
  c: '.c'
};

// ─── Extension → language map (used when uploading a file) ─────────
const extToLang = {
  '.js': 'javascript',
  '.py': 'python',
  '.java': 'java',
  '.cpp': 'cpp',
  '.c': 'c'
};

// ─── Allowed upload extensions (for the <input> filter) ────────────
const ALLOWED_EXTENSIONS = Object.keys(extToLang).join(',');

// ─── Unique ID counter for tabs ─────────────────────────────────────
let nextId = 2; // starts at 2 because the first default tab is 1

// ─── Helper: create a fresh tab object ──────────────────────────────
function createTab(language = 'javascript', name = null, code = null) {
  const id = nextId++;
  return {
    id,
    name: name || `Untitled${id}${extensionMap[language]}`,
    language,
    code: code !== null ? code : defaultCode[language],
    input: '',
    output: '',
    executionTime: null,
    hasError: false
  };
}

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api';

// ─────────────────────────────────────────────────────────────────────
// APP
// ─────────────────────────────────────────────────────────────────────
function App() {
  // tabs state – array of tab objects
  const [tabs, setTabs] = useState([
    {
      id: 1,
      name: 'main.js',
      language: 'javascript',
      code: defaultCode.javascript,
      input: '', // user input for stdin
      output: '',
      executionTime: null,
      hasError: false
    }
  ]);
  const [activeTabId, setActiveTabId] = useState(1);
  const [theme, setTheme] = useState('vs-dark');
  const [isRunning, setIsRunning] = useState(false);

  // rename state
  const [renamingTabId, setRenamingTabId] = useState(null);
  const renameInputRef = useRef(null);

  // hidden file-input ref (upload trigger)
  const fileInputRef = useRef(null);

  // ── Derived: current active tab ──────────────────────────────────
  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];

  // ── Generic tab updater ──────────────────────────────────────────
  const updateTab = useCallback((id, updates) => {
    setTabs(prev =>
      prev.map(t => (t.id === id ? { ...t, ...updates } : t))
    );
  }, []);

  // ──────────── TAB ACTIONS ─────────────────────────────────────────

  // Add a new blank tab
  const addTab = () => {
    const tab = createTab('javascript');
    setTabs(prev => [...prev, tab]);
    setActiveTabId(tab.id);
  };

  // Close a tab
  const closeTab = (id, e) => {
    e.stopPropagation(); // don't also activate the tab
    if (tabs.length === 1) return; // keep at least one tab open

    setTabs(prev => {
      const next = prev.filter(t => t.id !== id);
      // If we closed the active tab, switch to the nearest one
      if (activeTabId === id) {
        const idx = prev.findIndex(t => t.id === id);
        const newActive = next[Math.min(idx, next.length - 1)];
        setActiveTabId(newActive.id);
      }
      return next;
    });
  };

  // ──────────── RENAME ──────────────────────────────────────────────

  const startRename = (id, e) => {
    e.stopPropagation();
    setRenamingTabId(id);
    // Focus the input after React renders it
    setTimeout(() => renameInputRef.current?.focus(), 0);
  };

  const finishRename = (id) => {
    const input = renameInputRef.current;
    if (!input) return;
    const val = input.value.trim();
    if (val) updateTab(id, { name: val });
    setRenamingTabId(null);
  };

  const handleRenameKeyDown = (id, e) => {
    if (e.key === 'Enter') finishRename(id);
    if (e.key === 'Escape') setRenamingTabId(null);
  };

  // ──────────── LANGUAGE CHANGE (per-tab) ───────────────────────────

  const handleLanguageChange = (e) => {
    const lang = e.target.value;
    updateTab(activeTab.id, {
      language: lang,
      code: defaultCode[lang],
      name: `Untitled${activeTab.id}${extensionMap[lang]}`,
      output: '',
      executionTime: null,
      hasError: false
    });
  };

  // ──────────── FILE UPLOAD ─────────────────────────────────────────

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Figure out the language from the extension
    const dotIndex = file.name.lastIndexOf('.');
    const ext = dotIndex !== -1 ? file.name.slice(dotIndex) : '';
    const lang = extToLang[ext];

    if (!lang) {
      alert(`Unsupported file type "${ext}".\nSupported: .js .py .java .cpp .c`);
      e.target.value = ''; // reset input so same file can be re-selected
      return;
    }

    // Read file content
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target.result;
      const tab = createTab(lang, file.name, content);
      setTabs(prev => [...prev, tab]);
      setActiveTabId(tab.id);
    };
    reader.readAsText(file);

    e.target.value = ''; // reset so the same file can be uploaded again
  };

  // ──────────── FILE DOWNLOAD ───────────────────────────────────────

  const downloadFile = () => {
    const blob = new Blob([activeTab.code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeTab.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ──────────── RUN CODE ────────────────────────────────────────────

  const runCode = async () => {
    setIsRunning(true);
    updateTab(activeTab.id, { output: 'Running...', executionTime: null, hasError: false });

    try {
      const response = await axios.post(`${API_URL}/execute`, {
        code: activeTab.code,
        language: activeTab.language,
        input: activeTab.input
      });

      if (response.data.success) {
        updateTab(activeTab.id, {
          output: response.data.output || 'Program executed successfully (no output)',
          executionTime: response.data.executionTime,
          hasError: false
        });
      } else {
        updateTab(activeTab.id, {
          output: response.data.error,
          executionTime: response.data.executionTime,
          hasError: true
        });
      }
    } catch (error) {
      updateTab(activeTab.id, {
        output: error.response?.data?.error || error.message || 'Failed to execute code',
        hasError: true
      });
    } finally {
      setIsRunning(false);
    }
  };

  // ──────────── CLEAR OUTPUT ────────────────────────────────────────

  const clearOutput = () => {
    updateTab(activeTab.id, { output: '', executionTime: null, hasError: false });
  };

  // ──────────── RENDER ──────────────────────────────────────────────

  return (
    <div className="app">
      {/* ── Hidden file input (triggered programmatically) ── */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_EXTENSIONS}
        className="hidden-file-input"
        onChange={handleFileUpload}
      />

      {/* ── Top Header ── */}
      <header className="header">
        <div className="header-left">
          <h1>💻 Online Code Editor</h1>
        </div>
        <div className="header-controls">
          <select value={activeTab.language} onChange={handleLanguageChange} className="language-select">
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="cpp">C++</option>
            <option value="c">C</option>
          </select>

          <select value={theme} onChange={(e) => setTheme(e.target.value)} className="theme-select">
            <option value="vs-dark">Dark</option>
            <option value="light">Light</option>
            <option value="hc-black">High Contrast</option>
          </select>

          {/* Upload button */}
          <button className="icon-button upload-btn" onClick={() => fileInputRef.current.click()} title="Upload File">
            📂 Upload
          </button>

          {/* Download button */}
          <button className="icon-button download-btn" onClick={downloadFile} title="Download File">
            💾 Save
          </button>

          {/* Run */}
          <button onClick={runCode} className="run-button" disabled={isRunning}>
            {isRunning ? '⏳ Running...' : '▶ Run Code'}
          </button>
        </div>
      </header>

      {/* ── Tab Bar ── */}
      <div className="tab-bar">
        {tabs.map(tab => (
          <div
            key={tab.id}
            className={`tab ${tab.id === activeTabId ? 'tab--active' : ''}`}
            onClick={() => setActiveTabId(tab.id)}
            onDoubleClick={(e) => startRename(tab.id, e)}
          >
            {/* Tab name or rename input */}
            {renamingTabId === tab.id ? (
              <input
                ref={renameInputRef}
                className="tab-rename-input"
                defaultValue={tab.name}
                onClick={(e) => e.stopPropagation()}
                onBlur={() => finishRename(tab.id)}
                onKeyDown={(e) => handleRenameKeyDown(tab.id, e)}
              />
            ) : (
              <span className="tab-name">{tab.name}</span>
            )}

            {/* Close button (only if more than 1 tab) */}
            {tabs.length > 1 && (
              <button className="tab-close" onClick={(e) => closeTab(tab.id, e)}>×</button>
            )}
          </div>
        ))}

        {/* "+" button to add a new tab */}
        <button className="tab-add" onClick={addTab} title="New Tab">+</button>
      </div>

      {/* ── Main Content: Editor + Output ── */}
      <div className="content">
        <div className="editor-section">
          <Editor
            key={activeTab.id}
            height="100%"
            language={activeTab.language}
            value={activeTab.code}
            onChange={(value) => updateTab(activeTab.id, { code: value })}
            theme={theme}
            options={{
              fontSize: 14,
              fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
              fontLigatures: true,
              minimap: { enabled: true, scale: 0.8 },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              wordWrap: 'on',
              // Syntax validation and error detection
              quickSuggestions: true,
              suggestOnTriggerCharacters: true,
              parameterHints: { enabled: true },
              formatOnPaste: true,
              formatOnType: true,
              // Error highlighting and markers
              'semanticHighlighting.enabled': true,
              glyphMargin: true,
              folding: true,
              lineNumbersMinChars: 3,
              renderLineHighlight: 'all',
              smoothScrolling: true,
              cursorBlinking: 'smooth',
              cursorSmoothCaretAnimation: 'on',
              // Additional professional features
              bracketPairColorization: { enabled: true },
              guides: {
                bracketPairs: true,
                indentation: true
              }
            }}
            onMount={(editor, monaco) => {
              // Enable syntax validation for JavaScript
              if (activeTab.language === 'javascript') {
                monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
                  noSemanticValidation: false,
                  noSyntaxValidation: false
                });
                
                monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
                  target: monaco.languages.typescript.ScriptTarget.ES2020,
                  allowNonTsExtensions: true,
                  checkJs: true,
                  allowJs: true
                });
              }
              
              // For Python, C++, Java, C - Monaco has built-in syntax highlighting
              // Errors will be caught at runtime when code executes
            }}
          />
        </div>

        <div className="output-section">
          {/* Input Section */}
          <div className="input-section">
            <div className="section-header">
              <span>📥 Input (stdin)</span>
            </div>
            <textarea
              className="input-textarea"
              placeholder="Type input here (e.g., numbers, text)&#10;Each line will be sent to your program..."
              value={activeTab.input}
              onChange={(e) => updateTab(activeTab.id, { input: e.target.value })}
            />
          </div>

          {/* Output Section */}
          <div className="section-header">
            <span>🖥️ Output</span>
            <div className="output-controls">
              {activeTab.executionTime != null && (
                <span className="execution-time">⏱️ {activeTab.executionTime}ms</span>
              )}
              <button onClick={clearOutput} className="clear-button">🗑️ Clear</button>
            </div>
          </div>

          <div className={`terminal ${activeTab.hasError ? 'terminal--error' : ''}`}>
            <pre>{activeTab.output || 'Click "Run Code" to see output here...'}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
