/**
 * Kubernetes Monitoring Script
 * This script handles the Kubernetes monitoring widget functionality.
 */

// Initialize Chart.js components
let clusterHealthChart = null;
let podCpuUsageChart = null;
let podMemoryUsageChart = null;
let podsRunningTimeChart = null;

// Keep track of polling
let kubernetesPollingTimerId = null;
const POLLING_INTERVAL = 15000; // 15 seconds for faster demo updates

// Pod data arrays
let podCpuData = {};
let podMemoryData = {};
let podsRunningData = {
    labels: [],
    datasets: [
        {
            label: 'Total Pods',
            data: [],
            borderColor: 'rgba(75, 192, 192, 1)',
            tension: 0.4,
            fill: false
        }
    ]
};

// Initialize the Kubernetes monitoring components
document.addEventListener('DOMContentLoaded', function() {
    // Initialize all the charts
    initClusterHealthChart();
    initPodCpuUsageChart();
    initPodMemoryUsageChart();
    initPodsRunningTimeChart();
    
    // Fetch the initial data
    fetchKubernetesOverview();
    fetchPodResourceUsage();
    fetchKubernetesEvents();
    
    // Set up event listeners
    setupEventListeners();
    
    // Set up polling for automatic updates
    startKubernetesPolling();
});

// Set up event listeners for the Kubernetes section
function setupEventListeners() {
    // Refresh button
    const refreshButton = document.querySelector('.refresh-k8s');
    if (refreshButton) {
        refreshButton.addEventListener('click', function() {
            fetchKubernetesOverview();
        });
    }
    
    // Details buttons - opens the Kubernetes details modal
    console.log("Setting up Kubernetes details button click handlers");
    
    // Additional backup handler to ensure button clicks are captured
    window.openKubernetesModal = function() {
        console.log("openKubernetesModal function called");
        const modalElement = document.getElementById('kubernetesModal');
        if (!modalElement) {
            console.error("Modal element not found in openKubernetesModal!");
            return;
        }
        
        try {
            const kubernetesModal = new bootstrap.Modal(modalElement);
            kubernetesModal.show();
            console.log("Modal shown via Bootstrap Modal API");
        } catch (error) {
            console.error("Error showing modal via Bootstrap API:", error);
            try {
                // Direct approach as fallback
                modalElement.classList.add('show');
                modalElement.style.display = 'block';
                document.body.classList.add('modal-open');
                const backdrop = document.createElement('div');
                backdrop.classList.add('modal-backdrop', 'fade', 'show');
                document.body.appendChild(backdrop);
                console.log("Modal shown via direct DOM manipulation");
            } catch (innerError) {
                console.error("Error showing modal via direct DOM:", innerError);
            }
        }
        
        // Load the initial data for the modal regardless of how it was opened
        fetchNodeDetails();
    };
    
    // Set up click handlers for both buttons
    const detailsButtons = document.querySelectorAll('#show-k8s-details, #show-k8s-details-secondary');
    console.log("Found details buttons:", detailsButtons.length);
    
    detailsButtons.forEach(button => {
        if (button) {
            console.log("Adding click event to button:", button.id);
            button.onclick = function(event) {
                console.log("Details button clicked (onclick):", this.id);
                event.preventDefault();
                window.openKubernetesModal();
                return false;
            };
            
            // Also add regular event listener as backup
            button.addEventListener('click', function(event) {
                console.log("Details button clicked (addEventListener):", this.id);
                event.preventDefault();
                window.openKubernetesModal();
            });
        }
    });
    
    // Refresh button in modal
    const refreshDetailsButton = document.querySelector('.refresh-k8s-details');
    if (refreshDetailsButton) {
        refreshDetailsButton.addEventListener('click', function() {
            // Determine which tab is active and refresh that data
            const activeTab = document.querySelector('#k8sDetailsTabs .nav-link.active');
            if (activeTab) {
                const tabId = activeTab.id;
                switch(tabId) {
                    case 'nodes-tab':
                        fetchNodeDetails();
                        break;
                    case 'pods-tab':
                        fetchPodDetails();
                        break;
                    case 'deployments-tab':
                        // Not implemented yet
                        break;
                    case 'l1mon-tab':
                        fetchL1MonitoringDetailsData();
                        break;
                    case 'pod-metrics-tab':
                        // Show the loading state
                        document.getElementById('k8s-pod-metrics-loading').style.display = 'block';
                        document.getElementById('k8s-pod-metrics-content').style.display = 'none';
                        
                        // Fetch the pod resource usage data
                        fetchPodResourceUsage().then(() => {
                            // Hide loading and show content
                            document.getElementById('k8s-pod-metrics-loading').style.display = 'none';
                            document.getElementById('k8s-pod-metrics-content').style.display = 'block';
                        });
                        break;
                    default:
                        fetchNodeDetails();
                }
            }
        });
    }
    
    // Tab change events
    const tabButtons = document.querySelectorAll('#k8sDetailsTabs .nav-link');
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tabId = this.id;
            switch(tabId) {
                case 'nodes-tab':
                    fetchNodeDetails();
                    break;
                case 'pods-tab':
                    fetchPodDetails();
                    break;
                case 'deployments-tab':
                    // Show "coming soon" message
                    document.getElementById('k8s-deployments-loading').style.display = 'none';
                    document.getElementById('k8s-deployments-content').style.display = 'block';
                    break;
                case 'l1mon-tab':
                    fetchL1MonitoringDetailsData();
                    break;
                case 'pod-metrics-tab':
                    // Show the loading state
                    document.getElementById('k8s-pod-metrics-loading').style.display = 'block';
                    document.getElementById('k8s-pod-metrics-content').style.display = 'none';
                    
                    // Fetch the pod resource usage data
                    fetchPodResourceUsage().then(() => {
                        // Hide loading and show content
                        document.getElementById('k8s-pod-metrics-loading').style.display = 'none';
                        document.getElementById('k8s-pod-metrics-content').style.display = 'block';
                    });
                    break;
            }
        });
    });
    
    // Namespace selector for pods tab
    const namespaceSelector = document.getElementById('namespace-selector');
    if (namespaceSelector) {
        namespaceSelector.addEventListener('change', function() {
            fetchPodDetails(this.value);
        });
    }
}

