/**
 * Pod Restart Agent UI management script
 * This script provides UI functionality for interacting with the Pod Restart Agent API
 */

console.log("Initializing Pod Restart Agent UI");

// Keep track of agent configuration
let agentConfig = {
    error_threshold: 10,
    cooldown_period: 300,
    check_interval: 60,
    namespace: 'default',
    running: false,
    mock_mode: true
};

// Keep track of monitored pods
let monitoredPods = [];
let restartHistory = [];

// Initialize agent status UI
function initPodRestartAgentUI() {
    // Set up event listeners
    document.getElementById('pod-restart-config-form')?.addEventListener('submit', updateAgentConfig);
    document.getElementById('refresh-agent-status')?.addEventListener('click', refreshAgentStatus);
    document.getElementById('toggle-agent-status')?.addEventListener('click', toggleAgentStatus);
    
    // Make the card header clickable for collapse
    const agentHeader = document.querySelector('.card-header[data-bs-toggle="collapse"]');
    if (agentHeader) {
        agentHeader.style.cursor = 'pointer';
        agentHeader.addEventListener('click', function() {
            const collapseIcon = this.querySelector('.fa-chevron-down, .fa-chevron-up');
            if (collapseIcon) {
                collapseIcon.classList.toggle('fa-chevron-down');
                collapseIcon.classList.toggle('fa-chevron-up');
            }
        });
    }
    
    // Initial status fetch
    refreshAgentStatus();
    
    // Set up auto-refresh
    setInterval(refreshAgentStatus, 30000); // Refresh every 30 seconds
    
    // Set up history refresh
    setInterval(refreshRestartHistory, 60000); // Refresh every minute
    
    // Initial refresh for restart history
    refreshRestartHistory();
}

// Fetch agent configuration and status
function refreshAgentStatus() {
    fetch('/api/pod-restart-agent/config')
        .then(response => response.json())
        .then(data => {
            // Update stored configuration
            agentConfig = data;
            
            // Update UI with current configuration
            updateConfigUI(data);
            
            // Fetch current pod status
            return fetch('/api/pod-restart-agent/status');
        })
        .then(response => response.json())
        .then(data => {
            // Update pod status UI
            updatePodStatusUI(data);
        })
        .catch(error => {
            console.error('Error fetching agent status:', error);
            showErrorMessage('Failed to fetch agent status. See console for details.');
        });
}

// Fetch restart history
function refreshRestartHistory() {
    fetch('/api/pod-restart-agent/history?limit=10')
        .then(response => response.json())
        .then(data => {
            restartHistory = data.history || [];
            updateRestartHistoryUI(data);
        })
        .catch(error => {
            console.error('Error fetching restart history:', error);
        });
}

// Update the agent configuration
function updateAgentConfig(event) {
    event.preventDefault();
    
    // Collect values from form
    const formData = new FormData(event.target);
    
    // Create update payload
    const payload = {
        error_threshold: parseInt(formData.get('error_threshold') || agentConfig.error_threshold),
        cooldown_period: parseInt(formData.get('cooldown_period') || agentConfig.cooldown_period),
        check_interval: parseInt(formData.get('check_interval') || agentConfig.check_interval),
        namespace: formData.get('namespace') || agentConfig.namespace
    };
    
    // Send update request
    fetch('/api/pod-restart-agent/config', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showSuccessMessage('Agent configuration updated successfully');
            agentConfig = data.current_config;
            updateConfigUI(data.current_config);
        } else {
            showErrorMessage('Failed to update agent configuration: ' + (data.error || 'Unknown error'));
        }
    })
    .catch(error => {
        console.error('Error updating agent configuration:', error);
        showErrorMessage('Failed to update agent configuration. See console for details.');
    });
}

