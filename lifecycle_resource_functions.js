/**
 * Add CSS for the lifecycle timeline
 */
function addLifecycleTimelineStyles() {
    // Add styles if not already present
    if (!document.getElementById('lifecycle-timeline-styles')) {
        const styleSheet = document.createElement('style');
        styleSheet.id = 'lifecycle-timeline-styles';
        styleSheet.textContent = `
            .lifecycle-timeline {
                position: relative;
                max-width: 100%;
                margin: 0 auto;
                padding-bottom: 1rem;
            }
            
            .timeline-item {
                display: flex;
                align-items: flex-start;
                margin-bottom: 2rem;
                position: relative;
            }
            
            .timeline-dot {
                flex-shrink: 0;
                width: 16px;
                height: 16px;
                border-radius: 50%;
                margin-right: 10px;
                margin-top: 5px;
                z-index: 1;
            }
            
            .timeline-content {
                flex-grow: 1;
                background-color: rgba(52, 58, 64, 0.5);
                border-radius: 0.25rem;
                padding: 1rem;
                border-left: 4px solid;
            }
            
            .timeline-line {
                position: absolute;
                top: 16px;
                left: 8px;
                height: calc(100%);
                width: 2px;
                background-color: rgba(255, 255, 255, 0.1);
                z-index: 0;
            }
            
            .resource-forecast-card {
                background-color: rgba(25, 35, 50, 0.4);
                border-radius: 0.25rem;
                padding: 1rem;
                margin-bottom: 1rem;
                border-left: 4px solid;
            }
            
            .forecast-critical { border-color: #dc3545; }
            .forecast-warning { border-color: #ffc107; }
            .forecast-stable { border-color: #198754; }
            .forecast-improving { border-color: #0dcaf0; }
            
            .forecast-title {
                font-weight: bold;
                margin-bottom: 0.5rem;
            }
            
            .forecast-value {
                font-size: 1.25rem;
                font-weight: bold;
            }
            
            .forecast-date {
                font-size: 0.875rem;
                opacity: 0.7;
            }
            
            .forecast-trend {
                display: flex;
                align-items: center;
                margin-top: 0.5rem;
                font-size: 0.875rem;
            }
            
            .forecast-trend i {
                margin-right: 0.25rem;
            }
            
            .trend-up { color: #dc3545; }
            .trend-down { color: #198754; }
            .trend-stable { color: #ffc107; }
        `;
        document.head.appendChild(styleSheet);
    }
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
    
    const container = document.getElementById('resourceForecasting');
    if (!container) return;
    
    // Clear existing content including the spinner
    container.innerHTML = '';
    
    // Create a row for the forecasting cards
    const row = document.createElement('div');
    row.className = 'row';
    
    // Get forecasting data from the recommendations
    const forecasts = data.resource_forecasts || [];
    
    if (forecasts.length === 0) {
        // Display message when no forecasts are available
        const noDataMsg = document.createElement('div');
        noDataMsg.className = 'col-12 text-center my-4';
        noDataMsg.innerHTML = `
            <div class="alert alert-secondary">
                <i class="fas fa-info-circle me-2"></i>
                No resource forecasts available. Try refreshing or check back later.
            </div>
        `;
        row.appendChild(noDataMsg);
    } else {
        // Process and display available forecasts
        forecasts.forEach(forecast => {
            const col = document.createElement('div');
            col.className = 'col-md-4 col-sm-6 mb-4';
            
            // Determine forecast class based on trend
            let forecastClass = 'forecast-stable';
            if (forecast.trend === 'increasing' && forecast.resource_type.includes('usage')) {
                forecastClass = 'forecast-critical';
            } else if (forecast.trend === 'decreasing' && forecast.resource_type.includes('usage')) {
                forecastClass = 'forecast-improving';
            } else if (forecast.trend === 'increasing' && forecast.resource_type.includes('available')) {
                forecastClass = 'forecast-improving';
            } else if (forecast.trend === 'decreasing' && forecast.resource_type.includes('available')) {
                forecastClass = 'forecast-warning';
            }
            
            // Create forecast card
            const card = document.createElement('div');
            card.className = `resource-forecast-card ${forecastClass}`;
            
            // Determine trend icon and class
            let trendIcon = 'arrow-right';
            let trendClass = 'trend-stable';
            if (forecast.trend === 'increasing') {
                trendIcon = 'arrow-up';
                trendClass = forecast.resource_type.includes('usage') ? 'trend-up' : 'trend-down';
            } else if (forecast.trend === 'decreasing') {
                trendIcon = 'arrow-down';
                trendClass = forecast.resource_type.includes('usage') ? 'trend-down' : 'trend-up';
            }
            
            // Format forecast date
            const forecastDate = new Date(forecast.forecast_date);
            const formattedDate = forecastDate.toLocaleDateString(undefined, { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
            });
            
            // Create card content
            card.innerHTML = `
                <div class="forecast-title">${forecast.node_name || forecast.component}</div>
                <div class="forecast-value">${forecast.forecasted_value} ${forecast.unit}</div>
                <div class="forecast-date">Forecasted for ${formattedDate}</div>
                <div class="forecast-trend ${trendClass}">
                    <i class="fas fa-${trendIcon}"></i> 
                    ${forecast.trend_description || capitalizeFirstLetter(forecast.trend)}
                </div>
                <div class="mt-2 text-muted">
                    ${forecast.description || `${forecast.resource_type} forecast`}
                </div>
            `;
            
            // Add card to column, column to row
            col.appendChild(card);
            row.appendChild(col);
        });
    }
    
    // Add row to container
    container.appendChild(row);
}

/**
 * Update the lifecycle prediction section
 * @param {Object} data - AI recommendations data
 */
function updateLifecyclePrediction(data) {
    console.log('Updating lifecycle prediction:', data);
    
    const container = document.getElementById('lifecyclePrediction');
    if (!container) return;
    
    // Clear existing content including the spinner
    container.innerHTML = '';
    
    // Get lifecycle predictions from the recommendations
    const predictions = data.lifecycle_predictions || [];
    
    if (predictions.length === 0) {
        // Display message when no predictions are available
        const noDataMsg = document.createElement('div');
        noDataMsg.className = 'text-center my-4';
        noDataMsg.innerHTML = `
            <div class="alert alert-secondary">
                <i class="fas fa-info-circle me-2"></i>
                No lifecycle predictions available. Try refreshing or check back later.
            </div>
        `;
        container.appendChild(noDataMsg);
        return;
    }
    
    // Create a timeline container
    const timeline = document.createElement('div');
    timeline.className = 'lifecycle-timeline';
    
    // Current date for calculating remaining time
    const currentDate = new Date();
    
    // Process and display available predictions
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