// Initialize the cluster health chart
function initClusterHealthChart() {
    console.log('Initializing cluster health chart');
    try {
        // First, check if Chart.js is loaded, if not bail early with error message
        if (typeof Chart === 'undefined') {
            console.error('Chart.js is not loaded. Cannot initialize cluster health chart.');
            // Add a visible error message to alert users
            const chartContainers = document.querySelectorAll('.position-relative.me-3');
            chartContainers.forEach(container => {
                const errorMsg = document.createElement('div');
                errorMsg.className = 'alert alert-danger p-2 mt-2';
                errorMsg.textContent = 'Chart.js loading error';
                container.appendChild(errorMsg);
            });
            return;
        }
        
        // Check for both possible canvas elements (dashboard and modal)
        // First try the modal canvas
        let ctx = document.getElementById('clusterHealthChart');
        let isModalChart = true;
        
        // If not found, try the dashboard widget canvas
        if (!ctx) {
            ctx = document.getElementById('clusterHealthChartWidget');
            isModalChart = false;
        }
        
        console.log('Chart canvas element:', ctx, 'isModalChart:', isModalChart);
        
        if (!ctx) {
            console.warn('Could not find either chart canvas element, attempting recovery');
            
            // Emergency fallback - create the chart canvas if it doesn't exist
            let chartContainer;
            let canvasId;
            
            // First try the modal container
            chartContainer = document.querySelector('.position-relative.me-3');
            canvasId = 'clusterHealthChart';
            
            // If not found, try the dashboard widget container
            if (!chartContainer) {
                chartContainer = document.querySelector('.chart-container');
                canvasId = 'clusterHealthChartWidget';
            }
            
            if (chartContainer) {
                console.log('Found chart container, creating canvas element with ID:', canvasId);
                
                // Clear the container and setup for circular display
                chartContainer.innerHTML = '';
                chartContainer.style.position = 'relative';
                chartContainer.style.minWidth = '150px';
                chartContainer.style.minHeight = '150px';
                chartContainer.style.maxWidth = '200px';
                chartContainer.style.maxHeight = '200px';
                chartContainer.style.margin = 'auto';
                chartContainer.style.borderRadius = '50%';
                chartContainer.style.overflow = 'hidden';
                chartContainer.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
                
                // Create a new canvas element
                const canvas = document.createElement('canvas');
                canvas.id = canvasId;
                canvas.width = 150;
                canvas.height = 150;
                canvas.style.display = 'block';
                chartContainer.appendChild(canvas);
                
                // Create score element that will be positioned in the center
                const scoreEl = document.createElement('div');
                scoreEl.id = canvasId === 'clusterHealthChart' ? 'cluster-health-score' : 'cluster-health-score-widget';
                scoreEl.className = 'position-absolute top-50 start-50 translate-middle fw-bold';
                scoreEl.style.fontSize = '32px';
                scoreEl.textContent = '0';
                
                // Add subtle pulsing animation with CSS
                scoreEl.style.animation = 'pulse 2s infinite';
                // Create style for pulse animation if it doesn't exist
                if (!document.getElementById('pulse-animation-style')) {
                    const style = document.createElement('style');
                    style.id = 'pulse-animation-style';
                    style.textContent = `
                        @keyframes pulse {
                            0% { transform: translate(-50%, -50%) scale(1); }
                            50% { transform: translate(-50%, -50%) scale(1.05); }
                            100% { transform: translate(-50%, -50%) scale(1); }
                        }
                    `;
                    document.head.appendChild(style);
                }
                
                chartContainer.appendChild(scoreEl);
                
                // Create status element under the chart
                const statusEl = document.createElement('div');
                statusEl.id = canvasId === 'clusterHealthChart' ? 'cluster-health-status' : 'cluster-health-status-widget';
                statusEl.className = 'text-center mt-2';
                statusEl.textContent = 'Cluster Health: Unknown';
                statusEl.style.fontWeight = 'bold';
                
                // Add status element after the chart container
                chartContainer.parentNode.insertBefore(statusEl, chartContainer.nextSibling);
                
                // Get the new canvas context
                ctx = canvas;
            } else {
                console.error('Chart container not found, cannot create chart');
                return;
            }
        }
        
        // Destroy existing chart if any
        if (clusterHealthChart) {
            console.log('Destroying existing chart before re-initialization');
            clusterHealthChart.destroy();
        }
        
        clusterHealthChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: [0, 100], // Start with 0% health, 100% remaining
                    backgroundColor: [
                        '#198754', // Success color for health
                        '#e9ecef'  // Gray for remaining
                    ],
                    borderWidth: 0,
                    cutout: '75%',
                    borderRadius: 5
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
                        enabled: false
                    }
                },
                animation: {
                    animateRotate: true,
                    animateScale: true,
                    duration: 1000
                }
            }
        });
        console.log('Cluster health chart initialized successfully');
    } catch (error) {
        console.error('Error initializing cluster health chart:', error);
        // Continue with other features even if chart fails
    }
}

