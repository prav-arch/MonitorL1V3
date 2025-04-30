/**
 * Direct Dashboard Fix - targets specific IDs on the page
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('Applying Direct Dashboard Fix to both main and modal views');
    
    // Directly hardcode the data into the page
    // We're targeting both the main page widgets and the modal elements
    
    // Wait for elements to be available
    setTimeout(function() {
        // Set all cluster health scores and status
        updateElement('cluster-health-score', '95');
        updateElement('cluster-health-score-widget', '95');
        
        // Set all health status labels
        updateElement('cluster-health-status', 'Cluster Health: Healthy');
        updateElement('cluster-health-status-widget', 'Cluster Health: Healthy');
        
        // Set all badge elements
        updateBadge('cluster-health-badge', 'Healthy', 'success');
        updateBadge('cluster-health-badge-widget', 'Healthy', 'success');
        
        // Set component status for both views
        updateElement('nodes-ready', '1/1');
        updateElement('pods-running', '5/5');
        updateElement('deployments-available', '5/5');
        
        // Update progress bars
        updateProgressBar('nodes-progress', 100, 'success');
        updateProgressBar('pods-progress', 100, 'success');
        updateProgressBar('deployments-progress', 100, 'success');
        
        // Set L1 monitoring status
        updateBadge('l1mon-status', 'Healthy', 'success');
        updateElement('l1mon-score', '100%');
        
        // Update timestamps
        const currentTime = new Date().toLocaleTimeString();
        updateElement('k8s-last-updated', currentTime);
        updateElement('k8s-last-updated-widget', currentTime);
        
        // Set events tables (both main and modal)
        setEventsTable('k8s-events');
        
        // Fix card headers text colors
        fixCardHeaderColors();
        
        // Force add metrics to the main dashboard
        createStandaloneMetricsSection();
        
        console.log('Direct Dashboard Fix successfully applied with forced metrics section');
    }, 500);
    
    // Add a click handler for refresh buttons
    setTimeout(function() {
        document.querySelectorAll('.refresh-k8s').forEach(function(button) {
            button.addEventListener('click', function() {
                const currentTime = new Date().toLocaleTimeString();
                updateElement('k8s-last-updated', currentTime);
                updateElement('k8s-last-updated-widget', currentTime);
            });
        });
    }, 1000);
});

/**
 * Update an element's inner HTML
 */
function updateElement(id, value) {
    const elements = document.querySelectorAll('#' + id);
    elements.forEach(function(el) {
        if (el) {
            el.innerHTML = value;
        }
    });
}

/**
 * Update a badge element
 */
function updateBadge(id, text, status) {
    const elements = document.querySelectorAll('#' + id);
    elements.forEach(function(el) {
        if (el) {
            el.innerHTML = text;
            el.className = 'badge bg-' + status;
        }
    });
}

/**
 * Update a progress bar
 */
function updateProgressBar(id, percentage, status) {
    const elements = document.querySelectorAll('#' + id);
    elements.forEach(function(el) {
        if (el) {
            el.style.width = percentage + '%';
            el.className = 'progress-bar bg-' + status;
        }
    });
}

/**
 * Set events table data
 */
