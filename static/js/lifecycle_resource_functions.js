/**
 * Add CSS for the lifecycle timeline
 */
function addLifecycleTimelineStyles() {
    // Add CSS for the lifecycle timeline
    const style = document.createElement('style');
    style.textContent = `
        .lifecycle-timeline {
            position: relative;
            padding: 20px 0;
        }
        
        .timeline-item {
            position: relative;
            padding-left: 40px;
            margin-bottom: 30px;
        }
        
        .timeline-dot {
            position: absolute;
            left: 0;
            top: 0;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            z-index: 2;
        }
        
        .timeline-line {
            position: absolute;
            left: 9px;
            top: 20px;
            bottom: -30px;
            width: 2px;
            background-color: #495057;
            z-index: 1;
        }
        
        .timeline-content {
            background-color: #212529;
            border-left: 4px solid #0d6efd;
            padding: 15px;
            border-radius: 4px;
        }
    `;
    document.head.appendChild(style);
}

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
 * Update the resource forecasting section
 * @param {Object} data - AI recommendations data
 */
function updateResourceForecasting(data) {
    console.log('Updating resource forecasting:', data);
    
    const forecastLoader = document.getElementById('forecastLoader');
    const forecastContent = document.getElementById('forecastContent');
    
    if (!forecastLoader || !forecastContent) {
        console.error('Resource forecasting containers not found');
        return;
    }
    
    // Hide loader, show content
    forecastLoader.classList.add('d-none');
    forecastContent.classList.remove('d-none');
    
    // Get resource forecasts
    const forecasting = data.resource_forecasting || {};
    
    // Check if we have any forecasts
    if (!forecasting.cpu_forecast && !forecasting.memory_forecast && !forecasting.disk_forecast) {
        forecastContent.innerHTML = `
            <div class="alert alert-info">
                <i class="fas fa-info-circle me-2"></i>
                No resource forecasting data is currently available. This section will update when forecast data is generated.
            </div>
        `;
        return;
    }
    
    // Clear existing content
    forecastContent.innerHTML = '';
    
    // Create row for cards
    const row = document.createElement('div');
    row.className = 'row';
    
    // Process each resource forecast
    const forecastTypes = {
        'cpu': forecasting.cpu_forecast,
        'memory': forecasting.memory_forecast, 
        'disk': forecasting.disk_forecast
    };
    
    // Process each forecast type
    Object.entries(forecastTypes).forEach(([resource, forecast]) => {
        if (forecast) {
            const col = document.createElement('div');
            col.className = 'col-md-6 col-lg-4 mb-4';
            col.appendChild(createForecastCard(resource, forecast));
            row.appendChild(col);
        }
    });
    
    // Add row to container
    forecastContent.appendChild(row);
    
    // Add recommendations section if available
    if (data.forecast_recommendations && data.forecast_recommendations.length > 0) {
        const recommendationsSection = document.createElement('div');
        recommendationsSection.className = 'mt-4';
        
        const recommendationsTitle = document.createElement('h5');
        recommendationsTitle.textContent = 'Optimization Recommendations';
        recommendationsSection.appendChild(recommendationsTitle);
        
        const recommendationsList = document.createElement('ul');
        recommendationsList.className = 'list-group';
        
        data.forecast_recommendations.forEach(recommendation => {
            const item = document.createElement('li');
            item.className = 'list-group-item bg-dark border-secondary';
            item.innerHTML = `
                <div class="d-flex align-items-start">
                    <i class="fas fa-lightbulb text-warning me-2 mt-1"></i>
                    <div>${recommendation}</div>
                </div>
            `;
            recommendationsList.appendChild(item);
        });
        
        recommendationsSection.appendChild(recommendationsList);
        forecastContent.appendChild(recommendationsSection);
    }
}

/**
 * Create a forecast card for a specific resource
 * @param {string} title - Resource title
 * @param {Object} forecastData - Forecast data for the resource
 * @returns {HTMLElement} - Forecast card element
 */
