/**
 * Kubernetes Pod Metrics Charts
 * This script handles the visualization of pod resource metrics.
 */

// Define our own chart variables to avoid conflicts with kubernetes-monitor.js
let metricsTabPodCpuChart = null;
let metricsTabPodMemoryChart = null;
let metricsTabPodsRunningChart = null;

const podChartData = {
    timeSeriesLabels: [],
    podsRunningData: [],
    lastUpdated: null
};

// Color palette for consistent visualization
const chartColorPalette = [
    'rgba(54, 162, 235, 0.7)',   // Blue
    'rgba(255, 99, 132, 0.7)',    // Red
    'rgba(75, 192, 192, 0.7)',    // Green
    'rgba(255, 159, 64, 0.7)',    // Orange
    'rgba(153, 102, 255, 0.7)',   // Purple
    'rgba(201, 203, 207, 0.7)',   // Grey
    'rgba(255, 205, 86, 0.7)',    // Yellow
];

/**
 * Initialize the CPU Usage Chart
 */
function initPodCpuUsageChart() {
    console.log("Initializing Pod CPU Usage Chart");
    const cpuChartCtx = document.getElementById('podCpuUsageChart');
    
    if (!cpuChartCtx) {
        console.error("Could not find podCpuUsageChart element");
        return;
    }
    
    metricsTabPodCpuChart = new Chart(cpuChartCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'CPU Usage (millicores)',
                data: [],
                backgroundColor: chartColorPalette[0],
                borderColor: chartColorPalette[0].replace('0.7', '1'),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'CPU (millicores)',
                        color: '#e9ecef'  // Light color for dark theme
                    },
                    ticks: {
                        color: '#e9ecef'  // Light color for dark theme
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'  // Subtle grid lines for dark theme
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Pod Name',
                        color: '#e9ecef'  // Light color for dark theme
                    },
                    ticks: {
                        color: '#e9ecef'  // Light color for dark theme
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'  // Subtle grid lines for dark theme
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `CPU: ${context.parsed.y} millicores`;
                        }
                    }
                },
                legend: {
                    display: false,
                    labels: {
                        color: '#e9ecef'  // Light color for dark theme
                    }
                },
                title: {
                    display: true,
                    text: 'Pod CPU Usage',
                    color: '#e9ecef'  // Light color for dark theme
                }
            }
        }
    });
}

/**
 * Initialize the Memory Usage Chart
 */
function initPodMemoryUsageChart() {
    console.log("Initializing Pod Memory Usage Chart");
    const memoryChartCtx = document.getElementById('podMemoryUsageChart');
    
    if (!memoryChartCtx) {
        console.error("Could not find podMemoryUsageChart element");
        return;
    }
    
    metricsTabPodMemoryChart = new Chart(memoryChartCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Memory Usage (MB)',
                data: [],
                backgroundColor: chartColorPalette[2],
                borderColor: chartColorPalette[2].replace('0.7', '1'),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Memory (MB)',
                        color: '#e9ecef'  // Light color for dark theme
                    },
                    ticks: {
                        color: '#e9ecef'  // Light color for dark theme
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'  // Subtle grid lines for dark theme
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Pod Name',
                        color: '#e9ecef'  // Light color for dark theme
                    },
                    ticks: {
                        color: '#e9ecef'  // Light color for dark theme
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'  // Subtle grid lines for dark theme
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Memory: ${context.parsed.y} MB`;
                        }
                    }
                },
                legend: {
                    display: false,
                    labels: {
                        color: '#e9ecef'  // Light color for dark theme
                    }
                },
                title: {
                    display: true,
                    text: 'Pod Memory Usage',
                    color: '#e9ecef'  // Light color for dark theme
                }
            }
        }
    });
}

/**
 * Initialize the Pods Running Time Chart
 */
function initPodsRunningTimeChart() {
    console.log("Initializing Pods Running Time Chart");
    const timeChartCtx = document.getElementById('podsRunningTimeChart');
    
    if (!timeChartCtx) {
        console.error("Could not find podsRunningTimeChart element");
        return;
    }
    
    metricsTabPodsRunningChart = new Chart(timeChartCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Running Pods',
                data: [],
                fill: true,
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgba(75, 192, 192, 1)',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Pod Count',
                        color: '#e9ecef'  // Light color for dark theme
                    },
                    ticks: {
                        color: '#e9ecef'  // Light color for dark theme
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'  // Subtle grid lines for dark theme
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Time',
                        color: '#e9ecef'  // Light color for dark theme
                    },
                    ticks: {
                        color: '#e9ecef'  // Light color for dark theme
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'  // Subtle grid lines for dark theme
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Running Pods: ${context.parsed.y}`;
                        }
                    }
                },
                legend: {
                    display: false,
                    labels: {
                        color: '#e9ecef'  // Light color for dark theme
                    }
                },
                title: {
                    display: true,
                    text: 'Pods Running Over Time',
                    color: '#e9ecef'  // Light color for dark theme
                }
            }
        }
    });
}