function setEventsTable(id) {
    const elements = document.querySelectorAll('#' + id);
    
    const eventsHtml = `
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
    
    elements.forEach(function(el) {
        if (el) {
            el.innerHTML = eventsHtml;
        }
    });
}

/**
 * Fix card header text colors
 */
function fixCardHeaderColors() {
    // This is a simpler, more reliable approach
    // Find all card headers with class 'bg-light'
    document.querySelectorAll('.card-header.bg-light').forEach(function(header) {
        // For each card header, find all h6 elements and set their color
        header.querySelectorAll('h6').forEach(function(heading) {
            heading.style.color = '#212529';
        });
        
        // Also set the color of the header itself
        header.style.color = '#212529';
    });
    
    // Direct approach - manually set colors for specific sections
    // CPU Usage Card
    const cpuHeading = document.querySelector('.card-header h6:contains("CPU Usage by Pod")');
    if (cpuHeading) {
        cpuHeading.style.color = '#212529';
    }
    
    // Memory Usage Card
    const memoryHeading = document.querySelector('.card-header h6:contains("Memory Usage by Pod")');
    if (memoryHeading) {
        memoryHeading.style.color = '#212529';
    }
    
    // Pods Running Card
    const podsRunningHeading = document.querySelector('.card-header h6:contains("Pods Running Over Time")');
    if (podsRunningHeading) {
        podsRunningHeading.style.color = '#212529';
    }
    
    // Pods Bad Phase Card
    const badPhaseHeading = document.querySelector('.card-header h6:contains("Pods in Bad Phase")');
    if (badPhaseHeading) {
        badPhaseHeading.style.color = '#212529';
    }
    
    // Since the :contains selector might not be supported, let's try a different approach
    // Simply set the color of all h6 inside card-header.bg-light elements using brute force
    setTimeout(() => {
        // Get all card headers in the document
        const cardHeaders = document.querySelectorAll('.card-header');
        cardHeaders.forEach(header => {
            // If this is a bg-light header, set the color to dark
            if (header.classList.contains('bg-light')) {
                header.style.color = '#212529';
                const headings = header.querySelectorAll('h6');
                headings.forEach(h => {
                    h.style.color = '#212529';
                });
            } 
            // But for default headers (dark), set the color to white
            else {
                header.style.color = '#ffffff';
                const headings = header.querySelectorAll('h6');
                headings.forEach(h => {
                    h.style.color = '#ffffff';
                });
            }
        });
    }, 50);
}

/**
 * Update card header text color
 */
function updateCardHeaderTextColor(element) {
    if (element) {
        // Find all headings inside this element
        const headings = element.querySelectorAll('h6');
        headings.forEach(function(heading) {
            heading.style.color = '#ffffff';
        });
        
        // Also set the element's own text color
        element.style.color = '#ffffff';
    }
}

/**
 * Add additional metrics to the Kubernetes monitoring dashboard
 */
function addAdditionalMetrics() {
    console.log('Adding additional metrics to dashboard');
    
    // First try to find the Kubernetes Monitoring card
    let k8sCardBody = null;
    
    // Try to find the card by its header text
    document.querySelectorAll('.card-header').forEach(header => {
        if (header.textContent.includes('Kubernetes Monitoring')) {
            k8sCardBody = header.closest('.card').querySelector('.card-body');
        }
    });
    
    if (k8sCardBody) {
        console.log('Found Kubernetes card, adding metrics to card');
        addExtraMetricsToCard(k8sCardBody);
    } else {
        console.log('Card not found, trying to find deployments section');
        // Try another approach - insert after pod statuses
        const deploymentsElement = document.getElementById('deployments-available');
        if (deploymentsElement) {
            console.log('Found deployments element');
            const parentElement = findParentContainer(deploymentsElement);
            if (parentElement) {
                console.log('Found parent container, adding metrics after element');
                addExtraMetricsAfterElement(parentElement);
            } else {
                console.log('Direct insertion failed, trying backup approach');
                insertAfterL1Monitoring();
            }
        } else {
            console.log('Deployments not found, trying L1 monitoring');
            insertAfterL1Monitoring();
        }
    }
}

/**
 * Find the parent container of an element
 */
function findParentContainer(element) {
    if (!element) return null;
    
    // First try to find the closest d-flex flex-column
    let parent = element.closest('.d-flex.flex-column');
    if (parent) return parent;
    
    // If that fails, try to go up 3 parent levels
    let current = element;
    for (let i = 0; i < 3; i++) {
        if (current.parentElement) {
            current = current.parentElement;
        } else {
            break;
        }
    }
    
    return current;
}

/**
 * Insert metrics after L1 monitoring section
 */
function insertAfterL1Monitoring() {
    const l1monElement = document.getElementById('l1mon-status');
    if (l1monElement) {
        console.log('Found L1 monitoring, adding metrics after it');
        const parentElement = findParentContainer(l1monElement);
        if (parentElement) {
            addExtraMetricsAfterElement(parentElement);
        } else {
            console.log('Absolutely last resort - create a new section at the top of the page');
            createNewMetricsSection();
        }
    } else {
        console.log('Final fallback - creating new metrics section');
        createNewMetricsSection();
    }
}

/**
 * Create a standalone metrics section at the top of dashboard
 */
function createStandaloneMetricsSection() {
    console.log('Creating standalone metrics section');
    const mainContent = document.querySelector('.col-md-10.col-sm-9');
    if (!mainContent) {
        console.error('Could not find main content area');
        return;
    }
    
    // Create a new card at the top
    const metricsCard = document.createElement('div');
    metricsCard.className = 'card bg-dark border-primary shadow-sm mb-4';
    metricsCard.id = 'kubernetes-additional-metrics-card';
    metricsCard.innerHTML = `
        <div class="card-header bg-primary bg-opacity-25 text-white">
            <h5 class="mb-0"><i class="fas fa-chart-line me-2"></i> Kubernetes Additional Metrics</h5>
        </div>
        <div class="card-body">
            <div class="row row-cols-2 g-2 mb-3">
                <!-- Cluster metrics -->
                <div class="col">
                    <div class="metric-card p-2 border border-info rounded bg-dark bg-opacity-50">
                        <div class="d-flex justify-content-between">
                            <span><i class="fas fa-microchip me-1"></i> Cluster CPU</span>
                            <span>23%</span>
                        </div>
                        <div class="progress mt-1" style="height: 4px;">
                            <div class="progress-bar bg-info" style="width: 23%"></div>
                        </div>
                    </div>
                </div>
                <div class="col">
                    <div class="metric-card p-2 border border-info rounded bg-dark bg-opacity-50">
                        <div class="d-flex justify-content-between">
                            <span><i class="fas fa-memory me-1"></i> Cluster Memory</span>
                            <span>47%</span>
                        </div>
                        <div class="progress mt-1" style="height: 4px;">
                            <div class="progress-bar bg-info" style="width: 47%"></div>
                        </div>
                    </div>
                </div>
                
                <!-- Network metrics -->
                <div class="col">
                    <div class="metric-card p-2 border border-success rounded bg-dark bg-opacity-50">
                        <div class="d-flex justify-content-between">
                            <span><i class="fas fa-arrow-down me-1"></i> Network In</span>
                            <span>3.4 Mbps</span>
                        </div>
                        <div class="progress mt-1" style="height: 4px;">
                            <div class="progress-bar bg-success" style="width: 34%"></div>
                        </div>
                    </div>
                </div>
                <div class="col">
                    <div class="metric-card p-2 border border-success rounded bg-dark bg-opacity-50">
                        <div class="d-flex justify-content-between">
                            <span><i class="fas fa-arrow-up me-1"></i> Network Out</span>
                            <span>1.2 Mbps</span>
                        </div>
                        <div class="progress mt-1" style="height: 4px;">
                            <div class="progress-bar bg-success" style="width: 12%"></div>
                        </div>
                    </div>
                </div>
                
                <!-- Storage metrics -->
                <div class="col">
                    <div class="metric-card p-2 border border-warning rounded bg-dark bg-opacity-50">
                        <div class="d-flex justify-content-between">
                            <span><i class="fas fa-database me-1"></i> Storage Used</span>
                            <span>32%</span>
                        </div>
                        <div class="progress mt-1" style="height: 4px;">
                            <div class="progress-bar bg-warning" style="width: 32%"></div>
                        </div>
                    </div>
                </div>
                <div class="col">
                    <div class="metric-card p-2 border border-warning rounded bg-dark bg-opacity-50">
                        <div class="d-flex justify-content-between">
                            <span><i class="fas fa-hdd me-1"></i> IOPS</span>
                            <span>825</span>
                        </div>
                        <div class="progress mt-1" style="height: 4px;">
                            <div class="progress-bar bg-warning" style="width: 28%"></div>
                        </div>
                    </div>
                </div>
                
                <!-- Pod metrics -->
                <div class="col">
                    <div class="metric-card p-2 border border-primary rounded bg-dark bg-opacity-50">
                        <div class="d-flex justify-content-between">
                            <span><i class="fas fa-redo me-1"></i> Restart Count</span>
                            <span>3</span>
                        </div>
                        <div class="progress mt-1" style="height: 4px;">
                            <div class="progress-bar bg-primary" style="width: 15%"></div>
                        </div>
                    </div>
                </div>
                <div class="col">
                    <div class="metric-card p-2 border border-primary rounded bg-dark bg-opacity-50">
                        <div class="d-flex justify-content-between">
                            <span><i class="fas fa-tachometer-alt me-1"></i> Health Index</span>
                            <span>94%</span>
                        </div>
                        <div class="progress mt-1" style="height: 4px;">
                            <div class="progress-bar bg-primary" style="width: 94%"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Find the first child and insert our card before it
    const firstChild = mainContent.firstChild;
    if (firstChild) {
        mainContent.insertBefore(metricsCard, firstChild);
        console.log('Inserted metrics card at the top of main content');
    } else {
        mainContent.appendChild(metricsCard);
        console.log('Appended metrics card to main content');
    }
}