function createForecastCard(title, forecastData) {
    // Create card
    const card = document.createElement('div');
    card.className = 'card bg-dark h-100';
    
    // Format title
    let formattedTitle = title;
    if (title === 'cpu') formattedTitle = 'CPU';
    else if (title === 'memory') formattedTitle = 'Memory';
    else if (title === 'disk') formattedTitle = 'Disk Storage';
    else if (title === 'network') formattedTitle = 'Network';
    
    // Determine status class based on status
    let statusClass = 'bg-info';
    let statusIcon = 'fa-minus';
    let trendText = 'Stable';
    
    // Handle multiple data structures - original structure
    if (forecastData.trend) {
        // Original structure
        if (forecastData.trend === 'increasing') {
            statusClass = forecastData.is_critical ? 'bg-danger' : 'bg-warning';
            statusIcon = 'fa-arrow-up';
            trendText = 'Increasing';
        } else if (forecastData.trend === 'decreasing') {
            statusClass = 'bg-success';
            statusIcon = 'fa-arrow-down';
            trendText = 'Decreasing';
        }
    } else {
        // Alternate structure from mock data
        if (forecastData.status === 'warning') {
            statusClass = 'bg-warning';
            statusIcon = 'fa-arrow-up';
            trendText = 'Increasing';
        } else if (forecastData.status === 'critical') {
            statusClass = 'bg-danger';
            statusIcon = 'fa-arrow-up';
            trendText = 'Critical';
        } else if (forecastData.status === 'healthy') {
            statusClass = 'bg-success';
            statusIcon = 'fa-check';
            trendText = 'Stable';
        }
    }

    // Generate a simplified card for alternate data structure
    if (forecastData.data_points) {
        // Calculate current and forecasted percentages
        const currentPointIndex = 6; // July (current month in sample data)
        const shortTermIndex = 8; // Sep (3 months ahead)
        const longTermIndex = 11; // Dec (6 months ahead)
        
        const currentPoint = forecastData.data_points[currentPointIndex];
        const shortTermPoint = forecastData.data_points[shortTermIndex];
        const longTermPoint = forecastData.data_points[longTermIndex];
        
        const currentValue = currentPoint.actual || 0;
        const shortTermValue = shortTermPoint.predicted || 0;
        const longTermValue = longTermPoint.predicted || 0;
        
        const threshold = forecastData.threshold || 100;
        
        // Build card content
        card.innerHTML = `
            <div class="card-header d-flex justify-content-between align-items-center">
                <h5 class="mb-0">${formattedTitle}</h5>
                <span class="badge ${statusClass}">
                    <i class="fas ${statusIcon} me-1"></i> ${trendText}
                </span>
            </div>
            <div class="card-body">
                <div class="mb-3">
                    <small class="text-muted">Current Usage:</small>
                    <div class="progress mt-1" style="height: 15px;">
                        <div class="progress-bar ${getProgressClass(currentValue)}" 
                            role="progressbar" 
                            style="width: ${currentValue}%;" 
                            aria-valuenow="${currentValue}" 
                            aria-valuemin="0" 
                            aria-valuemax="100">
                            ${currentValue}%
                        </div>
                    </div>
                </div>
                
                <div class="mb-3">
                    <small class="text-muted">Forecast (3 Months):</small>
                    <div class="progress mt-1" style="height: 15px;">
                        <div class="progress-bar ${getProgressClass(shortTermValue)}" 
                            role="progressbar" 
                            style="width: ${shortTermValue}%;" 
                            aria-valuenow="${shortTermValue}" 
                            aria-valuemin="0" 
                            aria-valuemax="100">
                            ${shortTermValue}%
                        </div>
                    </div>
                </div>
                
                <div>
                    <small class="text-muted">Forecast (6 Months):</small>
                    <div class="progress mt-1" style="height: 15px;">
                        <div class="progress-bar ${getProgressClass(longTermValue)}" 
                            role="progressbar" 
                            style="width: ${longTermValue}%;" 
                            aria-valuenow="${longTermValue}" 
                            aria-valuemin="0" 
                            aria-valuemax="100">
                            ${longTermValue}%
                        </div>
                    </div>
                </div>
                
                <div class="mt-3">
                    <small class="text-muted">Threshold: ${threshold}%</small>
                </div>
            </div>
            <div class="card-footer">
                <small class="text-muted">${forecastData.prediction || ''}</small>
            </div>
        `;
        
        return card;
    }
    
    // Original card for the original data structure
    card.innerHTML = `
        <div class="card-header d-flex justify-content-between align-items-center">
            <h5 class="mb-0">${formattedTitle}</h5>
            <span class="badge ${statusClass}">
                <i class="fas ${statusIcon} me-1"></i> ${trendText}
            </span>
        </div>
        <div class="card-body">
            <div class="mb-3">
                <small class="text-muted">Current Usage:</small>
                <div class="progress mt-1" style="height: 15px;">
                    <div class="progress-bar ${getProgressClass(forecastData.current_usage?.percentage || 0)}" 
                        role="progressbar" 
                        style="width: ${forecastData.current_usage?.percentage || 0}%;" 
                        aria-valuenow="${forecastData.current_usage?.percentage || 0}" 
                        aria-valuemin="0" 
                        aria-valuemax="100">
                        ${forecastData.current_usage?.percentage || 0}%
                    </div>
                </div>
                <div class="small mt-1 text-end">
                    ${forecastData.current_usage?.value || 0} / ${forecastData.current_usage?.total || 0} ${forecastData.current_usage?.unit || ''}
                </div>
            </div>
            
            <div class="mb-3">
                <small class="text-muted">Forecast (7 Days):</small>
                <div class="progress mt-1" style="height: 15px;">
                    <div class="progress-bar ${getProgressClass(forecastData.forecast_7d?.percentage || 0)}" 
                        role="progressbar" 
                        style="width: ${forecastData.forecast_7d?.percentage || 0}%;" 
                        aria-valuenow="${forecastData.forecast_7d?.percentage || 0}" 
                        aria-valuemin="0" 
                        aria-valuemax="100">
                        ${forecastData.forecast_7d?.percentage || 0}%
                    </div>
                </div>
            </div>
            
            <div>
                <small class="text-muted">Forecast (30 Days):</small>
                <div class="progress mt-1" style="height: 15px;">
                    <div class="progress-bar ${getProgressClass(forecastData.forecast_30d?.percentage || 0)}" 
                        role="progressbar" 
                        style="width: ${forecastData.forecast_30d?.percentage || 0}%;" 
                        aria-valuenow="${forecastData.forecast_30d?.percentage || 0}" 
                        aria-valuemin="0" 
                        aria-valuemax="100">
                        ${forecastData.forecast_30d?.percentage || 0}%
                    </div>
                </div>
            </div>
        </div>
        <div class="card-footer">
            <small class="text-muted">Time to limit: ${forecastData.time_to_limit || 'N/A'}</small>
        </div>
    `;
    
    return card;
}

