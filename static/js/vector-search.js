/**
 * Enhanced Vector Search with Filtering for L1 Monitoring Application
 * Provides advanced filtering capabilities for vector-based log searches
 */

/**
 * Initialize the vector search functionality
 */
function initVectorSearch() {
    console.log("Initializing Enhanced Vector Search");
    
    // Set up event listeners
    setupFilterPanel();
    setupVectorSearchEventListener();
    setupMetadataFilters();
}

/**
 * Setup the filter panel toggle
 */
function setupFilterPanel() {
    const filterToggle = document.getElementById('filter-toggle');
    const filterPanel = document.getElementById('filter-panel');
    
    if (filterToggle && filterPanel) {
        filterToggle.addEventListener('click', () => {
            const isVisible = filterPanel.classList.toggle('show');
            
            // Update toggle text based on visibility
            filterToggle.innerHTML = isVisible 
                ? '<i class="fas fa-chevron-up me-1"></i> Hide Filters'
                : '<i class="fas fa-filter me-1"></i> Show Filters';
        });
    }
}

/**
 * Setup the vector search button event listener
 */
function setupVectorSearchEventListener() {
    const searchButton = document.getElementById('vector-search-btn');
    const searchInput = document.getElementById('vector-search-input');
    
    if (searchButton && searchInput) {
        // Handle search button click
        searchButton.addEventListener('click', () => {
            const query = searchInput.value.trim();
            if (query) {
                performVectorSearch(query);
            } else {
                showNotification('Please enter a search query', 'warning');
            }
        });
        
        // Handle Enter key in search input
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                searchButton.click();
            }
        });
    }
}

/**
 * Setup custom metadata filter management
 */
function setupMetadataFilters() {
    const addFilterButton = document.getElementById('add-metadata-filter');
    const filtersContainer = document.getElementById('metadata-filters');
    
    if (addFilterButton && filtersContainer) {
        addFilterButton.addEventListener('click', () => {
            addMetadataFilter(filtersContainer);
        });
        
        // Add first filter row if container is empty
        if (filtersContainer.children.length === 0) {
            addMetadataFilter(filtersContainer);
        }
    }
}

/**
 * Add a new metadata filter row
 * @param {HTMLElement} container - The container for metadata filters
 */
function addMetadataFilter(container) {
    const filterId = `metadata-filter-${Date.now()}`;
    const filterHTML = `
        <div class="custom-metadata-filter row mb-2" id="${filterId}">
            <div class="col">
                <input type="text" class="form-control form-control-sm metadata-key" 
                       placeholder="Field name">
            </div>
            <div class="col">
                <input type="text" class="form-control form-control-sm metadata-value" 
                       placeholder="Value">
            </div>
            <div class="col-auto">
                <button type="button" class="btn btn-sm btn-outline-danger remove-filter-btn">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
    `;
    
    // Add to container
    container.insertAdjacentHTML('beforeend', filterHTML);
    
    // Add remove button event listener
    const newFilter = document.getElementById(filterId);
    const removeBtn = newFilter.querySelector('.remove-filter-btn');
    
    removeBtn.addEventListener('click', () => {
        newFilter.remove();
    });
}

/**
 * Get all active filters from the UI
 * @returns {Object} - Object with filter criteria
 */
function getActiveFilters() {
    const filters = {};
    
    // Get log level filter
    const levelFilter = document.getElementById('log-level-filter');
    if (levelFilter && levelFilter.value) {
        filters.level = levelFilter.value;
    }
    
    // Get service filter
    const serviceFilter = document.getElementById('service-filter');
    if (serviceFilter && serviceFilter.value) {
        filters.service = serviceFilter.value;
    }
    
    // Get date range filter
    const startDate = document.getElementById('date-range-start');
    const endDate = document.getElementById('date-range-end');
    
    if (startDate && startDate.value && endDate && endDate.value) {
        filters.time_range = {
            start: startDate.value,
            end: endDate.value
        };
    }
    
    // Get custom metadata filters
    const metadataFilters = document.querySelectorAll('.custom-metadata-filter');
    if (metadataFilters.length > 0) {
        filters.custom_metadata = {};
        
        metadataFilters.forEach(filter => {
            const key = filter.querySelector('.metadata-key').value;
            const value = filter.querySelector('.metadata-value').value;
            
            if (key && value) {
                filters.custom_metadata[key] = value;
            }
        });
        
        // If no metadata filters were set, remove the property
        if (Object.keys(filters.custom_metadata).length === 0) {
            delete filters.custom_metadata;
        }
    }
    
    return filters;
}

/**
 * Perform vector search with filters
 * @param {string} query - The search query
 */
function performVectorSearch(query) {
    // Show loading state
    setSearchLoadingState(true);
    const resultsContainer = document.getElementById('search-results-container');
    if (resultsContainer) {
        resultsContainer.innerHTML = `
            <div class="text-center p-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2">Searching logs...</p>
            </div>
        `;
        resultsContainer.style.display = 'block';
    }
    
    // Get filters
    const filters = getActiveFilters();
    
    // Make API request
    fetch('/api/vector-search', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            query: query,
            filters: filters,
            limit: 20 // Get more results for better filtering
        }),
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Error: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        // Display search results
        displaySearchResults(data);
        setSearchLoadingState(false);
    })
    .catch(error => {
        console.error('Error performing vector search:', error);
        // Display error message
        displaySearchError(`Failed to perform search: ${error.message}`);
        setSearchLoadingState(false);
    });
}

/**
 * Set the loading state during search
 * @param {boolean} isLoading - Whether search is loading
 */