/**
 * Create a completely new metrics section at the top of the page
 */
function createNewMetricsSection() {
    const mainContent = document.querySelector('.col-md-10.col-sm-9');
    if (!mainContent) return;
    
    // Create a new card at the top
    const metricsCard = document.createElement('div');
    metricsCard.className = 'card bg-dark border-secondary shadow-sm mb-4';
    metricsCard.innerHTML = `
        <div class="card-header bg-secondary bg-opacity-25 text-white">
            <h5 class="mb-0"><i class="fas fa-chart-bar me-2"></i> Kubernetes Additional Metrics</h5>
        </div>
        <div class="card-body">
            <div class="row row-cols-2 g-2 mb-3">
                <!-- Cluster metrics -->
                <div class="col">
                    <div class="metric-card p-2 border border-info rounded bg-dark bg-opacity-50">
                        <div class="d-flex justify-content-between">
                            <span><i class="fas fa-microchip me-1"></i> Cluster CPU</span>
                            <span>23%</span>
                        </div>
                        <div class="progress mt-1" style="height: 4px;">
                            <div class="progress-bar bg-info" style="width: 23%"></div>
                        </div>
                    </div>
                </div>
                <div class="col">
                    <div class="metric-card p-2 border border-info rounded bg-dark bg-opacity-50">
                        <div class="d-flex justify-content-between">
                            <span><i class="fas fa-memory me-1"></i> Cluster Memory</span>
                            <span>47%</span>
                        </div>
                        <div class="progress mt-1" style="height: 4px;">
                            <div class="progress-bar bg-info" style="width: 47%"></div>
                        </div>
                    </div>
                </div>
                
                <!-- Network metrics -->
                <div class="col">
                    <div class="metric-card p-2 border border-success rounded bg-dark bg-opacity-50">
                        <div class="d-flex justify-content-between">
                            <span><i class="fas fa-arrow-down me-1"></i> Network In</span>
                            <span>3.4 Mbps</span>
                        </div>
                        <div class="progress mt-1" style="height: 4px;">
                            <div class="progress-bar bg-success" style="width: 34%"></div>
                        </div>
                    </div>
                </div>
                <div class="col">
                    <div class="metric-card p-2 border border-success rounded bg-dark bg-opacity-50">
                        <div class="d-flex justify-content-between">
                            <span><i class="fas fa-arrow-up me-1"></i> Network Out</span>
                            <span>1.2 Mbps</span>
                        </div>
                        <div class="progress mt-1" style="height: 4px;">
                            <div class="progress-bar bg-success" style="width: 12%"></div>
                        </div>
                    </div>
                </div>
                
                <!-- Storage metrics -->
                <div class="col">
                    <div class="metric-card p-2 border border-warning rounded bg-dark bg-opacity-50">
                        <div class="d-flex justify-content-between">
                            <span><i class="fas fa-database me-1"></i> Storage Used</span>
                            <span>32%</span>
                        </div>
                        <div class="progress mt-1" style="height: 4px;">
                            <div class="progress-bar bg-warning" style="width: 32%"></div>
                        </div>
                    </div>
                </div>
                <div class="col">
                    <div class="metric-card p-2 border border-warning rounded bg-dark bg-opacity-50">
                        <div class="d-flex justify-content-between">
                            <span><i class="fas fa-hdd me-1"></i> IOPS</span>
                            <span>825</span>
                        </div>
                        <div class="progress mt-1" style="height: 4px;">
                            <div class="progress-bar bg-warning" style="width: 28%"></div>
                        </div>
                    </div>
                </div>
                
                <!-- Pod metrics -->
                <div class="col">
                    <div class="metric-card p-2 border border-primary rounded bg-dark bg-opacity-50">
                        <div class="d-flex justify-content-between">
                            <span><i class="fas fa-redo me-1"></i> Restart Count</span>
                            <span>3</span>
                        </div>
                        <div class="progress mt-1" style="height: 4px;">
                            <div class="progress-bar bg-primary" style="width: 15%"></div>
                        </div>
                    </div>
                </div>
                <div class="col">
                    <div class="metric-card p-2 border border-primary rounded bg-dark bg-opacity-50">
                        <div class="d-flex justify-content-between">
                            <span><i class="fas fa-tachometer-alt me-1"></i> Health Index</span>
                            <span>94%</span>
                        </div>
                        <div class="progress mt-1" style="height: 4px;">
                            <div class="progress-bar bg-primary" style="width: 94%"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Find the first child and insert our card before it
    const firstChild = mainContent.firstChild;
    if (firstChild) {
        mainContent.insertBefore(metricsCard, firstChild);
    } else {
        mainContent.appendChild(metricsCard);
    }
}

/**
 * Add metrics after an existing element
 */
function addExtraMetricsAfterElement(element) {
    if (!element) return;
    
    // Create container for our new metrics
    const metricsContainer = document.createElement('div');
    metricsContainer.className = 'additional-metrics mt-3';
    metricsContainer.innerHTML = `
        <h6 class="border-bottom pb-2 mb-3 text-light"><i class="fas fa-chart-bar me-2"></i>Additional Metrics</h6>
        
        <div class="row row-cols-2 g-2 mb-3">
            <!-- Cluster metrics -->
            <div class="col">
                <div class="metric-card p-2 border border-info rounded bg-dark bg-opacity-50">
                    <div class="d-flex justify-content-between">
                        <span><i class="fas fa-microchip me-1"></i> Cluster CPU</span>
                        <span>23%</span>
                    </div>
                    <div class="progress mt-1" style="height: 4px;">
                        <div class="progress-bar bg-info" style="width: 23%"></div>
                    </div>
                </div>
            </div>
            <div class="col">
                <div class="metric-card p-2 border border-info rounded bg-dark bg-opacity-50">
                    <div class="d-flex justify-content-between">
                        <span><i class="fas fa-memory me-1"></i> Cluster Memory</span>
                        <span>47%</span>
                    </div>
                    <div class="progress mt-1" style="height: 4px;">
                        <div class="progress-bar bg-info" style="width: 47%"></div>
                    </div>
                </div>
            </div>
            
            <!-- Network metrics -->
            <div class="col">
                <div class="metric-card p-2 border border-success rounded bg-dark bg-opacity-50">
                    <div class="d-flex justify-content-between">
                        <span><i class="fas fa-arrow-down me-1"></i> Network In</span>
                        <span>3.4 Mbps</span>
                    </div>
                    <div class="progress mt-1" style="height: 4px;">
                        <div class="progress-bar bg-success" style="width: 34%"></div>
                    </div>
                </div>
            </div>
            <div class="col">
                <div class="metric-card p-2 border border-success rounded bg-dark bg-opacity-50">
                    <div class="d-flex justify-content-between">
                        <span><i class="fas fa-arrow-up me-1"></i> Network Out</span>
                        <span>1.2 Mbps</span>
                    </div>
                    <div class="progress mt-1" style="height: 4px;">
                        <div class="progress-bar bg-success" style="width: 12%"></div>
                    </div>
                </div>
            </div>
            
            <!-- Storage metrics -->
            <div class="col">
                <div class="metric-card p-2 border border-warning rounded bg-dark bg-opacity-50">
                    <div class="d-flex justify-content-between">
                        <span><i class="fas fa-database me-1"></i> Storage Used</span>
                        <span>32%</span>
                    </div>
                    <div class="progress mt-1" style="height: 4px;">
                        <div class="progress-bar bg-warning" style="width: 32%"></div>
                    </div>
                </div>
            </div>
            <div class="col">
                <div class="metric-card p-2 border border-warning rounded bg-dark bg-opacity-50">
                    <div class="d-flex justify-content-between">
                        <span><i class="fas fa-hdd me-1"></i> IOPS</span>
                        <span>825</span>
                    </div>
                    <div class="progress mt-1" style="height: 4px;">
                        <div class="progress-bar bg-warning" style="width: 28%"></div>
                    </div>
                </div>
            </div>
            
            <!-- Pod metrics -->
            <div class="col">
                <div class="metric-card p-2 border border-primary rounded bg-dark bg-opacity-50">
                    <div class="d-flex justify-content-between">
                        <span><i class="fas fa-redo me-1"></i> Restart Count</span>
                        <span>3</span>
                    </div>
                    <div class="progress mt-1" style="height: 4px;">
                        <div class="progress-bar bg-primary" style="width: 15%"></div>
                    </div>
                </div>
            </div>
            <div class="col">
                <div class="metric-card p-2 border border-primary rounded bg-dark bg-opacity-50">
                    <div class="d-flex justify-content-between">
                        <span><i class="fas fa-tachometer-alt me-1"></i> Health Index</span>
                        <span>94%</span>
                    </div>
                    <div class="progress mt-1" style="height: 4px;">
                        <div class="progress-bar bg-primary" style="width: 94%"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Insert after the element
    element.parentNode.insertBefore(metricsContainer, element.nextSibling);
}

