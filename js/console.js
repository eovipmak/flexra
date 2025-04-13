// Server ID assignment
window.serverId = window.serverId || document.currentScript.getAttribute('data-server-id') 
    || new URLSearchParams(window.location.search).get('id');

// DOM elements and state initialization
const elements = {
    console: document.getElementById('console'),
    command: document.getElementById('command'),
    sendButton: document.getElementById('send-command'),
    status: document.getElementById('status-value'),
    ram: document.getElementById('ram-value'),
    cpu: document.getElementById('cpu-value'),
    serverResources: document.getElementById('server-resources')
};

const state = {
    polling: false,
    pollingIntervalId: null,
    logFilePath: null,
    lastLogs: "",
    logsFound: false,
    isFirstLoad: true,
    commandHistory: [],
    commandHistoryIndex: -1,
    statusAnimationTimeout: null
};

// Utilities
const api = {
    request: (params) => {
        const url = `console.php?id=${window.serverId}${params.endpoint ? '&' + params.endpoint : ''}`;
        return $.ajax({
            url,
            type: params.method || 'GET',
            data: params.data || null,
            dataType: params.dataType || 'json'
        }).catch(error => {
            console.error(`API Error: ${params.endpoint}`, error);
            return Promise.reject(error);
        });
    },
    
    sendCommand: (command) => api.request({
        method: 'POST',
        data: { command },
        endpoint: ''
    }),
    
    getFiles: (directory) => api.request({
        endpoint: `action=files${directory ? '&directory=' + encodeURIComponent(directory) : ''}`
    }),
    
    getFileContents: (file) => api.request({
        endpoint: `action=file_contents&file=${encodeURIComponent(file)}`,
        dataType: 'text'
    }),
    
    getResources: () => api.request({
        endpoint: 'action=resources'
    }),

    // Format log content into readable HTML
    formatLogs: (logContent) => {
        if (!logContent) return '';
        
        // Check if content is JSON string and try to parse it
        try {
            if (logContent.trim().startsWith('{') || logContent.trim().startsWith('[')) {
                const parsed = JSON.parse(logContent);
                if (typeof parsed === 'string') {
                    logContent = parsed;
                } else if (parsed && parsed.logs) {
                    logContent = parsed.logs;
                }
            }
        } catch (e) {
            // Not valid JSON or already plain text, continue with original content
        }
        
        // Remove any trailing quotes that might be part of JSON formatting
        logContent = logContent.trim();
        if (logContent.endsWith('"')) {
            logContent = logContent.slice(0, -1);
        }
        if (logContent.startsWith('"')) {
            logContent = logContent.substring(1);
        }
        
        // Unescape common JSON string escapes
        logContent = logContent
            .replace(/\\n/g, '\n')     // Convert \n to actual newlines
            .replace(/\\\//g, '/')     // Convert \/ to /
            .replace(/\\"/g, '"')      // Convert \" to "
            .replace(/\\r/g, '')       // Remove \r
            .replace(/\\\\/g, '\\');   // Convert \\ to \
        
        // Apply colored formatting based on log level
        return logContent
            .split('\n')
            .filter(line => line.trim())
            .map(line => {
                // Parse different log patterns
                let formatted = line;
                
                // Color based on log level
                if (line.includes('/INFO]')) {
                    formatted = `<span class="log-info">${line}</span>`;
                } else if (line.includes('/WARN]')) {
                    formatted = `<span class="log-warn">${line}</span>`;
                } else if (line.includes('/ERROR]')) {
                    formatted = `<span class="log-error">${line}</span>`;
                } else if (line.includes('>')) {
                    // Command input
                    formatted = `<span class="log-cmd">${line}</span>`;
                }
                
                return formatted;
            })
            .join('<br>');
    }
};

// Core functions
function sendCommand() {
    const command = elements.command.value.trim();
    if (!command) return;
    
    // Show loading state on button
    elements.sendButton.disabled = true;
    elements.sendButton.innerHTML = '<span class="loading-spinner"></span> Sending...';
    
    // Add to command history
    if (state.commandHistory.length === 0 || state.commandHistory[0] !== command) {
        state.commandHistory.unshift(command);
        // Keep history limited to 20 commands
        if (state.commandHistory.length > 20) {
            state.commandHistory.pop();
        }
    }
    state.commandHistoryIndex = -1;
    
    api.sendCommand(command)
        .then(() => {
            // Add command to console with special styling
            appendToConsole(`> ${command}`, true);
            elements.command.value = "";
            
            // Show success animation on button
            elements.sendButton.innerHTML = '<i class="bi bi-check-lg"></i> Sent';
            setTimeout(() => {
                elements.sendButton.innerHTML = '<i class="bi bi-send-fill me-1"></i> Send';
                elements.sendButton.disabled = false;
            }, 1000);
            
            // Fetch logs after a short delay to see the result
            setTimeout(fetchConsoleLogs, 1000);
        })
        .catch(error => {
            // Show error in console
            appendToConsole(`[Error] Failed to send command: ${error}`, false, true);
            
            // Show error animation on button
            elements.sendButton.innerHTML = '<i class="bi bi-x-lg"></i> Failed';
            elements.sendButton.classList.add('btn-danger');
            
            setTimeout(() => {
                elements.sendButton.innerHTML = '<i class="bi bi-send-fill me-1"></i> Send';
                elements.sendButton.disabled = false;
                elements.sendButton.classList.remove('btn-danger');
                elements.sendButton.classList.add('btn-primary');
            }, 2000);
        });
}

function searchLogFiles() {
    // Check logs in common Minecraft server locations
    ['logs', ''].forEach((dir, index) => {
        setTimeout(() => {
            if (!state.logsFound) checkLogsInDirectory(dir);
        }, index * 200);  // Stagger requests slightly
    });
}

function checkLogsInDirectory(directory) {
    api.getFiles(directory ? '/' + directory : '')
        .then(response => {
            if (!response?.data?.length) return false;
            
            const logFiles = response.data.filter(file => 
                file.attributes.name.toLowerCase().includes('.log'));
            
            if (logFiles.length) {
                logFiles.sort((a, b) => b.attributes.modified_at - a.attributes.modified_at);
                state.logFilePath = `${directory ? '/' + directory : ''}/${logFiles[0].attributes.name}`;
                state.logsFound = true;
                fetchLogFileContents();
                return true;
            }
            return false;
        })
        .catch(() => false);
}

function fetchLogFileContents() {
    if (!state.logFilePath) return;
    
    api.getFileContents(state.logFilePath)
        .then(data => {
            if (data === state.lastLogs) return;
            
            // Remove loading animation if present
            const loadingElement = elements.console.querySelector('.console-loading');
            if (loadingElement) {
                loadingElement.remove();
            }
            
            // Store the new logs
            state.lastLogs = data;
            
            // Display last 300 lines for performance
            const lines = data.split('\n');
            const lastLines = lines.slice(Math.max(0, lines.length - 300)).join('\n');
            
            // Apply formatting to the logs before displaying
            const formattedLogs = api.formatLogs(lastLines);
            
            // Update content, preserve scroll position
            const shouldScroll = elements.console.scrollTop + elements.console.clientHeight >= 
                                 elements.console.scrollHeight - 50;
            
            // If this is the first load, add a fade-in animation
            if (state.isFirstLoad) {
                elements.console.innerHTML = formattedLogs;
                elements.console.classList.add('fade-in');
                
                // Add timestamp indicators to make the console more readable
                addTimestampIndicators();
                
                state.isFirstLoad = false;
            } else {
                // For subsequent updates, highlight new content
                const oldContent = elements.console.innerHTML;
                elements.console.innerHTML = formattedLogs;
                
                // Add timestamp indicators
                addTimestampIndicators();
                
                // Highlight new content if there's a significant change
                if (formattedLogs.length - oldContent.length > 50) {
                    highlightNewContent();
                }
            }
            
            if (shouldScroll) {
                elements.console.scrollTop = elements.console.scrollHeight;
            }
        });
}

// Add visual timestamp indicators to make the console more readable
function addTimestampIndicators() {
    // Find timestamp patterns in the console
    const consoleText = elements.console.innerHTML;
    const timestampRegex = /\d{2}:\d{2}:\d{2}/g;
    const matches = consoleText.match(timestampRegex);
    
    if (!matches || matches.length < 3) return;
    
    // Get unique timestamps (hours only)
    const uniqueHours = [...new Set(matches.map(time => time.substring(0, 2)))];
    
    if (uniqueHours.length < 2) return;
    
    // Add timestamp indicators for hour changes
    let modifiedContent = consoleText;
    uniqueHours.forEach(hour => {
        // Find the first occurrence of this hour
        const hourRegex = new RegExp(`${hour}:\\d{2}:\\d{2}`);
        const match = modifiedContent.match(hourRegex);
        
        if (match && match.index) {
            // Insert a timestamp indicator before this line
            const beforeMatch = modifiedContent.substring(0, match.index);
            const lastNewlineBeforeMatch = beforeMatch.lastIndexOf('<br>');
            
            if (lastNewlineBeforeMatch !== -1) {
                const indicator = `<div class="timestamp-indicator">${hour}:00</div>`;
                modifiedContent = modifiedContent.substring(0, lastNewlineBeforeMatch) + 
                                 indicator + 
                                 modifiedContent.substring(lastNewlineBeforeMatch);
            }
        }
    });
    
    elements.console.innerHTML = modifiedContent;
}

// Highlight new content in the console
function highlightNewContent() {
    // Add a subtle highlight to the last few lines
    const lines = elements.console.innerHTML.split('<br>');
    const numLinesToHighlight = Math.min(5, Math.floor(lines.length * 0.1));
    
    if (lines.length <= numLinesToHighlight) return;
    
    // Add highlight class to the last few lines
    for (let i = lines.length - numLinesToHighlight; i < lines.length; i++) {
        if (lines[i].trim()) {
            lines[i] = `<span class="new-log-line">${lines[i]}</span>`;
        }
    }
    
    elements.console.innerHTML = lines.join('<br>');
    
    // Remove the highlight after a delay
    setTimeout(() => {
        document.querySelectorAll('.new-log-line').forEach(el => {
            el.classList.add('fade-highlight');
        });
    }, 2000);
}

function fetchServerResources() {
    api.getResources()
        .then(data => {
            if (!data?.attributes) return;
            
            const { current_state: status, resources } = data.attributes;
            const memory = Math.round(resources.memory_bytes / 1024 / 1024);
            const cpu = resources.cpu_absolute;
            
            // Clear any existing animation timeout
            if (state.statusAnimationTimeout) {
                clearTimeout(state.statusAnimationTimeout);
            }
            
            // Prepare new values
            const newStatusText = status.toUpperCase();
            const newRamText = `${memory} MB`;
            const newCpuText = `${cpu.toFixed(2)}%`;
            
            // Determine status class
            const statusClass = status === 'running' ? 'status-running' : 
                              (status === 'offline' || status === 'stopping') ? 'status-offline' : 'status-starting';
            
            // If this is the first load, just set the values directly
            if (state.isFirstLoad) {
                elements.status.textContent = newStatusText;
                elements.ram.textContent = newRamText;
                elements.cpu.textContent = newCpuText;
                
                // Update status indicator
                elements.status.className = 'value';
                elements.status.classList.add(statusClass);
                
                // Remove loading skeletons
                elements.status.querySelector('.skeleton-loading')?.remove();
                elements.ram.querySelector('.skeleton-loading')?.remove();
                elements.cpu.querySelector('.skeleton-loading')?.remove();
                
                state.isFirstLoad = false;
                return;
            }
            
            // Animate status change if it's different
            if (elements.status.textContent !== newStatusText) {
                // Fade out
                elements.status.style.transition = 'opacity 0.3s ease-out';
                elements.status.style.opacity = '0';
                
                state.statusAnimationTimeout = setTimeout(() => {
                    // Update text and class
                    elements.status.textContent = newStatusText;
                    elements.status.className = 'value';
                    elements.status.classList.add(statusClass);
                    
                    // Fade in
                    elements.status.style.opacity = '1';
                    
                    // Add pulse animation to server resources
                    elements.serverResources.classList.add('pulse-animation');
                    setTimeout(() => {
                        elements.serverResources.classList.remove('pulse-animation');
                    }, 1000);
                }, 300);
            }
            
            // Update RAM with animation if changed
            if (elements.ram.textContent !== newRamText) {
                animateValueChange(elements.ram, newRamText);
            }
            
            // Update CPU with animation if changed
            if (elements.cpu.textContent !== newCpuText) {
                animateValueChange(elements.cpu, newCpuText);
            }
        });
}

// Helper function to animate value changes
function animateValueChange(element, newValue) {
    // Fade out
    element.style.transition = 'opacity 0.2s ease-out';
    element.style.opacity = '0.5';
    
    setTimeout(() => {
        // Update value
        element.textContent = newValue;
        
        // Fade in with highlight
        element.style.opacity = '1';
        element.style.color = '#0d6efd';
        
        // Reset color after animation
        setTimeout(() => {
            element.style.transition = 'color 0.5s ease-out';
            element.style.color = '';
        }, 500);
    }, 200);
}

// Append text to console with optional styling
function appendToConsole(text, isCommand = false, isError = false) {
    // Create a new element for the text
    const line = document.createElement('div');
    line.className = 'console-line console-line-new';
    
    if (isCommand) {
        line.classList.add('log-cmd');
    } else if (isError) {
        line.classList.add('console-error');
    }
    
    line.textContent = text;
    
    // Add to console
    elements.console.appendChild(line);
    
    // Scroll to bottom
    elements.console.scrollTop = elements.console.scrollHeight;
    
    // Remove highlight after animation
    setTimeout(() => {
        line.classList.remove('console-line-new');
    }, 2000);
}

// Handle command history navigation
function handleCommandHistory(direction) {
    if (state.commandHistory.length === 0) return;
    
    if (direction === 'up') {
        state.commandHistoryIndex = Math.min(state.commandHistoryIndex + 1, state.commandHistory.length - 1);
    } else {
        state.commandHistoryIndex = Math.max(state.commandHistoryIndex - 1, -1);
    }
    
    if (state.commandHistoryIndex === -1) {
        elements.command.value = '';
    } else {
        elements.command.value = state.commandHistory[state.commandHistoryIndex];
    }
}

// Start polling for console logs
function startPolling() {
    if (state.polling) return;
    
    state.polling = true;
    
    // Initial fetch
    searchLogFiles();
    fetchServerResources();
    
    // Set up polling intervals
    state.pollingIntervalId = setInterval(() => {
        fetchConsoleLogs();
        fetchServerResources();
    }, 3000);
}

// Stop polling
function stopPolling() {
    if (!state.polling) return;
    
    state.polling = false;
    
    if (state.pollingIntervalId) {
        clearInterval(state.pollingIntervalId);
        state.pollingIntervalId = null;
    }
}

// Fetch console logs (either from log file or API)
function fetchConsoleLogs() {
    if (state.logFilePath) {
        fetchLogFileContents();
    } else {
        searchLogFiles();
    }
}

// Set up event listeners
function setupEventListeners() {
    // Send command on button click
    elements.sendButton.addEventListener('click', sendCommand);
    
    // Send command on Enter key
    elements.command.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendCommand();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            handleCommandHistory('up');
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            handleCommandHistory('down');
        }
    });
    
    // Stop polling when page is hidden
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            stopPolling();
        } else {
            startPolling();
        }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl+L to clear console
        if (e.ctrlKey && e.key === 'l') {
            e.preventDefault();
            elements.console.innerHTML = '';
        }
    });
}

// Initialize the console
function initConsole() {
    setupEventListeners();
    startPolling();
}

// Start the console when DOM is ready
document.addEventListener('DOMContentLoaded', initConsole);