// Toggle agent status (start/stop)
function toggleAgentStatus() {
    const action = agentConfig.running ? 'stop' : 'start';
    
    fetch('/api/pod-restart-agent/config', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const actionText = action === 'start' ? 'started' : 'stopped';
            showSuccessMessage(`Agent ${actionText} successfully`);
            agentConfig = data.current_config;
            updateConfigUI(data.current_config);
        } else {
            showErrorMessage(`Failed to ${action} agent: ${data.error || 'Unknown error'}`);
        }
    })
    .catch(error => {
        console.error(`Error ${action}ing agent:`, error);
        showErrorMessage(`Failed to ${action} agent. See console for details.`);
    });
}

// Manually restart a pod
function restartPod(podName) {
    if (!confirm(`Are you sure you want to restart pod "${podName}"?`)) {
        return;
    }
    
    fetch(`/api/pod-restart-agent/restart/${podName}`, {
        method: 'POST'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showSuccessMessage(`Pod ${podName} restart initiated successfully`);
            // Refresh history after a short delay to show the new restart
            setTimeout(refreshRestartHistory, 2000);
        } else {
            showErrorMessage(`Failed to restart pod ${podName}: ${data.message || data.error || 'Unknown error'}`);
        }
    })
    .catch(error => {
        console.error('Error restarting pod:', error);
        showErrorMessage(`Failed to restart pod ${podName}. See console for details.`);
    });
}

// Update configuration UI
function updateConfigUI(config) {
    // Update form fields
    document.getElementById('error-threshold').value = config.error_threshold;
    document.getElementById('cooldown-period').value = config.cooldown_period;
    document.getElementById('check-interval').value = config.check_interval;
    document.getElementById('namespace').value = config.namespace;
    
    // Update status indicators
    const statusElement = document.getElementById('agent-status');
    if (statusElement) {
        statusElement.innerText = config.running ? 'Running' : 'Stopped';
        statusElement.className = config.running ? 'badge bg-success' : 'badge bg-danger';
    }
    
    const modeElement = document.getElementById('agent-mode');
    if (modeElement) {
        modeElement.innerText = config.mock_mode ? 'Mock Mode' : 'Production Mode';
        modeElement.className = config.mock_mode ? 'badge bg-warning' : 'badge bg-info';
    }
    
    // Update header status indicator
    const statusIndicator = document.getElementById('agent-status-indicator');
    if (statusIndicator) {
        if (config.running) {
            statusIndicator.innerText = config.mock_mode ? 'Running (Mock)' : 'Running';
            statusIndicator.className = 'badge bg-success me-2';
        } else {
            statusIndicator.innerText = 'Offline';
            statusIndicator.className = 'badge bg-secondary me-2';
        }
    }
    
    // Update toggle button
    const toggleButton = document.getElementById('toggle-agent-status');
    if (toggleButton) {
        toggleButton.innerText = config.running ? 'Stop Agent' : 'Start Agent';
        toggleButton.className = config.running 
            ? 'btn btn-sm btn-danger' 
            : 'btn btn-sm btn-success';
    }
}