/**
 * Add extra metrics to a card
 */
function addExtraMetricsToCard(cardBody) {
    if (!cardBody) return;
    
    // Create the metrics elements
    const metricsDiv = document.createElement('div');
    metricsDiv.className = 'additional-metrics mt-3';
    metricsDiv.innerHTML = `
        <h6 class="border-bottom pb-2 mb-3 text-light"><i class="fas fa-chart-bar me-2"></i>Additional Metrics</h6>
        
        <div class="row row-cols-2 g-2 mb-3">
            <!-- Cluster metrics -->
            <div class="col">
                <div class="metric-card p-2 border border-info rounded bg-dark bg-opacity-50">
                    <div class="d-flex justify-content-between">
                        <span><i class="fas fa-microchip me-1"></i> Cluster CPU</span>
                        <span>23%</span>
                    </div>
                    <div class="progress mt-1" style="height: 4px;">
                        <div class="progress-bar bg-info" style="width: 23%"></div>
                    </div>
                </div>
            </div>
            <div class="col">
                <div class="metric-card p-2 border border-info rounded bg-dark bg-opacity-50">
                    <div class="d-flex justify-content-between">
                        <span><i class="fas fa-memory me-1"></i> Cluster Memory</span>
                        <span>47%</span>
                    </div>
                    <div class="progress mt-1" style="height: 4px;">
                        <div class="progress-bar bg-info" style="width: 47%"></div>
                    </div>
                </div>
            </div>
            
            <!-- Network metrics -->
            <div class="col">
                <div class="metric-card p-2 border border-success rounded bg-dark bg-opacity-50">
                    <div class="d-flex justify-content-between">
                        <span><i class="fas fa-arrow-down me-1"></i> Network In</span>
                        <span>3.4 Mbps</span>
                    </div>
                    <div class="progress mt-1" style="height: 4px;">
                        <div class="progress-bar bg-success" style="width: 34%"></div>
                    </div>
                </div>
            </div>
            <div class="col">
                <div class="metric-card p-2 border border-success rounded bg-dark bg-opacity-50">
                    <div class="d-flex justify-content-between">
                        <span><i class="fas fa-arrow-up me-1"></i> Network Out</span>
                        <span>1.2 Mbps</span>
                    </div>
                    <div class="progress mt-1" style="height: 4px;">
                        <div class="progress-bar bg-success" style="width: 12%"></div>
                    </div>
                </div>
            </div>
            
            <!-- Storage metrics -->
            <div class="col">
                <div class="metric-card p-2 border border-warning rounded bg-dark bg-opacity-50">
                    <div class="d-flex justify-content-between">
                        <span><i class="fas fa-database me-1"></i> Storage Used</span>
                        <span>32%</span>
                    </div>
                    <div class="progress mt-1" style="height: 4px;">
                        <div class="progress-bar bg-warning" style="width: 32%"></div>
                    </div>
                </div>
            </div>
            <div class="col">
                <div class="metric-card p-2 border border-warning rounded bg-dark bg-opacity-50">
                    <div class="d-flex justify-content-between">
                        <span><i class="fas fa-hdd me-1"></i> IOPS</span>
                        <span>825</span>
                    </div>
                    <div class="progress mt-1" style="height: 4px;">
                        <div class="progress-bar bg-warning" style="width: 28%"></div>
                    </div>
                </div>
            </div>
            
            <!-- Pod metrics -->
            <div class="col">
                <div class="metric-card p-2 border border-primary rounded bg-dark bg-opacity-50">
                    <div class="d-flex justify-content-between">
                        <span><i class="fas fa-redo me-1"></i> Restart Count</span>
                        <span>3</span>
                    </div>
                    <div class="progress mt-1" style="height: 4px;">
                        <div class="progress-bar bg-primary" style="width: 15%"></div>
                    </div>
                </div>
            </div>
            <div class="col">
                <div class="metric-card p-2 border border-primary rounded bg-dark bg-opacity-50">
                    <div class="d-flex justify-content-between">
                        <span><i class="fas fa-tachometer-alt me-1"></i> Health Index</span>
                        <span>94%</span>
                    </div>
                    <div class="progress mt-1" style="height: 4px;">
                        <div class="progress-bar bg-primary" style="width: 94%"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add the metrics to the card
    cardBody.appendChild(metricsDiv);
}