// Start polling for Kubernetes updates
function startKubernetesPolling() {
    console.log("Starting Kubernetes polling with interval", POLLING_INTERVAL, "ms");
    
    // Clear existing timer if any
    if (kubernetesPollingTimerId) {
        clearInterval(kubernetesPollingTimerId);
    }
    
    // Immediately fetch data once
    fetchKubernetesOverview();
    fetchPodResourceUsage();
    fetchKubernetesEvents();
    
    // Set up new polling interval
    kubernetesPollingTimerId = setInterval(function() {
        fetchKubernetesOverview();
        fetchPodResourceUsage();
        fetchKubernetesEvents();
    }, POLLING_INTERVAL);
}

// Fetch Kubernetes cluster overview
function fetchKubernetesOverview() {
    fetch('/api/kubernetes/overview')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Kubernetes overview data:', data);
            updateClusterHealthUI(data);
            fetchL1MonitoringHealth();
        })
        .catch(error => {
            console.error('Error fetching Kubernetes overview:', error);
            showKubernetesError('Failed to fetch cluster overview. Server may be unavailable.');
        });
}

// Fetch L1 Monitoring specific health information
function fetchKubernetesEvents() {
    console.log("Fetching Kubernetes events...");
    // Use axios instead of fetch for better error handling
    axios.get('/api/kubernetes/events')
        .then(response => {
            const data = response.data;
            console.log('Kubernetes events data received:', data);
            
            // Get the events table body element
            const mainEventsTableBody = document.getElementById('k8s-events');
            
            // Make sure the element exists
            if (!mainEventsTableBody) {
                console.error('Events table body element not found in DOM');
                return;
            }
            
            // Check if we have events data
            if (!data.events || data.events.length === 0) {
                console.log('No events found in data payload or empty events array');
                const noEventsHTML = `
                    <tr>
                        <td colspan="4" class="text-center">No recent events found</td>
                    </tr>
                `;
                
                mainEventsTableBody.innerHTML = noEventsHTML;
            } else {
                console.log(`Found ${data.events.length} events to display`);
                
                // Only show up to 5 most recent events in the main view
                const eventsToShow = data.events.slice(0, 5);
                
                // Create HTML for the main dashboard (up to 5 events)
                let mainEventsHtml = '';
                
                // Process each event and create table rows
                eventsToShow.forEach(event => {
                    try {
                        // Use try-catch to handle any issues with individual events
                        
                        // Handle different timestamp formats
                        let timestamp;
                        try {
                            timestamp = new Date(event.last_timestamp || event.first_timestamp || data.timestamp);
                        } catch (e) {
                            timestamp = new Date(); // Fallback to current time if parsing fails
                        }
                        
                        // Determine style class based on event type
                        const typeClass = event.type === 'Warning' ? 'text-warning' : 'text-info';
                        
                        // Extract object info safely
                        let objectInfo = 'System';
                        if (event.involved_object) {
                            objectInfo = `${event.involved_object.kind || 'Object'}/${event.involved_object.name || 'unknown'}`;
                        }
                        
                        // Create a properly formatted row
                        mainEventsHtml += `
                            <tr>
                                <td>${timestamp.toLocaleTimeString()}</td>
                                <td><span class="${typeClass}">${event.type || 'Info'}</span></td>
                                <td>${objectInfo}</td>
                                <td>${event.reason ? event.reason + ': ' : ''}${event.message || 'No message available'}</td>
                            </tr>
                        `;
                    } catch (error) {
                        console.error('Error processing event:', error, event);
                        // Skip this event if there's an error
                    }
                });
                
                // If we couldn't process any events, show an error
                if (!mainEventsHtml) {
                    mainEventsHtml = `
                        <tr>
                            <td colspan="4" class="text-center">
                                Error processing event data
                            </td>
                        </tr>
                    `;
                }
                
                // Update the main events table with event data
                mainEventsTableBody.innerHTML = mainEventsHtml;
            }
        })
        .catch(error => {
            console.error('Error fetching Kubernetes events:', error);
            
            // Create error message HTML
            const errorHTML = `
                <tr>
                    <td colspan="4" class="text-center text-danger">
                        Failed to fetch events. Server may be unavailable.
                    </td>
                </tr>
            `;
            
            // Show error in main events table
            const mainEventsTableBody = document.getElementById('k8s-events');
            if (mainEventsTableBody) {
                mainEventsTableBody.innerHTML = errorHTML;
            }
        });
}

function fetchL1MonitoringHealth() {
    fetch('/api/kubernetes/l1monitoring')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            updateL1MonitoringUI(data);
        })
        .catch(error => {
            console.error('Error fetching L1 Monitoring health:', error);
            // Don't show error, already handled in overview
        });
}