// Update pod status UI
function updatePodStatusUI(data) {
    const podListElement = document.getElementById('monitored-pods-list');
    if (!podListElement) return;
    
    // Store monitored pods data
    monitoredPods = data.pod_summaries || [];
    
    // Clear current list
    podListElement.innerHTML = '';
    
    // Display summary metrics
    document.getElementById('monitored-pod-count').textContent = data.monitored_pods || 0;
    document.getElementById('restarted-pod-count').textContent = data.restarted_pods || 0;
    document.getElementById('total-restarts').textContent = data.total_restarts || 0;
    
    // Check if we have any monitored pods
    if (!monitoredPods.length) {
        podListElement.innerHTML = '<div class="alert alert-info">No pods are currently being monitored.</div>';
        return;
    }
    
    // Add each pod to the list
    monitoredPods.forEach(pod => {
        // Create card for each pod
        const card = document.createElement('div');
        card.className = 'card mb-3';
        
        // Determine card header class based on threshold status
        const headerClass = pod.threshold_reached 
            ? 'card-header bg-danger text-white'
            : (pod.error_count > 0 ? 'card-header bg-warning' : 'card-header bg-secondary text-white');
        
        // Calculate time since last error
        const lastErrorTime = new Date(pod.last_error_time);
        const timeSinceError = Math.floor((new Date() - lastErrorTime) / 1000); // in seconds
        let timeDisplay = '';
        
        if (timeSinceError < 60) {
            timeDisplay = `${timeSinceError} seconds ago`;
        } else if (timeSinceError < 3600) {
            timeDisplay = `${Math.floor(timeSinceError / 60)} minutes ago`;
        } else if (timeSinceError < 86400) {
            timeDisplay = `${Math.floor(timeSinceError / 3600)} hours ago`;
        } else {
            timeDisplay = `${Math.floor(timeSinceError / 86400)} days ago`;
        }
        
        // Calculate restart cooldown status if applicable
        let cooldownStatus = '';
        if (pod.last_restart) {
            const lastRestart = new Date(pod.last_restart);
            const timeSinceRestart = Math.floor((new Date() - lastRestart) / 1000);
            const cooldownRemaining = agentConfig.cooldown_period - timeSinceRestart;
            
            if (cooldownRemaining > 0) {
                cooldownStatus = `<div class="mt-2 alert alert-info">
                    <small>In cooldown: ${Math.floor(cooldownRemaining / 60)}m ${cooldownRemaining % 60}s remaining</small>
                </div>`;
            }
        }
        
        card.innerHTML = `
            <div class="${headerClass}">
                <div class="d-flex justify-content-between align-items-center">
                    <span><strong>${pod.pod_name}</strong></span>
                    <button class="btn btn-sm btn-primary restart-pod-btn" data-pod="${pod.pod_name}">
                        Restart Pod
                    </button>
                </div>
            </div>
            <div class="card-body">
                <div class="d-flex justify-content-between">
                    <span>Error Count: <strong>${pod.error_count}</strong></span>
                    <span>Last Error: <strong>${timeDisplay}</strong></span>
                </div>
                <div class="mt-2">
                    <span>Error Types: ${pod.error_types.map(type => 
                        `<span class="badge bg-secondary">${type}</span>`).join(' ')}
                    </span>
                </div>
                ${cooldownStatus}
            </div>
        `;
        
        podListElement.appendChild(card);
        
        // Add event listener to restart button
        const restartBtn = card.querySelector('.restart-pod-btn');
        if (restartBtn) {
            restartBtn.addEventListener('click', () => restartPod(pod.pod_name));
        }
    });
}

