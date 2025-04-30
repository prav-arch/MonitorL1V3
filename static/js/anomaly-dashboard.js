/**
 * Anomaly Dashboard JS
 * Handles machine learning-based anomaly detection display and AI suggestions
 */

// Global variables for anomaly tracking
let anomalyData = null;
let refreshInterval = null;

/**
 * Initialize the anomaly dashboard
 */
function initAnomalyDashboard() {
    console.log('Initializing ML anomaly detection dashboard');
    
    // Get elements
    const anomalyPanel = document.getElementById('anomaly-panel');
    if (!anomalyPanel) {
        console.error('Anomaly panel element not found');
        return;
    }
    
    // Add event listeners
    document.getElementById('refresh-anomalies')?.addEventListener('click', fetchAnomalies);
    
    // Set up view anomalies button for mobile/small screens
    const viewAnomaliesBtn = document.getElementById('view-anomalies-btn');
    if (viewAnomaliesBtn) {
        viewAnomaliesBtn.addEventListener('click', () => {
            const anomalyPanel = document.getElementById('anomaly-panel');
            if (anomalyPanel) {
                anomalyPanel.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }
    
    // Set up recommendations button
    const getRecommendationsBtn = document.getElementById('get-recommendations-btn');
    if (getRecommendationsBtn) {
        getRecommendationsBtn.addEventListener('click', () => {
            openRecommendationsModal();
        });
    }
    
    // Initialize the anomaly chart
    initAnomalyChart();
    
    // Initial fetch
    fetchAnomalies();
    
    // Set up auto-refresh every 60 seconds
    refreshInterval = setInterval(fetchAnomalies, 60000);
}

/**
 * Initialize the ML Anomaly Detection chart
 */
function initAnomalyChart() {
    const ctx = document.getElementById('anomalyChart');
    if (!ctx) {
        console.log('Anomaly chart canvas element not found');
        return;
    }
    
    try {
        // Create initial chart with placeholder data
        const anomalyChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Critical', 'Warning', 'Normal'],
            datasets: [{
                data: [2, 3, 95],
                backgroundColor: [
                    'rgba(220, 53, 69, 0.8)',    // red for critical
                    'rgba(255, 193, 7, 0.8)',    // yellow for warning
                    'rgba(23, 162, 184, 0.8)',   // info color for normal
                ],
                borderColor: [
                    'rgba(220, 53, 69, 1)',
                    'rgba(255, 193, 7, 1)',
                    'rgba(23, 162, 184, 1)',
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        boxWidth: 12,
                        padding: 15,
                        color: '#e9ecef'
                    }
                },
                title: {
                    display: false,
                    text: 'Anomaly Detection'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${context.label}: ${percentage}% (${value})`;
                        }
                    }
                }
            }
        }
    });
    
    // Update chart with real data when anomalies are fetched
    document.addEventListener('anomalies-updated', (event) => {
        if (!event.detail || !anomalyChart) return;
        
        const anomalyData = event.detail;
        const criticalCount = anomalyData.total_anomalies || 0;
        const mildCount = anomalyData.mild_anomalies || 0;
        const totalLogs = 100; // We'll use percentages for visualization
        const normalCount = totalLogs - (criticalCount + mildCount);
        
        // Update chart data
        anomalyChart.data.datasets[0].data = [criticalCount, mildCount, normalCount];
        anomalyChart.update();
    });
    
    } catch (error) {
        console.error('Error initializing anomaly chart:', error);
    }
}

/**
 * Fetch anomalies from the server
 */
function fetchAnomalies() {
    const anomalyStatus = document.getElementById('anomaly-status');
    if (anomalyStatus) {
        anomalyStatus.innerHTML = `
            <div class="d-flex align-items-center">
                <div class="spinner-border spinner-border-sm text-primary me-2" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <span>Detecting anomalies...</span>
            </div>
        `;
    }
    
    axios.get('/api/logs/anomalies')
        .then(response => {
            anomalyData = response.data;
            updateAnomalyDashboard(anomalyData);
        })
        .catch(error => {
            console.error('Error fetching anomalies:', error);
            
            // Create mock data for demonstration purposes
            anomalyData = {
                total_anomalies: 3,
                mild_anomalies: 2,
                total_logs: 100,
                ml_trained: true,
                patterns: [
                    {
                        type: 'connection',
                        explanation: 'Multiple connection timeout errors detected',
                        confidence: 0.85
                    },
                    {
                        type: 'performance',
                        explanation: 'Database query performance degradation',
                        confidence: 0.75
                    }
                ],
                anomalies: [
                    {
                        id: 1,
                        timestamp: new Date().toISOString(),
                        level: 'ERROR',
                        severity: 'critical',
                        service: 'database-service',
                        message: 'Connection refused: Failed to establish connection to database server after 5 retries',
                        anomaly_score: 0.95
                    },
                    {
                        id: 2,
                        timestamp: new Date().toISOString(),
                        level: 'ERROR',
                        severity: 'critical',
                        service: 'api-gateway',
                        message: 'Authentication failed: Invalid credentials provided for service account',
                        anomaly_score: 0.87
                    },
                    {
                        id: 3,
                        timestamp: new Date().toISOString(),
                        level: 'WARNING',
                        severity: 'warning',
                        service: 'storage-service',
                        message: 'Disk space warning: System storage utilization at 85%, approaching threshold',
                        anomaly_score: 0.72
                    },
                    {
                        id: 4,
                        timestamp: new Date().toISOString(),
                        level: 'WARNING',
                        severity: 'warning',
                        service: 'processing-service',
                        message: 'High CPU usage detected: Service utilizing 92% of allocated CPU resources',
                        anomaly_score: 0.68
                    },
                    {
                        id: 5,
                        timestamp: new Date().toISOString(),
                        level: 'INFO',
                        severity: 'structural',
                        service: 'config-service',
                        message: 'Unusual configuration change pattern detected across multiple services',
                        anomaly_score: 0.61
                    }
                ]
            };
            
            // Update dashboard with mock data
            updateAnomalyDashboard(anomalyData);
            
            if (anomalyStatus) {
                anomalyStatus.innerHTML = `
                    <div class="d-flex align-items-center text-warning">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        <div>
                            <div>Using demonstration data - API error: ${error.message || 'Unknown error'}</div>
                            <small class="text-muted">Error retrieving live anomaly data from server</small>
                        </div>
                    </div>
                `;
            }
        });
}

/**
 * Update the ML Anomaly Detection counters
 * @param {Object} data - Anomaly data from the server
 */
function updateMLAnomalyCounters(data) {
    // Update counters in the ML Anomaly Detection component
    const criticalAnomalies = document.getElementById('critical-anomalies');
    const warningAnomalies = document.getElementById('warning-anomalies');
    const structuralAnomalies = document.getElementById('structural-anomalies');
    const mlModelStatus = document.getElementById('ml-model-status');
    
    if (criticalAnomalies) {
        criticalAnomalies.textContent = data.total_anomalies || 0;
    }
    
    if (warningAnomalies) {
        warningAnomalies.textContent = data.mild_anomalies || 0;
    }
    
    if (structuralAnomalies) {
        structuralAnomalies.textContent = data.patterns ? data.patterns.length : 0;
    }
    
    if (mlModelStatus) {
        if (data.ml_trained) {
            mlModelStatus.textContent = 'Trained';
            mlModelStatus.className = 'progress-bar bg-success';
        } else {
            mlModelStatus.textContent = 'Training';
            mlModelStatus.className = 'progress-bar bg-warning progress-bar-striped progress-bar-animated';
        }
    }
}

/**
 * Update the anomaly dashboard with data
 * @param {Object} data - Anomaly data from the server
 */
function updateAnomalyDashboard(data) {
    const anomalyStatus = document.getElementById('anomaly-status');
    const anomalyCount = document.getElementById('anomaly-count');
    const anomalyList = document.getElementById('anomaly-list');
    const anomalyPatterns = document.getElementById('anomaly-patterns');
    const aiExplanation = document.getElementById('ai-explanation');
    
    // Update counters in the ML Anomaly Detection component
    updateMLAnomalyCounters(data);
    
    // Update status
    if (anomalyStatus) {
        const totalAnomalies = data.total_anomalies + data.mild_anomalies;
        if (totalAnomalies > 0) {
            anomalyStatus.innerHTML = `
                <div class="d-flex align-items-center">
                    <i class="fas fa-exclamation-triangle text-danger me-2"></i>
                    <span>${totalAnomalies} anomalies detected</span>
                    <span class="badge bg-danger ms-2">${data.total_anomalies} critical</span>
                    <span class="badge bg-warning ms-2">${data.mild_anomalies} mild</span>
                </div>
            `;
        } else {
            anomalyStatus.innerHTML = `
                <div class="d-flex align-items-center">
                    <i class="fas fa-check-circle text-success me-2"></i>
                    <span>No anomalies detected</span>
                </div>
            `;
        }
        
        // Add ML training status
        if (data.ml_trained) {
            anomalyStatus.innerHTML += `
                <small class="text-muted d-block mt-1">
                    <i class="fas fa-robot me-1"></i> ML model trained and active
                </small>
            `;
        } else {
            anomalyStatus.innerHTML += `
                <small class="text-muted d-block mt-1">
                    <i class="fas fa-robot me-1"></i> ML model training in progress...
                </small>
            `;
        }
    }
    
    // Dispatch event for components listening for anomaly updates (like the ML chart)
    const anomalyEvent = new CustomEvent('anomalies-updated', { detail: data });
    document.dispatchEvent(anomalyEvent);
    
    // Add event listeners for individual recommendation buttons
    setTimeout(() => {
        document.querySelectorAll('.get-single-recommendation').forEach(button => {
            button.addEventListener('click', function() {
                const anomalyId = this.getAttribute('data-anomaly-id');
                const anomalyIndex = parseInt(this.getAttribute('data-anomaly-index'));
                openSingleAnomalyRecommendationModal(anomalyId, anomalyIndex);
            });
        });
    }, 100); // Small delay to ensure DOM elements are fully rendered
    
    // Update count
    if (anomalyCount) {
        anomalyCount.textContent = data.total_anomalies + data.mild_anomalies;
    }
    
    // Update anomaly list
    if (anomalyList) {
        if (data.anomalies && data.anomalies.length > 0) {
            anomalyList.innerHTML = '';
            
            // Make sure the anomaly list has a fixed height with scrollbar
            anomalyList.style.maxHeight = '300px';
            anomalyList.style.overflowY = 'auto';
            
            // Add enough items to ensure scrolling if there are few logs
            const anomalyArray = [...data.anomalies];
            
            // If we have fewer than 10 items, duplicate them to ensure scrolling
            if (anomalyArray.length < 10) {
                const originalLength = anomalyArray.length;
                for (let i = 0; i < 20; i++) {
                    for (let j = 0; j < originalLength; j++) {
                        anomalyArray.push({...anomalyArray[j]});
                    }
                }
            }
            
            anomalyArray.forEach((anomaly, index) => {
                // No limit - show all items to test scrolling
                
                const anomalyItem = document.createElement('div');
                anomalyItem.className = 'list-group-item p-2';
                
                // Determine anomaly level class
                let levelClass = 'info';
                if (anomaly.anomaly_score >= 0.7) {
                    levelClass = 'danger';
                } else if (anomaly.anomaly_score >= 0.5) {
                    levelClass = 'warning';
                }
                
                // Format timestamp to be more readable
                let timestamp = anomaly.timestamp;
                try {
                    const date = new Date(anomaly.timestamp);
                    timestamp = date.toLocaleString();
                } catch (e) {
                    // Keep original timestamp if parsing fails
                }
                
                // Create content
                anomalyItem.innerHTML = `
                    <div class="d-flex w-100 justify-content-between align-items-center mb-1">
                        <span class="badge bg-${levelClass} me-2">${anomaly.level}</span>
                        <small class="text-muted">${timestamp}</small>
                    </div>
                    <p class="mb-1 small">${escapeHtml(anomaly.message)}</p>
                    <div class="d-flex justify-content-between align-items-center">
                        <small class="text-muted">${anomaly.service || 'unknown'}</small>
                        <span>
                            <button type="button" class="btn btn-sm btn-outline-primary get-single-recommendation" 
                                data-anomaly-id="${anomaly.id}" data-anomaly-index="${index}">
                                <i class="fas fa-lightbulb"></i> Get Recommendation
                            </button>
                            <small class="badge bg-secondary ms-2">Score: ${anomaly.anomaly_score.toFixed(2)}</small>
                        </span>
                    </div>
                `;
                
                anomalyList.appendChild(anomalyItem);
            });
        } else {
            anomalyList.innerHTML = `
                <div class="list-group-item text-center py-3">
                    <i class="fas fa-check-circle text-success mb-2" style="font-size: 1.5rem;"></i>
                    <p class="mb-0">No anomalies detected</p>
                </div>
            `;
        }
    }
    
    // Update anomaly patterns
    if (anomalyPatterns) {
        if (data.patterns && data.patterns.length > 0) {
            anomalyPatterns.innerHTML = '';
            
            data.patterns.forEach(pattern => {
                const patternItem = document.createElement('div');
                patternItem.className = 'alert alert-warning mb-2 p-2';
                
                patternItem.innerHTML = `
                    <div class="d-flex align-items-center">
                        <i class="fas fa-lightbulb me-2"></i>
                        <div>
                            <div class="fw-bold small">${pattern.explanation}</div>
                            <div class="d-flex justify-content-between align-items-center mt-1">
                                <small>Pattern type: ${pattern.type}</small>
                                <span class="badge bg-secondary">Confidence: ${(pattern.confidence * 100).toFixed(0)}%</span>
                            </div>
                        </div>
                    </div>
                `;
                
                anomalyPatterns.appendChild(patternItem);
            });
        } else {
            anomalyPatterns.innerHTML = `
                <div class="alert alert-secondary mb-0">
                    <i class="fas fa-search me-2"></i>
                    No specific patterns detected
                </div>
            `;
        }
    }
    
    // Update AI explanation
    if (aiExplanation) {
        if (data.ai_explanation) {
            // Highlight certain keywords
            let explanation = data.ai_explanation;
            explanation = explanation.replace(/error/gi, '<span class="text-danger fw-bold">error</span>');
            explanation = explanation.replace(/warning/gi, '<span class="text-warning fw-bold">warning</span>');
            explanation = explanation.replace(/critical/gi, '<span class="text-danger fw-bold">critical</span>');
            explanation = explanation.replace(/important/gi, '<span class="text-primary fw-bold">important</span>');
            
            aiExplanation.innerHTML = `
                <div class="card-body">
                    <div class="d-flex align-items-start mb-2">
                        <i class="fas fa-robot text-primary me-2 mt-1"></i>
                        <div>${explanation}</div>
                    </div>
                </div>
            `;
        } else {
            aiExplanation.innerHTML = `
                <div class="card-body text-center py-3">
                    <i class="fas fa-robot text-secondary mb-2"></i>
                    <p class="mb-0">No AI explanation available</p>
                </div>
            `;
        }
    }
}

/**
 * Open the recommendations modal and fetch recommendations
 */
function openRecommendationsModal() {
    // Get modal elements
    const modal = new bootstrap.Modal(document.getElementById('recommendationsModal'));
    const loadingElement = document.getElementById('recommendations-loading');
    const contentElement = document.getElementById('recommendations-content');
    
    // Show modal with loading state
    modal.show();
    if (loadingElement) loadingElement.style.display = 'block';
    if (contentElement) contentElement.style.display = 'none';
    
    // Get anomalies to analyze
    let anomaliesToAnalyze = [];
    
    // If we have anomaly data, get the specific anomalies
    if (anomalyData && anomalyData.anomalies && anomalyData.anomalies.length > 0) {
        // Get the anomalies (limit to first 5 for better performance)
        anomaliesToAnalyze = anomalyData.anomalies.slice(0, 5);
    }
    
    // If no anomalies are detected, show a message
    if (anomaliesToAnalyze.length === 0) {
        if (loadingElement) loadingElement.style.display = 'none';
        if (contentElement) {
            contentElement.style.display = 'block';
            contentElement.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle me-2"></i>
                    No anomalies detected to analyze. Please wait for anomalies to appear in the list.
                </div>
            `;
        }
        return;
    }
    
    // Extract anomaly IDs for the API call
    const selectedAnomalyIds = anomaliesToAnalyze.map(anomaly => anomaly.id).filter(id => id);
    
    // Fetch recommendations from the API with the selected anomaly IDs
    axios.get(`/api/logs/anomalies/recommendations?anomaly_ids=${selectedAnomalyIds.join(',')}`)
        .then(response => {
            const data = response.data;
            
            // Set up recommendations content
            let html = '';
            
            // Add overall analysis if available
            if (data.recommendations) {
                html += `<div class="mb-4">
                    <h5 class="mb-3"><i class="fas fa-brain text-primary me-2"></i>Overall Analysis</h5>
                    <div class="card">
                        <div class="card-body">
                            ${formatRecommendations(data.recommendations)}
                        </div>
                    </div>
                </div>`;
            }
            
            // Display recommendations for each anomaly
            html += `<div class="mb-4">
                <h5 class="mb-3"><i class="fas fa-lightbulb text-warning me-2"></i>Specific Anomaly Recommendations</h5>
                <div class="accordion" id="anomalyRecommendationsAccordion">`;
            
            // Add individual anomaly recommendations
            anomaliesToAnalyze.forEach((anomaly, index) => {
                // Determine severity based on anomaly_score if severity is not set
                let severity = anomaly.severity || 'info';
                if (!anomaly.severity && anomaly.anomaly_score) {
                    severity = anomaly.anomaly_score >= 0.7 ? 'critical' : 
                               anomaly.anomaly_score >= 0.5 ? 'warning' : 'info';
                }
                
                const severityClass = severity === 'critical' ? 'danger' : 
                                      severity === 'warning' ? 'warning' : 'primary';
                const severityIcon = severity === 'critical' ? 'exclamation-circle' : 
                                     severity === 'warning' ? 'exclamation-triangle' : 'info-circle';
                
                // Generate specific recommendation for this anomaly
                const anomalyRec = data.anomaly_recommendations && data.anomaly_recommendations[anomaly.id] ? 
                    data.anomaly_recommendations[anomaly.id] : 
                    generateAnomalyRecommendation(anomaly);
                
                html += `
                    <div class="accordion-item">
                        <h2 class="accordion-header" id="anomaly-heading-${index}">
                            <button class="accordion-button ${index > 0 ? 'collapsed' : ''}" type="button" 
                                    data-bs-toggle="collapse" data-bs-target="#anomaly-collapse-${index}" 
                                    aria-expanded="${index === 0 ? 'true' : 'false'}" aria-controls="anomaly-collapse-${index}">
                                <i class="fas fa-${severityIcon} text-${severityClass} me-2"></i>
                                <span class="text-${severityClass} fw-bold me-2">${severity.toUpperCase()}:</span>
                                ${escapeHtml(truncateText(anomaly.message, 80))}
                            </button>
                        </h2>
                        <div id="anomaly-collapse-${index}" class="accordion-collapse collapse ${index === 0 ? 'show' : ''}" 
                             aria-labelledby="anomaly-heading-${index}" data-bs-parent="#anomalyRecommendationsAccordion">
                            <div class="accordion-body">
                                <div class="mb-3">
                                    <h6 class="text-muted">Full Message:</h6>
                                    <div class="log-entry p-2 rounded ${severity === 'critical' ? 'anomaly' : 
                                                                         severity === 'warning' ? 'mild-anomaly' : 'structural-anomaly'}">
                                        ${escapeHtml(anomaly.message)}
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <h6 class="text-muted">Detected At:</h6>
                                    <p>${new Date(anomaly.timestamp).toLocaleString()}</p>
                                </div>
                                <div class="mb-3">
                                    <h6 class="text-muted">GenAI Recommendation:</h6>
                                    <div class="card bg-light">
                                        <div class="card-body">
                                            ${formatRecommendations(anomalyRec)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>`;
            });
            
            html += `</div></div>`;
            
            // Add action items if available
            if (data.action_items && data.action_items.length > 0) {
                html += `<div>
                    <h5 class="mb-3"><i class="fas fa-tasks text-success me-2"></i>Suggested Actions</h5>
                    <div class="card">
                        <div class="card-body">
                            <ul class="list-group list-group-flush">
                                ${data.action_items.map(item => `
                                    <li class="list-group-item d-flex">
                                        <i class="fas fa-check-circle text-success me-2 mt-1"></i>
                                        <span>${escapeHtml(item)}</span>
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                    </div>
                </div>`;
            }
            
            // Show content
            if (contentElement) {
                contentElement.innerHTML = html;
                contentElement.style.display = 'block';
            }
            if (loadingElement) loadingElement.style.display = 'none';
        })
        .catch(error => {
            console.error('Error fetching recommendations:', error);
            
            // Show error message
            if (contentElement) {
                contentElement.innerHTML = `
                    <div class="alert alert-danger">
                        <i class="fas fa-exclamation-circle me-2"></i>
                        Failed to get recommendations: ${error.message || 'Unknown error'}
                    </div>
                    <p>Please try again later or check the AI Assistant tab for more detailed analysis.</p>
                `;
                contentElement.style.display = 'block';
            }
            if (loadingElement) loadingElement.style.display = 'none';
        });
}

/**
 * Format recommendation text with highlighting
 */
function formatRecommendations(text) {
    if (!text) return '<p style="color: #000000 !important;">No specific recommendations available. Please check the AI Assistant tab for more detailed analysis.</p>';
    
    // Split text into meaningful chunks (code blocks, paragraphs, etc.)
    let lines = text.split('\n');
    let formatted = '';
    let inCodeBlock = false;
    let inList = false;
    let listType = '';
    
    // Force light theme styling
    const textColorClass = 'text-dark';
    const codeBgClass = 'bg-white';
    
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (!line && !inCodeBlock) continue; // Skip empty lines outside code blocks
        
        // Handle code blocks
        if (line.startsWith('```')) {
            inCodeBlock = !inCodeBlock;
            if (inCodeBlock) {
                // Extract language if specified (e.g., ```python)
                let language = line.substring(3).trim();
                let langClass = language ? ` language-${language}` : '';
                formatted += `<pre class="bg-light border border-secondary rounded p-2 my-2"><code class="text-dark${langClass}">`;
            } else {
                formatted += '</code></pre>';
            }
            continue;
        }
        
        if (inCodeBlock) {
            // Inside code block - add line as is (but escape HTML)
            formatted += escapeHtml(lines[i]) + '\n';
            continue;
        }
        
        // Check if exiting a list
        if (inList && !(line.startsWith('- ') || line.startsWith('* ') || line.match(/^\d+\.\s/))) {
            inList = false;
            formatted += `</${listType}>`;
        }
        
        // Handle headers
        if (line.startsWith('# ')) {
            formatted += `<h4 class="mt-3 mb-2" style="color: #000000 !important;">${escapeHtml(line.substring(2))}</h4>`;
        } else if (line.startsWith('## ')) {
            formatted += `<h5 class="mt-3 mb-2" style="color: #000000 !important;">${escapeHtml(line.substring(3))}</h5>`;
        } else if (line.startsWith('### ')) {
            formatted += `<h6 class="mt-2 mb-1" style="color: #000000 !important;">${escapeHtml(line.substring(4))}</h6>`;
        }
        // Handle unordered lists (bullets)
        else if (line.startsWith('- ') || line.startsWith('* ')) {
            if (!inList || listType !== 'ul') {
                if (inList) formatted += `</${listType}>`;
                formatted += '<ul class="my-2 ps-3">';
                inList = true;
                listType = 'ul';
            }
            let content = escapeHtml(line.substring(2));
            // Apply inline formatting to list items
            content = formatInlineMarkdown(content);
            formatted += `<li class="mb-1" style="color: #000000 !important;">${content}</li>`;
        }
        // Handle ordered lists (numbers)
        else if (line.match(/^\d+\.\s/)) {
            if (!inList || listType !== 'ol') {
                if (inList) formatted += `</${listType}>`;
                formatted += '<ol class="my-2 ps-3">';
                inList = true;
                listType = 'ol';
            }
            let content = escapeHtml(line.replace(/^\d+\.\s/, ''));
            // Apply inline formatting to list items
            content = formatInlineMarkdown(content);
            formatted += `<li class="mb-1" style="color: #000000 !important;">${content}</li>`;
        }
        // Normal paragraph
        else {
            let content = escapeHtml(line);
            // Apply inline formatting
            content = formatInlineMarkdown(content);
            formatted += `<p class="mb-2" style="color: #000000 !important;">${content}</p>`;
        }
    }
    
    // Close any open list at the end
    if (inList) {
        formatted += `</${listType}>`;
    }
    
    return formatted;
}

function formatInlineMarkdown(text) {
    // Bold
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong style="color: #000000 !important;">$1</strong>');
    // Italic
    text = text.replace(/\*([^*]+)\*/g, '<em style="color: #000000 !important;">$1</em>');
    // Inline code
    text = text.replace(/`([^`]+)`/g, '<code class="bg-light px-1 rounded border border-secondary" style="color: #000000 !important;">$1</code>');
    
    // Highlight technical terms - but still ensure readability
    text = text.replace(/\b(error|warning|critical|alert)\b/gi, '<span class="fw-bold" style="color: #dc3545 !important;">$1</span>');
    text = text.replace(/\b(fix|repair|resolve|solution)\b/gi, '<span class="fw-bold" style="color: #198754 !important;">$1</span>');
    text = text.replace(/\b(network|database|server|connection|api|endpoint)\b/gi, '<span style="color: #0d6efd !important;">$1</span>');
    
    return text;
}

/**
 * Helper function to escape HTML to prevent XSS
 */
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * Truncates text to specified length and adds ellipsis if needed
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text with ellipsis if needed
 */
function truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
}

/**
 * Generate a recommendation for an anomaly based on its properties
 * This function provides fallback recommendations when specific ones aren't available from the API
 * @param {Object} anomaly - Anomaly object
 * @returns {string} Recommendation text
 */
function generateAnomalyRecommendation(anomaly) {
    if (!anomaly) return 'Unable to analyze without anomaly details';
    
    // Extract information from the anomaly
    const message = anomaly.message || '';
    const severity = anomaly.severity || 'unknown';
    const service = anomaly.service || 'Unknown Service';
    
    // Define common patterns and their recommendations
    const patterns = [
        {
            regex: /timeout|timed out|connection refused|unable to connect|can't connect|failed to connect/i,
            rec: `# Connection Issue Detected\n\nThis appears to be a **connection failure** in the ${service} service. \n\n## Recommended Actions:\n- Check if the target service is running and accessible\n- Verify network connectivity between services\n- Check for firewall or security group restrictions\n- Look for recent changes in connection configurations\n- Consider increasing connection timeout thresholds if appropriate`
        },
        {
            regex: /authentication failed|auth failed|unauthorized|not authorized|permission denied|access denied/i,
            rec: `# Authentication Problem\n\nThe ${service} service is experiencing an **authentication failure**. \n\n## Recommended Actions:\n- Verify credentials are correct and not expired\n- Check if service account permissions have changed\n- Look for recent security policy updates\n- Check for certificate expiration if applicable\n- Review authentication logs for additional details`
        },
        {
            regex: /disk full|no space left|insufficient space|out of space|storage exceeded/i,
            rec: `# Storage Issue\n\nThe ${service} system is experiencing **storage problems**. \n\n## Recommended Actions:\n- Check disk usage and free up space if needed\n- Rotate or compress log files\n- Clean temporary files and caches\n- Consider adding more storage capacity\n- Implement improved storage monitoring`
        },
        {
            regex: /memory|out of memory|OOM|insufficient memory|memory leak/i,
            rec: `# Memory Issue Detected\n\nThe ${service} service is experiencing **memory problems**. \n\n## Recommended Actions:\n- Check for memory leaks in the application\n- Analyze memory consumption patterns\n- Consider increasing memory allocation\n- Optimize application code that may be consuming excessive memory\n- Implement memory usage monitoring alerts`
        },
        {
            regex: /cpu|processor|load average|high load|processing time/i,
            rec: `# CPU or Processing Issue\n\nThe ${service} service is showing signs of **CPU or processing limitations**. \n\n## Recommended Actions:\n- Check for resource-intensive processes\n- Analyze system load patterns\n- Consider scaling up CPU resources\n- Look for inefficient queries or processes\n- Implement CPU throttling or rate limiting if appropriate`
        },
        {
            regex: /database|db|query|sql|insert|update|delete|select/i,
            rec: `# Database Issue\n\nThe ${service} service is experiencing **database-related problems**. \n\n## Recommended Actions:\n- Check database server status and connectivity\n- Review slow queries and optimize if needed\n- Verify database resource usage (connections, memory, disk)\n- Look for deadlocks or blocking transactions\n- Consider database scaling or optimization`
        },
        {
            regex: /api|endpoint|http|request|response|status code|[45][0-9][0-9]/i,
            rec: `# API or Service Communication Issue\n\nThe ${service} service is experiencing **API or service communication problems**. \n\n## Recommended Actions:\n- Verify the target service or API is operational\n- Check request parameters and formatting\n- Look for rate limiting or throttling issues\n- Implement circuit breakers for failing services\n- Consider retries with exponential backoff for transient issues`
        },
        {
            regex: /configuration|config|setting|property|parameter|invalid/i,
            rec: `# Configuration Issue\n\nThe ${service} service has a **configuration problem**. \n\n## Recommended Actions:\n- Review recent configuration changes\n- Verify all required configuration parameters are set\n- Check for typos or invalid values\n- Validate configuration against expected format\n- Consider implementing configuration validation`
        }
    ];
    
    // Check for specific patterns
    for (const pattern of patterns) {
        if (pattern.regex.test(message)) {
            return pattern.rec;
        }
    }
    
    // If no specific pattern matches, provide a generic recommendation based on severity
    switch (severity.toLowerCase()) {
        case 'critical':
            return `# Critical Issue in ${service}\n\nThis is a **critical anomaly** that requires immediate attention. While the exact cause isn't clear from the message pattern, critical issues typically indicate system instability or service disruption.\n\n## Recommended Actions:\n- Check system and service logs for additional context\n- Verify all core services are operational\n- Look for recent changes or deployments that may have triggered this issue\n- Consider temporary rollback if this followed a recent change\n- Monitor system metrics for unusual patterns`;
        
        case 'warning':
            return `# Warning Condition in ${service}\n\nThis **warning anomaly** indicates a potential issue that may require attention. While not critical, warnings often precede more serious problems if not addressed.\n\n## Recommended Actions:\n- Monitor the situation for escalation\n- Check system metrics for concerning trends\n- Review logs for additional context\n- Consider preventative maintenance\n- Verify that dependent services are functioning properly`;
            
        case 'structural':
        default:
            return `# Anomaly Detected in ${service}\n\nA **structural anomaly** has been detected that doesn't match normal patterns. This may represent a change in system behavior that warrants investigation.\n\n## Recommended Actions:\n- Compare with historical patterns\n- Look for recent system or configuration changes\n- Check for unusual traffic or usage patterns\n- Monitor for additional related anomalies\n- Document findings for future reference`;
    }
}

/**
 * Open recommendations modal for a single anomaly
 * @param {number} anomalyId - The ID of the anomaly to analyze
 * @param {number} anomalyIndex - The index of the anomaly in the anomalyData.anomalies array
 */
function openSingleAnomalyRecommendationModal(anomalyId, anomalyIndex) {
    // Get modal elements
    const modal = new bootstrap.Modal(document.getElementById('recommendationsModal'));
    const loadingElement = document.getElementById('recommendations-loading');
    const contentElement = document.getElementById('recommendations-content');
    
    // Show modal with loading state
    modal.show();
    if (loadingElement) loadingElement.style.display = 'block';
    if (contentElement) contentElement.style.display = 'none';
    
    // Get the specific anomaly
    let anomaly = null;
    if (anomalyData && anomalyData.anomalies && anomalyData.anomalies.length > anomalyIndex) {
        anomaly = anomalyData.anomalies[anomalyIndex];
    }
    
    // If no anomaly found, show an error
    if (!anomaly) {
        if (loadingElement) loadingElement.style.display = 'none';
        if (contentElement) {
            contentElement.style.display = 'block';
            contentElement.innerHTML = `
                <div class="alert alert-danger" style="background-color: #f8d7da !important; color: #842029 !important; border-color: #f5c2c7 !important;">
                    <i class="fas fa-exclamation-circle me-2"></i>
                    Could not find the selected anomaly. The anomaly list may have been updated.
                </div>
            `;
        }
        return;
    }
    
    // Fetch recommendation from the API for this specific anomaly
    axios.get(`/api/logs/anomalies/recommendations?anomaly_ids=${anomalyId}`)
        .then(response => {
            const data = response.data;
            
            // Set up recommendation content
            let html = '';
            
            // Determine severity based on anomaly_score if severity is not set
            let severity = anomaly.severity || 'info';
            if (!anomaly.severity && anomaly.anomaly_score) {
                severity = anomaly.anomaly_score >= 0.7 ? 'critical' : 
                           anomaly.anomaly_score >= 0.5 ? 'warning' : 'info';
            }
            
            // Extract severity info for styling
            const severityClass = severity === 'critical' ? 'danger' : 
                                  severity === 'warning' ? 'warning' : 'primary';
            const severityIcon = severity === 'critical' ? 'exclamation-circle' : 
                                 severity === 'warning' ? 'exclamation-triangle' : 'info-circle';
            
            // Format timestamp
            let timestamp = anomaly.timestamp;
            try {
                const date = new Date(anomaly.timestamp);
                timestamp = date.toLocaleString();
            } catch (e) {
                // Keep original timestamp if parsing fails
            }
            
            // Add anomaly details section
            html += `
                <div class="mb-4">
                    <h5 class="mb-3 text-dark"><i class="fas fa-${severityIcon} text-${severityClass} me-2"></i>Anomaly Details</h5>
                    <div class="card border-secondary">
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <h6 class="text-muted">Severity:</h6>
                                    <span class="badge bg-${severityClass} px-3 py-2">${severity.toUpperCase()}</span>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <h6 class="text-muted">Detected At:</h6>
                                    <p>${timestamp}</p>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <h6 class="text-muted">Service:</h6>
                                    <p>${anomaly.service || 'Unknown Service'}</p>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <h6 class="text-muted">Anomaly Score:</h6>
                                    <p>${anomaly.anomaly_score ? anomaly.anomaly_score.toFixed(2) : 'N/A'}</p>
                                </div>
                                <div class="col-12">
                                    <h6 class="text-muted">Message:</h6>
                                    <div class="log-entry p-2 rounded ${severity === 'critical' ? 'anomaly' : 
                                                                     severity === 'warning' ? 'mild-anomaly' : 'structural-anomaly'}">
                                        ${escapeHtml(anomaly.message)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>`;
            
            // Generate recommendation - check if the main recommendations field has content
            let anomalyRec;
            
            // First try API-provided recommendations
            if (data.recommendations && typeof data.recommendations === 'string' && data.recommendations.length > 10 && 
                data.recommendations !== 'LLM interface not available to generate recommendations.') {
                // Use the full recommendations if available and valid
                anomalyRec = data.recommendations;
            } else if (data.anomaly_recommendations && data.anomaly_recommendations[anomalyId]) {
                // Use specific recommendation for this anomaly if available
                anomalyRec = data.anomaly_recommendations[anomalyId];
            } else {
                // Fallback to locally generated recommendation
                console.log('Using local recommendation generation for anomaly:', anomaly);
                anomalyRec = generateAnomalyRecommendation(anomaly);
            }
            
            // Final safety check - if we still don't have a valid recommendation, generate a generic one
            if (!anomalyRec || anomalyRec.length < 10) {
                anomalyRec = `# Anomaly Analysis\n\nAn anomaly was detected in the ${anomaly.service || 'system'} that requires attention.\n\n## Recommended Actions:\n- Investigate the logs for more details\n- Check system metrics around the time of the anomaly\n- Look for recent changes that might have affected system behavior\n- Monitor the service for further anomalies`;
            }
            
            // Add recommendation section
            html += `
                <div class="mb-4">
                    <h5 class="mb-3 text-dark"><i class="fas fa-lightbulb text-warning me-2"></i>GenAI Recommendation</h5>
                    <div class="card border-secondary bg-light">
                        <div class="card-body text-dark">
                            ${formatRecommendations(anomalyRec)}
                        </div>
                    </div>
                </div>`;
            
            // Add action items if available
            if (data.action_items && data.action_items.length > 0) {
                html += `
                    <div>
                        <h5 class="mb-3 text-dark"><i class="fas fa-tasks text-success me-2"></i>Suggested Actions</h5>
                        <div class="card border-secondary bg-light">
                            <div class="card-body p-0">
                                <ul class="list-group list-group-flush">
                                    ${data.action_items.map(item => `
                                        <li class="list-group-item d-flex border-secondary bg-light text-dark">
                                            <i class="fas fa-check-circle text-success me-2 mt-1"></i>
                                            <span>${escapeHtml(item)}</span>
                                        </li>
                                    `).join('')}
                                </ul>
                            </div>
                        </div>
                    </div>`;
            }
            
            // Show content
            if (contentElement) {
                contentElement.innerHTML = html;
                contentElement.style.display = 'block';
            }
            if (loadingElement) loadingElement.style.display = 'none';
        })
        .catch(error => {
            console.error('Error fetching recommendation:', error);
            
            // Show error message
            if (contentElement) {
                contentElement.innerHTML = `
                    <div class="alert alert-danger" style="background-color: #f8d7da !important; color: #842029 !important; border-color: #f5c2c7 !important;">
                        <i class="fas fa-exclamation-circle me-2"></i>
                        Failed to get recommendation: ${error.message || 'Unknown error'}
                    </div>
                    <p style="color: #000000 !important;">Please try again later or check the AI Assistant tab for more detailed analysis.</p>
                `;
                contentElement.style.display = 'block';
            }
            if (loadingElement) loadingElement.style.display = 'none';
        });
}

// Initialize on document ready
document.addEventListener('DOMContentLoaded', () => {
    // Add this initialization to your existing DOMContentLoaded event handler
    if (document.getElementById('anomaly-panel')) {
        initAnomalyDashboard();
        
        // Add event listener for recommendations button clicks
        document.addEventListener('click', function(event) {
            // Check if the clicked element or its parent has the get-single-recommendation class
            const recommendationButton = event.target.closest('.get-single-recommendation');
            if (recommendationButton) {
                // Get anomaly ID and index from data attributes
                const anomalyId = recommendationButton.getAttribute('data-anomaly-id');
                const anomalyIndex = parseInt(recommendationButton.getAttribute('data-anomaly-index'), 10);
                
                // Open modal with this specific anomaly
                if (anomalyId && !isNaN(anomalyIndex)) {
                    openSingleAnomalyRecommendationModal(anomalyId, anomalyIndex);
                }
                
                // Prevent the default action
                event.preventDefault();
            }
        });
    }
});