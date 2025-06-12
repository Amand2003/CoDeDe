document.addEventListener('DOMContentLoaded', function () {
    // Initialize CodeMirror editor
    const codeEditor = CodeMirror.fromTextArea(document.getElementById('code-editor'), {
        mode: 'javascript',
        lineNumbers: true,
        theme: 'custom-theme',
        indentUnit: 4,
        tabSize: 4,
        matchBrackets: true,
        autoCloseBrackets: true,
        extraKeys: {
            'Ctrl-Enter': executeCode,
            'Cmd-Enter': executeCode,
            'Tab': function (cm) {
                const spaces = Array(cm.getOption('indentUnit') + 1).join(' ');
                cm.replaceSelection(spaces);
            }
        }
    });

    // Set initial size
    codeEditor.setSize(null, '100%');
    
    // Get DOM elements
    const runButton = document.getElementById('run-button');
    const consoleOutput = document.getElementById('console-output');
    const errorBadge = document.getElementById('error-badge');
    const tabButtons = document.querySelectorAll('.tab-button');

    // State variables
    let isRunning = false;
    let originalConsoleLog, originalConsoleError;
    let logBuffer = [];
    let activeIntervals = [];
    let activeTimeouts = [];

    // Store original functions
    const originalSetInterval = window.setInterval;
    const originalSetTimeout = window.setTimeout;
    const originalClearInterval = window.clearInterval;
    const originalClearTimeout = window.clearTimeout;

    // Extract line number from error stack
    function extractLineNumber(errorStack) {
        const lineMatch = errorStack.match(/<anonymous>:(\d+):(\d+)/);
        return lineMatch ? parseInt(lineMatch[1], 10) : null;
    }

    // Update console output display
    function updateConsoleOutput() {
        if (logBuffer.length > 0) {
            consoleOutput.innerHTML = `<div class="output-text">${logBuffer.join('\n')}</div>`;
        }
    }

    // Main code execution function
    function executeCode() {
        if (isRunning) return;

        isRunning = true;
        logBuffer = [];
        errorBadge.style.display = 'none';
        consoleOutput.innerHTML = '';
        
        // Clear existing timers
        activeIntervals.forEach(id => originalClearInterval(id));
        activeTimeouts.forEach(id => originalClearTimeout(id));
        activeIntervals = [];
        activeTimeouts = [];

        // Store original console methods
        originalConsoleLog = console.log;
        originalConsoleError = console.error;
        
        // Override timer functions to track them
        window.setInterval = function(callback, delay, ...args) {
            const intervalId = originalSetInterval(callback, delay, ...args);
            activeIntervals.push(intervalId);
            return intervalId;
        };
        
        window.setTimeout = function(callback, delay, ...args) {
            const timeoutId = originalSetTimeout(callback, delay, ...args);
            activeTimeouts.push(timeoutId);
            return timeoutId;
        };
        
        window.clearInterval = function(id) {
            const index = activeIntervals.indexOf(id);
            if (index !== -1) activeIntervals.splice(index, 1);
            return originalClearInterval(id);
        };
        
        window.clearTimeout = function(id) {
            const index = activeTimeouts.indexOf(id);
            if (index !== -1) activeTimeouts.splice(index, 1);
            return originalClearTimeout(id);
        };

        // Timer storage for console.time/timeEnd
        const timers = {};

        // Override console methods
        console.log = function() {
            const args = Array.from(arguments);
            const formattedArgs = args.map(arg => 
                typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
            );
            logBuffer.push(formattedArgs.join(' '));
            updateConsoleOutput();
        };
        
        console.error = function() {
            const args = Array.from(arguments);
            const formattedArgs = args.map(arg => 
                typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
            );
            logBuffer.push(`<span class="error-text">${formattedArgs.join(' ')}</span>`);
            updateConsoleOutput();
        };
        
        console.time = function(label) {
            timers[label] = performance.now();
        };
        
        console.timeEnd = function(label) {
            if (timers[label]) {
                const duration = performance.now() - timers[label];
                console.log(`${label}: ${duration.toFixed(2)}ms`);
                delete timers[label];
            } else {
                console.log(`Timer '${label}' does not exist`);
            }
        };

        try {
            const code = codeEditor.getValue();
            const result = eval(code);
            
            // Handle async code (Promises)
            if (result && typeof result.then === 'function') {
                consoleOutput.innerHTML = '<div class="async-indicator">Running async code...</div>';
                
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Async operation timed out after 30 seconds')), 30000);
                });
                
                Promise.race([result, timeoutPromise])
                    .then(value => {
                        if (value !== undefined && !logBuffer.includes(String(value))) {
                            console.log(value);
                        }
                    })
                    .catch(error => {
                        if (logBuffer.length === 0) {
                            console.error(error.toString());
                        }
                    })
                    .finally(() => {
                        restoreConsole();
                        isRunning = false;
                    });
                return;
            }
            
            // Handle synchronous code
            if (result !== undefined && !logBuffer.includes(String(result))) {
                console.log(result);
            }
        } catch (error) {
            const lineNumber = extractLineNumber(error.stack);
            
            if (lineNumber) {
                errorBadge.textContent = `Error on line ${lineNumber}`;
                errorBadge.style.display = 'block';
                
                // Highlight error line
                codeEditor.addLineClass(lineNumber - 1, 'background', 'error-line');
                setTimeout(() => {
                    codeEditor.removeLineClass(lineNumber - 1, 'background', 'error-line');
                }, 3000);
            } else {
                errorBadge.textContent = 'Error';
                errorBadge.style.display = 'block';
            }
            
            consoleOutput.innerHTML = `<div class="error-text">${error.toString()}</div>`;
        } finally {
            if (!result || typeof result.then !== 'function') {
                restoreConsole();
                isRunning = false;
            }
        }
    }

    // Restore original console methods
    function restoreConsole() {
        console.log = originalConsoleLog;
        console.error = originalConsoleError;
        window.setInterval = originalSetInterval;
        window.setTimeout = originalSetTimeout;
        window.clearInterval = originalClearInterval;
        window.clearTimeout = originalClearTimeout;
    }

    // Event listeners
    runButton.addEventListener('click', executeCode);

    // Reset button
    const resetButton = document.createElement('button');
    resetButton.textContent = 'Reset Console';
    resetButton.className = 'run-button';
    resetButton.style.backgroundColor = '#6b7280';

    resetButton.addEventListener('click', function () {
        restoreConsole();
        isRunning = false;
        logBuffer = [];
        consoleOutput.innerHTML = '<div class="placeholder-text">Console has been reset...</div>';
    });

    document.querySelector('#code-panel .panel-controls').appendChild(resetButton);

    // Mobile tab navigation
    function switchTab(targetId) {
        // Hide all panels
        document.querySelectorAll('.panel').forEach(panel => {
            panel.classList.remove('active');
        });
        
        // Deactivate all tab buttons
        tabButtons.forEach(btn => btn.classList.remove('active'));
        
        // Show target panel and activate button
        const targetPanel = document.getElementById(targetId);
        targetPanel.classList.add('active');
        document.querySelector(`.tab-button[data-target="${targetId}"]`).classList.add('active');
        
        // Refresh CodeMirror if switching to code panel
        if (targetId === 'code-panel') {
            setTimeout(() => {
                codeEditor.refresh();
                const isMobile = window.innerWidth <= 768;
                codeEditor.setSize(null, isMobile ? '350px' : '100%');
            }, 100);
        }
    }

    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            switchTab(targetId);
        });
    });

    // Handle window resize
    window.addEventListener('resize', function() {
        clearTimeout(window.resizeTimeout);
        window.resizeTimeout = setTimeout(function() {
            codeEditor.refresh();
            
            const isMobile = window.innerWidth <= 768;
            const isDesktop = window.innerWidth > 1024;
            
            if (isMobile) {
                const panel = document.querySelector('.panel.active');
                if (panel) {
                    const panelHeight = panel.offsetHeight;
                    const headerHeight = panel.querySelector('.panel-header').offsetHeight;
                    const editorHeight = panelHeight - headerHeight - 20;
                    codeEditor.setSize(null, Math.max(300, editorHeight));
                }
            } else if (isDesktop) {
                const viewportHeight = window.innerHeight;
                const headerHeight = document.querySelector('header')?.offsetHeight || 100;
                const heroHeight = document.querySelector('.hero')?.offsetHeight || 150;
                const footerHeight = document.querySelector('.footer')?.offsetHeight || 200;
                const padding = 80;
                
                const availableHeight = viewportHeight - headerHeight - heroHeight - footerHeight - padding;
                const maxHeight = window.innerWidth > 1400 ? 1000 : 800;
                const editorHeight = Math.min(availableHeight, maxHeight);
                
                codeEditor.setSize(null, Math.max(400, editorHeight));
            } else {
                codeEditor.setSize(null, '100%');
            }
        }, 250);
    });

    // Initialize desktop layout
    function initializeDesktopLayout() {
        const isDesktop = window.innerWidth > 1024;
        
        if (isDesktop) {
            const viewportHeight = window.innerHeight;
            const headerHeight = document.querySelector('header')?.offsetHeight || 100;
            const heroHeight = document.querySelector('.hero')?.offsetHeight || 150;
            const footerHeight = document.querySelector('.footer')?.offsetHeight || 200;
            const padding = 80;
            
            const availableHeight = viewportHeight - headerHeight - heroHeight - footerHeight - padding;
            const maxHeight = window.innerWidth > 1400 ? 1000 : 800;
            const editorHeight = Math.min(availableHeight, maxHeight);
            
            codeEditor.setSize(null, Math.max(400, editorHeight));
            
            setTimeout(() => codeEditor.refresh(), 100);
        }
    }

    // Initialize after page load
    setTimeout(initializeDesktopLayout, 500);
});