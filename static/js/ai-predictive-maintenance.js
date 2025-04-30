// Make sure to place this before any other code
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the AI Predictive Maintenance components
    initializePredictiveMaintenance();
    
    // Bind event handlers
    bindEventHandlers();
});

/**
 * Helper function to capitalize the first letter of a string
 * @param {string} string - String to capitalize
 * @returns {string} - Capitalized string
 */
function capitalizeFirstLetter(string) {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
}

/**
 * Initialize the AI Predictive Maintenance components
 */
function initializePredictiveMaintenance() {
    console.log('Initializing AI Predictive Maintenance');
    
    // Load Kubernetes overview data
    loadKubernetesOverview();
    
    // Load recommendations
    loadRecommendations();
    
    // Initialize Pod Restart Agent if it exists
    if (document.getElementById('podRestartAgent')) {
        initializePodRestartAgent();
    }
}

/**
 * Bind event handlers for interactive elements
 */
function bindEventHandlers() {
    // Bind filter change handlers for restart history
    const historyFilter = document.getElementById('restartHistoryFilter');
    if (historyFilter) {
        historyFilter.addEventListener('change', function() {
            loadRestartHistory(this.value);
        });
    }
    
    // Bind restart pod button
    const restartButton = document.getElementById('restartPodButton');
    if (restartButton) {
        restartButton.addEventListener('click', function() {
            const podNameInput = document.getElementById('restartPodName');
            const namespaceInput = document.getElementById('restartNamespace');
            
            if (podNameInput && namespaceInput) {
                restartPodManually(podNameInput.value, namespaceInput.value);
            }
        });
    }
    
    // Bind threshold update button
    const updateThresholdButton = document.getElementById('updateThresholdButton');
    if (updateThresholdButton) {
        updateThresholdButton.addEventListener('click', function() {
            const errorThresholdInput = document.getElementById('errorThreshold');
            const warningThresholdInput = document.getElementById('warningThreshold');
            
            if (errorThresholdInput && warningThresholdInput) {
                updateRestartThresholds(
                    parseInt(errorThresholdInput.value, 10),
                    parseInt(warningThresholdInput.value, 10)
                );
            }
        });
    }
    
    // Toggle agent activation
    const agentToggle = document.getElementById('agentActivation');
    if (agentToggle) {
        agentToggle.addEventListener('change', function() {
            toggleAgentActivation(this.checked);
        });
    }
}

/**
 * Load Kubernetes overview data
 */
function loadKubernetesOverview() {
    // Update health gauge
    const healthScore = document.getElementById('healthScore');
    const clusterStatus = document.getElementById('clusterStatus');
    
    if (healthScore) {
        // Set a default health score for now
        healthScore.textContent = '85';
    }
    
    if (clusterStatus) {
        // Set a default status
        clusterStatus.textContent = 'Healthy';
        clusterStatus.className = 'badge bg-success';
    }
    
    // Initialize the Health Trend chart
    initializeHealthTrendChart();
    
    // Fetch Kubernetes overview data
    fetch('/api/kubernetes/overview')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load Kubernetes overview');
            }
            return response.json();
        })
        .then(data => {
            // Update overview metrics
            updateOverviewMetrics(data);
        })
        .catch(error => {
            console.error('Error loading Kubernetes overview:', error);
        });
}

/**
 * Update overview metrics with data from API
 * @param {Object} data - Overview data
 */
function updateOverviewMetrics(data) {
    // Update cluster health score
    const healthScoreElement = document.getElementById('clusterHealthScore');
    if (healthScoreElement) {
        const healthScore = data.health_score || 0;
        healthScoreElement.textContent = healthScore + '%';
        
        // Update color based on health score
        if (healthScore < 60) {
            healthScoreElement.className = 'display-4 text-danger';
        } else if (healthScore < 80) {
            healthScoreElement.className = 'display-4 text-warning';
        } else {
            healthScoreElement.className = 'display-4 text-success';
        }
    }
    
    // Update node count
    const nodeCountElement = document.getElementById('nodeCount');
    if (nodeCountElement) {
        nodeCountElement.textContent = data.node_count || 0;
    }
    
    // Update pod count
    const podCountElement = document.getElementById('podCount');
    if (podCountElement) {
        podCountElement.textContent = data.pod_count || 0;
    }
    
    // Update deployment count
    const deploymentCountElement = document.getElementById('deploymentCount');
    if (deploymentCountElement) {
        deploymentCountElement.textContent = data.deployment_count || 0;
    }
    
    // Update namespace count
    const namespaceCountElement = document.getElementById('namespaceCount');
    if (namespaceCountElement) {
        namespaceCountElement.textContent = data.namespace_count || 0;
    }
    
    // Update event count
    const eventCountElement = document.getElementById('eventCount');
    if (eventCountElement) {
        eventCountElement.textContent = data.recent_events_count || 0;
    }
    
    // Update resource usage
    updateResourceUsage(data.resource_usage || {});
    
    // Update node status
    updateNodeStatus(data.nodes || []);
    
    // Update L1 monitoring components
    updateL1Components(data.l1monitoring_components || []);
}

/**
 * Update resource usage display
 * @param {Object} resourceData - Resource usage data
 */
