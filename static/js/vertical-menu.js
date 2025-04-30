/**
 * Vertical Menu with collapsible sections and state memory
 * This script manages the sidebar navigation menu with sections that can be
 * collapsed or expanded. It remembers the state of each section using localStorage.
 */
document.addEventListener('DOMContentLoaded', function() {
    // Initialize menu sections
    initCollapsibleMenu();
    
    // Log for debugging
    console.log('Vertical menu initialized with state memory');
});

/**
 * Initialize the collapsible menu sections
 */
function initCollapsibleMenu() {
    const menuSections = document.querySelectorAll('.menu-section-header');
    const currentPath = window.location.pathname;
    
    console.log('Current path:', currentPath);
    
    // Initialize menu state based on localStorage or current path
    menuSections.forEach(section => {
        const sectionId = section.getAttribute('data-section');
        const itemsContainer = document.getElementById(`${sectionId}-section`);
        
        if (!itemsContainer) {
            console.warn(`Container not found for section: ${sectionId}`);
            return;
        }
        
        // Check if we should open this section based on current path
        let shouldOpen = false;
        const menuLinks = itemsContainer.querySelectorAll('a.list-group-item');
        
        menuLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href === currentPath) {
                shouldOpen = true;
                console.log(`Should open section ${sectionId} because current path matches: ${href}`);
            }
        });
        
        // Check if we have a saved state in localStorage
        const savedState = localStorage.getItem(`menu_section_${sectionId}`);
        console.log(`Section ${sectionId} saved state:`, savedState);
        
        if (savedState) {
            // If we have a saved state, use it (unless user is on a page in this section)
            if (savedState === 'collapsed' && !shouldOpen) {
                collapseSection(section, itemsContainer);
                console.log(`Collapsing section ${sectionId} based on saved state`);
            } else {
                expandSection(section, itemsContainer);
                console.log(`Expanding section ${sectionId} based on saved state or active link`);
            }
        } else {
            // No saved state, expand if should be open, otherwise collapse
            if (shouldOpen) {
                expandSection(section, itemsContainer);
                console.log(`Expanding section ${sectionId} because it contains the active page`);
            } else {
                collapseSection(section, itemsContainer);
                console.log(`Collapsing section ${sectionId} by default`);
            }
        }
        
        // Add click event listener
        section.addEventListener('click', function(e) {
            // Prevent default if this is a link
            e.preventDefault();
            toggleSection(section, itemsContainer);
        });
    });
}

/**
 * Toggle a menu section between expanded and collapsed
 * @param {Element} headerElement - The section header element
 * @param {Element} itemsContainer - The container for the section items
 */
function toggleSection(headerElement, itemsContainer) {
    const sectionId = headerElement.getAttribute('data-section');
    
    if (headerElement.classList.contains('collapsed')) {
        expandSection(headerElement, itemsContainer);
        localStorage.setItem(`menu_section_${sectionId}`, 'expanded');
        console.log(`Expanded section ${sectionId} and saved state`);
    } else {
        collapseSection(headerElement, itemsContainer);
        localStorage.setItem(`menu_section_${sectionId}`, 'collapsed');
        console.log(`Collapsed section ${sectionId} and saved state`);
    }
}

/**
 * Collapse a menu section
 * @param {Element} headerElement - The section header element
 * @param {Element} itemsContainer - The container for the section items
 */
function collapseSection(headerElement, itemsContainer) {
    headerElement.classList.add('collapsed');
    itemsContainer.classList.add('collapsed');
    // Rotate the chevron icon
    const icon = headerElement.querySelector('.section-toggle-icon');
    if (icon) {
        icon.style.transform = 'rotate(-90deg)';
    }
}

/**
 * Expand a menu section
 * @param {Element} headerElement - The section header element
 * @param {Element} itemsContainer - The container for the section items
 */
function expandSection(headerElement, itemsContainer) {
    headerElement.classList.remove('collapsed');
    itemsContainer.classList.remove('collapsed');
    // Reset the chevron icon rotation
    const icon = headerElement.querySelector('.section-toggle-icon');
    if (icon) {
        icon.style.transform = 'rotate(0deg)';
    }
}