// Update the UI with cluster health data
function updateClusterHealthUI(data) {
    console.log("Updating cluster health UI with data:", data);
    
    // Clear any previous error
    document.querySelectorAll('.kubernetes-error-message').forEach(el => {
        el.style.display = 'none';
    });
    
    if (data.error) {
        console.error("Error in cluster health data:", data.error);
        showKubernetesError(data.message || data.error);
        return;
    }
    
    // Update timestamp
    const timestampEl = document.getElementById('k8s-last-updated');
    if (timestampEl && data.timestamp) {
        const timestamp = new Date(data.timestamp);
        timestampEl.textContent = timestamp.toLocaleTimeString();
    } else {
        console.log("Setting timestamp to current time (no timestamp in data)");
        const now = new Date();
        if (timestampEl) {
            timestampEl.textContent = now.toLocaleTimeString();
        }
    }
    
    // Calculate an overall health score based on available data
    let healthScore = 85; // Default when in mock mode
    let healthStatus = 'Healthy';
    
    // Derive health from control_plane if available
    if (data.control_plane && data.control_plane.healthy !== undefined) {
        healthStatus = data.control_plane.healthy ? 'Healthy' : 'Degraded';
        healthScore = data.control_plane.healthy ? 95 : 65;
    }
    
    // Further adjust score based on deployments
    if (data.deployments && data.deployments.available_percentage !== undefined) {
        if (data.deployments.available_percentage < 100) {
            healthStatus = 'Degraded';
            healthScore = Math.min(healthScore, data.deployments.available_percentage);
        }
    }
    
    // Override with overall_health if explicitly provided
    if (data.overall_health) {
        healthScore = data.overall_health.score || healthScore;
        healthStatus = data.overall_health.status || healthStatus;
    }
    
    console.log("Calculated health score:", healthScore, "status:", healthStatus);
    
    // Update health score for both the widget and modal
    const scoreElements = [
        document.getElementById('cluster-health-score'),
        document.getElementById('cluster-health-score-widget')
    ];
    scoreElements.forEach(scoreEl => {
        if (scoreEl) {
            scoreEl.textContent = healthScore;
        }
    });
    
    // Update health status text for both the widget and modal
    const statusElements = [
        document.getElementById('cluster-health-status'),
        document.getElementById('cluster-health-status-widget')
    ];
    statusElements.forEach(statusEl => {
        if (statusEl) {
            if (statusEl.id.includes('widget')) {
                statusEl.textContent = `Cluster Health: ${healthStatus}`;
            } else {
                statusEl.textContent = `Cluster Health: ${healthStatus}`;
            }
        }
    });
    
    // Update health badge for both the widget and modal
    const badgeElements = [
        document.getElementById('cluster-health-badge'),
        document.getElementById('cluster-health-badge-widget')
    ];
    badgeElements.forEach(badgeEl => {
        if (badgeEl) {
            badgeEl.textContent = healthStatus;
            
            // Update badge color based on status
            badgeEl.className = 'badge';
            switch(healthStatus) {
                case 'Healthy':
                    badgeEl.classList.add('bg-success');
                    break;
                case 'Degraded':
                    badgeEl.classList.add('bg-warning');
                    break;
                case 'Unhealthy':
                case 'Critical':
                    badgeEl.classList.add('bg-danger');
                    break;
                default:
                    badgeEl.classList.add('bg-secondary');
            }
        }
    });
    
    // Also update the timestamp on both elements
    const timestampElements = [
        document.getElementById('k8s-last-updated'),
        document.getElementById('k8s-last-updated-widget')
    ];
    const now = new Date();
    timestampElements.forEach(tsEl => {
        if (tsEl) {
            tsEl.textContent = now.toLocaleTimeString();
        }
    });
    
    // Update chart
    if (clusterHealthChart) {
        console.log('Updating chart with health score:', healthScore);
        
        // Determine chart color based on health status
        let chartColor = '#198754'; // Default green for Healthy
        if (healthStatus === 'Degraded') {
            chartColor = '#ffc107'; // Warning yellow
        } else if (healthStatus === 'Unhealthy' || healthStatus === 'Critical') {
            chartColor = '#dc3545'; // Danger red
        }
        
        // Update the chart data and colors
        clusterHealthChart.data.datasets[0].data = [healthScore, 100 - healthScore];
        clusterHealthChart.data.datasets[0].backgroundColor[0] = chartColor;
        
        // Add a smooth animation to the chart update
        clusterHealthChart.update({
            duration: 750,
            easing: 'easeOutQuart'
        });
        
        // Update score element colors to match chart
        const scoreElements = [
            document.getElementById('cluster-health-score'),
            document.getElementById('cluster-health-score-widget')
        ];
        
        scoreElements.forEach(scoreEl => {
            if (scoreEl) {
                // Add percentage symbol and set color
                scoreEl.textContent = `${healthScore}%`;
                scoreEl.style.color = chartColor;
                
                // Add shadow to make it pop
                scoreEl.style.textShadow = '0 2px 4px rgba(0,0,0,0.1)';
            }
        });
        
        // Update status element colors and styles
        const statusElements = [
            document.getElementById('cluster-health-status'),
            document.getElementById('cluster-health-status-widget')
        ];
        
        statusElements.forEach(statusEl => {
            if (statusEl) {
                statusEl.style.color = chartColor;
                statusEl.style.fontWeight = 'bold';
            }
        });
    } else {
        console.warn('Chart not initialized or destroyed, attempting to re-initialize');
        // Attempt to re-initialize the chart
        initClusterHealthChart();
        
        // If initialization succeeded, immediately update with current data
        if (clusterHealthChart) {
            // Determine chart color based on health status
            let chartColor = '#198754'; // Default green for Healthy
            if (healthStatus === 'Degraded') {
                chartColor = '#ffc107'; // Warning yellow
            } else if (healthStatus === 'Unhealthy' || healthStatus === 'Critical') {
                chartColor = '#dc3545'; // Danger red
            }
            
            clusterHealthChart.data.datasets[0].data = [healthScore, 100 - healthScore];
            clusterHealthChart.data.datasets[0].backgroundColor[0] = chartColor;
            clusterHealthChart.update();
            
            // Also update score element colors
            const scoreElements = [
                document.getElementById('cluster-health-score'),
                document.getElementById('cluster-health-score-widget')
            ];
            
            scoreElements.forEach(scoreEl => {
                if (scoreEl) {
                    scoreEl.textContent = `${healthScore}%`;
                    scoreEl.style.color = chartColor;
                    
                    // Add subtle pulsing animation
                    if (!scoreEl.style.animation) {
                        scoreEl.style.animation = 'pulse 2s infinite';
                    }
                }
            });
        }
        
        // Fallback - update the text display if chart is still unavailable
        const healthPercentageElement = document.querySelector('.position-relative.me-3 .display-6');
        if (healthPercentageElement) {
            healthPercentageElement.textContent = `${healthScore}%`;
            
            // Add color coding to the percentage text
            if (healthScore >= 90) {
                healthPercentageElement.style.color = '#198754'; // success green
            } else if (healthScore >= 70) {
                healthPercentageElement.style.color = '#ffc107'; // warning yellow
            } else {
                healthPercentageElement.style.color = '#dc3545'; // danger red
            }
        }
    }
    
    // Update nodes information
    if (data.nodes) {
        const nodesReadyEl = document.getElementById('nodes-ready');
        const nodesProgressEl = document.getElementById('nodes-progress');
        
        if (nodesReadyEl) {
            nodesReadyEl.textContent = `${data.nodes.ready_count}/${data.nodes.total_count}`;
        }
        
        if (nodesProgressEl) {
            const readyPercentage = data.nodes.ready_percentage || 0;
            nodesProgressEl.style.width = `${readyPercentage}%`;
            
            // Update progress bar color based on percentage
            nodesProgressEl.className = 'progress-bar';
            if (readyPercentage >= 90) {
                nodesProgressEl.classList.add('bg-success');
            } else if (readyPercentage >= 60) {
                nodesProgressEl.classList.add('bg-warning');
            } else {
                nodesProgressEl.classList.add('bg-danger');
            }
        }
    }
    
    // Update pods information
    if (data.pods) {
        const podsRunningEl = document.getElementById('pods-running');
        const podsProgressEl = document.getElementById('pods-progress');
        
        if (podsRunningEl) {
            podsRunningEl.textContent = `${data.pods.running_count}/${data.pods.total_count}`;
        }
        
        if (podsProgressEl) {
            const runningPercentage = data.pods.running_percentage || 0;
            podsProgressEl.style.width = `${runningPercentage}%`;
            
            // Update progress bar color based on percentage
            podsProgressEl.className = 'progress-bar';
            if (runningPercentage >= 90) {
                podsProgressEl.classList.add('bg-success');
            } else if (runningPercentage >= 60) {
                podsProgressEl.classList.add('bg-warning');
            } else {
                podsProgressEl.classList.add('bg-danger');
            }
        }
    }
    
    // Update deployments information
    if (data.deployments) {
        const deploymentsAvailableEl = document.getElementById('deployments-available');
        const deploymentsProgressEl = document.getElementById('deployments-progress');
        
        if (deploymentsAvailableEl) {
            deploymentsAvailableEl.textContent = `${data.deployments.available_count}/${data.deployments.total_count}`;
        }
        
        if (deploymentsProgressEl) {
            const availablePercentage = data.deployments.available_percentage || 0;
            deploymentsProgressEl.style.width = `${availablePercentage}%`;
            
            // Update progress bar color based on percentage
            deploymentsProgressEl.className = 'progress-bar';
            if (availablePercentage >= 90) {
                deploymentsProgressEl.classList.add('bg-success');
            } else if (availablePercentage >= 60) {
                deploymentsProgressEl.classList.add('bg-warning');
            } else {
                deploymentsProgressEl.classList.add('bg-danger');
            }
        }
    }
    
    // Update events table
    if (data.events) {
        const eventsTableBody = document.getElementById('k8s-events');
        if (eventsTableBody) {
            let eventsHtml = '';
            
            if (data.events.length === 0) {
                eventsHtml = `
                    <tr>
                        <td colspan="4" class="text-center">No recent events found</td>
                    </tr>
                `;
            } else {
                // Only show up to 5 most recent events
                const eventsToShow = data.events.slice(0, 5);
                
                eventsToShow.forEach(event => {
                    const timestamp = new Date(event.last_timestamp || event.first_timestamp || data.timestamp);
                    const typeClass = event.type === 'Warning' ? 'text-warning' : 'text-info';
                    
                    eventsHtml += `
                        <tr>
                            <td>${timestamp.toLocaleTimeString()}</td>
                            <td><span class="${typeClass}">${event.type}</span></td>
                            <td>${event.involved_object.kind}/${event.involved_object.name}</td>
                            <td>${event.message}</td>
                        </tr>
                    `;
                });
            }
            
            eventsTableBody.innerHTML = eventsHtml;
        }
    }
}

