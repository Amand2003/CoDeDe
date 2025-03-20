document.addEventListener('DOMContentLoaded', function() {
    // Define the Tab handler function separately so we can call it directly
    function emmetTabHandler(cm) {
        const cursor = cm.getCursor();
        const line = cm.getLine(cursor.line);
        const textBeforeCursor = line.slice(0, cursor.ch);
        
        console.log("Tab handler called. Text before cursor:", textBeforeCursor);
        
        // Check if we're inside a tag
        const insideTag = /<[^>]*$/.test(textBeforeCursor);
        
        // If we're inside a tag, use default indentation
        if (insideTag) {
            console.log("Inside tag, using default indentation");
            cm.execCommand("indentAuto");
            return;
        }
        
        // Handle the "!" boilerplate shortcut
        // This needs special handling because it's a single character
        if (textBeforeCursor === "!" || (textBeforeCursor.length > 0 && textBeforeCursor.endsWith("!"))) {
            console.log("Boilerplate shortcut detected!");
            
            // Find the position of the "!" character
            const exclamationPos = textBeforeCursor.length - 1;
            
            // Only proceed if the character is actually "!"
            if (textBeforeCursor.charAt(exclamationPos) === "!") {
                const htmlTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
</head>
<body>
  
</body>
</html>`;
                
                // Replace just the "!" character
                cm.replaceRange(htmlTemplate, 
                    {line: cursor.line, ch: exclamationPos}, 
                    {line: cursor.line, ch: exclamationPos + 1});
                
                // Position cursor inside the body tag
                cm.setCursor({line: cursor.line + 8, ch: 2});
                console.log("Boilerplate inserted");
                return;
            }
        }
        
        // Find the last word or pattern before cursor
        const lastWordMatch = textBeforeCursor.match(/[\w.#>*]+$/);
        
        if (!lastWordMatch) {
            // No pattern found, use default indentation
            console.log("No pattern found, using default indentation");
            cm.execCommand("indentAuto");
            return;
        }
        
        const pattern = lastWordMatch[0];
        const patternStart = cursor.ch - pattern.length;
        
        console.log("Pattern detected:", pattern, "at position", patternStart);
        
        // Tag with class (e.g., div.container)
        const classMatch = pattern.match(/^(\w+)\.(\w+)$/);
        if (classMatch) {
            const [fullMatch, tag, className] = classMatch;
            const replacement = `<${tag} class="${className}"></${tag}>`;
            
            cm.replaceRange(replacement, 
                {line: cursor.line, ch: patternStart}, 
                {line: cursor.line, ch: patternStart + pattern.length});
            
            // Position cursor inside the tag
            cm.setCursor({line: cursor.line, ch: patternStart + tag.length + className.length + 10});
            return;
        }
        
        // Tag with ID (e.g., div#header)
        const idMatch = pattern.match(/^(\w+)#(\w+)$/);
        if (idMatch) {
            const [fullMatch, tag, id] = idMatch;
            const replacement = `<${tag} id="${id}"></${tag}>`;
            
            cm.replaceRange(replacement, 
                {line: cursor.line, ch: patternStart}, 
                {line: cursor.line, ch: patternStart + pattern.length});
            
            // Position cursor inside the tag
            cm.setCursor({line: cursor.line, ch: patternStart + tag.length + id.length + 7});
            return;
        }
        
        // Multiplication (e.g., li*3)
        const multiplyMatch = pattern.match(/^(\w+)\*(\d+)$/);
        if (multiplyMatch) {
            const [fullMatch, tag, count] = multiplyMatch;
            let result = '';
            for (let i = 0; i < parseInt(count); i++) {
                result += `<${tag}></${tag}>\n`;
            }
            result = result.trim(); // Remove trailing newline
            
            // Get the indentation of the current line
            const indentation = textBeforeCursor.match(/^\s*/)[0];
            
            // Add indentation to each line except the first
            result = result.replace(/\n/g, '\n' + indentation);
            
            cm.replaceRange(result, 
                {line: cursor.line, ch: patternStart}, 
                {line: cursor.line, ch: patternStart + pattern.length});
            
            // Position cursor after the first opening tag
            cm.setCursor({line: cursor.line, ch: patternStart + tag.length + 2});
            return;
        }
        
        // Nested elements (e.g., ul>li)
        const nestedMatch = pattern.match(/^(\w+)>(\w+)$/);
        if (nestedMatch) {
            const [fullMatch, parent, child] = nestedMatch;
            
            // Get the indentation of the current line
            const indentation = textBeforeCursor.match(/^\s*/)[0];
            
            const result = `<${parent}>\n${indentation}  <${child}></${child}>\n${indentation}</${parent}>`;
            
            cm.replaceRange(result, 
                {line: cursor.line, ch: patternStart}, 
                {line: cursor.line, ch: patternStart + pattern.length});
            
            // Position cursor inside the child tag
            cm.setCursor({line: cursor.line + 1, ch: indentation.length + 2 + child.length + 2});
            return;
        }
        
        // Simple HTML tag (e.g., div)
        const tagMatch = pattern.match(/^(\w+)$/);
        if (tagMatch) {
            const [fullMatch, tag] = tagMatch;
            const replacement = `<${tag}></${tag}>`;
            
            cm.replaceRange(replacement, 
                {line: cursor.line, ch: patternStart}, 
                {line: cursor.line, ch: patternStart + pattern.length});
            
            // Position cursor inside the tag
            cm.setCursor({line: cursor.line, ch: patternStart + tag.length + 2});
            return;
        }
        
        // If no patterns match, use the default indentation behavior
        cm.execCommand("indentAuto");
    }

    // CSS Tab handler function
    function cssTabHandler(cm) {
        const cursor = cm.getCursor();
        const line = cm.getLine(cursor.line);
        const textBeforeCursor = line.slice(0, cursor.ch);
        
        // Find the last word before cursor
        const lastWordMatch = textBeforeCursor.match(/\b(\w+)$/);
        
        if (!lastWordMatch) {
            // No word found, use default indentation
            cm.execCommand("indentAuto");
            return;
        }
        
        const word = lastWordMatch[0];
        const wordStart = cursor.ch - word.length;
        
        // CSS property shortcuts
        const cssShortcuts = {
            'm': 'margin: ;',
            'p': 'padding: ;',
            'bg': 'background: ;',
            'fs': 'font-size: ;',
            'fw': 'font-weight: ;',
            'ff': 'font-family: ;',
            'c': 'color: ;',
            'w': 'width: ;',
            'h': 'height: ;',
            'b': 'border: ;',
            'd': 'display: ;',
            'pos': 'position: ;',
            'flex': 'display: flex;',
            'grid': 'display: grid;'
        };
        
        if (cssShortcuts[word]) {
            cm.replaceRange(cssShortcuts[word], 
                {line: cursor.line, ch: wordStart}, 
                {line: cursor.line, ch: wordStart + word.length});
            
            // Position cursor before the semicolon
            const property = cssShortcuts[word];
            cm.setCursor({line: cursor.line, ch: wordStart + property.length - 1});
            return;
        }
        
        // If no patterns match, use the default indentation behavior
        cm.execCommand("indentAuto");
    }

    // Initialize HTML editor with CodeMirror
    const htmlEditor = CodeMirror.fromTextArea(document.getElementById('html-editor'), {
        mode: 'htmlmixed',
        lineNumbers: true,
        theme: 'custom-theme',
        autoCloseTags: true,
        autoCloseBrackets: {
            pairs: '()[]{}\'\'""``<>',
            closeBefore: '.,=}])>:;'
        },
        matchTags: {bothTags: true},
        matchBrackets: true,
        foldGutter: true,
        gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
        styleActiveLine: true,
        extraKeys: {
            "Tab": emmetTabHandler,
            'Ctrl-Space': 'autocomplete',
            'Ctrl-/': 'toggleComment',
            'Ctrl-J': 'toMatchingTag',
            'Ctrl-F': 'findPersistent'
        }
    });

    // Initialize CSS editor with CodeMirror
    const cssEditor = CodeMirror.fromTextArea(document.getElementById('css-editor'), {
        mode: 'css',
        lineNumbers: true,
        theme: 'custom-theme',
        autoCloseBrackets: true,
        matchBrackets: true,
        foldGutter: true,
        gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
        styleActiveLine: true,
        extraKeys: {
            "Tab": cssTabHandler,
            'Ctrl-Space': 'autocomplete',
            'Ctrl-/': 'toggleComment',
            'Ctrl-F': 'findPersistent'
        }
    });

    // Ensure CodeMirror fills its container
    htmlEditor.setSize(null, '100%');
    cssEditor.setSize(null, '100%');

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
    
    // Apply the fix to both editors
    fixScrollbarBehavior(htmlEditor);
    fixScrollbarBehavior(cssEditor);
    
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

    const runButton = document.getElementById('run-button');
    const previewFrame = document.getElementById('preview-frame');
    const suggestionsPanel = document.getElementById('suggestions-panel');
    const suggestionsList = document.querySelector('.suggestions-list');

    // Create a notification for Emmet shortcuts
    function showEmmetNotification() {
        const notification = document.createElement('div');
        notification.className = 'emmet-notification';
        notification.innerHTML = `
            <div class="notification-header">
                <h3><i class="fas fa-bolt"></i> Emmet Shortcuts Available</h3>
                <button class="close-btn"><i class="fas fa-times"></i></button>
            </div>
            <div class="notification-content">
                <p>Type these shortcuts <strong>anywhere in a line</strong> and press <strong>Tab</strong> to expand:</p>
                <ul>
                    <li><code>!</code> - HTML5 boilerplate</li>
                    <li><code>tag</code> - Create HTML tag (e.g., <code>div</code>)</li>
                    <li><code>tag.class</code> - Tag with class (e.g., <code>div.container</code>)</li>
                    <li><code>tag#id</code> - Tag with ID (e.g., <code>div#header</code>)</li>
                    <li><code>tag*n</code> - Multiple tags (e.g., <code>li*3</code>)</li>
                    <li><code>parent>child</code> - Nested tags (e.g., <code>ul>li</code>)</li>
                </ul>
            </div>
        `;
        
        // Style the notification
        Object.assign(notification.style, {
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            width: '300px',
            backgroundColor: 'var(--panel-bg)',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            zIndex: '1000',
            overflow: 'hidden',
            transition: 'all 0.3s ease',
            border: '1px solid var(--border-color)'
        });
        
        // Style the header
        const header = notification.querySelector('.notification-header');
        Object.assign(header.style, {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 15px',
            backgroundColor: 'var(--primary-color)',
            color: 'white'
        });
        
        // Style the content
        const content = notification.querySelector('.notification-content');
        Object.assign(content.style, {
            padding: '15px'
        });
        
        // Style the close button
        const closeBtn = notification.querySelector('.close-btn');
        Object.assign(closeBtn.style, {
            background: 'none',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            fontSize: '16px'
        });
        
        // Add close functionality
        closeBtn.addEventListener('click', function() {
            document.body.removeChild(notification);
            localStorage.setItem('emmetNotificationShown', 'true');
        });
        
        // Add the notification to the body
        document.body.appendChild(notification);
        
        // Auto-hide after 15 seconds
        setTimeout(() => {
            if (document.body.contains(notification)) {
                notification.style.opacity = '0';
                setTimeout(() => {
                    if (document.body.contains(notification)) {
                        document.body.removeChild(notification);
                    }
                }, 300);
            }
        }, 15000);
    }
    
    // Show the notification if it hasn't been shown before
    if (!localStorage.getItem('emmetNotificationShown')) {
        // Delay showing the notification to ensure the page is loaded
        setTimeout(showEmmetNotification, 1000);
    }

    // HTML Shortcuts Button
    const htmlShortcutsBtn = document.getElementById('html-shortcuts-button');
    const htmlShortcutsModal = document.getElementById('html-shortcuts-modal');
    const htmlShortcutsClose = htmlShortcutsModal.querySelector('.shortcuts-close');

    // CSS Shortcuts Button
    const cssShortcutsBtn = document.getElementById('css-shortcuts-button');
    const cssShortcutsModal = document.getElementById('css-shortcuts-modal');
    const cssShortcutsClose = cssShortcutsModal.querySelector('.shortcuts-close');
    
    // Test Boilerplate Button
    const testBoilerplateBtn = document.getElementById('test-boilerplate-button');
    if (testBoilerplateBtn) {
        testBoilerplateBtn.addEventListener('click', function() {
            // Clear the editor
            htmlEditor.setValue('');
            
            // Insert the "!" character
            htmlEditor.replaceSelection('!');
            
            // Directly call the Tab handler function
            emmetTabHandler(htmlEditor);
            
            // Focus the editor
            htmlEditor.focus();
            
            console.log("Test boilerplate button clicked");
        });
    }

    // Open HTML Shortcuts Modal
    htmlShortcutsBtn.addEventListener('click', function() {
        htmlShortcutsModal.classList.add('active');
    });

    // Close HTML Shortcuts Modal
    htmlShortcutsClose.addEventListener('click', function() {
        htmlShortcutsModal.classList.remove('active');
    });

    // Open CSS Shortcuts Modal
    cssShortcutsBtn.addEventListener('click', function() {
        cssShortcutsModal.classList.add('active');
    });

    // Close CSS Shortcuts Modal
    cssShortcutsClose.addEventListener('click', function() {
        cssShortcutsModal.classList.remove('active');
    });

    // Close modals when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === htmlShortcutsModal) {
            htmlShortcutsModal.classList.remove('active');
        }
        if (event.target === cssShortcutsModal) {
            cssShortcutsModal.classList.remove('active');
        }
    });

    // Close modals with Escape key
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            htmlShortcutsModal.classList.remove('active');
            cssShortcutsModal.classList.remove('active');
        }
    });

    // Add animation to run button
    runButton.addEventListener('mousedown', function() {
        this.classList.add('active');
    });
    
    runButton.addEventListener('mouseup', function() {
        this.classList.remove('active');
    });
    
    runButton.addEventListener('mouseleave', function() {
        this.classList.remove('active');
    });

    // Update preview when run button is clicked
    runButton.addEventListener('click', updatePreview);

    // Initial preview update
    updatePreview();

    // Function to update the preview
    function updatePreview() {
        const html = htmlEditor.getValue();
        const css = cssEditor.getValue();
        
        const previewDoc = previewFrame.contentDocument || previewFrame.contentWindow.document;
        previewDoc.open();
        previewDoc.write(html);
        
        // Add CSS to the preview
        const styleElement = previewDoc.createElement('style');
        styleElement.textContent = css;
        previewDoc.head.appendChild(styleElement);
        
        previewDoc.close();
    }

    // Populate CSS class suggestions
    populateSuggestions();

    // Function to populate CSS class suggestions
    function populateSuggestions() {
        const commonClasses = [
            { name: '.container', description: 'Main container with centered content' },
            { name: '.btn', description: 'Basic button style' },
            { name: '.btn-primary', description: 'Primary action button' },
            { name: '.btn-secondary', description: 'Secondary action button' },
            { name: '.card', description: 'Card component with shadow' },
            { name: '.navbar', description: 'Navigation bar' },
            { name: '.hero', description: 'Hero section with background' },
            { name: '.flex-container', description: 'Flexbox container' },
            { name: '.grid-container', description: 'CSS Grid container' },
            { name: '.text-center', description: 'Center-aligned text' }
        ];
        
        commonClasses.forEach(cls => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.innerHTML = `
                <div class="name">${cls.name}</div>
                <div class="description">${cls.description}</div>
            `;
            
            item.addEventListener('click', function() {
                insertSuggestion(cls.name);
            });
            
            suggestionsList.appendChild(item);
        });
    }

    // Function to insert a CSS class suggestion
    function insertSuggestion(className) {
        // Remove the dot from the class name
        const cleanClassName = className.replace('.', '');
        
        // Get the current HTML content
        const html = htmlEditor.getValue();
        
        // Check if the class already exists in the CSS
        const cssContent = cssEditor.getValue();
        if (!cssContent.includes(className + ' {')) {
            // Add the class to the CSS if it doesn't exist
            const newCssRule = `\n${className} {\n  /* Add your styles here */\n}\n`;
            cssEditor.replaceRange(newCssRule, {line: cssEditor.lineCount(), ch: 0});
        }
        
        // Focus back on the HTML editor
        htmlEditor.focus();
    }

    // Tab navigation for mobile
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            switchTab(targetId);
        });
    });

    // Function to switch tabs
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
        
        // If switching to preview, update it
        if (targetId === 'preview-panel') {
            updatePreview();
        }
    }

    // Theme toggle functionality
    const themeToggle = document.querySelector('.theme-toggle input');
    if (themeToggle) {
        // Check for saved theme preference
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-mode');
            themeToggle.checked = true;
            updatePreviewTheme('dark');
        }
        
        // Theme toggle event listener
        themeToggle.addEventListener('change', function() {
            if (this.checked) {
                document.body.classList.add('dark-mode');
                localStorage.setItem('theme', 'dark');
                updatePreviewTheme('dark');
            } else {
                document.body.classList.remove('dark-mode');
                localStorage.setItem('theme', 'light');
                updatePreviewTheme('light');
            }
        });
    }

    // Function to update preview theme
    function updatePreviewTheme(theme) {
        const previewDoc = previewFrame.contentDocument || previewFrame.contentWindow.document;
        if (previewDoc.body) {
            if (theme === 'dark') {
                previewDoc.body.classList.add('dark-mode');
            } else {
                previewDoc.body.classList.remove('dark-mode');
            }
        }
    }

    // Debounce function for performance
    function debounce(func, wait) {
        let timeout;
        return function() {
            const context = this;
            const args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    }

    // Debounced preview update
    const debounceUpdate = debounce(updatePreview, 500);

    // Auto-update preview on typing (debounced)
    htmlEditor.on('change', debounceUpdate);
    cssEditor.on('change', debounceUpdate);
    
    // Format HTML code
    function formatHTML(code) {
        let formatted = '';
        let indent = 0;
        const tab = '  '; // 2 spaces for indentation
        const lines = code.split(/>\s*</);
        
        lines.forEach((line, index) => {
            // Add back the > and < that were removed by the split
            if (index !== 0) {
                line = '<' + line;
            }
            if (index !== lines.length - 1) {
                line = line + '>';
            }
            
            // Check for closing tags
            const isClosingTag = line.indexOf('</') !== -1 && line.indexOf('/>') === -1;
            const isSelfClosingTag = line.indexOf('/>') !== -1;
            const hasClosingTag = line.indexOf('<') !== -1 && line.indexOf('</') !== -1 && line.indexOf('<') < line.indexOf('</');
            
            // Adjust indentation
            if (isClosingTag && !hasClosingTag) {
                indent--;
            }
            
            // Add indentation
            formatted += tab.repeat(indent) + line.trim() + '\n';
            
            // Adjust indentation for next line
            if (!isClosingTag && !isSelfClosingTag && !hasClosingTag) {
                indent++;
            }
        });
        
        return formatted.trim();
    }
    
    // Format CSS code
    function formatCSS(code) {
        // Remove all whitespace
        let formatted = code.replace(/\s+/g, ' ').trim();
        
        // Add newlines and indentation
        formatted = formatted.replace(/\{/g, ' {\n  ');
        formatted = formatted.replace(/;\s*/g, ';\n  ');
        formatted = formatted.replace(/\s*}\s*/g, '\n}\n\n');
        
        // Fix indentation for nested rules
        formatted = formatted.replace(/\n\n/g, '\n');
        
        return formatted.trim();
    }
    
    // Format the code in the active editor
    function formatActiveEditor() {
        // Get the active panel
        const activePanel = document.querySelector('.panel.active');
        
        if (activePanel.id === 'html-panel') {
            // Format HTML
            const htmlCode = htmlEditor.getValue();
            const formattedHTML = formatHTML(htmlCode);
            htmlEditor.setValue(formattedHTML);
            
            // Show notification
            showNotification('HTML code formatted successfully!', 'success');
        } else if (activePanel.id === 'css-panel') {
            // Format CSS
            const cssCode = cssEditor.getValue();
            const formattedCSS = formatCSS(cssCode);
            cssEditor.setValue(formattedCSS);
            
            // Show notification
            showNotification('CSS code formatted successfully!', 'success');
        }
    }
    
    // Show notification function
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `format-notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
        
        // Style the notification
        Object.assign(notification.style, {
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            padding: '10px 15px',
            backgroundColor: type === 'success' ? 'var(--primary-color)' : 'var(--secondary-color)',
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
    
    // Add event listener for Ctrl+S
    document.addEventListener('keydown', function(event) {
        // Check if Ctrl+S was pressed
        if ((event.ctrlKey || event.metaKey) && event.key === 's') {
            // Prevent the default save action
            event.preventDefault();
            
            // Format the code
            formatActiveEditor();
            
            // Update the preview
            updatePreview();
        }
    });
}); 