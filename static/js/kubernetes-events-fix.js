/**
 * Direct fix for Kubernetes events display
 */
document.addEventListener('DOMContentLoaded', function() {
    // Function to fetch and display events
    fetchAndDisplayEvents();
    
    // Add click handler to the refresh button
    const refreshBtn = document.querySelector('.refresh-k8s');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            fetchAndDisplayEvents();
        });
    }
    
    // Set up polling for events every 30 seconds
    setInterval(fetchAndDisplayEvents, 30000);
});

function fetchAndDisplayEvents() {
    const eventsTableBody = document.getElementById('k8s-events');
    if (!eventsTableBody) return;
    
    // Show loading indicator
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
    
    // Fetch events from the API
    fetch('/api/kubernetes/events')
        .then(response => response.json())
        .then(data => {
            if (!data.events || data.events.length === 0) {
                eventsTableBody.innerHTML = `
                    <tr>
                        <td colspan="4" class="text-center">No recent events found</td>
                    </tr>
                `;
                return;
            }
            
            // Display up to 5 events
            const eventsToShow = data.events.slice(0, 5);
            let eventsHtml = '';
            
            eventsToShow.forEach(event => {
                // Format timestamp
                const timestamp = new Date(event.last_timestamp || event.first_timestamp);
                const timeStr = timestamp.toLocaleTimeString();
                
                // Style based on event type
                const typeClass = event.type === 'Warning' ? 'text-warning' : 'text-info';
                
                // Format object info
                const objectInfo = `${event.involved_object.kind}/${event.involved_object.name}`;
                
                // Create row
                eventsHtml += `
                    <tr>
                        <td>${timeStr}</td>
                        <td><span class="${typeClass}">${event.type}</span></td>
                        <td>${objectInfo}</td>
                        <td>${event.reason ? event.reason + ': ' : ''}${event.message}</td>
                    </tr>
                `;
            });
            
            // Update table
            eventsTableBody.innerHTML = eventsHtml;
        })
        .catch(error => {
            console.error('Error fetching Kubernetes events:', error);
            eventsTableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center text-danger">
                        Failed to fetch events. Server may be unavailable.
                    </td>
                </tr>
            `;
        });
}