// Update the UI with L1 Monitoring specific health data
function updateL1MonitoringUI(data) {
    if (data.error) {
        // Don't show error, already handled in overview
        return;
    }
    
    const statusEl = document.getElementById('l1mon-status');
    const scoreEl = document.getElementById('l1mon-score');
    
    if (data.health) {
        // Update L1 Monitoring health score
        if (scoreEl) {
            scoreEl.textContent = data.health.score;
        }
        
        // Update L1 Monitoring status badge
        if (statusEl) {
            statusEl.textContent = data.health.status;
            
            // Update badge color based on status
            statusEl.className = 'badge';
            switch(data.health.status) {
                case 'Healthy':
                    statusEl.classList.add('bg-success');
                    break;
                case 'Degraded':
                    statusEl.classList.add('bg-warning');
                    break;
                case 'Unhealthy':
                    statusEl.classList.add('bg-danger');
                    break;
                case 'Critical':
                    statusEl.classList.add('bg-danger');
                    break;
                default:
                    statusEl.classList.add('bg-secondary');
            }
        }
    }
}

// Fetch detailed node information
function fetchNodeDetails() {
    // Show loading state
    document.getElementById('k8s-nodes-loading').style.display = 'block';
    document.getElementById('k8s-nodes-content').style.display = 'none';
    
    console.log("Fetching node details...");
    
    fetch('/api/kubernetes/nodes')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            console.log("Node details response received");
            return response.json();
        })
        .then(data => {
            console.log("Node details data:", data);
            updateNodeDetailsUI(data);
        })
        .catch(error => {
            console.error('Error fetching node details:', error);
            showDetailError('nodes', 'Failed to fetch node details. Server may be unavailable.');
        });
}

