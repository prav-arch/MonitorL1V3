/**
 * Responsive metrics script to enhance mobile compatibility
 * This script detects screen size and applies optimizations for the metrics display
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('Responsive metrics: Initializing mobile optimizations');
    
    // Watch for screen size changes
    function applyResponsiveOptimizations() {
        const isMobile = window.innerWidth < 768;
        const isVerySmall = window.innerWidth < 576;
        
        // Find all metric cards
        const metricCards = document.querySelectorAll('.metric-card');
        
        metricCards.forEach(card => {
            // Adjust spacing and layout on mobile
            if (isMobile) {
                card.classList.add('mobile-optimized');
            } else {
                card.classList.remove('mobile-optimized');
            }
            
            // For very small screens, optimize further
            if (isVerySmall) {
                card.classList.add('very-small-screen');
            } else {
                card.classList.remove('very-small-screen');
            }
        });
        
        // Find all gauge containers and optimize their display
        const metricRows = document.querySelectorAll('.metrics-row');
        metricRows.forEach(row => {
            if (isVerySmall) {
                row.classList.add('single-column');
            } else {
                row.classList.remove('single-column');
            }
        });
    }
    
    // Apply optimizations on load
    applyResponsiveOptimizations();
    
    // Listen for window resize
    window.addEventListener('resize', function() {
        applyResponsiveOptimizations();
    });
    
    // Also apply on orientation change for mobile
    window.addEventListener('orientationchange', function() {
        setTimeout(applyResponsiveOptimizations, 100);
    });
});