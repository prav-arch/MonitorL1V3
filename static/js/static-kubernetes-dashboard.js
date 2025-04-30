/**
 * Static implementation for the Kubernetes dashboard
 * This will show reliable, static data for the monitoring dashboard
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing Static Kubernetes Dashboard');
    
    // Set up the cluster health display
    setupClusterHealth();
    
    // Set up the component status display
    setupComponentStatus();
    
    // Set up the events display
    fetchAndDisplayStaticEvents();
    
    // Set up L1 monitoring status display
    setupL1MonitoringStatus();
    
    // Add event listener for refresh button
    const refreshButtons = document.querySelectorAll('.refresh-k8s');
    refreshButtons.forEach(button => {
        button.addEventListener('click', function() {
            console.log('Refresh clicked');
            setupClusterHealth();
            setupComponentStatus();
            fetchAndDisplayStaticEvents();
            setupL1MonitoringStatus();
        });
    });
});

/**
 * Set up the cluster health display with static data
 */
function setupClusterHealth() {
    // Set up the cluster health display
    const healthScore = 95;
    const healthStatus = 'Healthy';
    
    // Update timestamp
    const timestampElement = document.getElementById('k8s-last-updated');
    if (timestampElement) {
        const timestamp = new Date();
        timestampElement.textContent = timestamp.toLocaleTimeString();
    }
    
    // Update health score
    const scoreElement = document.getElementById('cluster-health-score');
    if (scoreElement) {
        scoreElement.textContent = healthScore;
    }
    
    // Update health status
    const statusElement = document.getElementById('cluster-health-status');
    if (statusElement) {
        statusElement.textContent = 'Cluster Health: ' + healthStatus;
    }
    
    // Update health badge
    const badgeElement = document.getElementById('cluster-health-badge');
    if (badgeElement) {
        let badgeClass = 'badge bg-success';
        badgeElement.className = badgeClass;
        badgeElement.textContent = healthStatus;
    }
    
    // Create or update the doughnut chart
    const chartElement = document.getElementById('clusterHealthChart');
    if (chartElement) {
        // Since Chart.js seems to be having issues, let's use a simpler approach
        // Create a simple visual representation with a div
        chartElement.innerHTML = '';
        
        const chartContainer = document.createElement('div');
        chartContainer.className = 'health-chart-container';
        chartContainer.style.width = '100%';
        chartContainer.style.height = '100%';
        chartContainer.style.position = 'relative';
        chartContainer.style.borderRadius = '50%';
        chartContainer.style.background = '#eee';
        
        const chartFill = document.createElement('div');
        chartFill.className = 'health-chart-fill';
        chartFill.style.width = '100%';
        chartFill.style.height = '100%';
        chartFill.style.position = 'absolute';
        chartFill.style.borderRadius = '50%';
        chartFill.style.background = 'rgba(40, 167, 69, 0.8)';
        chartFill.style.clipPath = 'polygon(0 0, 100% 0, 100% 100%, 0% 100%)';
        
        const chartCenter = document.createElement('div');
        chartCenter.className = 'health-chart-center';
        chartCenter.style.width = '70%';
        chartCenter.style.height = '70%';
        chartCenter.style.position = 'absolute';
        chartCenter.style.top = '15%';
        chartCenter.style.left = '15%';
        chartCenter.style.borderRadius = '50%';
        chartCenter.style.background = '#343a40';
        chartCenter.style.display = 'flex';
        chartCenter.style.alignItems = 'center';
        chartCenter.style.justifyContent = 'center';
        chartCenter.style.fontSize = '24px';
        chartCenter.style.fontWeight = 'bold';
        chartCenter.style.color = '#fff';
        chartCenter.textContent = healthScore;
        
        chartContainer.appendChild(chartFill);
        chartContainer.appendChild(chartCenter);
        chartElement.appendChild(chartContainer);
    }
}

/**
 * Set up the component status display with static data
 */
