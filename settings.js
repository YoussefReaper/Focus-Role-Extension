// Settings page functionality - Simplified for role and website management

let roleWebsites = new Map(); // Map of role -> Set of websites
let allRoles = []; // All available roles

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('⚙️ Settings page initializing...');
    initializeSettings();
});

async function initializeSettings() {
    try {
        // Load role data from aurocore_sections.js
        await loadRoleData();
        
        // Load custom website data from storage
        await loadCustomWebsites();
        
        // Populate role selector
        populateRoleSelector();
        
        // Set up event listeners
        setupEventListeners();
        
        console.log('✅ Settings initialized successfully');
        
    } catch (error) {
        console.error('❌ Error initializing settings:', error);
    }
}

async function loadRoleData() {
    try {
        // Import the data from aurocore_sections.js
        const { data } = await import('./aurocore_sections.js');
        
        // Initialize role websites map
        roleWebsites.clear();
        allRoles = [];
        
        data.sections.forEach(section => {
            section.roles.forEach(role => {
                if (!roleWebsites.has(role)) {
                    roleWebsites.set(role, new Set());
                    allRoles.push(role);
                }
                
                // Add default websites for this role
                section.websites.forEach(website => {
                    roleWebsites.get(role).add({
                        url: website,
                        name: getWebsiteName(website),
                        isDefault: true
                    });
                });
            });
        });
        
        console.log(`📊 Loaded ${allRoles.length} roles with default websites`);
        
    } catch (error) {
        console.error('❌ Error loading role data:', error);
    }
}

async function loadCustomWebsites() {
    try {
        const result = await chrome.storage.local.get(['customRoleWebsites']);
        const customData = result.customRoleWebsites || {};
        
        // Add custom websites to existing roles
        Object.entries(customData).forEach(([role, websites]) => {
            if (!roleWebsites.has(role)) {
                roleWebsites.set(role, new Set());
                if (!allRoles.includes(role)) {
                    allRoles.push(role);
                }
            }
            
            websites.forEach(website => {
                roleWebsites.get(role).add({
                    url: website.url,
                    name: website.name,
                    isDefault: false
                });
            });
        });
        
        console.log('📥 Loaded custom websites from storage');
        
    } catch (error) {
        console.error('❌ Error loading custom websites:', error);
    }
}

function populateRoleSelector() {
    const roleSelect = document.getElementById('role-select');
    
    // Clear existing options (except first)
    roleSelect.innerHTML = '<option value="">Select a role...</option>';
    
    // Sort roles alphabetically
    const sortedRoles = [...allRoles].sort();
    
    sortedRoles.forEach(role => {
        const option = document.createElement('option');
        option.value = role;
        option.textContent = role;
        roleSelect.appendChild(option);
    });
    
    console.log(`📝 Populated role selector with ${sortedRoles.length} roles`);
}

function setupEventListeners() {
    const roleSelect = document.getElementById('role-select');
    const addWebsiteBtn = document.getElementById('add-website-btn');
    const saveAllBtn = document.getElementById('save-all-btn');
    const resetAllBtn = document.getElementById('reset-all-btn');
    
    // Role selection change
    roleSelect.addEventListener('change', handleRoleSelection);
    
    // Add website button
    addWebsiteBtn.addEventListener('click', handleAddWebsite);
    
    // Save all settings
    saveAllBtn.addEventListener('click', handleSaveAll);
    
    // Reset all settings
    resetAllBtn.addEventListener('click', handleResetAll);
    
    // Enter key on website inputs
    const websiteUrl = document.getElementById('website-url');
    const websiteName = document.getElementById('website-name');
    
    websiteUrl.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleAddWebsite();
    });
    
    websiteName.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleAddWebsite();
    });
}

function handleRoleSelection() {
    const roleSelect = document.getElementById('role-select');
    const selectedRole = roleSelect.value;
    
    if (selectedRole) {
        displayWebsitesForRole(selectedRole);
    } else {
        hideWebsitesList();
    }
}

function displayWebsitesForRole(role) {
    const websiteListSection = document.getElementById('website-list-section');
    const selectedRoleName = document.getElementById('selected-role-name');
    const websitesList = document.getElementById('websites-list');
    
    // Show the section
    websiteListSection.style.display = 'block';
    selectedRoleName.textContent = role;
    
    // Clear existing websites
    websitesList.innerHTML = '';
    
    // Get websites for this role
    const websites = roleWebsites.get(role) || new Set();
    
    if (websites.size === 0) {
        websitesList.innerHTML = '<div style="color: #888; font-style: italic;">No websites added for this role yet.</div>';
        return;
    }
    
    // Display each website
    websites.forEach(website => {
        const websiteItem = document.createElement('div');
        websiteItem.className = 'website-item';
        
        const nameSpan = document.createElement('span');
        nameSpan.textContent = website.name;
        
        if (!website.isDefault) {
            const removeBtn = document.createElement('span');
            removeBtn.className = 'remove-btn';
            removeBtn.textContent = '×';
            removeBtn.title = 'Remove website';
            removeBtn.onclick = () => removeWebsite(role, website);
            
            websiteItem.appendChild(nameSpan);
            websiteItem.appendChild(removeBtn);
        } else {
            websiteItem.appendChild(nameSpan);
            websiteItem.style.opacity = '0.7';
            websiteItem.title = 'Default website (cannot be removed)';
        }
        
        websitesList.appendChild(websiteItem);
    });
    
    console.log(`📋 Displayed ${websites.size} websites for ${role}`);
}

