/**
 * Telecom Health Dashboard JS
 * Animated visualization of telecom system health status
 */

// Global variables for telecom dashboard
let telecomNetworkData = {
    "5g_core": {
        nodes: [
            { id: "amf", name: "AMF", status: "healthy", connections: ["smf", "ausf", "udm"], type: "core", x: 200, y: 150 },
            { id: "smf", name: "SMF", status: "healthy", connections: ["upf", "pcf"], type: "core", x: 350, y: 150 },
            { id: "upf", name: "UPF", status: "degraded", connections: [], type: "core", x: 500, y: 150 },
            { id: "ausf", name: "AUSF", status: "healthy", connections: ["udm"], type: "core", x: 200, y: 250 },
            { id: "udm", name: "UDM", status: "healthy", connections: ["udr"], type: "core", x: 200, y: 350 },
            { id: "udr", name: "UDR", status: "healthy", connections: [], type: "core", x: 350, y: 350 },
            { id: "pcf", name: "PCF", status: "healthy", connections: ["udr"], type: "core", x: 350, y: 250 },
            { id: "nrf", name: "NRF", status: "healthy", connections: [], type: "core", x: 280, y: 60 },
            { id: "nssf", name: "NSSF", status: "healthy", connections: [], type: "core", x: 500, y: 60 }
        ]
    },
    "openran": {
        nodes: [
            { id: "o-du", name: "O-DU", status: "degraded", connections: ["o-cu-cp", "o-cu-up", "ric"], type: "ran", x: 150, y: 150 },
            { id: "o-cu-cp", name: "O-CU-CP", status: "healthy", connections: ["o-cu-up", "amf"], type: "ran", x: 150, y: 250 },
            { id: "o-cu-up", name: "O-CU-UP", status: "healthy", connections: ["upf"], type: "ran", x: 150, y: 350 },
            { id: "o-ru", name: "O-RU", status: "healthy", connections: ["o-du"], type: "ran", x: 50, y: 150 },
            { id: "ric", name: "Near-RT RIC", status: "degraded", connections: [], type: "ran", x: 50, y: 250 }
        ]
    }
};

// Configuration options
const telecomDashboardConfig = {
    nodeRadius: 30,
    pulseRadius: 40,
    animationDuration: 2000,  // 2 seconds
    refreshInterval: 10000,    // 10 seconds
    statusColors: {
        "healthy": "#28a745",
        "degraded": "#ffc107",
        "critical": "#dc3545",
        "unknown": "#6c757d"
    },
    typeColors: {
        "core": "#007bff",
        "ran": "#6610f2",
        "edge": "#fd7e14"
    }
};

// Canvas context
let telecomCanvasCtx = null;

/**
 * Initialize the telecom health dashboard
 */
function initTelecomHealthDashboard() {
    console.log('Initializing telecom health dashboard');
    
    // Get the canvas element
    const canvas = document.getElementById('telecom-network-canvas');
    if (!canvas) {
        console.error('Telecom network canvas not found');
        // Don't return early - just skip canvas-related code
        // This allows the function to continue running when switching tabs
    } else {
        // Only proceed with canvas operations if it exists
        // Set canvas dimensions to match container
        const container = canvas.parentElement;
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        
        // Get the canvas context
        telecomCanvasCtx = canvas.getContext('2d');
        
        // Initial render
        renderTelecomNetwork();
        
        // Add click event to canvas
        canvas.addEventListener('click', handleNodeClick);
        
        // Add window resize event handler
        window.addEventListener('resize', () => {
            canvas.width = container.clientWidth;
            canvas.height = container.clientHeight;
            renderTelecomNetwork();
        });
    }
    
    // Set up auto-refresh - only if we're on the telecom page
    if (document.getElementById('telecom-stats-container')) {
        setInterval(fetchTelecomHealth, telecomDashboardConfig.refreshInterval);
    }
}

/**
 * Fetch telecom health data from the API
 */
function fetchTelecomHealth() {
    axios.get('/api/telecom/health')
        .then(response => {
            updateTelecomNetworkData(response.data);
            renderTelecomNetwork();
        })
        .catch(error => {
            console.error('Error fetching telecom health data:', error);
            // Use demo data for errors - in production, you might want to show an error state
            updateDemoData();
            renderTelecomNetwork();
        });
}

/**
 * Update telecom network data for demo/testing purposes
 */
