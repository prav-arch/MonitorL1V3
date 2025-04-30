/**
 * Chart utilities for the L1 Monitoring application
 * Helper functions for creating and updating charts
 */

/**
 * Generate a color palette for charts
 * @param {number} count - Number of colors needed
 * @param {number} opacity - Opacity value (0-1)
 * @returns {Array} Array of color strings
 */
function generateColorPalette(count, opacity = 0.7) {
    const baseColors = [
        `rgba(13, 110, 253, ${opacity})`,    // Primary (blue)
        `rgba(25, 135, 84, ${opacity})`,     // Success (green)
        `rgba(255, 193, 7, ${opacity})`,     // Warning (yellow)
        `rgba(220, 53, 69, ${opacity})`,     // Danger (red)
        `rgba(13, 202, 240, ${opacity})`,    // Info (cyan)
        `rgba(108, 117, 125, ${opacity})`,   // Secondary (gray)
        `rgba(111, 66, 193, ${opacity})`,    // Purple
        `rgba(253, 126, 20, ${opacity})`,    // Orange
        `rgba(214, 51, 132, ${opacity})`,    // Pink
        `rgba(32, 201, 151, ${opacity})`     // Teal
    ];
    
    // If we need more colors than the base palette, generate them
    if (count <= baseColors.length) {
        return baseColors.slice(0, count);
    }
    
    // Generate additional colors using hue rotation
    const colors = [...baseColors];
    const hueStep = 360 / (count - baseColors.length);
    
    for (let i = baseColors.length; i < count; i++) {
        const hue = Math.floor(hueStep * (i - baseColors.length));
        colors.push(`hsla(${hue}, 70%, 60%, ${opacity})`);
    }
    
    return colors;
}

/**
 * Format date/time for chart labels
 * @param {string} isoString - ISO date string
 * @param {string} format - Format type ('time', 'date', 'datetime')
 * @returns {string} Formatted date string
 */
function formatDateTime(isoString, format = 'time') {
    try {
        const date = new Date(isoString);
        
        switch (format) {
            case 'time':
                return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            case 'date':
                return date.toLocaleDateString();
            case 'datetime':
                return date.toLocaleString([], { 
                    month: 'short', 
                    day: 'numeric', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
            default:
                return date.toLocaleString();
        }
    } catch (e) {
        console.error('Error formatting date:', e);
        return isoString; // Return original string if parsing fails
    }
}

/**
 * Create chart tooltip formatter function
 * @param {string} title - Title for the tooltip
 * @returns {Function} Tooltip formatter function
 */
function createTooltipFormatter(title) {
    return function(context) {
        // Label
        const label = context.dataset.label || '';
        
        // Data value
        let value = context.parsed.y;
        if (value === undefined) {
            value = context.parsed || context.parsed.r;
        }
        
        // Return the tooltip HTML
        return `
            <div class="chart-tooltip">
                <div class="chart-tooltip-title">${title}</div>
                <div class="chart-tooltip-content">
                    <span class="chart-tooltip-label">${label}:</span>
                    <span class="chart-tooltip-value">${value}</span>
                </div>
            </div>
        `;
    };
}

/**
 * Get chart gradient for background
 * @param {Object} ctx - Canvas context
 * @param {string} color - Base color
 * @returns {Object} Gradient object
 */
function getChartGradient(ctx, color) {
    const gradient = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
    
    // Parse the RGBA color
    const rgbaMatch = color.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
    if (!rgbaMatch) {
        // Fallback to solid color if parsing fails
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, color);
        return gradient;
    }
    
    const [, r, g, b, a] = rgbaMatch;
    
    // Create gradient with fading opacity
    gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${a})`);
    gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
    
    return gradient;
}

/**
 * Create common chart options
 * @param {string} type - Chart type ('line', 'bar', 'pie', etc.)
 * @param {Object} customOptions - Custom options to merge
 * @returns {Object} Chart options
 */
function createChartOptions(type, customOptions = {}) {
    // Base options for all chart types
    const baseOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
            },
            tooltip: {
                mode: 'index',
                intersect: false
            }
        }
    };
    
    // Chart-type specific options
    let typeOptions = {};
    
    switch (type) {
        case 'line':
            typeOptions = {
                scales: {
                    x: {
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)'
                        }
                    }
                },
                elements: {
                    line: {
                        tension: 0.2
                    },
                    point: {
                        radius: 2,
                        hoverRadius: 5
                    }
                }
            };
            break;
            
        case 'bar':
            typeOptions = {
                scales: {
                    x: {
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)'
                        }
                    }
                }
            };
            break;
            
        case 'pie':
        case 'doughnut':
            typeOptions = {
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            };
            break;
    }
    
    // Merge options
    return {
        ...baseOptions,
        ...typeOptions,
        ...customOptions
    };
}

/**
 * Format large numbers for display
 * @param {number} value - The number to format
 * @returns {string} Formatted number
 */
function formatLargeNumber(value) {
    if (value >= 1000000) {
        return (value / 1000000).toFixed(1) + 'M';
    } else if (value >= 1000) {
        return (value / 1000).toFixed(1) + 'K';
    }
    return value.toString();
}
