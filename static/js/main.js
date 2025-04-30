// Main application JavaScript

// Global variables
let allLogs = [];
let selectedLogs = [];
let logCharts = {};
let currentFilter = 'all';
let isLoading = false;
let anomalyCount = 0;
let anomalyPatterns = [
    { pattern: /error|exception|fail|timeout/i, type: 'anomaly', score: 3 },
    { pattern: /warning|warn|deprecated|retry/i, type: 'mild-anomaly', score: 2 },
    { pattern: /unexpected|unusual|abnormal|unknown/i, type: 'structural-anomaly', score: 2 },
    { pattern: /permission denied|access denied|unauthorized|forbidden/i, type: 'anomaly', score: 3 },
    { pattern: /missing|not found|undefined|null/i, type: 'mild-anomaly', score: 2 }
];

// Document ready
document.addEventListener('DOMContentLoaded', () => {
    // Initialize application
    initApp();
    
    // Event listeners
    setupEventListeners();
    
    // Initialize tab navigation
    initTabNavigation();
});

/**
 * Initialize the application
 */
function initApp() {
    // Apply saved theme preference if exists
    loadSavedTheme();
    
    // Current path to determine page-specific initialization
    const currentPath = window.location.pathname;
    
    if (currentPath === '/' || currentPath === '/telecom-health') {
        // Only fetch logs on main dashboard and telecom health pages
        fetchLogs();
        
        // Fetch system status
        fetchSystemStatus();
        
        // Initialize charts
        initCharts();
    } else if (currentPath === '/ai-assistant') {
        // AI Assistant page is initialized in its own script
        console.log("Initializing AI Assistant");
    }
    
    console.log('L1 Monitoring Application initialized');
}

/**
 * Always use dark theme
 */
function loadSavedTheme() {
    // Force dark theme
    const htmlElement = document.documentElement;
    htmlElement.setAttribute('data-bs-theme', 'dark');
    
    // Get the navbar and footer elements to ensure they use dark theme
    const navbar = document.querySelector('.navbar');
    const footer = document.querySelector('.footer');
    
    // Make sure dark mode classes are applied
    if (navbar) {
        navbar.classList.remove('navbar-light', 'bg-light');
        navbar.classList.add('navbar-dark', 'bg-dark');
    }
    
    if (footer) {
        footer.classList.remove('bg-light');
        footer.classList.add('bg-dark');
    }
    
    // Apply CSS overrides for dark theme
    applyThemeStyles('dark');
    
    console.log('Dark theme applied as default');
}

/**
 * Setup event listeners for UI interactions
 */
function setupEventListeners() {
    // Refresh logs button
    document.getElementById('refresh-logs').addEventListener('click', (e) => {
        e.preventDefault();
        fetchLogs();
    });
    
    // Log filtering buttons
    if (document.getElementById('filter-all')) {
        document.getElementById('filter-all').addEventListener('click', () => filterLogs('all'));
    }
    if (document.getElementById('filter-error')) {
        document.getElementById('filter-error').addEventListener('click', () => filterLogs('ERROR'));
    }
    if (document.getElementById('filter-warn')) {
        document.getElementById('filter-warn').addEventListener('click', () => filterLogs('WARN'));
    }
    if (document.getElementById('filter-info')) {
        document.getElementById('filter-info').addEventListener('click', () => filterLogs('INFO'));
    }
    
    // Log search
    if (document.getElementById('search-button')) {
        document.getElementById('search-button').addEventListener('click', searchLogs);
    }
    if (document.getElementById('log-search')) {
        document.getElementById('log-search').addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                searchLogs();
            }
        });
    }
    
    // Analyze button
    if (document.getElementById('analyze-button')) {
        document.getElementById('analyze-button').addEventListener('click', analyzeLogs);
    }
    
    // Upload logs
    if (document.getElementById('upload-button')) {
        document.getElementById('upload-button').addEventListener('click', uploadLogFile);
    }
    
    // Time filter for charts
    document.querySelectorAll('.time-filter').forEach(button => {
        button.addEventListener('click', (e) => {
            // Remove active class from all buttons
            document.querySelectorAll('.time-filter').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Add active class to clicked button
            e.target.classList.add('active');
            
            // Update chart time range
            updateChartTimeRange(e.target.dataset.time);
        });
    });
    
    // Dark theme is now the default, toggle functionality removed
}