function updateDemoData() {
    // Randomly update statuses for demo
    const statuses = ["healthy", "degraded", "critical"];
    
    // Update 5G Core nodes
    telecomNetworkData["5g_core"].nodes.forEach(node => {
        if (Math.random() < 0.3) { // 30% chance to change status
            node.status = statuses[Math.floor(Math.random() * statuses.length)];
        }
    });
    
    // Update OpenRAN nodes
    telecomNetworkData["openran"].nodes.forEach(node => {
        if (Math.random() < 0.3) { // 30% chance to change status
            node.status = statuses[Math.floor(Math.random() * statuses.length)];
        }
    });
}

/**
 * Update telecom network data from API response
 * @param {Object} data - Telecom health data from API
 */
function updateTelecomNetworkData(data) {
    // Update 5G Core nodes
    if (data["5g_core"] && data["5g_core"].nodes) {
        data["5g_core"].nodes.forEach(nodeData => {
            const existingNode = telecomNetworkData["5g_core"].nodes.find(n => n.id === nodeData.id);
            if (existingNode) {
                existingNode.status = nodeData.status;
            }
        });
    }
    
    // Update OpenRAN nodes
    if (data["openran"] && data["openran"].nodes) {
        data["openran"].nodes.forEach(nodeData => {
            const existingNode = telecomNetworkData["openran"].nodes.find(n => n.id === nodeData.id);
            if (existingNode) {
                existingNode.status = nodeData.status;
            }
        });
    }
}

/**
 * Handle click events on network nodes
 * @param {Event} event - Canvas click event
 */
function handleNodeClick(event) {
    const rect = event.target.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Check if a node was clicked
    const clickedNode = findClickedNode(x, y);
    
    if (clickedNode) {
        showNodeDetails(clickedNode);
    }
}

/**
 * Find which node was clicked, if any
 * @param {number} x - Canvas X coordinate
 * @param {number} y - Canvas Y coordinate
 * @returns {Object|null} - The clicked node or null
 */
function findClickedNode(x, y) {
    // Check 5G Core nodes
    for (const node of telecomNetworkData["5g_core"].nodes) {
        const dx = node.x - x;
        const dy = node.y - y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= telecomDashboardConfig.nodeRadius) {
            return { ...node, domain: "5g_core" };
        }
    }
    
    // Check OpenRAN nodes
    for (const node of telecomNetworkData["openran"].nodes) {
        const dx = node.x - x;
        const dy = node.y - y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= telecomDashboardConfig.nodeRadius) {
            return { ...node, domain: "openran" };
        }
    }
    
    return null;
}

/**
 * Show node details in the sidebar
 * @param {Object} node - The selected node
 */
function showNodeDetails(node) {
    const detailsElement = document.getElementById('telecom-node-details');
    if (!detailsElement) return;
    
    // Update the details panel
    detailsElement.innerHTML = `
        <div class="card-header bg-transparent">
            <h5 class="mb-0">
                <i class="fas fa-server me-2"></i> ${node.name} Details
            </h5>
        </div>
        <div class="card-body">
            <div class="mb-3">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <span>Status</span>
                    <span class="badge bg-${getStatusBadgeClass(node.status)}">${node.status.toUpperCase()}</span>
                </div>
                <div class="d-flex justify-content-between mb-2">
                    <span>Type</span>
                    <span>${node.domain === "5g_core" ? "5G Core" : "OpenRAN"}</span>
                </div>
                <div class="d-flex justify-content-between mb-2">
                    <span>Component</span>
                    <span>${node.name}</span>
                </div>
            </div>
            
            <div class="mt-3">
                <h6 class="mb-2">Connected Components</h6>
                <ul class="list-group">
                    ${renderConnectedNodes(node)}
                </ul>
            </div>
            
            <div class="mt-3">
                <button class="btn btn-sm btn-primary" onclick="fetchNodeLogs('${node.id}')">
                    <i class="fas fa-search me-1"></i> View Logs
                </button>
                <button class="btn btn-sm btn-outline-secondary" onclick="analyzeNodeIssues('${node.id}')">
                    <i class="fas fa-stethoscope me-1"></i> Analyze Issues
                </button>
            </div>
        </div>
    `;
    
    // Show details panel if it was hidden
    detailsElement.style.display = 'block';
}

/**
 * Render the list of connected nodes
 * @param {Object} node - The selected node
 * @returns {string} HTML for connected nodes list
 */
