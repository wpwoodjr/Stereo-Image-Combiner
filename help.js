document.addEventListener('DOMContentLoaded', () => {
    // Find the header container
    const headerContainer = document.querySelector('.header-container');
    
    // Create help icon container
    const helpIconContainer = document.createElement('div');
    helpIconContainer.className = 'help-icon';
    helpIconContainer.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: #333333;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        transition: background-color 0.2s;
        position: absolute;
        right: 60px;
        cursor: pointer;
    `;
    
    // Create help icon SVG
    helpIconContainer.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M9.09 9.00001C9.3251 8.33167 9.78915 7.76811 10.4 7.40914C11.0108 7.05016 11.7289 6.91894 12.4272 7.03873C13.1255 7.15852 13.7588 7.52154 14.2151 8.06354C14.6713 8.60553 14.9211 9.29152 14.92 10C14.92 12 11.92 13 11.92 13" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M12 17H12.01" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
    `;
    
    // Add hover effect
    helpIconContainer.addEventListener('mouseover', () => {
        helpIconContainer.style.backgroundColor = '#444444';
    });
    
    helpIconContainer.addEventListener('mouseout', () => {
        helpIconContainer.style.backgroundColor = '#333333';
    });
    
    // Add click event to open help in a new tab
    helpIconContainer.addEventListener('click', openHelpTab);
    
    // Add the help icon to the header
    headerContainer.appendChild(helpIconContainer);
    
    // Add keyboard shortcut for help (? key)
    window.addEventListener('keydown', (e) => {
        // Check if an input element is focused
        if (document.activeElement.tagName === 'INPUT' || 
            document.activeElement.tagName === 'TEXTAREA') {
            return;
        }
        
        // Show help screen when ? key is pressed
        if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
            e.preventDefault();
            openHelpTab();
        }
    });

    // Make icon more visible and tappable on mobile
    if (isMobileDevice()) {
        helpIconContainer.style.width = '48px';
        helpIconContainer.style.height = '48px';
        
        // Add a bit more space on smaller screens
        if (window.innerWidth < 600) {
            helpIconContainer.style.right = '70px';
        }
    }
});

// 3. Function to open help in a new tab
function openHelpTab() {
    window.open('help.html', '_blank');
}

// 4. Helper function to detect mobile devices
function isMobileDevice() {
    return (window.matchMedia('(pointer: coarse)').matches ||
            window.matchMedia('(max-width: 768px)').matches ||
            /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
}