/**
 * Fetch logs from the server
 */
function fetchLogs() {
    isLoading = true;
    const logsContainer = document.getElementById('logs-container');
    
    // Show loading indicator
    logsContainer.innerHTML = `
        <tr>
            <td colspan="4" class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2">Loading logs...</p>
            </td>
        </tr>
    `;
    
    // Fetch logs
    axios.get('/api/logs')
        .then(response => {
            allLogs = response.data;
            renderLogs(allLogs);
            updateLogCount(allLogs.length);
            fetchLogStats();
        })
        .catch(error => {
            console.error('Error fetching logs:', error);
            logsContainer.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center py-5 text-danger">
                        <i class="fas fa-exclamation-circle fa-2x mb-2"></i>
                        <p>Failed to load logs. Please try again.</p>
                        <p class="small text-muted">${error.message}</p>
                    </td>
                </tr>
            `;
        })
        .finally(() => {
            isLoading = false;
        });
}

/**
 * Detect anomalies in a log message
 * @param {Object} log - The log object to check
 * @returns {Object|null} - The anomaly info if detected, null otherwise
 */
function detectAnomaly(log) {
    // Check level first - ERROR logs are automatic anomalies
    if (log.level === 'ERROR') {
        return { type: 'anomaly', score: 3 };
    }
    
    // Then check the message for pattern matches
    const message = log.message.toLowerCase();
    
    for (const pattern of anomalyPatterns) {
        if (pattern.pattern.test(message)) {
            return { type: pattern.type, score: pattern.score };
        }
    }
    
    // Check for repeated sequences that might indicate abnormal behavior
    if ((message.match(/(\S+)(\s+\1){3,}/)) || // Same word repeated 4+ times
        (message.match(/(\d+)(\s+\1){2,}/))) { // Same number repeated 3+ times
        return { type: 'structural-anomaly', score: 1 };
    }
    
    // Check for unusually long messages (may indicate dumps or errors)
    if (message.length > 500) {
        return { type: 'mild-anomaly', score: 1 };
    }
    
    // No anomaly detected
    return null;
}

/**
 * Update anomaly count in UI
 * @param {number} count - The number of anomalies
 */
function updateAnomalyCount(count) {
    anomalyCount = count;
    
    // Get the anomaly indicator element that we've added to the template
    const anomalyIndicator = document.getElementById('anomaly-indicator');
    
    // Only update if the element exists (might be on a different page)
    if (anomalyIndicator) {
        if (count > 0) {
            // Update the indicator with the badge
            anomalyIndicator.innerHTML = `
                <span class="anomaly-badge ms-2">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span class="anomaly-indicator">${count}</span>
                </span>
            `;
        } else {
            // Clear the indicator if no anomalies
            anomalyIndicator.innerHTML = '';
        }
    }
}

/**
 * Render logs in the logs container
 * @param {Array} logs - Array of log objects to render
 */
function renderLogs(logs) {
    if (isLoading) return;
    
    const logsContainer = document.getElementById('logs-container');
    if (!logsContainer) {
        console.log('Logs container not found in this view - storing logs for later use');
        // Just store the logs in memory for use when switching back to the main dashboard
        return;
    }
    
    if (logs.length === 0) {
        logsContainer.innerHTML = `
            <tr>
                <td colspan="4" class="text-center py-5">
                    <i class="fas fa-search fa-2x mb-2 text-muted"></i>
                    <p>No logs found matching your criteria.</p>
                </td>
            </tr>
        `;
        updateAnomalyCount(0);
        return;
    }
    
    // Clear container
    logsContainer.innerHTML = '';
    
    // Track anomalies for this render
    let anomalies = 0;
    
    // Render each log
    logs.forEach((log, index) => {
        const isSelected = selectedLogs.some(selectedLog => 
            selectedLog.timestamp === log.timestamp && 
            selectedLog.message === log.message
        );
        
        // Check for anomalies
        const anomalyInfo = detectAnomaly(log);
        
        const row = document.createElement('tr');
        let rowClass = `log-entry ${isSelected ? 'selected' : ''}`;
        
        // Apply anomaly class if detected
        if (anomalyInfo) {
            rowClass += ` ${anomalyInfo.type}`;
            anomalies++;
            
            // Add anomaly info to the log object for reference
            log.anomalyInfo = anomalyInfo;
        }
        
        row.className = rowClass;
        row.dataset.index = index;
        
        // Format timestamp to be more readable
        let timestamp = log.timestamp;
        try {
            const date = new Date(log.timestamp);
            timestamp = date.toLocaleString();
        } catch (e) {
            // Keep original timestamp if parsing fails
        }
        
        row.innerHTML = `
            <td>${timestamp}</td>
            <td><span class="badge level-badge level-${log.level}">${log.level}</span></td>
            <td>${log.service || 'unknown'}</td>
            <td>${escapeHtml(log.message)}${anomalyInfo ? `<i class="fas fa-exclamation-circle ms-2 text-danger" title="Anomaly detected"></i>` : ''}</td>
        `;
        
        // Add click event to select/deselect log
        row.addEventListener('click', () => {
            toggleLogSelection(row, log);
        });
        
        logsContainer.appendChild(row);
    });
    
    // Update anomaly count in UI
    updateAnomalyCount(anomalies);
}

/**
 * Toggle log selection for analysis
 * @param {Element} row - The row element that was clicked
 * @param {Object} log - The log object associated with the row
 */
function toggleLogSelection(row, log) {
    row.classList.toggle('selected');
    
    if (row.classList.contains('selected')) {
        // Add to selected logs
        selectedLogs.push(log);
    } else {
        // Remove from selected logs
        selectedLogs = selectedLogs.filter(selectedLog => 
            !(selectedLog.timestamp === log.timestamp && 
              selectedLog.message === log.message)
        );
    }
    
    // Update count in UI if needed
    updateSelectedLogCount();
}

/**
 * Update the selected log count in UI
 */
function updateSelectedLogCount() {
    const count = selectedLogs.length;
    // Removed analyze button update as AI Assistant widget has been removed from dashboard
    // This is only used on the AI Assistant page now
}

/**
 * Update the log count display
 * @param {number} count - The number of logs
 */
function updateLogCount(count) {
    const logCount = document.getElementById('log-count');
    if (logCount) {
        logCount.textContent = count;
    }
}

/**
 * Filter logs by level
 * @param {string} level - The log level to filter by ('all' for no filtering)
 */
function filterLogs(level) {
    currentFilter = level;
    
    let filteredLogs;
    if (level === 'all') {
        filteredLogs = allLogs;
    } else {
        filteredLogs = allLogs.filter(log => log.level === level);
    }
    
    renderLogs(filteredLogs);
    updateLogCount(filteredLogs.length);
}

/**
 * Search logs by text
 */
function searchLogs() {
    const searchInput = document.getElementById('log-search');
    const searchText = searchInput.value.trim().toLowerCase();
    
    if (searchText === '') {
        filterLogs(currentFilter); // Reset to current filter
        return;
    }
    
    let searchResults;
    if (currentFilter === 'all') {
        searchResults = allLogs.filter(log => 
            log.message.toLowerCase().includes(searchText) || 
            (log.service && log.service.toLowerCase().includes(searchText))
        );
    } else {
        searchResults = allLogs.filter(log => 
            log.level === currentFilter && 
            (log.message.toLowerCase().includes(searchText) || 
             (log.service && log.service.toLowerCase().includes(searchText)))
        );
    }
    
    renderLogs(searchResults);
    updateLogCount(searchResults.length);
}

/**
 * Analyze logs using the RAG engine
 */
function analyzeLogs() {
    // This function now only exists to maintain compatibility with other pages
    // It has been moved to the ai-assistant.js file since it was removed from the dashboard
    console.log('analyzeLogs function called but AI Assistant widget has been removed from dashboard');
    // AI Assistant functionality is still available in the AI Assistant page
}

/**
 * Render the suggestion from the AI
 * @param {string} suggestion - The suggestion text
 */
function renderSuggestion(suggestion) {
    // This function now only exists for compatibility
    // AI Assistant widget has been removed from dashboard tab
    console.log('renderSuggestion called but AI Assistant widget has been removed from dashboard');
}

/**
 * Render the relevant logs identified by the RAG system
 * @param {Array} logs - Array of relevant log objects
 */
function renderRelevantLogs(logs) {
    // This function now only exists for compatibility
    // AI Assistant widget has been removed from dashboard tab
    console.log('renderRelevantLogs called but AI Assistant widget has been removed from dashboard');
}

/**
 * Highlight a log entry in the main log list
 * @param {Object} log - The log object to highlight
 */
function highlightLogInMainList(log) {
    // Find the log in allLogs
    const logIndex = allLogs.findIndex(l => 
        l.timestamp === log.timestamp && l.message === log.message
    );
    
    if (logIndex === -1) {
        // Log not found in current view
        return;
    }
    
    // Reset filter to show all logs
    filterLogs('all');
    
    // Find the row
    const row = document.querySelector(`.log-entry[data-index="${logIndex}"]`);
    if (row) {
        // Scroll to the row
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Highlight the row briefly
        row.classList.add('bg-primary', 'text-white');
        setTimeout(() => {
            row.classList.remove('bg-primary', 'text-white');
        }, 1500);
    }
}

/**
 * Fetch log statistics for charts
 */
function fetchLogStats() {
    axios.get('/api/logs/stats')
        .then(response => {
            updateCharts(response.data);
            
            // Update ML model training status if available
            if (response.data.anomalies && document.getElementById('ml-status')) {
                const mlStatus = document.getElementById('ml-status');
                if (response.data.anomalies.ml_trained) {
                    mlStatus.textContent = 'Active';
                    mlStatus.className = 'badge bg-success';
                } else {
                    mlStatus.textContent = 'Training';
                    mlStatus.className = 'badge bg-warning';
                }
            }
        })
        .catch(error => {
            console.error('Error fetching log stats:', error);
        });
}

/**
 * Initialize charts
 */
function initCharts() {
    // Get the log timeline element
    const logTimelineEl = document.getElementById('logTimeline');
    
    // Only proceed if the element exists (might be on a different page)
    if (!logTimelineEl) {
        console.log('Log timeline chart element not found - skipping chart initialization');
        return;
    }
    
    try {
        const logTimelineCtx = logTimelineEl.getContext('2d');
        
        // Log timeline chart (line chart)
        logCharts.timeline = new Chart(logTimelineCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Log Count',
                    data: [],
                    borderColor: '#0d6efd',
                    backgroundColor: 'rgba(13, 110, 253, 0.1)',
                    tension: 0.1,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)'
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error initializing charts:', error);
    }
}

/**
 * Update charts with log statistics
 * @param {Object} stats - Log statistics object
 */
function updateCharts(stats) {
    try {
        // Check if timeline chart exists
        if (!logCharts.timeline) {
            console.log('Timeline chart not initialized, skipping chart updates');
            return;
        }
        
        // Update timeline chart
        const timelineLabels = stats.timeline.map(item => {
            const date = new Date(item.timestamp);
            return date.toLocaleTimeString();
        });
        const timelineData = stats.timeline.map(item => item.count);
        
        logCharts.timeline.data.labels = timelineLabels;
        logCharts.timeline.data.datasets[0].data = timelineData;
        
        // Add anomaly data to timeline if available
        if (stats.anomalies && stats.timeline.length > 0) {
            // If we don't have anomaly distribution over time, simulate it
            // In a real implementation, this would come from the backend
            const anomalyTimelineData = stats.timeline.map((item, index) => {
                // Simulate anomalies being more common at certain times
                const baseRatio = stats.anomalies.total / stats.total || 0.05;
                const anomalyRatio = baseRatio * (index % 3 === 0 ? 2 : 0.5);
                return Math.floor(item.count * anomalyRatio);
            });
            
            // Add anomaly dataset to timeline chart
            if (!logCharts.timeline.data.datasets[1]) {
                logCharts.timeline.data.datasets.push({
                    label: 'Anomalies',
                    data: anomalyTimelineData,
                    borderColor: '#dc3545',
                    backgroundColor: 'rgba(220, 53, 69, 0.2)',
                    borderDash: [5, 5],
                    pointStyle: 'triangle',
                    tension: 0.1,
                    fill: true
                });
            } else {
                logCharts.timeline.data.datasets[1].data = anomalyTimelineData;
            }
        }
        
        logCharts.timeline.update();
        
        // Update anomaly count in UI if we have anomaly data
        if (stats.anomalies && stats.anomalies.total > 0) {
            const anomalyCount = document.getElementById('anomaly-count');
            if (anomalyCount) {
                anomalyCount.textContent = stats.anomalies.total;
            }
        }
    } catch (error) {
        console.error('Error updating charts:', error);
    }
}

/**
 * Update chart time range
 * @param {string} timeRange - Time range identifier ('hour', 'day', 'week')
 */
function updateChartTimeRange(timeRange) {
    try {
        // Check if timeline chart exists
        if (!logCharts.timeline) {
            console.log('Timeline chart not initialized, skipping time range update');
            return;
        }
    
        // This would normally fetch new data from the server with different time ranges
        // For this demo, we'll just modify the existing data
        
        let timelineLabels = [];
        let timelineData = [];
        
        switch (timeRange) {
            case 'hour':
                // Last hour data (simulated)
                for (let i = 0; i < 12; i++) {
                    const date = new Date();
                    date.setMinutes(date.getMinutes() - (i * 5));
                    timelineLabels.unshift(date.toLocaleTimeString());
                    timelineData.unshift(Math.floor(Math.random() * 30));
                }
                break;
            case 'day':
                // Last day data (simulated)
                for (let i = 0; i < 24; i++) {
                    const date = new Date();
                    date.setHours(date.getHours() - i);
                    timelineLabels.unshift(date.toLocaleTimeString());
                    timelineData.unshift(Math.floor(Math.random() * 100));
                }
                break;
            case 'week':
                // Last week data (simulated)
                for (let i = 0; i < 7; i++) {
                    const date = new Date();
                    date.setDate(date.getDate() - i);
                    timelineLabels.unshift(date.toLocaleDateString());
                    timelineData.unshift(Math.floor(Math.random() * 500));
                }
                break;
        }
        
        logCharts.timeline.data.labels = timelineLabels;
        logCharts.timeline.data.datasets[0].data = timelineData;
        logCharts.timeline.update();
    } catch (error) {
        console.error('Error updating chart time range:', error);
    }
}

/**
 * Upload a log file for processing
 */
function uploadLogFile() {
    const fileInput = document.getElementById('logfile');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('Please select a file to upload.');
        return;
    }
    
    // Show progress
    const progressBar = document.getElementById('upload-progress');
    const progressContainer = document.querySelector('.upload-progress-container');
    const statusText = document.getElementById('upload-status');
    
    progressContainer.classList.remove('d-none');
    progressBar.style.width = '0%';
    statusText.textContent = 'Uploading...';
    
    // Create form data
    const formData = new FormData();
    formData.append('logfile', file);
    
    // Upload file
    axios.post('/api/logs/upload', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: progressEvent => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            progressBar.style.width = `${percentCompleted}%`;
            progressBar.setAttribute('aria-valuenow', percentCompleted);
        }
    })
    .then(response => {
        statusText.textContent = 'Upload successful!';
        progressBar.classList.remove('bg-primary');
        progressBar.classList.add('bg-success');
        
        // Update logs with the newly processed logs
        allLogs = response.data.logs;
        renderLogs(allLogs);
        updateLogCount(allLogs.length);
        fetchLogStats();
        
        // Close modal after a delay
        setTimeout(() => {
            const uploadModal = bootstrap.Modal.getInstance(document.getElementById('uploadModal'));
            uploadModal.hide();
            
            // Reset progress bar
            progressContainer.classList.add('d-none');
            progressBar.style.width = '0%';
            progressBar.classList.remove('bg-success');
            progressBar.classList.add('bg-primary');
            fileInput.value = '';
        }, 1500);
    })
    .catch(error => {
        console.error('Error uploading file:', error);
        statusText.textContent = `Upload failed: ${error.response?.data?.error || error.message}`;
        progressBar.classList.remove('bg-primary');
        progressBar.classList.add('bg-danger');
    });
}

/**
 * Fetch system health status
 */
function fetchSystemStatus() {
    // Use fetch API instead of axios to avoid dependency issues
    fetch('/api/health')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // Make sure to properly update the system status with the data from the server
            updateSystemStatus(data);
        })
        .catch(error => {
            console.error('Error fetching system status:', error);
            
            const systemStatusElem = document.getElementById('system-status');
            
            // Check if the element exists before attempting to modify it
            if (!systemStatusElem) {
                console.log('System status element not found, skipping status update');
                return;
            }
            
            // Return a mock status object for fallback mode
            const fallbackStatus = {
                status: 'degraded',
                components: {
                    llm: false,
                    vector_store: true, 
                    embedding_model: true,
                    telecom: false
                }
            };
            
            // Update using our existing function to ensure consistent handling
            updateSystemStatus(fallbackStatus);
            
            // Log fallback mode for debugging
            console.log('System status check failed, using fallback mode');
        });
}

/**
 * Update system status in the UI
 * @param {Object} status - System status object
 */
function updateSystemStatus(status) {
    const systemStatusElem = document.getElementById('system-status');
    const llmStatusElem = document.getElementById('llm-status');
    const vectorStatusElem = document.getElementById('vector-status');
    const embeddingStatusElem = document.getElementById('embedding-status');
    
    // Overall system status
    if (status.status === 'healthy') {
        systemStatusElem.innerHTML = `<i class="fas fa-circle"></i> <span class="status-text">Online</span>`;
        systemStatusElem.classList.add('online');
        systemStatusElem.classList.remove('offline', 'degraded');
    } else {
        systemStatusElem.innerHTML = `<i class="fas fa-circle"></i> <span class="status-text">Degraded</span>`;
        systemStatusElem.classList.remove('online', 'offline');
        systemStatusElem.classList.add('degraded');
    }
    
    // LLM status
    if (status.components.llm) {
        llmStatusElem.textContent = 'Operational';
        llmStatusElem.className = 'badge bg-success';
    } else {
        llmStatusElem.textContent = 'Unavailable';
        llmStatusElem.className = 'badge bg-danger';
    }
    
    // Vector store status
    if (status.components.vector_store) {
        vectorStatusElem.textContent = 'Operational';
        vectorStatusElem.className = 'badge bg-success';
    } else {
        vectorStatusElem.textContent = 'Unavailable';
        vectorStatusElem.className = 'badge bg-danger';
    }
    
    // Embedding model status
    if (status.components.embedding_model) {
        embeddingStatusElem.textContent = 'Operational';
        embeddingStatusElem.className = 'badge bg-success';
    } else {
        embeddingStatusElem.textContent = 'Unavailable';
        embeddingStatusElem.className = 'badge bg-danger';
    }
}

/**
 * Toggle between dark and light mode
 */
function toggleDarkMode() {
    // Theme toggle functionality removed - dark theme is now the default
    // Keeping function stub for compatibility
    console.log('Theme toggle function has been deprecated - dark theme is now the default');
    
    // Apply dark theme styles to ensure consistency
    applyThemeStyles('dark');
    
    // Force dark theme in localStorage for persistence
    localStorage.setItem('theme', 'dark');
}

/**
 * Apply additional theme-specific styles
 * @param {string} theme - The theme to apply ('dark' or 'light')
 */
function applyThemeStyles(theme) {
    // Get or create a style element for our custom theme overrides
    let themeStyle = document.getElementById('theme-style-overrides');
    if (!themeStyle) {
        themeStyle = document.createElement('style');
        themeStyle.id = 'theme-style-overrides';
        document.head.appendChild(themeStyle);
    }
    
    if (theme === 'light') {
        // Light theme overrides
        themeStyle.innerHTML = `
            body { background-color: #f8f9fa; color: #000000; }
            p, h1, h2, h3, h4, h5, h6, span:not(.badge), div:not(.progress-bar), .form-label, .form-control { color: #000000; }
            .card { background-color: #fff; border-color: #dee2e6; }
            .card-body { color: #000000; }
            .modal-content { background-color: #fff; }
            .modal-title, .modal-body { color: #000000; }
            .list-group-item { background-color: #fff; color: #000000; }
            .nav-tabs .nav-link { color: #000000; }
            .nav-tabs .nav-link.active { color: #0066cc; background-color: #fff; font-weight: bold; }
            .table { color: #000000; background-color: #fff; }
            .table td, .table th { color: #000000; background-color: #fff; }
            tr { background-color: #fff; }
            tr:hover { background-color: #f2f2f2; }
            .log-entry { background-color: #fff; color: #000000; }
            .log-entry:hover { background-color: #f2f2f2; }
            .log-entry.selected { background-color: #e2f0ff; }
            .log-entry.anomaly { background-color: #ffebee; }
            .log-entry.mild-anomaly { background-color: #fff3e0; }
            .log-entry.structural-anomaly { background-color: #e8f5e9; }
            .text-muted { color: #555555 !important; }
            .form-text { color: #555555 !important; }
            .dropdown-menu { background-color: #fff; }
            .dropdown-item { color: #000000; }
            input, select, textarea { background-color: #fff !important; color: #000000 !important; }
            label { color: #000000; }
            .suggestion-content { color: #000000; }
            .container h1, .container h2, .container h3, .container-fluid h1, .container-fluid h2, .container-fluid h3 { color: #000000; }
        `;
    } else {
        // Dark theme overrides
        themeStyle.innerHTML = `
            body { background-color: #212529; color: #f8f9fa; }
            p, h1, h2, h3, h4, h5, h6, span:not(.badge), div:not(.progress-bar) { color: #f8f9fa; }
            .card { background-color: #343a40; border-color: #495057; }
            .card-body { color: #f8f9fa; }
            .modal-content { background-color: #343a40; }
            .modal-title, .modal-body { color: #f8f9fa; }
            .list-group-item { background-color: #343a40; color: #f8f9fa; }
            .nav-tabs .nav-link { color: #adb5bd; }
            .nav-tabs .nav-link.active { color: #fff; background-color: #343a40; font-weight: bold; }
            .table { color: #f8f9fa; background-color: #343a40; }
            .table td, .table th { color: #f8f9fa; background-color: #343a40; }
            tr { background-color: #343a40; }
            tr:hover { background-color: #2c3136; }
            .log-entry { background-color: #343a40; color: #f8f9fa; }
            .log-entry:hover { background-color: #2c3136; }
            .log-entry.selected { background-color: #1c4167; }
            .log-entry.anomaly { background-color: #420e0e; }
            .log-entry.mild-anomaly { background-color: #3a2c0d; }
            .log-entry.structural-anomaly { background-color: #1b3025; }
            .text-muted { color: #adb5bd !important; }
            .form-text { color: #adb5bd !important; }
            .dropdown-menu { background-color: #343a40; }
            .dropdown-item { color: #f8f9fa; }
            input, select, textarea { background-color: #343a40 !important; color: #f8f9fa !important; border-color: #495057 !important; }
            label { color: #f8f9fa; }
            .suggestion-content { color: #f8f9fa; }
            .container h1, .container h2, .container h3, .container-fluid h1, .container-fluid h2, .container-fluid h3 { color: #f8f9fa; }
        `;
    }
}

/**
 * Escape HTML special characters
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    
    return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Initialize vertical menu navigation
 */
function initTabNavigation() {
    // Set up vertical menu navigation
    const menuItems = document.querySelectorAll('.vertical-menu .list-group-item');
    
    // Store the current path to determine which page is active
    const currentPath = window.location.pathname;
    
    // Attach event listeners to all menu items
    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            // Save current state in sessionStorage before navigation
            if (typeof allLogs !== 'undefined' && allLogs && allLogs.length > 0) {
                sessionStorage.setItem('allLogs', JSON.stringify(allLogs));
                sessionStorage.setItem('currentFilter', currentFilter || 'all');
            }
        });
    });
    
    // Add refresh logs button functionality
    const refreshButton = document.getElementById('refresh-logs');
    if (refreshButton) {
        refreshButton.addEventListener('click', () => {
            // Clear storage and refresh logs
            sessionStorage.removeItem('allLogs');
            sessionStorage.removeItem('currentFilter');
            
            if (currentPath === '/') {
                fetchLogs();
                fetchLogStats();
            } else if (currentPath === '/telecom-health') {
                fetchTelecomHealth();
            } else if (currentPath === '/ai-assistant') {
                // For AI Assistant, refresh the AI functionality
                if (typeof initAIAssistant === 'function') {
                    initAIAssistant();
                }
                const suggestionContainer = document.getElementById('suggestion-container');
                if (suggestionContainer) {
                    suggestionContainer.style.display = 'none';
                }
                
                const issueDescription = document.getElementById('issue-description');
                if (issueDescription) {
                    issueDescription.value = '';
                }
            }
        });
    }
    
    // On page load, check if we have saved data from another tab
    checkForSavedData();
}

/**
 * Check for saved data from tab navigation
 */
function checkForSavedData() {
    // Only restore data if we don't already have logs loaded
    if ((!allLogs || allLogs.length === 0) && sessionStorage.getItem('allLogs')) {
        try {
            // Get the saved logs from sessionStorage
            const savedLogs = sessionStorage.getItem('allLogs');
            if (savedLogs) {
                allLogs = JSON.parse(savedLogs);
                currentFilter = sessionStorage.getItem('currentFilter') || 'all';
                
                // If we have logs, update the UI without making a new API call
                if (allLogs && allLogs.length > 0) {
                    // Check if we're on the main dashboard page by looking for logs-container
                    if (document.getElementById('logs-container')) {
                        renderLogs(allLogs);
                        fetchLogStats(); // Re-fetch stats to update charts
                    }
                }
            }
        } catch (error) {
            console.error('Error restoring saved logs:', error);
            // If there's any issue, clear session storage and fetch fresh data
            sessionStorage.removeItem('allLogs');
            sessionStorage.removeItem('currentFilter');
            // Fetch logs again
            fetchLogs();
        }
    }
}