function hideWebsitesList() {
    const websiteListSection = document.getElementById('website-list-section');
    websiteListSection.style.display = 'none';
}

function handleAddWebsite() {
    const roleSelect = document.getElementById('role-select');
    const websiteUrl = document.getElementById('website-url');
    const websiteName = document.getElementById('website-name');
    
    const selectedRole = roleSelect.value;
    const url = websiteUrl.value.trim();
    const name = websiteName.value.trim();
    
    // Validation
    if (!selectedRole) {
        alert('Please select a role first');
        return;
    }
    
    if (!url) {
        alert('Please enter a website URL');
        return;
    }
    
    if (!name) {
        alert('Please enter a website name');
        return;
    }
    
    // Validate URL format
    if (!isValidUrl(url)) {
        alert('Please enter a valid URL (e.g., https://example.com)');
        return;
    }
    
    // Check if website already exists for this role
    const existingWebsites = roleWebsites.get(selectedRole) || new Set();
    for (let website of existingWebsites) {
        if (website.url === url || website.name === name) {
            alert('This website is already added for this role');
            return;
        }
    }
    
    // Add the website
    const newWebsite = {
        url: url,
        name: name,
        isDefault: false
    };
    
    if (!roleWebsites.has(selectedRole)) {
        roleWebsites.set(selectedRole, new Set());
    }
    
    roleWebsites.get(selectedRole).add(newWebsite);
    
    // Clear inputs
    websiteUrl.value = '';
    websiteName.value = '';
    
    // Refresh display
    displayWebsitesForRole(selectedRole);
    
    console.log(`✅ Added website ${name} (${url}) to ${selectedRole}`);
}

function removeWebsite(role, websiteToRemove) {
    if (websiteToRemove.isDefault) {
        alert('Cannot remove default websites');
        return;
    }
    
    if (confirm(`Remove "${websiteToRemove.name}" from ${role}?`)) {
        const websites = roleWebsites.get(role);
        
        // Remove the website (need to find by properties since Set uses object reference)
        for (let website of websites) {
            if (website.url === websiteToRemove.url && website.name === websiteToRemove.name) {
                websites.delete(website);
                break;
            }
        }
        
        // Refresh display
        displayWebsitesForRole(role);
        
        console.log(`🗑️ Removed website ${websiteToRemove.name} from ${role}`);
    }
}

async function handleSaveAll() {
    try {
        // Prepare custom websites data (exclude defaults)
        const customData = {};
        
        roleWebsites.forEach((websites, role) => {
            const customWebsites = [];
            websites.forEach(website => {
                if (!website.isDefault) {
                    customWebsites.push({
                        url: website.url,
                        name: website.name
                    });
                }
            });
            
            if (customWebsites.length > 0) {
                customData[role] = customWebsites;
            }
        });
        
        // Save to storage
        await chrome.storage.local.set({ customRoleWebsites: customData });
        
        // Notify background script to reload websites
        try {
            await chrome.runtime.sendMessage({ type: 'reload_websites' });
            console.log('🔄 Notified background script to reload websites');
        } catch (error) {
            console.log('⚠️ Could not notify background script:', error);
        }
        
        // Show confirmation
        showNotification('✅ Settings saved successfully!', '#28a745');
        
        console.log('💾 Settings saved to storage:', customData);
        
    } catch (error) {
        console.error('❌ Error saving settings:', error);
        showNotification('❌ Error saving settings', '#dc3545');
    }
}

async function handleResetAll() {
    if (confirm('Are you sure you want to reset all custom website settings? This will remove all websites you\'ve added.')) {
        try {
            // Clear custom websites from storage
            await chrome.storage.local.remove(['customRoleWebsites']);
            
            // Reload the page to refresh everything
            location.reload();
            
        } catch (error) {
            console.error('❌ Error resetting settings:', error);
            showNotification('❌ Error resetting settings', '#dc3545');
        }
    }
}

// Utility functions
function getWebsiteName(url) {
    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.replace('www.', '');
        const parts = hostname.split('.');
        
        // Return capitalized domain name
        if (parts.length >= 2) {
            return parts[parts.length - 2].charAt(0).toUpperCase() + parts[parts.length - 2].slice(1);
        }
        return hostname.charAt(0).toUpperCase() + hostname.slice(1);
    } catch (error) {
        return url;
    }
}

function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

function showNotification(message, color) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${color};
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        font-weight: bold;
        z-index: 1000;
        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

console.log('⚙️ Settings script loaded');