// Fetch pod details, optionally filtered by namespace
function fetchPodDetails(namespace = '') {
    // Show loading state
    document.getElementById('k8s-pods-loading').style.display = 'block';
    document.getElementById('k8s-pods-content').style.display = 'none';
    
    // Fetch namespaces first to populate the dropdown
    fetch('/api/kubernetes/namespaces')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            updateNamespacesDropdown(data);
            
            // Then fetch pods
            const url = namespace ? 
                `/api/kubernetes/pods?namespace=${encodeURIComponent(namespace)}` : 
                '/api/kubernetes/pods';
                
            return fetch(url);
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            updatePodDetailsUI(data);
        })
        .catch(error => {
            console.error('Error fetching pod details:', error);
            showDetailError('pods', 'Failed to fetch pod details. Server may be unavailable.');
        });
}

// Fetch L1 Monitoring detailed data
function fetchL1MonitoringDetailsData() {
    // Show loading state
    document.getElementById('k8s-l1mon-loading').style.display = 'block';
    document.getElementById('k8s-l1mon-content').style.display = 'none';
    
    fetch('/api/kubernetes/l1monitoring')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            updateL1MonitoringDetailsUI(data);
        })
        .catch(error => {
            console.error('Error fetching L1 Monitoring details:', error);
            showDetailError('l1mon', 'Failed to fetch L1 Monitoring details. Server may be unavailable.');
        });
}