/**
 * Get the appropriate progress bar class based on percentage
 * @param {number} percentage - Percentage value
 * @returns {string} - CSS class for the progress bar
 */
function getProgressClass(percentage) {
    if (percentage >= 90) return 'bg-danger';
    if (percentage >= 75) return 'bg-warning';
    if (percentage >= 50) return 'bg-info';
    return 'bg-success';
}

/**
 * Update the lifecycle prediction section
 * @param {Object} data - AI recommendations data
 */
function updateLifecyclePrediction(data) {
    console.log('Updating lifecycle prediction from external function:', data);
    
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
    
    // Create a timeline container
    const timeline = document.createElement('div');
    timeline.className = 'lifecycle-timeline';
    
    // Current date for calculations
    const currentDate = new Date();
    
    // Process and display predictions
    predictions.forEach((prediction, index) => {
        // Create timeline item
        const timelineItem = document.createElement('div');
        timelineItem.className = 'timeline-item';
        
        // Determine status color based on prediction status
        let statusColor = '#ffc107'; // Default to warning/yellow
        if (prediction.status === 'critical' || prediction.status === 'end_of_life') {
            statusColor = '#dc3545'; // Danger/red
        } else if (prediction.status === 'stable' || prediction.status === 'optimal') {
            statusColor = '#198754'; // Success/green
        } else if (prediction.status === 'new' || prediction.status === 'recent_update') {
            statusColor = '#0dcaf0'; // Info/blue
        }
        
        // Add timeline dot
        const timelineDot = document.createElement('div');
        timelineDot.className = 'timeline-dot';
        timelineDot.style.backgroundColor = statusColor;
        
        // Add timeline content
        const timelineContent = document.createElement('div');
        timelineContent.className = 'timeline-content';
        timelineContent.style.borderLeftColor = statusColor;
        
        // Format dates
        const startDate = new Date(prediction.lifecycle_start || prediction.install_date);
        const endDate = new Date(prediction.end_of_life || prediction.replacement_date);
        
        const formattedStartDate = startDate.toLocaleDateString(undefined, { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
        
        const formattedEndDate = endDate.toLocaleDateString(undefined, { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
        
        // Calculate remaining time
        const timeRemaining = Math.max(0, endDate - currentDate);
        const daysRemaining = Math.ceil(timeRemaining / (1000 * 60 * 60 * 24));
        
        // Build the timeline content HTML
        timelineContent.innerHTML = `
            <h5>${prediction.component || prediction.name}</h5>
            <div class="mb-2">
                <span class="badge" style="background-color: ${statusColor}">
                    ${capitalizeFirstLetter(prediction.status)}
                </span>
                ${prediction.urgency ? 
                    `<span class="badge bg-secondary ms-2">${capitalizeFirstLetter(prediction.urgency)} Priority</span>` : 
                    ''}
            </div>
            <div class="row">
                <div class="col-md-4">
                    <small class="text-muted">Installed:</small>
                    <div>${formattedStartDate}</div>
                </div>
                <div class="col-md-4">
                    <small class="text-muted">End of Life:</small>
                    <div>${formattedEndDate}</div>
                </div>
                <div class="col-md-4">
                    <small class="text-muted">Remaining:</small>
                    <div>${daysRemaining} days</div>
                </div>
            </div>
            <div class="mt-2">
                ${prediction.recommendation || ''}
            </div>
            ${prediction.next_steps ? 
                `<div class="mt-2">
                    <small class="text-muted">Next Steps:</small>
                    <div>${prediction.next_steps}</div>
                </div>` : 
                ''}
        `;
        
        // Add timeline line (except for the last item)
        if (index < predictions.length - 1) {
            const timelineLine = document.createElement('div');
            timelineLine.className = 'timeline-line';
            timelineItem.appendChild(timelineLine);
        }
        
        // Build the timeline item
        timelineItem.appendChild(timelineDot);
        timelineItem.appendChild(timelineContent);
        
        // Add item to timeline
        timeline.appendChild(timelineItem);
    });
    
    // Add timeline to container
    container.appendChild(timeline);
}

// Make functions available to the window object
window.addLifecycleTimelineStyles = addLifecycleTimelineStyles;
window.updateResourceForecasting = updateResourceForecasting;
window.updateLifecyclePrediction = updateLifecyclePrediction;
window.capitalizeFirstLetter = capitalizeFirstLetter;