// Update restart history UI
function updateRestartHistoryUI(data) {
    const historyElement = document.getElementById('restart-history-list');
    if (!historyElement) return;
    
    // Clear current list
    historyElement.innerHTML = '';
    
    // Check if we have any history
    if (!data.history || !data.history.length) {
        historyElement.innerHTML = '<div class="alert alert-info">No restart history available.</div>';
        return;
    }
    
    // Create history table
    const table = document.createElement('table');
    table.className = 'table table-striped table-hover table-sm';
    
    table.innerHTML = `
        <thead>
            <tr>
                <th>Time</th>
                <th>Pod</th>
                <th>Type</th>
                <th>Status</th>
                <th>Details</th>
            </tr>
        </thead>
        <tbody id="history-table-body">
        </tbody>
    `;
    
    historyElement.appendChild(table);
    
    const tableBody = document.getElementById('history-table-body');
    
    // Add each history entry
    data.history.forEach(entry => {
        const row = document.createElement('tr');
        
        // Format datetime
        const date = new Date(entry.datetime);
        const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
        
        // Determine status badge
        const statusBadge = entry.successful 
            ? '<span class="badge bg-success">Success</span>' 
            : '<span class="badge bg-danger">Failed</span>';
            
        // Create view details button
        const detailsButton = `
            <button class="btn btn-sm btn-info view-restart-details"
                    data-bs-toggle="modal" 
                    data-bs-target="#restartDetailsModal"
                    data-restart-id="${entry.timestamp}">
                View
            </button>
        `;
        
        row.innerHTML = `
            <td>${formattedDate}</td>
            <td>${entry.pod_name}</td>
            <td>${entry.restart_type}</td>
            <td>${statusBadge}</td>
            <td>${detailsButton}</td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Add event listeners for detail buttons
    document.querySelectorAll('.view-restart-details').forEach(button => {
        button.addEventListener('click', function() {
            const restartId = this.getAttribute('data-restart-id');
            showRestartDetails(restartId);
        });
    });
}

// Show restart details in modal
function showRestartDetails(restartId) {
    // Find the restart entry
    const entry = restartHistory.find(entry => entry.timestamp == restartId);
    if (!entry) {
        console.error('Restart entry not found:', restartId);
        return;
    }
    
    // Update modal title
    const modalTitle = document.getElementById('restartDetailsModalLabel');
    if (modalTitle) {
        modalTitle.textContent = `Restart Details: ${entry.pod_name}`;
    }
    
    // Update modal body
    const modalBody = document.getElementById('restartDetailsModalBody');
    if (!modalBody) return;
    
    // Format datetime
    const date = new Date(entry.datetime);
    const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
    
    // Build details content
    let content = `
        <dl class="row">
            <dt class="col-sm-4">Pod Name:</dt>
            <dd class="col-sm-8">${entry.pod_name}</dd>
            
            <dt class="col-sm-4">Namespace:</dt>
            <dd class="col-sm-8">${entry.namespace}</dd>
            
            <dt class="col-sm-4">Time:</dt>
            <dd class="col-sm-8">${formattedDate}</dd>
            
            <dt class="col-sm-4">Type:</dt>
            <dd class="col-sm-8">${entry.restart_type}</dd>
            
            <dt class="col-sm-4">Status:</dt>
            <dd class="col-sm-8">
                <span class="badge ${entry.successful ? 'bg-success' : 'bg-danger'}">
                    ${entry.successful ? 'Success' : 'Failed'}
                </span>
            </dd>
            
            <dt class="col-sm-4">Error Count:</dt>
            <dd class="col-sm-8">${entry.error_count}</dd>
    `;
    
    // Add error message if present
    if (entry.error_message) {
        content += `
            <dt class="col-sm-4">Error Message:</dt>
            <dd class="col-sm-8">
                <div class="alert alert-danger">
                    ${entry.error_message}
                </div>
            </dd>
        `;
    }
    
    // Add AI recommendation if present
    if (entry.ai_recommendation) {
        const rec = entry.ai_recommendation;
        content += `
            <dt class="col-sm-4">AI Recommendation:</dt>
            <dd class="col-sm-8">
                <div class="card">
                    <div class="card-header bg-info text-white">
                        AI Recommendation (Confidence: ${Math.round(rec.confidence * 100)}%)
                    </div>
                    <div class="card-body">
                        <p><strong>Decision:</strong> ${rec.should_restart ? 'Restart' : 'Do Not Restart'}</p>
                        <p><strong>Reason:</strong> ${rec.reason}</p>
                        
                        ${rec.alternative_actions ? `
                        <div class="mt-2">
                            <strong>Alternative Actions:</strong>
                            <ul>
                                ${rec.alternative_actions.map(action => `<li>${action}</li>`).join('')}
                            </ul>
                        </div>
                        ` : ''}
                    </div>
                </div>
            </dd>
        `;
    }
    
    content += '</dl>';
    modalBody.innerHTML = content;
}

// Utility function to show error message
function showErrorMessage(message) {
    // Create and show toast notification
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = 'toast align-items-center text-white bg-danger border-0';
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    
    // Create and show Bootstrap toast
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
    
    // Remove toast after it's hidden
    toast.addEventListener('hidden.bs.toast', function() {
        toast.remove();
    });
}

// Utility function to show success message
function showSuccessMessage(message) {
    // Create and show toast notification
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = 'toast align-items-center text-white bg-success border-0';
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    
    // Create and show Bootstrap toast
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
    
    // Remove toast after it's hidden
    toast.addEventListener('hidden.bs.toast', function() {
        toast.remove();
    });
}

// Initialize once DOM is loaded
document.addEventListener('DOMContentLoaded', initPodRestartAgentUI);