function renderConnectedNodes(node) {
    if (!node.connections || node.connections.length === 0) {
        return '<li class="list-group-item text-muted">No connections</li>';
    }
    
    let html = '';
    node.connections.forEach(connId => {
        // Find the connected node in either domain
        let connectedNode = telecomNetworkData["5g_core"].nodes.find(n => n.id === connId);
        let domain = "5G Core";
        
        if (!connectedNode) {
            connectedNode = telecomNetworkData["openran"].nodes.find(n => n.id === connId);
            domain = "OpenRAN";
        }
        
        if (connectedNode) {
            const statusClass = getStatusBadgeClass(connectedNode.status);
            html += `
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    ${connectedNode.name} <span class="text-muted small">(${domain})</span>
                    <span class="badge bg-${statusClass}">${connectedNode.status}</span>
                </li>
            `;
        }
    });
    
    return html;
}

/**
 * Fetch logs specific to a network node
 * @param {string} nodeId - The ID of the node
 */
function fetchNodeLogs(nodeId) {
    console.log(`Fetching logs for node: ${nodeId}`);
    
    // Construct filter based on node ID
    let filter = '';
    
    // Map node ID to service name in logs
    if (nodeId === 'amf') {
        filter = 'AMF';
    } else if (nodeId === 'smf') {
        filter = 'SMF';
    } else if (nodeId === 'upf') {
        filter = 'UPF';
    } else if (nodeId === 'o-du') {
        filter = 'O-DU';
    } else if (nodeId === 'o-cu-cp') {
        filter = 'O-CU-CP';
    } else if (nodeId === 'o-cu-up') {
        filter = 'O-CU-UP';
    } else if (nodeId === 'o-ru') {
        filter = 'O-RU';
    } else if (nodeId === 'ric') {
        filter = 'RIC';
    } else {
        filter = nodeId.toUpperCase();
    }
    
    // Update log search and trigger filtering
    const searchInput = document.getElementById('log-search');
    if (searchInput) {
        searchInput.value = filter;
        
        // Trigger search event
        const searchButton = document.getElementById('search-button');
        if (searchButton) {
            searchButton.click();
        }
    }
}

/**
 * Analyze issues for a specific node
 * @param {string} nodeId - The ID of the node
 */
function analyzeNodeIssues(nodeId) {
    console.log(`Analyzing issues for node: ${nodeId}`);
    
    // Construct query based on node ID
    let query = '';
    
    // Map node ID to a meaningful query
    if (nodeId === 'amf') {
        query = 'Analyze AMF connection and service request issues';
    } else if (nodeId === 'smf') {
        query = 'Analyze SMF session management issues';
    } else if (nodeId === 'upf') {
        query = 'Analyze UPF data path and N4 interface issues';
    } else if (nodeId === 'o-du') {
        query = 'Analyze O-DU resource and E2 interface issues';
    } else if (nodeId === 'o-cu-cp') {
        query = 'Analyze O-CU-CP control plane issues';
    } else if (nodeId === 'o-cu-up') {
        query = 'Analyze O-CU-UP user plane issues';
    } else if (nodeId === 'ric') {
        query = 'Analyze RIC xApp communication issues';
    } else {
        query = `Analyze ${nodeId.toUpperCase()} issues`;
    }
    
    // Update issue description and trigger analysis
    const issueDescription = document.getElementById('issue-description');
    if (issueDescription) {
        issueDescription.value = query;
        
        // Trigger analysis
        const analyzeButton = document.getElementById('analyze-button');
        if (analyzeButton) {
            analyzeButton.click();
        }
    }
}

/**
 * Get the Bootstrap badge class for a status
 * @param {string} status - Node status
 * @returns {string} - Badge class
 */
function getStatusBadgeClass(status) {
    switch (status.toLowerCase()) {
        case 'healthy':
            return 'success';
        case 'degraded':
            return 'warning';
        case 'critical':
            return 'danger';
        default:
            return 'secondary';
    }
}

/**
 * Render the telecom network visualization
 */