function setupComponentStatus() {
    // Set up the component status display with static data
    const componentData = {
        nodes: {
            ready_count: 1,
            total_count: 1
        },
        pods: {
            running_count: 5,
            total_count: 5
        },
        deployments: {
            available_count: 5,
            total_count: 5
        }
    };
    
    // Update nodes status
    const nodesReadyElement = document.getElementById('nodes-ready');
    if (nodesReadyElement) {
        nodesReadyElement.textContent = `${componentData.nodes.ready_count}/${componentData.nodes.total_count}`;
        
        const nodesProgressElement = document.getElementById('nodes-progress');
        if (nodesProgressElement) {
            const percentage = (componentData.nodes.ready_count / Math.max(1, componentData.nodes.total_count)) * 100;
            nodesProgressElement.style.width = `${percentage}%`;
            nodesProgressElement.className = 'progress-bar bg-success';
        }
    }
    
    // Update pods status
    const podsRunningElement = document.getElementById('pods-running');
    if (podsRunningElement) {
        podsRunningElement.textContent = `${componentData.pods.running_count}/${componentData.pods.total_count}`;
        
        const podsProgressElement = document.getElementById('pods-progress');
        if (podsProgressElement) {
            const percentage = (componentData.pods.running_count / Math.max(1, componentData.pods.total_count)) * 100;
            podsProgressElement.style.width = `${percentage}%`;
            podsProgressElement.className = 'progress-bar bg-success';
        }
    }
    
    // Update deployments status
    const deploymentsAvailableElement = document.getElementById('deployments-available');
    if (deploymentsAvailableElement) {
        deploymentsAvailableElement.textContent = `${componentData.deployments.available_count}/${componentData.deployments.total_count}`;
        
        const deploymentsProgressElement = document.getElementById('deployments-progress');
        if (deploymentsProgressElement) {
            const percentage = (componentData.deployments.available_count / Math.max(1, componentData.deployments.total_count)) * 100;
            deploymentsProgressElement.style.width = `${percentage}%`;
            deploymentsProgressElement.className = 'progress-bar bg-success';
        }
    }
}

/**
 * Set up the L1 monitoring status display with static data
 */
function setupL1MonitoringStatus() {
    const l1monStatusElement = document.getElementById('l1mon-status');
    if (l1monStatusElement) {
        l1monStatusElement.className = 'badge bg-success';
        l1monStatusElement.textContent = 'Healthy';
    }
    
    const l1monScoreElement = document.getElementById('l1mon-score');
    if (l1monScoreElement) {
        l1monScoreElement.textContent = '100%';
    }
}

/**
 * Fetch and display Kubernetes events from a static file
 */
function fetchAndDisplayStaticEvents() {
    const eventsTableBody = document.getElementById('k8s-events');
    if (!eventsTableBody) return;
    
    // Show loading state
    eventsTableBody.innerHTML = `
        <tr>
            <td colspan="4" class="text-center py-3">
                <div class="spinner-border spinner-border-sm text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <span class="ms-2">Loading events...</span>
            </td>
        </tr>
    `;
    
    // Fetch events from static file
    fetch('/static/data/sample-kubernetes-events.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (!data.events || data.events.length === 0) {
                eventsTableBody.innerHTML = `
                    <tr>
                        <td colspan="4" class="text-center">No recent events found</td>
                    </tr>
                `;
                return;
            }
            
            // Display the events
            let eventsHtml = '';
            
            data.events.forEach(event => {
                // Format the timestamp
                const timestamp = new Date(event.last_timestamp || event.first_timestamp);
                const timeStr = timestamp.toLocaleTimeString();
                
                // Determine the CSS class based on event type
                const typeClass = event.type === 'Warning' ? 'text-warning' : 'text-info';
                
                // Format the object info
                const objectInfo = `${event.involved_object.kind}/${event.involved_object.name}`;
                
                // Create the HTML
                eventsHtml += `
                    <tr>
                        <td>${timeStr}</td>
                        <td><span class="${typeClass}">${event.type}</span></td>
                        <td>${objectInfo}</td>
                        <td>${event.reason ? event.reason + ': ' : ''}${event.message}</td>
                    </tr>
                `;
            });
            
            // Update the table
            eventsTableBody.innerHTML = eventsHtml;
        })
        .catch(error => {
            console.error('Error fetching Kubernetes events:', error);
            
            // Since we can't load the static file, let's insert some hardcoded events
            eventsTableBody.innerHTML = `
                <tr>
                    <td>3:25:09 PM</td>
                    <td><span class="text-info">Normal</span></td>
                    <td>Pod/l1-monitoring-app</td>
                    <td>Started: Started container l1-monitoring-app</td>
                </tr>
                <tr>
                    <td>3:24:49 PM</td>
                    <td><span class="text-info">Normal</span></td>
                    <td>Pod/l1-monitoring-app</td>
                    <td>Pulled: Container image pulled successfully</td>
                </tr>
                <tr>
                    <td>3:24:36 PM</td>
                    <td><span class="text-info">Normal</span></td>
                    <td>Pod/clickhouse-server</td>
                    <td>Pulling: Pulling image clickhouse/clickhouse-server:23.3</td>
                </tr>
                <tr>
                    <td>3:23:20 PM</td>
                    <td><span class="text-info">Normal</span></td>
                    <td>Deployment/l1-monitoring</td>
                    <td>ScalingReplicaSet: Scaled up replica set l1-monitoring to 1</td>
                </tr>
                <tr>
                    <td>3:23:12 PM</td>
                    <td><span class="text-info">Normal</span></td>
                    <td>Deployment/clickhouse-server</td>
                    <td>ScalingReplicaSet: Scaled up replica set clickhouse-server to 1</td>
                </tr>
            `;
        });
}