function updateResourceUsage(resourceData) {
    // Update CPU usage
    const cpuUsageElement = document.getElementById('cpuUsage');
    if (cpuUsageElement) {
        const cpuPercentage = resourceData.cpu_percentage || 0;
        cpuUsageElement.textContent = cpuPercentage + '%';
        
        // Update CPU progress bar
        const cpuProgressElement = document.getElementById('cpuProgress');
        if (cpuProgressElement) {
            cpuProgressElement.style.width = cpuPercentage + '%';
            
            // Update color based on usage
            if (cpuPercentage > 90) {
                cpuProgressElement.className = 'progress-bar bg-danger';
            } else if (cpuPercentage > 70) {
                cpuProgressElement.className = 'progress-bar bg-warning';
            } else {
                cpuProgressElement.className = 'progress-bar bg-success';
            }
        }
    }
    
    // Update memory usage
    const memoryUsageElement = document.getElementById('memoryUsage');
    if (memoryUsageElement) {
        const memoryPercentage = resourceData.memory_percentage || 0;
        memoryUsageElement.textContent = memoryPercentage + '%';
        
        // Update memory progress bar
        const memoryProgressElement = document.getElementById('memoryProgress');
        if (memoryProgressElement) {
            memoryProgressElement.style.width = memoryPercentage + '%';
            
            // Update color based on usage
            if (memoryPercentage > 90) {
                memoryProgressElement.className = 'progress-bar bg-danger';
            } else if (memoryPercentage > 70) {
                memoryProgressElement.className = 'progress-bar bg-warning';
            } else {
                memoryProgressElement.className = 'progress-bar bg-success';
            }
        }
    }
    
    // Update disk usage
    const diskUsageElement = document.getElementById('diskUsage');
    if (diskUsageElement) {
        const diskPercentage = resourceData.disk_percentage || 0;
        diskUsageElement.textContent = diskPercentage + '%';
        
        // Update disk progress bar
        const diskProgressElement = document.getElementById('diskProgress');
        if (diskProgressElement) {
            diskProgressElement.style.width = diskPercentage + '%';
            
            // Update color based on usage
            if (diskPercentage > 90) {
                diskProgressElement.className = 'progress-bar bg-danger';
            } else if (diskPercentage > 70) {
                diskProgressElement.className = 'progress-bar bg-warning';
            } else {
                diskProgressElement.className = 'progress-bar bg-success';
            }
        }
    }
    
    // Update network usage
    const networkUsageElement = document.getElementById('networkUsage');
    if (networkUsageElement) {
        const networkMbps = resourceData.network_mbps || 0;
        networkUsageElement.textContent = networkMbps + ' Mbps';
    }
}

/**
 * Update node status display
 * @param {Array} nodes - Node data
 */
function updateNodeStatus(nodes) {
    // This section is currently not needed as the nodeStatus container doesn't exist
    // Skip this function to avoid console errors
    return;
}

/**
 * Update L1 monitoring components status
 * @param {Array} components - L1 monitoring components data
 */
function updateL1Components(components) {
    // This section is currently not needed as the l1Components container doesn't exist
    // Skip this function to avoid console errors
    return;
}

/**
 * Initialize the Health Trend chart
 */
function initializeHealthTrendChart() {
    const ctx = document.getElementById('clusterHealthChart');
    
    if (!ctx) {
        console.error('Health Trend chart element not found');
        return;
    }
    
    // Sample data for health trend
    const labels = [];
    const data = [];
    
    // Generate 24 hours of sample data
    const now = new Date();
    for (let i = 23; i >= 0; i--) {
        const hour = new Date(now);
        hour.setHours(now.getHours() - i);
        labels.push(hour.getHours() + ':00');
        
        // Generate a random value between 75 and 100 with some variation
        // but trending slightly downward for visual interest
        const baseValue = 90 - (i * 0.3);
        const randomVariation = Math.random() * 10 - 5; // -5 to +5
        data.push(Math.max(70, Math.min(100, baseValue + randomVariation)));
    }
    
    // Create the chart
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Health Score',
                data: data,
                borderColor: 'rgba(23, 162, 184, 1)',
                backgroundColor: 'rgba(23, 162, 184, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)',
                        maxRotation: 0,
                        autoSkip: true,
                        maxTicksLimit: 8
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)',
                        min: 60,
                        max: 100
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    callbacks: {
                        label: function(context) {
                            return 'Health: ' + context.raw.toFixed(1) + '%';
                        }
                    }
                }
            }
        }
    });
}

/**
 * Load AI recommendations for predictive maintenance
 */