function renderTelecomNetwork() {
    // Check if canvas context exists - might not if we switched to another tab
    if (!telecomCanvasCtx || !telecomCanvasCtx.canvas) {
        console.log('No canvas context available for telecom network visualization');
        return;
    }
    
    try {
        // Clear canvas
        telecomCanvasCtx.clearRect(0, 0, telecomCanvasCtx.canvas.width, telecomCanvasCtx.canvas.height);
        
        // Draw network connections first (so they appear behind nodes)
        drawNetworkConnections();
        
        // Draw 5G Core nodes
        telecomNetworkData["5g_core"].nodes.forEach(node => {
            drawNetworkNode(node, "5G Core");
        });
        
        // Draw OpenRAN nodes
        telecomNetworkData["openran"].nodes.forEach(node => {
            drawNetworkNode(node, "OpenRAN");
        });
    } catch (error) {
        console.error('Error rendering telecom network:', error);
    }
}

/**
 * Draw network connections between nodes
 */
function drawNetworkConnections() {
    if (!telecomCanvasCtx) return;
    
    try {
        // Draw 5G Core connections
        if (telecomNetworkData && telecomNetworkData["5g_core"] && telecomNetworkData["5g_core"].nodes) {
            telecomNetworkData["5g_core"].nodes.forEach(node => {
                if (node.connections && node.connections.length > 0) {
                    node.connections.forEach(targetId => {
                        // Find target node in 5G Core
                        let targetNode = telecomNetworkData["5g_core"].nodes.find(n => n.id === targetId);
                        let sourceDomain = "5g_core";
                        let targetDomain = "5g_core";
                        
                        // If not found in 5G Core, look in OpenRAN
                        if (!targetNode && telecomNetworkData["openran"] && telecomNetworkData["openran"].nodes) {
                            targetNode = telecomNetworkData["openran"].nodes.find(n => n.id === targetId);
                            targetDomain = "openran";
                        }
                        
                        if (targetNode) {
                            drawConnection(node, targetNode, sourceDomain, targetDomain);
                        }
                    });
                }
            });
        }
        
        // Draw OpenRAN connections
        if (telecomNetworkData && telecomNetworkData["openran"] && telecomNetworkData["openran"].nodes) {
            telecomNetworkData["openran"].nodes.forEach(node => {
                if (node.connections && node.connections.length > 0) {
                    node.connections.forEach(targetId => {
                        // Find target node in OpenRAN
                        let targetNode = telecomNetworkData["openran"].nodes.find(n => n.id === targetId);
                        let sourceDomain = "openran";
                        let targetDomain = "openran";
                        
                        // If not found in OpenRAN, look in 5G Core
                        if (!targetNode && telecomNetworkData["5g_core"] && telecomNetworkData["5g_core"].nodes) {
                            targetNode = telecomNetworkData["5g_core"].nodes.find(n => n.id === targetId);
                            targetDomain = "5g_core";
                        }
                        
                        // Only draw if not already drawn (avoid duplicates)
                        if (targetNode && sourceDomain === "openran") {
                            drawConnection(node, targetNode, sourceDomain, targetDomain);
                        }
                    });
                }
            });
        }
    } catch (error) {
        console.error('Error drawing network connections:', error);
    }
}

/**
 * Draw a connection between two nodes
 * @param {Object} sourceNode - Source node
 * @param {Object} targetNode - Target node
 * @param {string} sourceDomain - Domain of source node
 * @param {string} targetDomain - Domain of target node
 */
function drawConnection(sourceNode, targetNode, sourceDomain, targetDomain) {
    // Get connection status (worst of the two nodes)
    let connectionStatus = "healthy";
    if (sourceNode.status === "critical" || targetNode.status === "critical") {
        connectionStatus = "critical";
    } else if (sourceNode.status === "degraded" || targetNode.status === "degraded") {
        connectionStatus = "degraded";
    }
    
    // Set line style based on status
    telecomCanvasCtx.strokeStyle = telecomDashboardConfig.statusColors[connectionStatus];
    telecomCanvasCtx.lineWidth = 2;
    
    // Draw dashed line if degraded
    if (connectionStatus === "degraded") {
        telecomCanvasCtx.setLineDash([5, 3]);
    } else if (connectionStatus === "critical") {
        telecomCanvasCtx.setLineDash([2, 2]);
    } else {
        telecomCanvasCtx.setLineDash([]);
    }
    
    // Draw line
    telecomCanvasCtx.beginPath();
    telecomCanvasCtx.moveTo(sourceNode.x, sourceNode.y);
    telecomCanvasCtx.lineTo(targetNode.x, targetNode.y);
    telecomCanvasCtx.stroke();
    
    // Reset line dash
    telecomCanvasCtx.setLineDash([]);
    
    // Draw data packets moving along the line for animation
    animateDataPackets(sourceNode, targetNode, connectionStatus);
}