/**
 * Fetch Pod Resource Usage data from the API
 * @returns {Promise} A promise that resolves when the data is fetched and charts are updated
 */
function fetchPodResourceUsage() {
    console.log("Fetching pod resource usage...");
    
    return new Promise(function(resolve, reject) {
        fetch('/api/kubernetes/pod-metrics')
            .then(function(response) {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(function(data) {
                console.log("Pod metrics data received:", data);
                
                // Generate a time label for this data point
                const now = new Date();
                const timeLabel = now.toLocaleTimeString();
                
                // Update the charts with the new data
                updatePodResourceCharts(data, timeLabel);
                
                // Update the bad phase pods list if there are any
                if (data.badPhasePods && data.badPhasePods.length > 0) {
                    updateBadPhasePodsList(data.badPhasePods);
                } else {
                    // Clear the list if there are no bad phase pods
                    const badPhaseEl = document.getElementById('badPhasePodsList');
                    if (badPhaseEl) {
                        badPhaseEl.innerHTML = '<div class="alert alert-success">No pods in bad phase detected</div>';
                    }
                }
                
                resolve(); // Resolve the promise when everything is done
            })
            .catch(function(error) {
                console.error("Error fetching pod metrics:", error);
                
                // If the metrics API isn't available, simulate some data
                // This is useful for development and demo purposes
                simulatePodMetrics();
                
                resolve(); // Resolve even on error after fallback to simulation
            });
    });
}

/**
 * Update the Pod Resource Charts with new data
 */
function updatePodResourceCharts(data, timeLabel) {
    // Update the timestamp display
    const lastUpdatedEl = document.getElementById('podMetricsLastUpdated');
    if (lastUpdatedEl) {
        lastUpdatedEl.textContent = `Last Updated: ${timeLabel}`;
    }
    
    // Extract pod data for CPU and Memory charts
    const podNames = data.pods.map(function(pod) { return pod.name; });
    const cpuUsage = data.pods.map(function(pod) { return pod.cpu_usage; });
    const memoryUsage = data.pods.map(function(pod) { return pod.memory_usage; });
    
    // Update CPU chart
    if (metricsTabPodCpuChart) {
        metricsTabPodCpuChart.data.labels = podNames;
        metricsTabPodCpuChart.data.datasets[0].data = cpuUsage;
        metricsTabPodCpuChart.update();
    }
    
    // Update Memory chart
    if (metricsTabPodMemoryChart) {
        metricsTabPodMemoryChart.data.labels = podNames;
        metricsTabPodMemoryChart.data.datasets[0].data = memoryUsage;
        metricsTabPodMemoryChart.update();
    }
    
    // Update time series data for running pods
    // Keep only the last 10 data points to prevent the chart from getting too crowded
    if (podChartData.timeSeriesLabels.length >= 10) {
        podChartData.timeSeriesLabels.shift();
        podChartData.podsRunningData.shift();
    }
    
    podChartData.timeSeriesLabels.push(timeLabel);
    podChartData.podsRunningData.push(data.runningPods);
    
    if (metricsTabPodsRunningChart) {
        metricsTabPodsRunningChart.data.labels = podChartData.timeSeriesLabels;
        metricsTabPodsRunningChart.data.datasets[0].data = podChartData.podsRunningData;
        metricsTabPodsRunningChart.update();
    }
    
    // Store the timestamp of the last update
    podChartData.lastUpdated = new Date();
}

/**
 * Update the list of pods in bad phase
 */
function updateBadPhasePodsList(badPhasePods) {
    const badPhasePodsList = document.getElementById('badPhasePodsList');
    if (!badPhasePodsList) return;
    
    // Clear the existing list
    badPhasePodsList.innerHTML = '';
    
    // Create a new alert for each pod in bad phase
    badPhasePods.forEach(function(pod) {
        const badPodAlert = document.createElement('div');
        badPodAlert.classList.add('alert', getPhaseBadgeClass(pod.phase));
        badPodAlert.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <strong>${pod.name}</strong> 
                    <span class="badge rounded-pill ${getPhaseBadgeClass(pod.phase, true)}">${pod.phase}</span>
                </div>
                <small>${pod.namespace} - ${pod.reason || 'Unknown reason'}</small>
            </div>
        `;
        badPhasePodsList.appendChild(badPodAlert);
    });
}

/**
 * Get the appropriate Bootstrap class for a pod phase
 */
function getPhaseBadgeClass(phase, isBadge) {
    if (isBadge) {
        // For badge styling
        switch (phase.toLowerCase()) {
            case 'failed':
                return 'bg-danger';
            case 'pending':
                return 'bg-warning text-dark';
            case 'unknown':
                return 'bg-secondary';
            default:
                return 'bg-light text-dark';
        }
    } else {
        // For alert styling
        switch (phase.toLowerCase()) {
            case 'failed':
                return 'alert-danger';
            case 'pending':
                return 'alert-warning';
            case 'unknown':
                return 'alert-secondary';
            default:
                return 'alert-light';
        }
    }
}

/**
 * Simulate pod metrics data when the API is not available
 * This is used in development/demo mode
 */
function simulatePodMetrics() {
    console.log("Simulating pod metrics data");
    
    // Generate a time label
    const now = new Date();
    const timeLabel = now.toLocaleTimeString();
    
    // Simulate pod data
    const simulatedData = {
        pods: [
            {
                name: 'app-server',
                namespace: 'default',
                cpu_usage: Math.floor(Math.random() * 300) + 100,
                memory_usage: Math.floor(Math.random() * 600) + 200,
                status: 'Running'
            },
            {
                name: 'database',
                namespace: 'default',
                cpu_usage: Math.floor(Math.random() * 250) + 150,
                memory_usage: Math.floor(Math.random() * 800) + 400,
                status: 'Running'
            },
            {
                name: 'cache',
                namespace: 'default',
                cpu_usage: Math.floor(Math.random() * 150) + 50,
                memory_usage: Math.floor(Math.random() * 300) + 100,
                status: 'Running'
            }
        ],
        runningPods: 3,
        totalPods: 3,
        badPhasePods: [],
        timestamp: now.toISOString()
    };
    
    // Occasionally add a bad phase pod
    if (Math.random() > 0.7) {
        simulatedData.badPhasePods.push({
            name: `job-${Math.floor(Math.random() * 1000)}`,
            namespace: 'default',
            phase: Math.random() > 0.5 ? 'Failed' : 'Pending',
            reason: Math.random() > 0.5 ? 'CrashLoopBackOff' : 'ContainerCreating'
        });
        simulatedData.totalPods++;
    }
    
    // Update the charts with the simulated data
    updatePodResourceCharts(simulatedData, timeLabel);
    
    // Update the bad phase pods list if there are any
    if (simulatedData.badPhasePods.length > 0) {
        updateBadPhasePodsList(simulatedData.badPhasePods);
    } else {
        // Clear the list if there are no bad phase pods
        const badPhaseEl = document.getElementById('badPhasePodsList');
        if (badPhaseEl) {
            badPhaseEl.innerHTML = '<div class="alert alert-success">No pods in bad phase detected</div>';
        }
    }
}

// Initialize charts when the DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log("Initializing Kubernetes pod charts");
    
    // Check if we're on the pod metrics tab
    const podMetricsTab = document.getElementById('pod-metrics-tab-pane');
    if (!podMetricsTab) {
        console.log("Pod metrics tab not found, skipping initialization");
        return;
    }
    
    // Initialize charts after a delay to ensure proper loading order
    setTimeout(function() {
        initPodCpuUsageChart();
        initPodMemoryUsageChart();
        initPodsRunningTimeChart();
        
        // Fetch initial data
        fetchPodResourceUsage();
        
        // Set up interval to update data
        setInterval(function() {
            fetchPodResourceUsage();
        }, 30000); // Update every 30 seconds
        
        // Add event listener for manual refresh
        const refreshBtn = document.querySelector('.refresh-pod-metrics');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', function() {
                fetchPodResourceUsage();
            });
        }
    }, 1000); // Delay initialization to ensure DOM is fully ready
});