function loadRecommendations() {
    // Create mock data for demonstration purposes
    const mockData = {
        recommendations: [
            {
                title: "Upgrade etcd version",
                description: "The current etcd version is outdated and has known security vulnerabilities.",
                priority: "high",
                affected_components: ["etcd", "Control Plane"],
                action_steps: [
                    "Take a backup of the etcd data",
                    "Upgrade etcd to the latest patch version",
                    "Verify cluster health after upgrade"
                ],
                expected_benefits: "Improved security and stability of the control plane"
            },
            {
                title: "Optimize resource allocation",
                description: "Several pods have resource requests that are significantly higher than their actual usage.",
                priority: "medium",
                affected_components: ["monitoring", "logging"],
                action_steps: [
                    "Review resource utilization metrics",
                    "Adjust resource requests and limits to match actual usage",
                    "Apply the changes using a rolling update"
                ],
                expected_benefits: "Better resource utilization and cost savings"
            }
        ],
        resource_forecasting: {
            cpu_forecast: {
                data_points: [
                    { label: "Jan", actual: 45, predicted: null },
                    { label: "Feb", actual: 52, predicted: null },
                    { label: "Mar", actual: 48, predicted: null },
                    { label: "Apr", actual: 58, predicted: null },
                    { label: "May", actual: 62, predicted: null },
                    { label: "Jun", actual: 70, predicted: null },
                    { label: "Jul", actual: 68, predicted: 68 },
                    { label: "Aug", actual: null, predicted: 75 },
                    { label: "Sep", actual: null, predicted: 82 },
                    { label: "Oct", actual: null, predicted: 88 },
                    { label: "Nov", actual: null, predicted: 92 },
                    { label: "Dec", actual: null, predicted: 96 }
                ],
                threshold: 85,
                status: "warning",
                prediction: "CPU utilization is projected to exceed the threshold within 3 months",
                recommendation: "Consider scaling out the cluster or optimizing resource-intensive workloads",
                timeframe: "12 months"
            },
            memory_forecast: {
                data_points: [
                    { label: "Jan", actual: 40, predicted: null },
                    { label: "Feb", actual: 42, predicted: null },
                    { label: "Mar", actual: 45, predicted: null },
                    { label: "Apr", actual: 50, predicted: null },
                    { label: "May", actual: 48, predicted: null },
                    { label: "Jun", actual: 52, predicted: null },
                    { label: "Jul", actual: 55, predicted: 55 },
                    { label: "Aug", actual: null, predicted: 58 },
                    { label: "Sep", actual: null, predicted: 62 },
                    { label: "Oct", actual: null, predicted: 65 },
                    { label: "Nov", actual: null, predicted: 70 },
                    { label: "Dec", actual: null, predicted: 72 }
                ],
                threshold: 80,
                status: "healthy",
                prediction: "Memory utilization is expected to stay within acceptable limits",
                recommendation: "No immediate action required, continue monitoring",
                timeframe: "12 months"
            },
            insights: [
                "CPU utilization is increasing faster than memory utilization",
                "Resource usage pattern suggests potential optimization opportunities in logging components",
                "Consider implementing horizontal pod autoscaling for workloads with variable demand"
            ]
        },
        lifecycle_predictions: [
            {
                component: "Kubernetes Control Plane",
                status: "warning",
                urgency: "medium",
                lifecycle_start: "2022-10-10",
                end_of_life: "2023-10-10",
                recommendation: "Plan upgrade to newer Kubernetes version within 3 months",
                next_steps: "Begin compatibility testing with applications"
            },
            {
                component: "Monitoring Stack",
                status: "stable",
                urgency: "low",
                lifecycle_start: "2023-01-05",
                end_of_life: "2024-06-15",
                recommendation: "No immediate action required, well within support lifecycle"
            },
            {
                component: "Database Cluster",
                status: "critical",
                urgency: "high",
                lifecycle_start: "2021-05-20",
                end_of_life: "2022-12-31",
                recommendation: "Urgent upgrade required - component has reached end of life",
                next_steps: "Schedule maintenance window, prepare migration plan"
            }
        ],
        risk_details: [
            {
                component: "etcd",
                severity: "high",
                description: "The current etcd version has critical security vulnerabilities that could be exploited"
            },
            {
                component: "API Server",
                severity: "medium",
                description: "API Server configuration has suboptimal security settings"
            },
            {
                component: "Database Cluster",
                severity: "high",
                description: "Database cluster is running an end-of-life version with no security updates"
            }
        ],
        maintenance_required: [
            "etcd", "Database Cluster"
        ],
        at_risk_components: [
            "API Server", "Ingress Controller"
        ]
    };
    
    // Update sections with mock data
    updateAIRecommendations(mockData);
    updateResourceForecasting(mockData);
    updateLifecyclePrediction(mockData);
    updateRiskAssessment(mockData);
    
    // Hide loaders, show content
    const recommendationsLoader = document.getElementById('recommendationsLoader');
    const recommendationsContent = document.getElementById('recommendationsContent');
    const forecastingLoader = document.getElementById('forecastingLoader');
    const lifecycleLoader = document.getElementById('lifecycleLoader');
    const riskLoader = document.getElementById('riskLoader');
    
    // Hide all loaders
    if (recommendationsLoader) recommendationsLoader.classList.add('d-none');
    if (forecastingLoader) forecastingLoader.classList.add('d-none');
    if (lifecycleLoader) lifecycleLoader.classList.add('d-none');
    if (riskLoader) riskLoader.classList.add('d-none');
    
    // Show content
    if (recommendationsContent) {
        recommendationsContent.classList.remove('d-none');
    }
    
    // Show risk content
    const riskContent = document.getElementById('riskContent');
    if (riskContent) {
        riskContent.classList.remove('d-none');
    }
}

/**
 * Update AI recommendations with data from API
 * @param {Object} data - Recommendations data
 */