/**
 * Animate data packets moving along connections
 * @param {Object} sourceNode - Source node
 * @param {Object} targetNode - Target node
 * @param {string} status - Connection status
 */
function animateDataPackets(sourceNode, targetNode, status) {
    // Only animate healthy or degraded connections
    if (status === "critical") return;
    
    // Calculate packet position based on time
    const now = Date.now();
    const dx = targetNode.x - sourceNode.x;
    const dy = targetNode.y - sourceNode.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Create animation timing
    const period = telecomDashboardConfig.animationDuration;
    const phase = (now % period) / period;
    
    // Draw packet
    const packetRadius = 3;
    const x = sourceNode.x + dx * phase;
    const y = sourceNode.y + dy * phase;
    
    telecomCanvasCtx.fillStyle = status === "healthy" ? "#28a745" : "#ffc107";
    telecomCanvasCtx.beginPath();
    telecomCanvasCtx.arc(x, y, packetRadius, 0, 2 * Math.PI);
    telecomCanvasCtx.fill();
}

/**
 * Draw a network node
 * @param {Object} node - The node to draw
 * @param {string} domain - Domain the node belongs to
 */
function drawNetworkNode(node, domain) {
    const { x, y, status, name, type } = node;
    const { nodeRadius, statusColors, typeColors } = telecomDashboardConfig;
    
    // Draw node background
    telecomCanvasCtx.fillStyle = typeColors[type] || "#6c757d";
    telecomCanvasCtx.beginPath();
    telecomCanvasCtx.arc(x, y, nodeRadius, 0, 2 * Math.PI);
    telecomCanvasCtx.fill();
    
    // Draw status border
    telecomCanvasCtx.strokeStyle = statusColors[status] || statusColors.unknown;
    telecomCanvasCtx.lineWidth = 3;
    telecomCanvasCtx.beginPath();
    telecomCanvasCtx.arc(x, y, nodeRadius, 0, 2 * Math.PI);
    telecomCanvasCtx.stroke();
    
    // Draw node label
    telecomCanvasCtx.fillStyle = "#ffffff";
    telecomCanvasCtx.font = "12px Arial";
    telecomCanvasCtx.textAlign = "center";
    telecomCanvasCtx.textBaseline = "middle";
    telecomCanvasCtx.fillText(name, x, y);
    
    // Draw animated pulse for critical/degraded nodes
    if (status === "critical" || status === "degraded") {
        drawPulse(x, y, status);
    }
}

/**
 * Draw animated pulse around node
 * @param {number} x - Node x position
 * @param {number} y - Node y position
 * @param {string} status - Node status
 */
function drawPulse(x, y, status) {
    const now = Date.now();
    const period = telecomDashboardConfig.animationDuration;
    const phase = (now % period) / period;
    
    // Calculate pulse radius
    const baseRadius = telecomDashboardConfig.nodeRadius;
    const maxPulseRadius = telecomDashboardConfig.pulseRadius;
    const pulseRadius = baseRadius + (maxPulseRadius - baseRadius) * phase;
    
    // Calculate pulse opacity
    const maxOpacity = status === "critical" ? 0.7 : 0.5;
    const opacity = maxOpacity * (1 - phase);
    
    // Draw pulse
    telecomCanvasCtx.strokeStyle = status === "critical" 
        ? `rgba(220, 53, 69, ${opacity})` // Red for critical
        : `rgba(255, 193, 7, ${opacity})`; // Yellow for degraded
        
    telecomCanvasCtx.lineWidth = 2;
    telecomCanvasCtx.beginPath();
    telecomCanvasCtx.arc(x, y, pulseRadius, 0, 2 * Math.PI);
    telecomCanvasCtx.stroke();
}

// Schedule periodic redrawing for animations
function startAnimationLoop() {
    function animate() {
        renderTelecomNetwork();
        requestAnimationFrame(animate);
    }
    animate();
}

// Initialize on document ready
document.addEventListener('DOMContentLoaded', () => {
    // Add this initialization to your existing DOMContentLoaded handler
    if (document.getElementById('telecom-network-canvas')) {
        initTelecomHealthDashboard();
        startAnimationLoop();
    }
});