function setSearchLoadingState(isLoading) {
    const searchButton = document.getElementById('vector-search-btn');
    
    if (searchButton) {
        if (isLoading) {
            searchButton.disabled = true;
            searchButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Searching...';
        } else {
            searchButton.disabled = false;
            searchButton.innerHTML = '<i class="fas fa-search me-2"></i> Search';
        }
    }
}

/**
 * Display vector search results
 * @param {Object} data - The search results data
 */
function displaySearchResults(data) {
    const resultsContainer = document.getElementById('search-results-container');
    
    if (!resultsContainer) return;
    
    if (!data.results || data.results.length === 0) {
        resultsContainer.innerHTML = `
            <div class="alert alert-info">
                <i class="fas fa-info-circle me-2"></i> No results found for "${data.query}"
            </div>
        `;
        return;
    }
    
    // Build results HTML
    let resultsHTML = `
        <div class="search-results-header mb-3">
            <h5>Search Results: ${data.total_results} found for "${data.query}"</h5>
            ${formatAppliedFilters(data.filters_applied)}
        </div>
        <div class="list-group">
    `;
    
    // Add each result
    data.results.forEach(result => {
        // Determine what type of result this is
        let resultContent = '';
        let resultMeta = '';
        let resultTime = '';
        
        if (result.type === 'knowledge') {
            // Knowledge base entry
            resultContent = result.content || 'No content';
            resultMeta = `<span class="badge bg-primary">Knowledge Base</span>`;
            resultTime = '';
        } else if (result.timestamp && result.message) {
            // Log entry
            resultContent = result.message;
            const logLevel = result.level || 'INFO';
            const logService = result.service || 'unknown';
            resultMeta = `
                <span class="badge level-badge level-${logLevel}">${logLevel}</span>
                <span class="text-muted small">[${logService}]</span>
            `;
            resultTime = result.timestamp;
        } else {
            // Unknown format
            resultContent = JSON.stringify(result);
            resultMeta = `<span class="badge bg-secondary">Unknown</span>`;
            resultTime = '';
        }
        
        // Create result item
        resultsHTML += `
            <div class="list-group-item search-result-item">
                <div class="d-flex w-100 justify-content-between">
                    <h6 class="mb-1">${resultMeta}</h6>
                    ${resultTime ? `<small class="text-muted">${resultTime}</small>` : ''}
                </div>
                <p class="mb-1">${resultContent}</p>
                <div class="mt-2">
                    <button class="btn btn-sm btn-outline-primary add-to-context-btn"
                            data-result='${JSON.stringify(result).replace(/'/g, "&#39;")}'>
                        <i class="fas fa-plus"></i> Add to Context
                    </button>
                </div>
            </div>
        `;
    });
    
    resultsHTML += `</div>`;
    
    // Update container
    resultsContainer.innerHTML = resultsHTML;
    resultsContainer.style.display = 'block';
    
    // Add event listeners to "Add to Context" buttons
    document.querySelectorAll('.add-to-context-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const resultData = JSON.parse(btn.getAttribute('data-result'));
            // Call the AI Assistant's function to add to selected logs
            if (typeof window.addToSelectedLogs === 'function') {
                window.addToSelectedLogs(resultData);
                showNotification('Added to context for analysis', 'success');
            } else {
                showNotification('Cannot add to context - function not available', 'warning');
            }
        });
    });
}

/**
 * Format applied filters for display
 * @param {Object} filters - The applied filters
 * @returns {string} - HTML for displaying applied filters
 */
function formatAppliedFilters(filters) {
    if (!filters || Object.keys(filters).length === 0) {
        return '';
    }
    
    let filtersHtml = '<div class="applied-filters mt-2 mb-3"><strong>Filters:</strong> ';
    const filterList = [];
    
    for (const [key, value] of Object.entries(filters)) {
        if (key === 'time_range' && typeof value === 'object') {
            filterList.push(`<span class="badge bg-info">Time: ${value.start} to ${value.end}</span>`);
        } else if (key === 'metadata' && typeof value === 'object') {
            for (const [metaKey, metaValue] of Object.entries(value)) {
                filterList.push(`<span class="badge bg-secondary">${metaKey}: ${metaValue}</span>`);
            }
        } else if (key === 'level') {
            filterList.push(`<span class="badge level-badge level-${value}">${key}: ${value}</span>`);
        } else if (key === 'service') {
            filterList.push(`<span class="badge bg-primary">${key}: ${value}</span>`);
        } else {
            filterList.push(`<span class="badge bg-secondary">${key}: ${value}</span>`);
        }
    }
    
    filtersHtml += filterList.join(' ') + '</div>';
    return filtersHtml;
}

/**
 * Display an error message for search
 * @param {string} message - The error message
 */
function displaySearchError(message) {
    const resultsContainer = document.getElementById('search-results-container');
    
    if (resultsContainer) {
        resultsContainer.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i> ${message}
            </div>
        `;
        resultsContainer.style.display = 'block';
    }
}

/**
 * Show a notification message
 * @param {string} message - The message to display
 * @param {string} type - The message type (success, info, warning, danger)
 */
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} notification fade-in`;
    notification.innerHTML = message;
    
    // Add to document
    document.body.appendChild(notification);
    
    // Remove after delay
    setTimeout(() => {
        notification.classList.remove('fade-in');
        notification.classList.add('fade-out');
        setTimeout(() => {
            if (notification.parentNode) {
                document.body.removeChild(notification);
            }
        }, 500); // Time for fade out animation
    }, 3000); // Display time
}

// Initialize vector search functionality when the document is ready
document.addEventListener('DOMContentLoaded', function() {
    initVectorSearch();
});