function updateAIRecommendations(data) {
    const priorityContainer = document.getElementById('priorityRecommendations');
    const optimizationContainer = document.getElementById('optimizationRecommendations');
    const recommendationsContent = document.getElementById('recommendationsContent');
    const recommendationsLoader = document.getElementById('recommendationsLoader');
    
    if (!priorityContainer || !optimizationContainer) {
        console.error('Recommendations containers not found');
        return;
    }
    
    // Hide loader, show content
    if (recommendationsLoader) {
        recommendationsLoader.classList.add('d-none');
    }
    if (recommendationsContent) {
        recommendationsContent.classList.remove('d-none');
    }
    
    // Clear existing content
    priorityContainer.innerHTML = '';
    optimizationContainer.innerHTML = '';
    
    // Get recommendations list
    const recommendations = data.recommendations || [];
    
    if (recommendations.length === 0) {
        // No recommendations available
        priorityContainer.innerHTML = `
            <li class="list-group-item bg-dark text-white border-secondary">
                <div class="alert alert-info mb-0">
                    <i class="fas fa-info-circle me-2"></i>
                    No maintenance recommendations are currently available. This is typically a good sign indicating that your Kubernetes infrastructure is in optimal condition.
                </div>
            </li>
        `;
        return;
    }
    
    // Add each recommendation
    recommendations.forEach((recommendation, index) => {
        // Create recommendation card
        const card = document.createElement('div');
        card.className = 'card bg-dark text-white mb-3 border-secondary';
        
        // Determine priority class for the card border
        let priorityClass = 'border-info';
        let priorityBadgeClass = 'bg-info';
        
        if (recommendation.priority === 'high') {
            priorityClass = 'border-danger';
            priorityBadgeClass = 'bg-danger';
        } else if (recommendation.priority === 'medium') {
            priorityClass = 'border-warning';
            priorityBadgeClass = 'bg-warning';
        } else if (recommendation.priority === 'low') {
            priorityClass = 'border-success';
            priorityBadgeClass = 'bg-success';
        }
        
        // Add priority border class
        card.classList.add(priorityClass);
        
        // Create card header
        const cardHeader = document.createElement('div');
        cardHeader.className = 'card-header d-flex justify-content-between align-items-center';
        cardHeader.innerHTML = `
            <h5 class="mb-0">${recommendation.title || `Recommendation #${index + 1}`}</h5>
            <span class="badge ${priorityBadgeClass}">${capitalizeFirstLetter(recommendation.priority || 'medium')} Priority</span>
        `;
        
        // Create card body
        const cardBody = document.createElement('div');
        cardBody.className = 'card-body';
        
        // Add recommendation description
        const description = document.createElement('p');
        description.className = 'card-text';
        description.textContent = recommendation.description || 'No description available.';
        cardBody.appendChild(description);
        
        // Add affected components if available
        if (recommendation.affected_components && recommendation.affected_components.length > 0) {
            const componentsHeading = document.createElement('h6');
            componentsHeading.className = 'mt-3 mb-2';
            componentsHeading.textContent = 'Affected Components:';
            cardBody.appendChild(componentsHeading);
            
            const componentsList = document.createElement('ul');
            componentsList.className = 'list-group list-group-flush bg-dark border-secondary mb-3';
            
            recommendation.affected_components.forEach(component => {
                const componentItem = document.createElement('li');
                componentItem.className = 'list-group-item bg-dark text-white border-secondary';
                componentItem.textContent = component;
                componentsList.appendChild(componentItem);
            });
            
            cardBody.appendChild(componentsList);
        }
        
        // Add action steps if available
        if (recommendation.action_steps && recommendation.action_steps.length > 0) {
            const actionsHeading = document.createElement('h6');
            actionsHeading.className = 'mt-3 mb-2';
            actionsHeading.textContent = 'Recommended Actions:';
            cardBody.appendChild(actionsHeading);
            
            const actionsList = document.createElement('ol');
            actionsList.className = 'ps-3';
            
            recommendation.action_steps.forEach(step => {
                const actionItem = document.createElement('li');
                actionItem.className = 'mb-2';
                actionItem.textContent = step;
                actionsList.appendChild(actionItem);
            });
            
            cardBody.appendChild(actionsList);
        }
        
        // Add expected benefits if available
        if (recommendation.expected_benefits) {
            const benefitsHeading = document.createElement('h6');
            benefitsHeading.className = 'mt-3 mb-2';
            benefitsHeading.textContent = 'Expected Benefits:';
            cardBody.appendChild(benefitsHeading);
            
            const benefits = document.createElement('p');
            benefits.className = 'card-text';
            benefits.textContent = recommendation.expected_benefits;
            cardBody.appendChild(benefits);
        }
        
        // Add card parts to card
        card.appendChild(cardHeader);
        card.appendChild(cardBody);
        
        // Create a list item to contain the card
        const listItem = document.createElement('li');
        listItem.className = 'list-group-item bg-dark text-white border-secondary p-0';
        listItem.appendChild(card);
        
        // Determine which container to add to based on priority
        if (recommendation.priority === 'high') {
            priorityContainer.appendChild(listItem);
        } else {
            optimizationContainer.appendChild(listItem);
        }
    });
}

/**
 * Update the resource forecasting section
 * @param {Object} data - AI recommendations data
 */
function updateResourceForecasting(data) {
    console.log('Updating resource forecasting:', data);
    
    const container = document.getElementById('resourceForecasting');
    const loader = document.getElementById('forecastingLoader');
    
    if (!container) {
        console.error('Resource forecasting container not found');
        return;
    }
    
    // Hide loader if it exists
    if (loader) {
        loader.classList.add('d-none');
    }
    
    // Clear existing content
    container.innerHTML = '';
    
    // Get forecasting data
    const forecasting = data.resource_forecasting || {};
    
    if (!forecasting.cpu_forecast && !forecasting.memory_forecast && !forecasting.disk_forecast) {
        // No forecasting data available
        container.innerHTML = `
            <div class="alert alert-info">
                <i class="fas fa-info-circle me-2"></i>
                No resource forecasting data is currently available. This section will update when forecast data is generated.
            </div>
        `;
        return;
    }
    
    // Create forecasting container
    const forecastingContainer = document.createElement('div');
    forecastingContainer.className = 'row';
    
    // Create CPU forecast card
    if (forecasting.cpu_forecast) {
        const cpuCard = createForecastCard('CPU Utilization', forecasting.cpu_forecast);
        forecastingContainer.appendChild(cpuCard);
    }
    
    // Create memory forecast card
    if (forecasting.memory_forecast) {
        const memoryCard = createForecastCard('Memory Utilization', forecasting.memory_forecast);
        forecastingContainer.appendChild(memoryCard);
    }
    
    // Create disk forecast card
    if (forecasting.disk_forecast) {
        const diskCard = createForecastCard('Disk Utilization', forecasting.disk_forecast);
        forecastingContainer.appendChild(diskCard);
    }
    
    // Add summary and insights
    if (forecasting.insights && forecasting.insights.length > 0) {
        const insightsContainer = document.createElement('div');
        insightsContainer.className = 'col-12 mt-4';
        
        const insightsCard = document.createElement('div');
        insightsCard.className = 'card bg-dark text-white border-secondary';
        
        const insightsCardHeader = document.createElement('div');
        insightsCardHeader.className = 'card-header';
        insightsCardHeader.innerHTML = '<h5 class="mb-0">Resource Insights</h5>';
        
        const insightsCardBody = document.createElement('div');
        insightsCardBody.className = 'card-body';
        
        const insightsList = document.createElement('ul');
        insightsList.className = 'list-group list-group-flush border-secondary';
        
        forecasting.insights.forEach(insight => {
            const insightItem = document.createElement('li');
            insightItem.className = 'list-group-item bg-dark text-white border-secondary';
            insightItem.textContent = insight;
            insightsList.appendChild(insightItem);
        });
        
        insightsCardBody.appendChild(insightsList);
        insightsCard.appendChild(insightsCardHeader);
        insightsCard.appendChild(insightsCardBody);
        insightsContainer.appendChild(insightsCard);
        
        forecastingContainer.appendChild(insightsContainer);
    }
    
    // Add forecasting container to main container
    container.appendChild(forecastingContainer);
}

/**
 * Create a forecast card for a specific resource
 * @param {string} title - Resource title
 * @param {Object} forecastData - Forecast data for the resource
 * @returns {HTMLElement} - Forecast card element
 */
function createForecastCard(title, forecastData) {
    const cardContainer = document.createElement('div');
    cardContainer.className = 'col-md-4 mb-4';
    
    const card = document.createElement('div');
    card.className = 'card h-100 bg-dark text-white border-secondary';
    
    const cardHeader = document.createElement('div');
    cardHeader.className = 'card-header';
    cardHeader.innerHTML = `<h5 class="mb-0">${title} Forecast</h5>`;
    
    const cardBody = document.createElement('div');
    cardBody.className = 'card-body';
    
    // Create visualization container (instead of a canvas)
    const visualContainer = document.createElement('div');
    visualContainer.className = 'visualization-container';
    const containerId = 'forecast-' + title.toLowerCase().replace(/\s+/g, '-');
    visualContainer.id = containerId;
    visualContainer.style.minHeight = '200px';
    
    // Add a placeholder message while loading
    visualContainer.innerHTML = `
        <div class="d-flex justify-content-center align-items-center h-100">
            <div class="spinner-border text-secondary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>
    `;
    
    cardBody.appendChild(visualContainer);
    
    // Build card
    card.appendChild(cardHeader);
    card.appendChild(cardBody);
    cardContainer.appendChild(card);
    
    // Initialize visualization after adding to DOM
    setTimeout(() => {
        initializeChart(containerId, forecastData);
    }, 100);
    
    return cardContainer;
}

/**
 * Initialize a chart for resource forecasting
 * @param {string} canvasId - Canvas ID for the chart
 * @param {Object} forecastData - Forecast data for the chart
 */
function initializeChart(canvasId, forecastData) {
    try {
        // Prepare chart data
        const labels = forecastData.data_points.map(point => point.label || '');
        const actual = forecastData.data_points.map(point => point.actual !== undefined ? point.actual : null);
        const predicted = forecastData.data_points.map(point => point.predicted !== undefined ? point.predicted : null);
        const threshold = forecastData.threshold || 80;
        
        // Get forecast info
        const prediction = forecastData.prediction || '';
        const recommendation = forecastData.recommendation || '';
        const status = forecastData.status || 'normal';
        
        // Get canvas and replace with HTML content (simpler than trying to debug Chart.js)
        const canvasParent = document.getElementById(canvasId)?.parentElement;
        if (!canvasParent) {
            console.error(`Parent for canvas ${canvasId} not found`);
            return;
        }
        
        // Remove canvas
        canvasParent.innerHTML = '';
        
        // Determine status color
        let statusColor = '#0dcaf0'; // info/blue
        if (status === 'critical') {
            statusColor = '#dc3545'; // danger/red
        } else if (status === 'warning') {
            statusColor = '#ffc107'; // warning/yellow
        } else if (status === 'healthy' || status === 'normal') {
            statusColor = '#198754'; // success/green
        }
        
        // Create simple visualization
        const chartContainer = document.createElement('div');
        chartContainer.className = 'p-3 bg-dark border border-secondary rounded';
        
        // Build HTML for visualization
        const chartHtml = `
            <div class="d-flex justify-content-between mb-3">
                <div class="text-muted">Current:</div>
                <div class="fw-bold">${actual[actual.length-1] || '--'}%</div>
            </div>
            <div class="d-flex justify-content-between mb-3">
                <div class="text-muted">Forecast (3mo):</div>
                <div class="fw-bold" style="color: ${statusColor}">${predicted[predicted.length-1] || '--'}%</div>
            </div>
            <div class="d-flex justify-content-between mb-3">
                <div class="text-muted">Threshold:</div>
                <div class="text-danger">${threshold}%</div>
            </div>
            <div class="progress bg-dark mb-4" style="height: 10px;">
                <div class="progress-bar" style="width: ${actual[actual.length-1] || 0}%; background-color: #0d6efd;"></div>
            </div>
            <div class="progress bg-dark mb-4" style="height: 10px;">
                <div class="progress-bar" style="width: ${predicted[predicted.length-1] || 0}%; background-color: ${statusColor};"></div>
            </div>
            <div class="mt-3">
                <h6>Prediction:</h6>
                <p style="color: ${statusColor}">${prediction}</p>
            </div>
            <div class="mt-3">
                <h6>Recommendation:</h6>
                <p>${recommendation}</p>
            </div>
        `;
        
        // Set chart HTML
        chartContainer.innerHTML = chartHtml;
        
        // Add to parent
        canvasParent.appendChild(chartContainer);
    } catch (error) {
        console.error('Error creating forecast visualization:', error);
        
        // Get canvas parent and replace with error message
        const canvasParent = document.getElementById(canvasId)?.parentElement;
        if (canvasParent) {
            canvasParent.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-circle me-2"></i>
                    Failed to display forecast data
                </div>
            `;
        }
    }
}