// Update the node details UI
function updateNodeDetailsUI(data) {
    console.log("Updating node details UI with data:", data);
    const tableBody = document.getElementById('k8s-nodes-table');
    if (!tableBody) {
        console.error("Could not find k8s-nodes-table element");
        return;
    }
    
    if (data.error || !data.nodes || data.nodes.length === 0) {
        console.warn("No node data available or error:", data.error);
        showDetailError('nodes', data.error || 'No node data available');
        return;
    }
    
    let nodesHtml = '';
    data.nodes.forEach(node => {
        // Determine status indicator
        let statusBadge = '';
        switch(node.status) {
            case 'Ready':
                statusBadge = '<span class="badge bg-success">Ready</span>';
                break;
            case 'NotReady':
                statusBadge = '<span class="badge bg-danger">Not Ready</span>';
                break;
            default:
                statusBadge = `<span class="badge bg-warning">${node.status}</span>`;
        }
        
        // For each field, use direct access if possible or extract from nested structures if needed
        // Get CPU information with defaults in case fields are missing
        let cpuUsage = 'N/A';
        if (node.usage && node.usage.cpu && node.allocatable && node.allocatable.cpu) {
            cpuUsage = `${node.usage.cpu} / ${node.allocatable.cpu}`;
        } else if (node.cpu) {
            cpuUsage = node.cpu.usage_percentage ? 
                `${node.cpu.usage_percentage}% (${node.cpu.used}/${node.cpu.total})` : 'N/A';
        }
        
        // Get memory information with defaults
        let memUsage = 'N/A';
        if (node.usage && node.usage.memory && node.allocatable && node.allocatable.memory) {
            memUsage = `${node.usage.memory} / ${node.allocatable.memory}`;
        } else if (node.memory) {
            memUsage = node.memory.usage_percentage ? 
                `${node.memory.usage_percentage}% (${formatBytes(node.memory.used)}/${formatBytes(node.memory.total)})` : 
                'N/A';
        }
        
        // Get pod information
        let podInfo = 'N/A';
        if (node.allocatable && node.allocatable.pods) {
            podInfo = node.allocatable.pods;
        } else if (node.pods) {
            podInfo = `${node.pods.running_count}/${node.pods.capacity}`;
        }
        
        nodesHtml += `
            <tr>
                <td>${node.name}</td>
                <td>${statusBadge}</td>
                <td>${cpuUsage}</td>
                <td>${memUsage}</td>
                <td>${podInfo}</td>
                <td>${node.kubernetes_version || 'N/A'}</td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = nodesHtml;
    
    // Hide loading, show content
    document.getElementById('k8s-nodes-loading').style.display = 'none';
    document.getElementById('k8s-nodes-content').style.display = 'block';
}

// Update the pod details UI
function updatePodDetailsUI(data) {
    console.log("Updating pod details UI with data:", data);
    const tableBody = document.getElementById('k8s-pods-table');
    if (!tableBody) {
        console.error("Could not find k8s-pods-table element");
        return;
    }
    
    if (data.error || !data.pods || data.pods.length === 0) {
        console.warn("No pod data available or error:", data.error);
        showDetailError('pods', data.error || 'No pod data available');
        return;
    }
    
    let podsHtml = '';
    data.pods.forEach(pod => {
        // Determine status indicator
        let statusBadge = '';
        switch(pod.status) {
            case 'Running':
                statusBadge = '<span class="badge bg-success">Running</span>';
                break;
            case 'Pending':
                statusBadge = '<span class="badge bg-warning">Pending</span>';
                break;
            case 'Failed':
            case 'Unknown':
                statusBadge = '<span class="badge bg-danger">' + pod.status + '</span>';
                break;
            default:
                statusBadge = `<span class="badge bg-secondary">${pod.status}</span>`;
        }
        
        // Calculate container count
        let containerCount = 0;
        if (pod.containers && Array.isArray(pod.containers)) {
            containerCount = pod.containers.length;
        } else if (pod.container_count !== undefined) {
            containerCount = pod.container_count;
        }
        
        // Get namespace
        const namespace = pod.namespace || 'default';
        
        // Format age
        let age = 'N/A';
        if (pod.age) {
            age = formatAge(pod.age);
        } else if (pod.start_time) {
            // Calculate age from start_time if available
            const startTime = new Date(pod.start_time);
            const now = new Date();
            const ageInSeconds = Math.floor((now - startTime) / 1000);
            age = formatAge(ageInSeconds);
        }
        
        podsHtml += `
            <tr>
                <td>${pod.name}</td>
                <td>${namespace}</td>
                <td>${statusBadge}</td>
                <td>${pod.node || 'N/A'}</td>
                <td>${containerCount}</td>
                <td>${age}</td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = podsHtml;
    
    // Hide loading, show content
    document.getElementById('k8s-pods-loading').style.display = 'none';
    document.getElementById('k8s-pods-content').style.display = 'block';
}

// Update namespaces dropdown
function updateNamespacesDropdown(data) {
    const dropdown = document.getElementById('namespace-selector');
    if (!dropdown) return;
    
    // Always keep the "All Namespaces" option
    let html = '<option value="">All Namespaces</option>';
    
    if (!data.error && data.namespaces && data.namespaces.length > 0) {
        data.namespaces.forEach(ns => {
            html += `<option value="${ns.name}">${ns.name}</option>`;
        });
    }
    
    dropdown.innerHTML = html;
}

// Update the L1 Monitoring details UI
function updateL1MonitoringDetailsUI(data) {
    if (data.error || !data.components) {
        showDetailError('l1mon', data.error || 'No L1 Monitoring data available');
        return;
    }
    
    // Update application status
    const appStatusEl = document.getElementById('l1mon-app-status');
    if (appStatusEl && data.components.application) {
        let appHtml = '';
        data.components.application.forEach(app => {
            const statusClass = getStatusClass(app.status);
            appHtml += `
                <div class="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="mb-0">${app.name}</h6>
                        <small class="text-muted">${app.type}</small>
                    </div>
                    <span class="badge ${statusClass}">${app.status}</span>
                </div>
            `;
        });
        appStatusEl.innerHTML = appHtml || '<div class="list-group-item">No application components found</div>';
    }
    
    // Update database status
    const dbStatusEl = document.getElementById('l1mon-db-status');
    if (dbStatusEl && data.components.database) {
        let dbHtml = '';
        data.components.database.forEach(db => {
            const statusClass = getStatusClass(db.status);
            dbHtml += `
                <div class="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="mb-0">${db.name}</h6>
                        <small class="text-muted">${db.type}</small>
                    </div>
                    <span class="badge ${statusClass}">${db.status}</span>
                </div>
            `;
        });
        dbStatusEl.innerHTML = dbHtml || '<div class="list-group-item">No database components found</div>';
    }
    
    // Update LLM status
    const llmStatusEl = document.getElementById('l1mon-llm-status');
    if (llmStatusEl && data.components.llm) {
        let llmHtml = '';
        data.components.llm.forEach(llm => {
            const statusClass = getStatusClass(llm.status);
            llmHtml += `
                <div class="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="mb-0">${llm.name}</h6>
                        <small class="text-muted">${llm.type}</small>
                    </div>
                    <span class="badge ${statusClass}">${llm.status}</span>
                </div>
            `;
        });
        llmStatusEl.innerHTML = llmHtml || '<div class="list-group-item">No LLM components found</div>';
    }
    
    // Update connectivity status
    const connectivityStatusEl = document.getElementById('l1mon-connectivity-status');
    if (connectivityStatusEl && data.components.connectivity) {
        let connectivityHtml = '';
        data.components.connectivity.forEach(conn => {
            const statusClass = getStatusClass(conn.status);
            connectivityHtml += `
                <div class="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="mb-0">${conn.name}</h6>
                        <small class="text-muted">${conn.type}</small>
                    </div>
                    <span class="badge ${statusClass}">${conn.status}</span>
                </div>
            `;
        });
        connectivityStatusEl.innerHTML = connectivityHtml || '<div class="list-group-item">No connectivity components found</div>';
    }
    
    // Hide loading, show content
    document.getElementById('k8s-l1mon-loading').style.display = 'none';
    document.getElementById('k8s-l1mon-content').style.display = 'block';
}

// Get the appropriate badge class based on status
function getStatusClass(status) {
    switch(status.toLowerCase()) {
        case 'healthy':
        case 'running':
        case 'ready':
            return 'bg-success';
        case 'degraded':
        case 'pending':
            return 'bg-warning';
        case 'unhealthy':
        case 'failed':
        case 'error':
            return 'bg-danger';
        default:
            return 'bg-secondary';
    }
}

// Format bytes to human-readable format
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0 || bytes === undefined || bytes === null) return '0 B';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Format age (duration) to human-readable format
function formatAge(seconds) {
    if (seconds === undefined || seconds === null) return 'N/A';
    
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
        return `${days}d ${hours}h`;
    } else if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else {
        return `${minutes}m`;
    }
}

