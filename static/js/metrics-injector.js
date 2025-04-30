// This script directly injects metrics into the page
document.addEventListener('DOMContentLoaded', function() {
    console.log('Metrics Injector: Starting direct HTML injection');
    
    // List of pages where we should NOT inject Kubernetes metrics
    const excludedPages = [
        '/telecom-health',
        '/ai-assistant',
        '/data-pipeline',
        '/fine-tuning',
        '/ai-predictive-maintenance',
        '/vector-search',
        '/telecom_health',
        '/ai_assistant',
        '/data_pipeline',
        '/fine_tuning',
        '/ai_predictive_maintenance',
        '/vector_search'
    ];
    
    // Check if current page is excluded
    const currentPath = window.location.pathname;
    if (excludedPages.includes(currentPath)) {
        console.log('Metrics Injector: Current page is excluded from Kubernetes metrics injection:', currentPath);
        return;
    }
    
    // Helper function to find Kubernetes monitoring widget
    function findKubernetesWidget() {
        // Try to find the card with Kubernetes in the header
        const headers = document.querySelectorAll('.card-header');
        for (const header of headers) {
            if (header.textContent.includes('Kubernetes')) {
                console.log('Metrics Injector: Found Kubernetes header', header);
                const card = header.closest('.card');
                if (card) {
                    const cardBody = card.querySelector('.card-body');
                    if (cardBody) return cardBody;
                }
            }
        }
        return null;
    }
    
    // Function to inject metrics into the Kubernetes monitoring widget
    function injectMetricsIntoKubernetesWidget(widget) {
        // Create a container for our metrics
        const metricsDiv = document.createElement('div');
        metricsDiv.className = 'additional-k8s-metrics mt-4 border-top pt-3';
        metricsDiv.innerHTML = `
            <h6 class="text-light mb-3">
                <i class="fas fa-chart-line me-2"></i> Additional Metrics
            </h6>
            <div class="row row-cols-1 row-cols-md-2 g-3 metrics-row">
                <!-- Cluster metrics with circular gauges -->
                <div class="col">
                    <div class="metric-card p-2 border border-info rounded bg-dark bg-opacity-50">
                        <h6 class="mb-2 text-center"><i class="fas fa-microchip me-1"></i> Cluster CPU</h6>
                        <div class="gauge-container">
                            <div class="gauge">
                                <div class="gauge-bg"></div>
                                <div class="gauge-color-ring"></div>
                                <div class="gauge-inner"></div>
                                <div class="gauge-needle" style="--rotation: 23"></div>
                                <div class="gauge-value">23</div>
                                <div class="gauge-unit">%</div>
                                <div class="gauge-min">0</div>
                                <div class="gauge-max">100</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col">
                    <div class="metric-card p-2 border border-info rounded bg-dark bg-opacity-50">
                        <h6 class="mb-2 text-center"><i class="fas fa-memory me-1"></i> Cluster Memory</h6>
                        <div class="gauge-container">
                            <div class="gauge">
                                <div class="gauge-bg"></div>
                                <div class="gauge-color-ring"></div>
                                <div class="gauge-inner"></div>
                                <div class="gauge-needle" style="--rotation: 47"></div>
                                <div class="gauge-value">47</div>
                                <div class="gauge-unit">%</div>
                                <div class="gauge-min">0</div>
                                <div class="gauge-max">100</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Network metrics (with circular gauges) -->
                <div class="col">
                    <div class="metric-card p-2 border border-success rounded bg-dark bg-opacity-50">
                        <h6 class="mb-2 text-center"><i class="fas fa-arrow-down me-1"></i> Network In</h6>
                        <div class="gauge-container">
                            <div class="gauge">
                                <div class="gauge-bg"></div>
                                <div class="gauge-color-ring"></div>
                                <div class="gauge-inner"></div>
                                <div class="gauge-needle" style="--rotation: 34"></div>
                                <div class="gauge-value">3.4</div>
                                <div class="gauge-unit">Mbps</div>
                                <div class="gauge-min">0</div>
                                <div class="gauge-max">10</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col">
                    <div class="metric-card p-2 border border-success rounded bg-dark bg-opacity-50">
                        <h6 class="mb-2 text-center"><i class="fas fa-arrow-up me-1"></i> Network Out</h6>
                        <div class="gauge-container">
                            <div class="gauge">
                                <div class="gauge-bg"></div>
                                <div class="gauge-color-ring"></div>
                                <div class="gauge-inner"></div>
                                <div class="gauge-needle" style="--rotation: 12"></div>
                                <div class="gauge-value">1.2</div>
                                <div class="gauge-unit">Mbps</div>
                                <div class="gauge-min">0</div>
                                <div class="gauge-max">10</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Storage metrics with circular gauges -->
                <div class="col">
                    <div class="metric-card p-2 border border-warning rounded bg-dark bg-opacity-50">
                        <h6 class="mb-2 text-center"><i class="fas fa-database me-1"></i> Storage Used</h6>
                        <div class="gauge-container">
                            <div class="gauge">
                                <div class="gauge-bg"></div>
                                <div class="gauge-color-ring"></div>
                                <div class="gauge-inner"></div>
                                <div class="gauge-needle" style="--rotation: 32"></div>
                                <div class="gauge-value">32</div>
                                <div class="gauge-unit">%</div>
                                <div class="gauge-min">0</div>
                                <div class="gauge-max">100</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col">
                    <div class="metric-card p-2 border border-warning rounded bg-dark bg-opacity-50">
                        <h6 class="mb-2 text-center"><i class="fas fa-hdd me-1"></i> IOPS</h6>
                        <div class="gauge-container">
                            <div class="gauge">
                                <div class="gauge-bg"></div>
                                <div class="gauge-color-ring"></div>
                                <div class="gauge-inner"></div>
                                <div class="gauge-needle" style="--rotation: 28"></div>
                                <div class="gauge-value">825</div>
                                <div class="gauge-unit">ops</div>
                                <div class="gauge-min">0</div>
                                <div class="gauge-max">3K</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Pod metrics removed as requested -->
            </div>
        `;
        
        // Append to the widget
        widget.appendChild(metricsDiv);
        console.log('Metrics Injector: Successfully injected metrics inside Kubernetes widget');
    }
    
    // Use setTimeout to ensure the DOM is fully loaded
    setTimeout(() => {
        // First, try to find the Kubernetes Monitoring widget
        const kubernetesWidget = findKubernetesWidget();
        if (kubernetesWidget) {
            console.log('Metrics Injector: Found Kubernetes Monitoring widget, injecting metrics inside it');
            injectMetricsIntoKubernetesWidget(kubernetesWidget);
            return;
        }
        
        // If no widget found directly, try finding the card by matching part of the text
        const allCards = document.querySelectorAll('.card');
        let k8sCard = null;
        
        allCards.forEach(card => {
            const cardText = card.textContent || '';
            if (cardText.includes('Kubernetes') || cardText.includes('Cluster Health') || 
                cardText.includes('Pods') || cardText.includes('Deployments')) {
                k8sCard = card;
            }
        });
        
        if (k8sCard) {
            console.log('Metrics Injector: Found Kubernetes card by text content');
            const cardBody = k8sCard.querySelector('.card-body');
            if (cardBody) {
                injectMetricsIntoKubernetesWidget(cardBody);
                return;
            }
        }
        
        // If we can't find the widget, check if we're on the main dashboard
        // Only inject standalone metrics on the main dashboard, not other pages
        if (currentPath !== '/' && currentPath !== '/index') {
            console.log('Metrics Injector: Not on main dashboard, skipping standalone metrics injection');
            return;
        }
        
        // Find main content area
        const mainContent = document.querySelector('.col-md-10.col-sm-9');
        if (!mainContent) {
            console.error('Metrics Injector: Could not find main content container');
            return;
        }
        
        // Create container for metrics
        const metricsContainer = document.createElement('div');
        metricsContainer.className = 'card bg-dark border-primary shadow-sm mb-4';
        metricsContainer.id = 'kubernetes-metrics-card';
        
        // Set HTML content
        metricsContainer.innerHTML = `
            <div class="card-header bg-primary bg-opacity-25">
                <h5 class="card-title mb-0 text-white">
                    <i class="fas fa-chart-line me-2"></i> Kubernetes Additional Metrics
                </h5>
            </div>
            <div class="card-body">
                <div class="row row-cols-1 row-cols-md-2 g-3 metrics-row">
                    <!-- Cluster metrics -->
                    <div class="col">
                        <div class="card h-100 bg-dark border-info">
                            <div class="card-body p-3">
                                <h6 class="card-title text-info">
                                    <i class="fas fa-microchip me-2"></i> Cluster CPU
                                </h6>
                                <div class="d-flex justify-content-between align-items-center">
                                    <div class="display-6 text-info">23%</div>
                                    <div class="text-muted small">Average utilization</div>
                                </div>
                                <div class="progress mt-2" style="height: 6px;">
                                    <div class="progress-bar bg-info" style="width: 23%"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col">
                        <div class="card h-100 bg-dark border-info">
                            <div class="card-body p-3">
                                <h6 class="card-title text-info">
                                    <i class="fas fa-memory me-2"></i> Cluster Memory
                                </h6>
                                <div class="d-flex justify-content-between align-items-center">
                                    <div class="display-6 text-info">47%</div>
                                    <div class="text-muted small">Total usage</div>
                                </div>
                                <div class="progress mt-2" style="height: 6px;">
                                    <div class="progress-bar bg-info" style="width: 47%"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Network metrics -->
                    <div class="col">
                        <div class="card h-100 bg-dark border-success">
                            <div class="card-body p-3">
                                <h6 class="card-title text-success">
                                    <i class="fas fa-arrow-down me-2"></i> Network In
                                </h6>
                                <div class="d-flex justify-content-between align-items-center">
                                    <div class="display-6 text-success">3.4</div>
                                    <div class="text-muted small">Mbps</div>
                                </div>
                                <div class="progress mt-2" style="height: 6px;">
                                    <div class="progress-bar bg-success" style="width: 34%"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col">
                        <div class="card h-100 bg-dark border-success">
                            <div class="card-body p-3">
                                <h6 class="card-title text-success">
                                    <i class="fas fa-arrow-up me-2"></i> Network Out
                                </h6>
                                <div class="d-flex justify-content-between align-items-center">
                                    <div class="display-6 text-success">1.2</div>
                                    <div class="text-muted small">Mbps</div>
                                </div>
                                <div class="progress mt-2" style="height: 6px;">
                                    <div class="progress-bar bg-success" style="width: 12%"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Storage metrics -->
                    <div class="col">
                        <div class="card h-100 bg-dark border-warning">
                            <div class="card-body p-3">
                                <h6 class="card-title text-warning">
                                    <i class="fas fa-database me-2"></i> Storage Used
                                </h6>
                                <div class="d-flex justify-content-between align-items-center">
                                    <div class="display-6 text-warning">32%</div>
                                    <div class="text-muted small">Disk capacity</div>
                                </div>
                                <div class="progress mt-2" style="height: 6px;">
                                    <div class="progress-bar bg-warning" style="width: 32%"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col">
                        <div class="card h-100 bg-dark border-warning">
                            <div class="card-body p-3">
                                <h6 class="card-title text-warning">
                                    <i class="fas fa-hdd me-2"></i> IOPS
                                </h6>
                                <div class="d-flex justify-content-between align-items-center">
                                    <div class="display-6 text-warning">825</div>
                                    <div class="text-muted small">Operations/sec</div>
                                </div>
                                <div class="progress mt-2" style="height: 6px;">
                                    <div class="progress-bar bg-warning" style="width: 28%"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Pod metrics -->
                    <div class="col">
                        <div class="card h-100 bg-dark border-primary">
                            <div class="card-body p-3">
                                <h6 class="card-title text-primary">
                                    <i class="fas fa-redo me-2"></i> Restart Count
                                </h6>
                                <div class="d-flex justify-content-between align-items-center">
                                    <div class="display-6 text-primary">3</div>
                                    <div class="text-muted small">Last 24 hours</div>
                                </div>
                                <div class="progress mt-2" style="height: 6px;">
                                    <div class="progress-bar bg-primary" style="width: 15%"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col">
                        <div class="card h-100 bg-dark border-primary">
                            <div class="card-body p-3">
                                <h6 class="card-title text-primary">
                                    <i class="fas fa-tachometer-alt me-2"></i> Health Index
                                </h6>
                                <div class="d-flex justify-content-between align-items-center">
                                    <div class="display-6 text-primary">94%</div>
                                    <div class="text-muted small">Overall score</div>
                                </div>
                                <div class="progress mt-2" style="height: 6px;">
                                    <div class="progress-bar bg-primary" style="width: 94%"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Insert at the beginning of the main content
        if (mainContent.firstChild) {
            mainContent.insertBefore(metricsContainer, mainContent.firstChild);
            console.log('Metrics Injector: Successfully injected metrics card');
        } else {
            mainContent.appendChild(metricsContainer);
            console.log('Metrics Injector: Appended metrics card to empty container');
        }
    }, 300); // Slight delay to ensure DOM is fully loaded
});