/**
 * Update the lifecycle prediction section - delegates to external function
 * @param {Object} data - AI recommendations data
 */
/**
 * Update the lifecycle prediction section - delegates to external function
 * @param {Object} data - AI recommendations data
 */
function updateLifecyclePrediction(data) {
    // Use the implementation from lifecycle_resource_functions.js if available
    if (typeof window.updateLifecyclePrediction === 'function') {
        window.updateLifecyclePrediction(data);
    } else {
        console.error('External updateLifecyclePrediction function not found, falling back to local implementation');
        
        // Get the lifecycle predictions container
        const container = document.getElementById('lifecyclePrediction');
        if (!container) {
            console.error('Lifecycle prediction container not found');
            return;
        }
        
        // Clear existing content including the spinner
        container.innerHTML = '';
        
        // Get lifecycle predictions from the recommendations
        const predictions = data.lifecycle_predictions || [];
        
        if (predictions.length === 0) {
            // No prediction data available, show a message
            const noDataDiv = document.createElement('div');
            noDataDiv.className = 'alert alert-info';
            noDataDiv.innerHTML = `
                <i class="fas fa-info-circle me-2"></i>
                No lifecycle prediction data is currently available. This section will update when prediction data is generated.
            `;
            container.appendChild(noDataDiv);
            return;
        }
        
        // Add message about the fallback
        const fallbackMessage = document.createElement('div');
        fallbackMessage.className = 'alert alert-warning mb-3';
        fallbackMessage.innerHTML = `
            <i class="fas fa-exclamation-triangle me-2"></i>
            Using fallback implementation for lifecycle predictions. Please include lifecycle_resource_functions.js for full functionality.
        `;
        container.appendChild(fallbackMessage);
        
        // Create a simple list of predictions instead of timeline
        const list = document.createElement('div');
        list.className = 'list-group';
        
        // Add each prediction as a list item
        predictions.forEach(prediction => {
            const item = document.createElement('div');
            item.className = 'list-group-item';
            
            // Determine status class
            let statusClass = 'bg-warning';
            if (prediction.status === 'critical' || prediction.status === 'end_of_life') {
                statusClass = 'bg-danger';
            } else if (prediction.status === 'stable' || prediction.status === 'optimal') {
                statusClass = 'bg-success';
            }
            
            // Add prediction content
            item.innerHTML = `
                <div class="d-flex w-100 justify-content-between">
                    <h5 class="mb-1">${prediction.component || prediction.name}</h5>
                    <span class="badge ${statusClass}">${capitalizeFirstLetter(prediction.status)}</span>
                </div>
                <p class="mb-1">${prediction.recommendation || 'No recommendation available'}</p>
                ${prediction.next_steps ? `<small>${prediction.next_steps}</small>` : ''}
            `;
            
            list.appendChild(item);
        });
        
        container.appendChild(list);
    }
}