// Show error in details modal
function showDetailError(detailType, message) {
    switch(detailType) {
        case 'nodes':
            document.getElementById('k8s-nodes-loading').style.display = 'none';
            document.getElementById('k8s-nodes-content').style.display = 'block';
            document.getElementById('k8s-nodes-table').innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-danger">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        ${message}
                    </td>
                </tr>
            `;
            break;
        case 'pods':
            document.getElementById('k8s-pods-loading').style.display = 'none';
            document.getElementById('k8s-pods-content').style.display = 'block';
            document.getElementById('k8s-pods-table').innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-danger">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        ${message}
                    </td>
                </tr>
            `;
            break;
        case 'deployments':
            document.getElementById('k8s-deployments-loading').style.display = 'none';
            document.getElementById('k8s-deployments-content').style.display = 'block';
            document.getElementById('k8s-deployments-content').innerHTML = `
                <div class="alert alert-danger text-center">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    ${message}
                </div>
            `;
            break;
        case 'l1mon':
            document.getElementById('k8s-l1mon-loading').style.display = 'none';
            document.getElementById('k8s-l1mon-content').style.display = 'block';
            const components = ['app', 'db', 'llm', 'connectivity'];
            components.forEach(comp => {
                const el = document.getElementById(`l1mon-${comp}-status`);
                if (el) {
                    el.innerHTML = `
                        <div class="list-group-item text-danger">
                            <i class="fas fa-exclamation-triangle me-2"></i>
                            ${message}
                        </div>
                    `;
                }
            });
            break;
    }
}

// Show error in the Kubernetes monitoring section
function showKubernetesError(message) {
    console.log('Kubernetes monitoring in mock mode due to error:', message);
    
    // Update health indicators to show mock mode
    const scoreEl = document.getElementById('cluster-health-score');
    if (scoreEl) {
        scoreEl.textContent = '85';  // Mock data example
    }
    
    const statusEl = document.getElementById('cluster-health-status');
    if (statusEl) {
        statusEl.textContent = 'Cluster Health (Mock)';
    }
    
    const badgeEl = document.getElementById('cluster-health-badge');
    if (badgeEl) {
        badgeEl.textContent = 'Mock Mode';
        badgeEl.className = 'badge bg-secondary';
    }
    
    // Update chart to show mock data
    if (clusterHealthChart) {
        clusterHealthChart.data.datasets[0].data = [85, 15];  // Mock data example
        clusterHealthChart.data.datasets[0].backgroundColor[0] = '#ffc107'; // Warning yellow
        clusterHealthChart.update();
    }
    
    // Update nodes, pods, deployments with mock data
    const nodesReadyEl = document.getElementById('nodes-ready');
    if (nodesReadyEl) {
        nodesReadyEl.textContent = '3/3';  // Mock data
    }
    
    const nodesProgressEl = document.getElementById('nodes-progress');
    if (nodesProgressEl) {
        nodesProgressEl.style.width = '100%';
        nodesProgressEl.className = 'progress-bar bg-success';
    }
    
    const podsRunningEl = document.getElementById('pods-running');
    if (podsRunningEl) {
        podsRunningEl.textContent = '14/15';  // Mock data
    }
    
    const podsProgressEl = document.getElementById('pods-progress');
    if (podsProgressEl) {
        podsProgressEl.style.width = '93%';
        podsProgressEl.className = 'progress-bar bg-success';
    }
    
    const deploymentsAvailableEl = document.getElementById('deployments-available');
    if (deploymentsAvailableEl) {
        deploymentsAvailableEl.textContent = '5/5';  // Mock data
    }
    
    const deploymentsProgressEl = document.getElementById('deployments-progress');
    if (deploymentsProgressEl) {
        deploymentsProgressEl.style.width = '100%';
        deploymentsProgressEl.className = 'progress-bar bg-success';
    }
    
    // Update L1 Monitoring status
    const l1monScoreEl = document.getElementById('l1mon-score');
    if (l1monScoreEl) {
        l1monScoreEl.textContent = '90';  // Mock data
    }
    
    const l1monStatusEl = document.getElementById('l1mon-status');
    if (l1monStatusEl) {
        l1monStatusEl.textContent = 'Healthy';
        l1monStatusEl.className = 'badge bg-success';
    }
    
    // Show mock notice in events table
    const eventsTableBody = document.getElementById('k8s-events');
    if (eventsTableBody) {
        eventsTableBody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center">
                    <div class="alert alert-warning mb-0 py-2">
                        <small><i class="fas fa-info-circle me-2"></i> Running in mock mode: ${message}</small>
                    </div>
                </td>
            </tr>
            <tr>
                <td>${new Date().toLocaleTimeString()}</td>
                <td><span class="text-info">Normal</span></td>
                <td>Pod/l1-monitoring-5d4f8b9d6c-2xlpn</td>
                <td>Started container l1-monitoring-app</td>
            </tr>
            <tr>
                <td>${new Date(Date.now() - 60000).toLocaleTimeString()}</td>
                <td><span class="text-info">Normal</span></td>
                <td>Pod/l1-monitoring-5d4f8b9d6c-2xlpn</td>
                <td>Container image pulled</td>
            </tr>
            <tr>
                <td>${new Date(Date.now() - 300000).toLocaleTimeString()}</td>
                <td><span class="text-warning">Warning</span></td>
                <td>Pod/l1-monitoring-5d4f8b9d6c-2xlpn</td>
                <td>Readiness probe failed: Connection refused</td>
            </tr>
        `;
    }
    
    console.error('Kubernetes monitoring error:', message);
}