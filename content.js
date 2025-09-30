console.log('🚀 AuroCore content script loaded on:', window.location.href);

let lastActivityTime = Date.now();
let currentUrl = window.location.href;
let isTimerRunning = false;
let currentRole = null;
let lastNotificationState = null; // Track last notification state
let notificationCooldown = false; // Prevent spam
let notificationTimeout = null; // Store timeout reference

function notifyActivity() {
    lastActivityTime = Date.now();
    
    // Only send activity messages when timer is running and throttle to once per 2 seconds
    if (isTimerRunning && (!notifyActivity.lastSent || Date.now() - notifyActivity.lastSent > 2000)) {
        chrome.runtime.sendMessage({
            type: 'user_activity',
            url: currentUrl,
            timestamp: lastActivityTime
        }).catch(() => {});
        notifyActivity.lastSent = Date.now();
        
        console.log('👆 User activity sent to background script');
    }
}

function notifyUrlChange() {
    const newUrl = window.location.href;
    if (newUrl !== currentUrl) {
        console.log('🔄 URL changed from', currentUrl, 'to', newUrl);
        currentUrl = newUrl;
        chrome.runtime.sendMessage({
            type: 'url_changed',
            url: currentUrl,
            timestamp: Date.now()
        }).catch(() => {});
        
        // Remove any existing notifications when URL changes
        removeExistingNotification();
        // Reset notification state on URL change
        lastNotificationState = null;
        notificationCooldown = false;
    }
}

const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

activityEvents.forEach(eventType => {
    document.addEventListener(eventType, notifyActivity, true);
});

let lastUrl = location.href;
new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
        lastUrl = url;
        notifyUrlChange();
    }
}).observe(document, { subtree: true, childList: true });

window.addEventListener('popstate', notifyUrlChange);

notifyUrlChange();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
        case 'get_current_url':
            sendResponse({ url: window.location.href });
            break;
            
        case 'show_website_status':
            // Only update timer state if it changed
            if (!isTimerRunning) {
                isTimerRunning = true;
                currentRole = message.role;
                console.log(`⏱️ Timer running for role: ${message.role}`);
            }
            
            // Show notification with throttling
            showWebsiteStatus(message.isValid, message.role);
            break;
            

            
        case 'timer_started':
            isTimerRunning = true;
            currentRole = message.role;
            lastNotificationState = null; // Reset notification state
            notificationCooldown = false; // Reset cooldown
            console.log(`⏱️ Timer started for role: ${message.role}`);
            break;
            
        case 'timer_stopped':
        case 'timer_paused':
            isTimerRunning = false;
            currentRole = null;
            lastNotificationState = null; // Reset notification state
            removeExistingNotification();
            console.log('⏹️ Timer stopped/paused - removing notifications');
            break;
            
        case 'timer_resumed':
            isTimerRunning = true;
            lastNotificationState = null; // Reset notification state 
            notificationCooldown = false; // Reset cooldown
            console.log('▶️ Timer resumed');
            break;
    }
    
    return true;
});

function removeExistingNotification() {
    const existingNotification = document.getElementById('aurocore-notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Clear any pending timeout
    if (notificationTimeout) {
        clearTimeout(notificationTimeout);
        notificationTimeout = null;
    }
}

function showWebsiteStatus(isValid, role) {
    // Create unique state identifier to prevent duplicate notifications  
    const currentState = `${isValid}-${role}-${isTimerRunning}`;
    
    // Don't show notification if:
    // 1. Website is valid 
    // 2. Timer is not running
    // 3. Same state as last notification (prevent spam)
    // 4. Currently in cooldown period
    if (isValid || !isTimerRunning || currentState === lastNotificationState || notificationCooldown) {
        if (isValid && !isTimerRunning) {
            removeExistingNotification(); // Remove notification if website becomes valid
        }
        return;
    }
    
    console.log(`⚠️ Showing invalid website notification for role: ${role}`);
    
    // Set cooldown to prevent spam (minimum 10 seconds between notifications)
    notificationCooldown = true;
    setTimeout(() => {
        notificationCooldown = false;
    }, 10000);
    
    // Update last notification state
    lastNotificationState = currentState;
    
    // Remove any existing notification first
    removeExistingNotification();
    
    // Create notification
    const notification = document.createElement('div');
    notification.id = 'aurocore-notification';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ff4444;
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 10000;
        max-width: 300px;
        border: 2px solid #cc0000;
        animation: slideIn 0.3s ease-out;
        transition: all 0.3s ease;
    `;
    
    // Add CSS animation (only once)
    if (!document.getElementById('aurocore-styles')) {
        const style = document.createElement('style');
        style.id = 'aurocore-styles';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }
        `;
        document.head.appendChild(style);
    }
    
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 8px; height: 8px; background: white; border-radius: 50%; flex-shrink: 0; animation: pulse 2s infinite;"></div>
            <div>You're not on any ${role} website</div>
            <button onclick="this.parentElement.parentElement.remove()" style="
                background: none; 
                border: none; 
                color: white; 
                cursor: pointer; 
                margin-left: 10px;
                font-size: 16px;
                opacity: 0.7;
                transition: opacity 0.2s;
            " onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.7'">×</button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 8 seconds with smooth animation
    notificationTimeout = setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }
        notificationTimeout = null;
    }, 8000);
}

// Inactivity notifications removed - no longer needed

// Heartbeat to keep connection alive and update activity (only if timer is running)
let heartbeatInterval = setInterval(() => {
    if (isTimerRunning) {
        chrome.runtime.sendMessage({
            type: 'heartbeat',
            url: window.location.href,
            lastActivity: lastActivityTime
        }).catch(() => {});
    }
}, 60000); // Every 60 seconds (reduced frequency)