/**
 * Update the risk assessment section
 * @param {Object} data - AI recommendations data
 */
function updateRiskAssessment(data) {
    console.log('Updating risk assessment:', data);
    
    const riskLoader = document.getElementById('riskLoader');
    const riskContent = document.getElementById('riskContent');
    
    if (!riskLoader || !riskContent) {
        console.error('Risk assessment containers not found');
        return;
    }
    
    // Hide loader, show content
    riskLoader.classList.add('d-none');
    riskContent.classList.remove('d-none');
    
    // Calculate current risk level
    let riskLevel = 'Low';
    let riskClass = 'bg-success';
    let impactLevel = 'Minimal';
    let impactClass = 'bg-success';
    
    // Count affected components
    const affectedComponents = (data.maintenance_required || []).length + (data.at_risk_components || []).length;
    
    // Update affected components count
    const affectedComponentsElem = document.getElementById('affectedComponents');
    if (affectedComponentsElem) {
        affectedComponentsElem.textContent = affectedComponents;
    }
    
    // Determine risk level based on affected components and their health scores
    if (affectedComponents > 0) {
        // Check for critical components (maintenance required)
        if ((data.maintenance_required || []).length > 0) {
            riskLevel = 'High';
            riskClass = 'bg-danger';
            impactLevel = 'Significant';
            impactClass = 'bg-danger';
        } else if ((data.at_risk_components || []).length > 0) {
            riskLevel = 'Medium';
            riskClass = 'bg-warning';
            impactLevel = 'Moderate';
            impactClass = 'bg-warning';
        }
    }
    
    // Update risk level badge
    const riskLevelElem = document.getElementById('currentRiskLevel');
    if (riskLevelElem) {
        riskLevelElem.textContent = riskLevel;
        riskLevelElem.className = `fs-5 badge ${riskClass}`;
    }
    
    // Update potential impact badge
    const impactElem = document.getElementById('potentialImpact');
    if (impactElem) {
        impactElem.textContent = impactLevel;
        impactElem.className = `fs-5 badge ${impactClass}`;
    }
    
    // Check if we have risk details and the container exists
    const riskDetailsContainer = document.getElementById('riskDetails');
    if (riskDetailsContainer && data.risk_details) {
        // Clear existing content
        riskDetailsContainer.innerHTML = '';
        
        // Create list of risk details
        const list = document.createElement('ul');
        list.className = 'list-group list-group-flush border-top border-secondary mt-3';
        
        // Add each risk detail as a list item
        data.risk_details.forEach(detail => {
            const item = document.createElement('li');
            item.className = 'list-group-item bg-dark text-white border-secondary';
            
            // Create severity badge
            let severityClass = 'bg-info';
            if (detail.severity === 'high') {
                severityClass = 'bg-danger';
            } else if (detail.severity === 'medium') {
                severityClass = 'bg-warning';
            } else if (detail.severity === 'low') {
                severityClass = 'bg-success';
            }
            
            const severityBadge = document.createElement('span');
            severityBadge.className = `badge ${severityClass} me-2`;
            severityBadge.textContent = capitalizeFirstLetter(detail.severity);
            
            // Create item content with badge and description
            item.innerHTML = `
                <div class="d-flex align-items-start">
                    <span class="badge ${severityClass} me-2">${capitalizeFirstLetter(detail.severity)}</span>
                    <div>
                        <div class="fw-bold">${detail.component || 'System Component'}</div>
                        <div>${detail.description}</div>
                    </div>
                </div>
            `;
            
            // Add item to list
            list.appendChild(item);
        });
        
        // Add list to container
        riskDetailsContainer.appendChild(list);
    }
}

/* Pod Restart Agent Functions */

/**
 * Initialize the Pod Restart Agent
 */
function initializePodRestartAgent() {
    console.log('Initializing Pod Restart Agent UI');
    
    // Load agent status
    loadAgentStatus();
    
    // Load restart history
    loadRestartHistory('all');
    
    // Load namespaces for dropdown
    loadNamespaces();
}

/**
 * Load the current status of the Pod Restart Agent
 */
