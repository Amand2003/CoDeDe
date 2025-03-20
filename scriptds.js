document.addEventListener('DOMContentLoaded', function () {
    const codeEditor = CodeMirror.fromTextArea(document.getElementById('code-editor'), {
        mode: 'javascript',
        lineNumbers: true,
        theme: 'custom-theme',
        indentUnit: 4,
        tabSize: 4,
        matchBrackets: true,
        autoCloseBrackets: true,
        extraKeys: {
            'Ctrl-Enter': function (cm) {
                if (!isRunning) {
                    executeCode();
                }
            },
            'Cmd-Enter': function (cm) {
                if (!isRunning) {
                    executeCode();
                }
            },
            'Tab': function (cm) {
                const spaces = Array(cm.getOption('indentUnit') + 1).join(' ');
                cm.replaceSelection(spaces);
            },
            'Ctrl-S': function(cm) {
                // Format code when Ctrl+S is pressed
                formatJavaScript(cm);
                return false; // Prevent default browser save action
            }
        }
    });

    // Ensure CodeMirror fills its container
    codeEditor.setSize(null, '100%');
    
    // Fix scrollbar issue - prevent scrollbar clicks from redirecting to top of page
    function fixScrollbarBehavior(editor) {
        // Wait for CodeMirror to fully initialize
        setTimeout(() => {
            // Get the scrollbar elements
            const wrapper = editor.getWrapperElement();
            const vScrollbar = wrapper.querySelector('.CodeMirror-vscrollbar');
            const hScrollbar = wrapper.querySelector('.CodeMirror-hscrollbar');
            
            // Add event listeners to prevent default behavior and stop propagation
            if (vScrollbar) {
                vScrollbar.addEventListener('mousedown', function(e) {
                    e.stopPropagation();
                });
                
                vScrollbar.addEventListener('click', function(e) {
                    e.stopPropagation();
                });
            }
            
            if (hScrollbar) {
                hScrollbar.addEventListener('mousedown', function(e) {
                    e.stopPropagation();
                });
                
                hScrollbar.addEventListener('click', function(e) {
                    e.stopPropagation();
                });
            }
            
            // Also prevent the wrapper from causing page jumps
            wrapper.addEventListener('click', function(e) {
                if (e.target.classList.contains('CodeMirror-scroll') || 
                    e.target.classList.contains('CodeMirror-vscrollbar') || 
                    e.target.classList.contains('CodeMirror-hscrollbar')) {
                    e.stopPropagation();
                }
            });
        }, 100);
    }
    
    // Apply the fix to the editor
    fixScrollbarBehavior(codeEditor);
    
    // Additional fix for scroll issues
    document.querySelectorAll('.editor').forEach(editorContainer => {
        editorContainer.addEventListener('wheel', function(e) {
            // Prevent the wheel event from propagating to parent elements
            // but only if the target is part of CodeMirror
            if (e.target.closest('.CodeMirror')) {
                e.stopPropagation();
            }
        }, { passive: true });
    });
    
    // Format JavaScript code
    function formatJavaScript(cm) {
        try {
            // Get the current code
            const code = cm.getValue();
            
            // Use Function constructor to validate and format JavaScript
            // This is a simple approach - a real formatter would use a library like prettier
            const formatted = new Function(`return (function() {
                ${code}
            }).toString()`)();
            
            // Extract the function body and format it
            let formattedCode = formatted
                .replace(/^function\s*\(\)\s*\{\s*/, '')  // Remove function header
                .replace(/\s*\}$/, '')                    // Remove closing brace
                .trim();
                
            // Set the formatted code back to the editor
            cm.setValue(formattedCode);
            
            // Show success notification
            showNotification('JavaScript code formatted successfully!', 'success');
        } catch (error) {
            // Show error notification
            showNotification('Error formatting code: ' + error.message, 'error');
        }
    }
    
    // Show notification function
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `format-notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
        
        // Style the notification
        Object.assign(notification.style, {
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            padding: '10px 15px',
            backgroundColor: type === 'success' ? 'var(--success-color)' : 
                            type === 'error' ? 'var(--error-color)' : 'var(--info-color)',
            color: 'white',
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
            zIndex: '1000',
            opacity: '0',
            transition: 'opacity 0.3s ease'
        });
        
        // Add the notification to the body
        document.body.appendChild(notification);
        
        // Fade in
        setTimeout(() => {
            notification.style.opacity = '1';
        }, 10);
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    const runButton = document.getElementById('run-button');
    const consoleOutput = document.getElementById('console-output');
    const errorBadge = document.getElementById('error-badge');

    let isRunning = false;
    let originalConsoleLog;
    let originalConsoleError;
    let originalConsoleTime;
    let originalConsoleTimeEnd;
    let logBuffer = [];
    
    // Store active intervals and timeouts so we can clear them
    let activeIntervals = [];
    let activeTimeouts = [];
    
    // Override setInterval and setTimeout to track them
    const originalSetInterval = window.setInterval;
    const originalSetTimeout = window.setTimeout;
    const originalClearInterval = window.clearInterval;
    const originalClearTimeout = window.clearTimeout;

    function extractLineNumber(errorStack) {
        const lineMatch = errorStack.match(/<anonymous>:(\d+):(\d+)/);
        if (lineMatch && lineMatch[1]) {
            return parseInt(lineMatch[1], 10);
        }
        return null;
    }

    function updateConsoleOutput() {
        if (logBuffer.length > 0) {
            consoleOutput.innerHTML = `<div class="output-text">${logBuffer.join('\n')}</div>`;
        }
    }

    function executeCode() {
        if (isRunning) return;

        isRunning = true;
        logBuffer = [];
        errorBadge.style.display = 'none';
        consoleOutput.innerHTML = '';
        
        // Clear any existing intervals and timeouts
        activeIntervals.forEach(id => originalClearInterval(id));
        activeTimeouts.forEach(id => originalClearTimeout(id));
        activeIntervals = [];
        activeTimeouts = [];

        // Save original console methods
        originalConsoleLog = console.log;
        originalConsoleError = console.error;
        originalConsoleTime = console.time;
        originalConsoleTimeEnd = console.timeEnd;
        
        // Override setInterval to track intervals
        window.setInterval = function(callback, delay, ...args) {
            const intervalId = originalSetInterval(callback, delay, ...args);
            activeIntervals.push(intervalId);
            return intervalId;
        };
        
        // Override setTimeout to track timeouts
        window.setTimeout = function(callback, delay, ...args) {
            const timeoutId = originalSetTimeout(callback, delay, ...args);
            activeTimeouts.push(timeoutId);
            return timeoutId;
        };
        
        // Override clearInterval to remove from tracking
        window.clearInterval = function(id) {
            const index = activeIntervals.indexOf(id);
            if (index !== -1) {
                activeIntervals.splice(index, 1);
            }
            return originalClearInterval(id);
        };
        
        // Override clearTimeout to remove from tracking
        window.clearTimeout = function(id) {
            const index = activeTimeouts.indexOf(id);
            if (index !== -1) {
                activeTimeouts.splice(index, 1);
            }
            return originalClearTimeout(id);
        };
        
        // Timer storage for our custom implementation
        const timers = {};

        // Override console.log
        console.log = function() {
            const args = Array.from(arguments);
            const formattedArgs = args.map(arg => {
                if (typeof arg === 'object') {
                    return JSON.stringify(arg, null, 2);
                }
                return String(arg);
            });
            logBuffer.push(formattedArgs.join(' '));
            updateConsoleOutput();
        };
        
        // Override console.error
        console.error = function() {
            const args = Array.from(arguments);
            const formattedArgs = args.map(arg => {
                if (typeof arg === 'object') {
                    return JSON.stringify(arg, null, 2);
                }
                return String(arg);
            });
            logBuffer.push(`<span class="error-text">${formattedArgs.join(' ')}</span>`);
            updateConsoleOutput();
        };
        
        // Override console.time
        console.time = function(label) {
            timers[label] = performance.now();
            // Call original for browser dev tools
            if (originalConsoleTime) {
                originalConsoleTime.call(console, label);
            }
        };
        
        // Override console.timeEnd
        console.timeEnd = function(label) {
            if (timers[label]) {
                const duration = performance.now() - timers[label];
                console.log(`${label}: ${duration.toFixed(2)}ms`);
                delete timers[label];
            } else {
                console.log(`Timer '${label}' does not exist`);
            }
            // Call original for browser dev tools
            if (originalConsoleTimeEnd) {
                originalConsoleTimeEnd.call(console, label);
            }
        };

        try {
            const code = codeEditor.getValue();
            const result = eval(code);
            
            // Check if the result is a Promise
            if (result && typeof result.then === 'function') {
                // Show that we're waiting for async code
                consoleOutput.innerHTML = '<div class="async-indicator">Running async code... (waiting for Promise to settle)</div>';
                
                // Keep the console.log override active until the Promise settles
                // We'll use a timeout to prevent hanging forever
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Async operation timed out after 30 seconds')), 30000);
                });
                
                // Race between the user's Promise and our timeout
                Promise.race([result, timeoutPromise])
                    .then(value => {
                        if (value !== undefined && !logBuffer.includes(String(value))) {
                            console.log(value);
                        }
                    })
                    .catch(error => {
                        // Don't show the error if it's already been handled
                        // (i.e., if there's already console output)
                        if (logBuffer.length === 0) {
                            console.error(error.toString());
                        }
                    })
                    .finally(() => {
                        // Restore original console methods
                        console.log = originalConsoleLog;
                        console.error = originalConsoleError;
                        console.time = originalConsoleTime;
                        console.timeEnd = originalConsoleTimeEnd;
                        
                        // Restore original timer functions
                        window.setInterval = originalSetInterval;
                        window.setTimeout = originalSetTimeout;
                        window.clearInterval = originalClearInterval;
                        window.clearTimeout = originalClearTimeout;
                        
                        isRunning = false;
                    });
                
                // Return early to prevent the finally block from executing immediately
                return;
            }
            
            // For non-Promise results
            if (result !== undefined && !logBuffer.includes(String(result))) {
                console.log(result);
            }
        } catch (error) {
            const lineNumber = extractLineNumber(error.stack);
            
            if (lineNumber) {
                errorBadge.textContent = `Error on line ${lineNumber}`;
                errorBadge.style.display = 'block';
                
                // Highlight the error line
                codeEditor.addLineClass(lineNumber - 1, 'background', 'error-line');
                
                // Clear the highlight after 3 seconds
                setTimeout(() => {
                    codeEditor.removeLineClass(lineNumber - 1, 'background', 'error-line');
                }, 3000);
            } else {
                errorBadge.textContent = 'Error';
                errorBadge.style.display = 'block';
            }
            
            consoleOutput.innerHTML = `<div class="error-text">${error.toString()}</div>`;
        } finally {
            // Only restore console.log and set isRunning to false if we're not handling a Promise
            // (for Promises, this is done in the Promise's finally block)
            if (!result || typeof result.then !== 'function') {
                // Restore original console.log
                console.log = originalConsoleLog;
                console.error = originalConsoleError;
                console.time = originalConsoleTime;
                console.timeEnd = originalConsoleTimeEnd;
                isRunning = false;
            }
        }
    }

    // Run button click event
    runButton.addEventListener('click', function() {
        if (!isRunning) {
            executeCode();
        }
    });

    // Add a reset button to restore the original console
    const resetButton = document.createElement('button');
    resetButton.textContent = 'Reset Console';
    resetButton.className = 'run-button';
    resetButton.style.marginLeft = '0.5rem';
    resetButton.style.backgroundColor = '#6b7280';

    resetButton.addEventListener('click', function () {
        if (originalConsoleLog) {
            console.log = originalConsoleLog;
            console.error = originalConsoleError;
            console.time = originalConsoleTime;
            console.timeEnd = originalConsoleTimeEnd;
        }
        isRunning = false;
        runButton.disabled = false;
        runButton.textContent = 'Run Code ▶';
        logBuffer = [];
        consoleOutput.innerHTML = '<div class="placeholder-text">Console has been reset...</div>';
    });

    // Add the reset button to the panel controls div instead of directly to the panel header
    document.querySelector('#code-panel .panel-controls').appendChild(resetButton);
    
    // Add event listener for Ctrl+S
    document.addEventListener('keydown', function(event) {
        // Check if Ctrl+S was pressed
        if ((event.ctrlKey || event.metaKey) && event.key === 's') {
            // Prevent the default save action
            event.preventDefault();
            
            // Format the code
            formatJavaScript(codeEditor);
        }
    });
    
    // Mobile tab navigation
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            switchTab(targetId);
        });
    });

    // Function to switch tabs on mobile
    function switchTab(targetId) {
        // Hide all panels
        const panels = document.querySelectorAll('.panel');
        panels.forEach(panel => {
            panel.classList.remove('active');
        });
        
        // Deactivate all tab buttons
        tabButtons.forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Show the target panel
        document.getElementById(targetId).classList.add('active');
        
        // Activate the corresponding tab button
        document.querySelector(`.tab-button[data-target="${targetId}"]`).classList.add('active');
        
        // Refresh CodeMirror when switching to code panel
        if (targetId === 'code-panel') {
            codeEditor.refresh();
        }
    }
    
    // Handle window resize to adjust layout
    window.addEventListener('resize', function() {
        codeEditor.refresh();
    });
});