function loadAgentStatus() {
    const statusContainer = document.getElementById('agentStatus');
    const loader = document.getElementById('agentStatusLoader');
    
    if (!statusContainer || !loader) {
        console.error('Agent status containers not found');
        return;
    }
    
    // Show loader, hide content
    loader.classList.remove('d-none');
    statusContainer.classList.add('d-none');
    
    // Fetch agent status
    fetch('/api/pod-restart/status')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load agent status');
            }
            return response.json();
        })
        .then(data => {
            // Update agent status
            updateAgentStatus(data);
            
            // Hide loader, show content
            loader.classList.add('d-none');
            statusContainer.classList.remove('d-none');
        })
        .catch(error => {
            console.error('Error loading agent status:', error);
            
            // Show error message
            loader.classList.add('d-none');
            statusContainer.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-circle me-2"></i>
                    Failed to load agent status. Please try again later.
                </div>
            `;
            statusContainer.classList.remove('d-none');
        });
}

/**
 * Update agent status with data from API
 * @param {Object} data - Agent status data
 */
function updateAgentStatus(data) {
    const statusContainer = document.getElementById('agentStatus');
    if (!statusContainer) {
        console.error('Agent status container not found');
        return;
    }
    
    // Clear existing content
    statusContainer.innerHTML = '';
    
    // Create status card
    const card = document.createElement('div');
    card.className = 'card bg-dark text-white border-secondary mb-4';
    
    // Create card header
    const cardHeader = document.createElement('div');
    cardHeader.className = 'card-header d-flex justify-content-between align-items-center';
    
    // Determine status badge class
    let statusBadgeClass = 'bg-success';
    let statusText = 'Active';
    
    if (!data.is_active) {
        statusBadgeClass = 'bg-secondary';
        statusText = 'Inactive';
    }
    
    cardHeader.innerHTML = `
        <h5 class="mb-0">Agent Status</h5>
        <span class="badge ${statusBadgeClass}">${statusText}</span>
    `;
    
    // Create card body
    const cardBody = document.createElement('div');
    cardBody.className = 'card-body';
    
    // Add agent status information
    cardBody.innerHTML = `
        <div class="row mb-3">
            <div class="col-md-6">
                <div class="form-check form-switch">
                    <input class="form-check-input" type="checkbox" id="agentActivation" ${data.is_active ? 'checked' : ''}>
                    <label class="form-check-label" for="agentActivation">
                        ${data.is_active ? 'Agent is enabled' : 'Agent is disabled'}
                    </label>
                </div>
            </div>
            <div class="col-md-6 text-md-end">
                <small class="text-muted">Last updated: ${new Date(data.last_updated || Date.now()).toLocaleString()}</small>
            </div>
        </div>
        
        <div class="row mb-4">
            <div class="col-md-6">
                <div class="mb-3">
                    <label for="errorThreshold" class="form-label">Error Threshold:</label>
                    <input type="number" class="form-control bg-dark text-white border-secondary" id="errorThreshold" 
                           value="${data.error_threshold || 5}" min="1" max="100">
                    <small class="form-text text-muted">Number of errors before triggering restart</small>
                </div>
            </div>
            <div class="col-md-6">
                <div class="mb-3">
                    <label for="warningThreshold" class="form-label">Warning Threshold:</label>
                    <input type="number" class="form-control bg-dark text-white border-secondary" id="warningThreshold" 
                           value="${data.warning_threshold || 3}" min="1" max="100">
                    <small class="form-text text-muted">Number of warnings before notification</small>
                </div>
            </div>
        </div>
        
        <div class="d-grid gap-2 d-md-flex justify-content-md-end">
            <button class="btn btn-primary" id="updateThresholdButton">
                <i class="fas fa-save me-2"></i>Update Settings
            </button>
        </div>
    `;
    
    // Add card parts to card
    card.appendChild(cardHeader);
    card.appendChild(cardBody);
    
    // Add card to container
    statusContainer.appendChild(card);
    
    // Add event listeners
    const agentToggle = document.getElementById('agentActivation');
    if (agentToggle) {
        agentToggle.addEventListener('change', function() {
            toggleAgentActivation(this.checked);
        });
    }
    
    const updateButton = document.getElementById('updateThresholdButton');
    if (updateButton) {
        updateButton.addEventListener('click', function() {
            const errorThreshold = document.getElementById('errorThreshold');
            const warningThreshold = document.getElementById('warningThreshold');
            
            if (errorThreshold && warningThreshold) {
                updateRestartThresholds(
                    parseInt(errorThreshold.value, 10),
                    parseInt(warningThreshold.value, 10)
                );
            }
        });
    }
}

/**
 * Load pod restart history
 * @param {string} timeRange - Time range filter (all, today, week, month)
 */
function loadRestartHistory(timeRange) {
    const historyContainer = document.getElementById('restartHistory');
    const loader = document.getElementById('restartHistoryLoader');
    
    if (!historyContainer || !loader) {
        console.error('Restart history containers not found');
        return;
    }
    
    // Show loader, hide content
    loader.classList.remove('d-none');
    historyContainer.innerHTML = '';
    
    // Fetch restart history
    fetch(`/api/pod-restart/history?range=${timeRange}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load restart history');
            }
            return response.json();
        })
        .then(data => {
            // Update history display
            updateRestartHistory(data, timeRange);
            
            // Hide loader
            loader.classList.add('d-none');
        })
        .catch(error => {
            console.error('Error loading restart history:', error);
            
            // Show error message
            loader.classList.add('d-none');
            historyContainer.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-circle me-2"></i>
                    Failed to load restart history. Please try again later.
                </div>
            `;
        });
}

/**
 * Update restart history display
 * @param {Object} data - History data
 * @param {string} timeRange - Current time range filter
 */
function updateRestartHistory(data, timeRange) {
    const historyContainer = document.getElementById('restartHistory');
    if (!historyContainer) {
        console.error('Restart history container not found');
        return;
    }
    
    // Clear existing content
    historyContainer.innerHTML = '';
    
    // Get history entries
    const entries = data.history || [];
    
    if (entries.length === 0) {
        // No history entries
        historyContainer.innerHTML = `
            <div class="alert alert-info">
                <i class="fas fa-info-circle me-2"></i>
                No pod restart history available for the selected time range.
            </div>
        `;
        return;
    }
    
    // Create history table
    const table = document.createElement('table');
    table.className = 'table table-dark table-hover';
    
    // Add table header
    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th>Time</th>
            <th>Pod</th>
            <th>Namespace</th>
            <th>Reason</th>
            <th>Trigger</th>
            <th>Status</th>
        </tr>
    `;
    table.appendChild(thead);
    
    // Add table body
    const tbody = document.createElement('tbody');
    
    // Add each entry as a row
    entries.forEach(entry => {
        const row = document.createElement('tr');
        
        // Format date
        const timestamp = new Date(entry.timestamp);
        const formattedDate = timestamp.toLocaleString();
        
        // Determine status class
        let statusClass = 'bg-success';
        if (entry.status === 'failed') {
            statusClass = 'bg-danger';
        } else if (entry.status === 'pending') {
            statusClass = 'bg-warning';
        }
        
        // Determine trigger badge
        let triggerBadge = '<span class="badge bg-primary">Automated</span>';
        if (entry.trigger === 'manual') {
            triggerBadge = '<span class="badge bg-secondary">Manual</span>';
        } else if (entry.trigger === 'ai') {
            triggerBadge = '<span class="badge bg-info">AI</span>';
        }
        
        // Create row content
        row.innerHTML = `
            <td>${formattedDate}</td>
            <td>${entry.pod_name}</td>
            <td>${entry.namespace}</td>
            <td>${entry.reason || 'N/A'}</td>
            <td>${triggerBadge}</td>
            <td><span class="badge ${statusClass}">${capitalizeFirstLetter(entry.status)}</span></td>
        `;
        
        // Add row to table body
        tbody.appendChild(row);
    });
    
    // Add table body to table
    table.appendChild(tbody);
    
    // Add table to container
    historyContainer.appendChild(table);
}

/**
 * Load Kubernetes namespaces for the dropdown
 */
function loadNamespaces() {
    const namespaceSelect = document.getElementById('restartNamespace');
    if (!namespaceSelect) {
        console.error('Namespace select not found');
        return;
    }
    
    // Fetch namespaces
    fetch('/api/kubernetes/namespaces')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load namespaces');
            }
            return response.json();
        })
        .then(data => {
            // Clear existing options except the first one
            while (namespaceSelect.options.length > 1) {
                namespaceSelect.remove(1);
            }
            
            // Add namespace options
            data.namespaces.forEach(namespace => {
                const option = document.createElement('option');
                option.value = namespace.name;
                option.textContent = namespace.name;
                namespaceSelect.appendChild(option);
            });
        })
        .catch(error => {
            console.error('Error loading namespaces:', error);
            
            // Add default namespaces
            const defaultNamespaces = ['default', 'kube-system', 'monitoring'];
            defaultNamespaces.forEach(namespace => {
                const option = document.createElement('option');
                option.value = namespace;
                option.textContent = namespace;
                namespaceSelect.appendChild(option);
            });
        });
}

/**
 * Toggle agent activation
 * @param {boolean} isActive - Whether to activate or deactivate the agent
 */
function toggleAgentActivation(isActive) {
    fetch('/api/pod-restart/toggle', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: isActive }),
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to toggle agent activation');
            }
            return response.json();
        })
        .then(data => {
            // Show success message
            const label = document.querySelector('label[for="agentActivation"]');
            if (label) {
                label.textContent = isActive ? 'Agent is enabled' : 'Agent is disabled';
            }
            
            // Show toast message
            showToast('Agent Setting Updated', `The Pod Restart Agent has been ${isActive ? 'activated' : 'deactivated'}.`);
        })
        .catch(error => {
            console.error('Error toggling agent activation:', error);
            
            // Show error message
            showToast('Error', 'Failed to update agent status. Please try again.', 'danger');
            
            // Reset toggle
            const toggle = document.getElementById('agentActivation');
            if (toggle) {
                toggle.checked = !isActive;
            }
        });
}

/**
 * Update restart thresholds
 * @param {number} errorThreshold - Error threshold
 * @param {number} warningThreshold - Warning threshold
 */
function updateRestartThresholds(errorThreshold, warningThreshold) {
    fetch('/api/pod-restart/thresholds', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            error_threshold: errorThreshold,
            warning_threshold: warningThreshold,
        }),
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to update thresholds');
            }
            return response.json();
        })
        .then(data => {
            // Show success message
            showToast('Thresholds Updated', 'The restart thresholds have been updated successfully.');
        })
        .catch(error => {
            console.error('Error updating thresholds:', error);
            
            // Show error message
            showToast('Error', 'Failed to update thresholds. Please try again.', 'danger');
        });
}

/**
 * Restart a pod manually
 * @param {string} podName - Pod name
 * @param {string} namespace - Namespace
 */
function restartPodManually(podName, namespace) {
    // Validate input
    if (!podName || !namespace) {
        showToast('Error', 'Pod name and namespace are required.', 'danger');
        return;
    }
    
    // Show confirmation
    if (!confirm(`Are you sure you want to restart pod "${podName}" in namespace "${namespace}"?`)) {
        return;
    }
    
    // Send restart request
    fetch('/api/pod-restart/restart', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            pod_name: podName,
            namespace: namespace,
            trigger: 'manual',
        }),
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to restart pod');
            }
            return response.json();
        })
        .then(data => {
            // Show success message
            showToast('Pod Restart Initiated', `Pod "${podName}" restart has been initiated.`);
            
            // Clear inputs
            const podNameInput = document.getElementById('restartPodName');
            if (podNameInput) {
                podNameInput.value = '';
            }
            
            // Reload history after a delay
            setTimeout(() => {
                loadRestartHistory('all');
            }, 2000);
        })
        .catch(error => {
            console.error('Error restarting pod:', error);
            
            // Show error message
            showToast('Error', 'Failed to restart pod. Please check the pod name and try again.', 'danger');
        });
}

/**
 * Show a toast message
 * @param {string} title - Toast title
 * @param {string} message - Toast message
 * @param {string} type - Toast type (success, danger, warning, info)
 */
function showToast(title, message, type = 'success') {
    // Create toast container if it doesn't exist
    let toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        toastContainer.className = 'position-fixed bottom-0 end-0 p-3';
        toastContainer.style.zIndex = '5';
        document.body.appendChild(toastContainer);
    }
    
    // Create a unique ID for this toast
    const toastId = 'toast-' + Date.now();
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast bg-dark border-${type} border border-2` ;
    toast.id = toastId;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    // Add toast content
    toast.innerHTML = `
        <div class="toast-header bg-${type} text-white">
            <strong class="me-auto">${title}</strong>
            <small>Just now</small>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
        <div class="toast-body text-white">
            ${message}
        </div>
    `;
    
    // Add toast to container
    toastContainer.appendChild(toast);
    
    // Initialize and show the toast
    const bsToast = new bootstrap.Toast(toast, {
        autohide: true,
        delay: 5000
    });
    bsToast.show();
    
    // Remove toast after it's hidden
    toast.addEventListener('hidden.bs.toast', function () {
        toast.remove();
    });
}
