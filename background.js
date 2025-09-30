import { data } from './aurocore_sections.js';

let timerState = {
    isRunning: false,
    isPaused: false,
    currentRole: null,
    startTime: null,
    pausedTime: null,
    totalFocusTime: 0,
    sessionDuration: 25 * 60,
    breakDuration: 5 * 60,
    isBreakTime: false,
    currentWebsite: null,
    lastActiveTime: Date.now(),
    currentSessionStart: null,
    currentSessionFocusTime: 0,
    sessionCounter: 0,
    currentSessionCompleted: false
};

let roleWebsites = new Map();

async function initializeRoleWebsites() {
    console.log('🔄 Initializing role websites mapping...');
    
    // Load default websites from aurocore_sections.js
    data.sections.forEach(section => {
        section.roles.forEach(role => {
            if (!roleWebsites.has(role)) {
                roleWebsites.set(role, new Set());
            }
            section.websites.forEach(website => {
                roleWebsites.get(role).add(website);
            });
        });
    });
    
    // Load custom websites from storage
    try {
        const result = await chrome.storage.local.get(['customRoleWebsites']);
        const customData = result.customRoleWebsites || {};
        
        console.log('📥 Loading custom websites:', customData);
        
        Object.entries(customData).forEach(([role, websites]) => {
            if (!roleWebsites.has(role)) {
                roleWebsites.set(role, new Set());
            }
            
            websites.forEach(website => {
                roleWebsites.get(role).add(website.url);
                console.log(`➕ Added custom website ${website.name} (${website.url}) to ${role}`);
            });
        });
        
        console.log(`✅ Initialized ${roleWebsites.size} roles with default + custom websites`);
        
    } catch (error) {
        console.error('❌ Error loading custom websites:', error);
        console.log(`✅ Initialized ${roleWebsites.size} roles with default websites only`);
    }
}

function isValidWebsiteForRole(url, role) {
    if (!url || !role || !roleWebsites.has(role)) {
        console.log(`⚠️ Validation failed: url=${!!url}, role=${role}, hasRole=${roleWebsites.has(role)}`);
        return false;
    }
    
    try {
        const roleWebsiteSet = roleWebsites.get(role);
        const urlObj = new URL(url);
        const domain = urlObj.hostname.replace('www.', '').toLowerCase();
        
        console.log(`🔍 Checking ${domain} against ${roleWebsiteSet.size} websites for ${role}`);
        
        for (let website of roleWebsiteSet) {
            try {
                const websiteObj = new URL(website);
                const websiteDomain = websiteObj.hostname.replace('www.', '').toLowerCase();
                
                // Improved matching logic
                if (domain === websiteDomain || 
                    domain.endsWith('.' + websiteDomain) ||
                    websiteDomain.endsWith('.' + domain) ||
                    domain.includes(websiteDomain) ||
                    websiteDomain.includes(domain)) {
                    console.log(`✅ Match found: ${domain} matches ${websiteDomain}`);
                    return true;
                }
                
                // Additional check for common domain patterns
                const domainParts = domain.split('.');
                const websiteParts = websiteDomain.split('.');
                
                // Check if main domain matches (e.g., figma.com matches www.figma.com)
                if (domainParts.length >= 2 && websiteParts.length >= 2) {
                    const mainDomain = domainParts.slice(-2).join('.');
                    const mainWebsite = websiteParts.slice(-2).join('.');
                    if (mainDomain === mainWebsite) {
                        console.log(`✅ Main domain match: ${mainDomain} matches ${mainWebsite}`);
                        return true;
                    }
                }
                
            } catch (e) {
                console.warn('Invalid website URL:', website, e.message);
            }
        }
        
        console.log(`❌ No match found for ${domain}`);
    } catch (e) {
        console.warn('Invalid URL for validation:', url, e.message);
    }
    return false;
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url && timerState.isRunning && !timerState.isPaused) {
        checkWebsiteAndUpdateTimer(tab.url);
    }
});

chrome.tabs.onActivated.addListener((activeInfo) => {
    if (timerState.isRunning && !timerState.isPaused) {
        chrome.tabs.get(activeInfo.tabId, (tab) => {
            if (tab.url) {
                checkWebsiteAndUpdateTimer(tab.url);
            }
        });
    }
});

let lastWebsiteCheck = { url: null, isValid: null, timestamp: 0 };

function checkWebsiteAndUpdateTimer(url) {
    if (!url || !timerState.currentRole) {
        console.log('⚠️ Missing URL or role for website check');
        return;
    }
    
    const isValid = isValidWebsiteForRole(url, timerState.currentRole);
    timerState.currentWebsite = url;
    timerState.lastActiveTime = Date.now();
    
    const now = Date.now();
    const urlChanged = lastWebsiteCheck.url !== url;
    const validityChanged = lastWebsiteCheck.isValid !== isValid;
    const timeElapsed = now - lastWebsiteCheck.timestamp > 30000;
    
    if (urlChanged || validityChanged || timeElapsed) {
        console.log(`🌐 Website check: ${url} for ${timerState.currentRole} = ${isValid ? '✅ Valid' : '❌ Invalid'}`);
        
        lastWebsiteCheck = { url, isValid, timestamp: now };
        
        chrome.runtime.sendMessage({
            type: 'website_status',
            isValid: isValid,
            website: url,
            role: timerState.currentRole
        }).catch(() => {});
        
        if (!isValid) {
            chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                if (tabs[0]) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        type: 'show_website_status',
                        isValid: isValid,
                        role: timerState.currentRole
                    }).catch(() => {});
                }
            });
        }
    }
}

async function startTimer(role, sessionMinutes, breakMinutes) {
    console.log(`▶️ Starting timer for ${role}: ${sessionMinutes}m focus, ${breakMinutes}m break`);
    console.log(`🔍 Available roles:`, Array.from(roleWebsites.keys()));
    console.log(`🔍 Role "${role}" exists:`, roleWebsites.has(role));
    
    if (roleWebsites.has(role)) {
        const websites = Array.from(roleWebsites.get(role));
        console.log(`🌐 Websites for ${role}:`, websites.slice(0, 5));
    }
    
    timerState.isRunning = true;
    timerState.isPaused = false;
    timerState.currentRole = role;
    timerState.sessionDuration = sessionMinutes * 60;
    timerState.breakDuration = breakMinutes * 60;
    timerState.startTime = Date.now();
    timerState.currentSessionStart = Date.now();
    timerState.currentSessionFocusTime = 0;
    timerState.lastActiveTime = Date.now();
    timerState.sessionCounter++;
    timerState.currentSessionCompleted = false;
    
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]?.url) {
        checkWebsiteAndUpdateTimer(tabs[0].url);
        
        chrome.tabs.sendMessage(tabs[0].id, {
            type: 'timer_started',
            role: role
        }).catch(() => {});
    }

    chrome.alarms.create('timerTick', { 
        delayInMinutes: 0.0167, 
        periodInMinutes: 0.0167 
    }); 
    chrome.alarms.create('idleCheck', { 
        delayInMinutes: 1, 
        periodInMinutes: 1 
    });
    
    await chrome.storage.local.set({ timerState });
}

async function pauseTimer() {
    console.log('⏸️ Pausing timer');
    console.log(`🔍 Current session focus time: ${timerState.currentSessionFocusTime}s`);
    console.log(`🔍 Current role: ${timerState.currentRole}`);
    console.log(`🔍 Current website: ${timerState.currentWebsite}`);
    
    timerState.isPaused = true;
    timerState.pausedTime = Date.now();
    
    if (timerState.currentSessionFocusTime >= 5) { // Lowered from 60 to 5 for testing
        console.log(`📝 Logging session: ${timerState.currentSessionFocusTime}s`);
        await logFocusSession();
    } else {
        console.log(`⚠️ Session too short (${timerState.currentSessionFocusTime}s), not logging`);
    }
    
    const tabs = await chrome.tabs.query({});
    tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
            type: 'timer_paused'
        }).catch(() => {});
    });
    
    chrome.alarms.clearAll();
    await chrome.storage.local.set({ timerState });
}

async function resumeTimer() {
    console.log('▶️ Resuming timer');
    timerState.isPaused = false;
    timerState.startTime += (Date.now() - timerState.pausedTime);
    timerState.currentSessionStart = Date.now();
    timerState.currentSessionFocusTime = 0;
    timerState.lastActiveTime = Date.now();
    timerState.sessionCounter++;
    timerState.currentSessionCompleted = false;
    
    const tabs = await chrome.tabs.query({});
    tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
            type: 'timer_resumed',
            role: timerState.currentRole
        }).catch(() => {});
    });
    
    chrome.alarms.create('timerTick', { 
        delayInMinutes: 0.0167, 
        periodInMinutes: 0.0167 
    });
    chrome.alarms.create('idleCheck', { 
        delayInMinutes: 1, 
        periodInMinutes: 1 
    });
    
    await chrome.storage.local.set({ timerState });
}

async function stopTimer() {
    console.log('⏹️ Stopping timer');
    console.log(`🔍 Final session focus time: ${timerState.currentSessionFocusTime}s`);
    console.log(`🔍 Current role: ${timerState.currentRole}`);
    console.log(`🔍 Current website: ${timerState.currentWebsite}`);

    if (timerState.currentSessionFocusTime >= 5) { // Lowered from 60 to 5 for testing
        console.log(`📝 Logging final session: ${timerState.currentSessionFocusTime}s`);
        await logFocusSession();
    } else {
        console.log(`⚠️ Final session too short (${timerState.currentSessionFocusTime}s), not logging`);
    }
    
    const tabs = await chrome.tabs.query({});
    tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
            type: 'timer_stopped'
        }).catch(() => {});
    });

    timerState = {
        isRunning: false,
        isPaused: false,
        currentRole: null,
        startTime: null,
        pausedTime: null,
        totalFocusTime: 0,
        sessionDuration: 25 * 60,
        breakDuration: 5 * 60,
        isBreakTime: false,
        currentWebsite: null,
        lastActiveTime: Date.now(),
        currentSessionStart: null,
        currentSessionFocusTime: 0,
        sessionCounter: 0,
        currentSessionCompleted: false
    };
    
    chrome.alarms.clearAll();
    await chrome.storage.local.set({ timerState });
}

async function logFocusSession() {
    console.log('🔄 Starting logFocusSession...');
    
    const session = {
        id: Date.now(),
        date: new Date().toISOString().split('T')[0],
        role: timerState.currentRole,
        website: timerState.currentWebsite,
        focusTime: timerState.currentSessionFocusTime,
        startTime: new Date(timerState.currentSessionStart).toLocaleTimeString(),
        endTime: new Date().toLocaleTimeString(),
        type: 'paused_or_stopped'
    };
    
    console.log('📝 Session data prepared:', session);
    
    const result = await chrome.storage.local.get(['focusLogs']);
    const logs = result.focusLogs || [];
    console.log(`📚 Current logs count: ${logs.length}`);
    
    logs.push(session);
    console.log(`📚 New logs count: ${logs.length}`);
    
    await chrome.storage.local.set({ focusLogs: logs });
    console.log('✅ Session successfully saved to storage');
    console.log('📊 Session logged:', session);
}

async function logCompletedSession() {
    console.log('🎯 Starting logCompletedSession...');
    
    const session = {
        id: Date.now(),
        date: new Date().toISOString().split('T')[0],
        role: timerState.currentRole,
        website: timerState.currentWebsite,
        focusTime: timerState.currentSessionFocusTime,
        startTime: new Date(timerState.currentSessionStart).toLocaleTimeString(),
        endTime: new Date().toLocaleTimeString(),
        sessionNumber: timerState.sessionCounter,
        type: 'completed',
        plannedDuration: timerState.sessionDuration
    };
    
    console.log('🎯 Completed session data prepared:', session);
    
    const result = await chrome.storage.local.get(['focusLogs']);
    const logs = result.focusLogs || [];
    console.log(`📚 Current logs count: ${logs.length}`);
    
    logs.push(session);
    console.log(`📚 New logs count: ${logs.length}`);
    
    await chrome.storage.local.set({ focusLogs: logs });
    console.log('✅ Completed session successfully saved to storage');
    console.log('🎉 Completed session logged:', session);
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
    try {
        if (alarm.name === 'timerTick' && timerState.isRunning && !timerState.isPaused) {
            // Check if we're on a valid website and increment time
            const isOnValidSite = timerState.currentWebsite && isValidWebsiteForRole(timerState.currentWebsite, timerState.currentRole);
            
            if (isOnValidSite) {
                timerState.currentSessionFocusTime++;
                timerState.totalFocusTime++;
                
                // Check if session is completed
                if (timerState.currentSessionFocusTime >= timerState.sessionDuration && !timerState.currentSessionCompleted) {
                    timerState.currentSessionCompleted = true;
                    console.log(`🎉 Session ${timerState.sessionCounter} completed! Duration: ${timerState.sessionDuration}s`);
                    await logCompletedSession();
                }
                
                // Log every 5 seconds for better debugging (was 30)
                if (timerState.currentSessionFocusTime % 5 === 0) {
                    console.log(`⏱️ Focus time: ${timerState.currentSessionFocusTime}s on ${timerState.currentWebsite} for ${timerState.currentRole}`);
                }
            } else {
                // Log more frequently when not on valid site for debugging
                if (timerState.currentSessionFocusTime % 10 === 0) {
                    console.log(`⏸️ Not counting time - not on valid site for ${timerState.currentRole}. Current site: ${timerState.currentWebsite}`);
                }
            }

            // Send update to popup
            chrome.runtime.sendMessage({
                type: 'timer_update',
                focusTime: timerState.currentSessionFocusTime,
                totalTime: timerState.totalFocusTime,
                isOnValidSite: isOnValidSite,
                currentWebsite: timerState.currentWebsite,
                sessionCounter: timerState.sessionCounter,
                sessionCompleted: timerState.currentSessionCompleted
            }).catch(() => {});
            
            // Save state every 30 seconds to avoid excessive writes
            if (timerState.currentSessionFocusTime % 30 === 0) {
                await chrome.storage.local.set({ timerState });
            }
        }
        
        if (alarm.name === 'idleCheck' && timerState.isRunning && !timerState.isPaused) {
            const idleTime = (Date.now() - timerState.lastActiveTime) / 1000;
            
            if (idleTime >= 5 * 60) { // 5 minutes
                console.log('⏸️ Auto-pausing due to 5 minutes of inactivity');
                await pauseTimer();
                
                chrome.runtime.sendMessage({
                    type: 'timer_paused_idle',
                    message: 'Timer paused due to 5 minutes of inactivity'
                }).catch(() => {});
            } else if (idleTime > 60) { // Log idle time if more than 1 minute
                console.log(`🕐 Idle for ${Math.round(idleTime)}s`);
            }
        }
    } catch (error) {
        console.error('❌ Alarm handler error:', error);
    }
});

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    try {
        switch (message.type) {
            case 'start_timer':
                await startTimer(message.role, message.sessionMinutes, message.breakMinutes);
                sendResponse({ success: true });
                break;
                
            case 'pause_timer':
                await pauseTimer();
                sendResponse({ success: true });
                break;
                
            case 'resume_timer':
                await resumeTimer();
                sendResponse({ success: true });
                break;
                
            case 'stop_timer':
                await stopTimer();
                sendResponse({ success: true });
                break;
                
            case 'get_timer_state':
                sendResponse({ timerState });
                break;
                
            case 'get_logs':
                console.log('📨 get_logs request received');
                const result = await chrome.storage.local.get(['focusLogs']);
                console.log('📦 Raw storage result:', result);
                console.log('📋 Logs to send:', result.focusLogs || []);
                sendResponse({ logs: result.focusLogs || [] });
                break;
                
            case 'user_activity':
                // Update activity time for idle detection only
                timerState.lastActiveTime = message.timestamp || Date.now();
                
                if (message.url) {
                    checkWebsiteAndUpdateTimer(message.url);
                }
                sendResponse({ success: true });
                break;
                
            case 'url_changed':
                if (message.url) {
                    checkWebsiteAndUpdateTimer(message.url);
                }
                sendResponse({ success: true });
                break;
                
            case 'heartbeat':
                timerState.lastActiveTime = message.lastActivity || Date.now();
                if (message.url) {
                    checkWebsiteAndUpdateTimer(message.url);
                }
                sendResponse({ success: true });
                break;
                
            case 'debug_info':
                sendResponse({ 
                    timerState,
                    roleWebsitesSize: roleWebsites.size,
                    availableRoles: Array.from(roleWebsites.keys()).slice(0, 10)
                });
                break;
                
            case 'debug_add_log':
                console.log('🧪 Debug: Manually adding test log');
                const testSession = {
                    id: Date.now(),
                    date: new Date().toISOString().split('T')[0],
                    role: 'Designer',
                    website: 'https://figma.com',
                    focusTime: 120,
                    startTime: new Date().toLocaleTimeString(),
                    endTime: new Date().toLocaleTimeString(),
                    sessionNumber: 1,
                    type: 'debug_manual'
                };
                
                const debugResult = await chrome.storage.local.get(['focusLogs']);
                const debugLogs = debugResult.focusLogs || [];
                debugLogs.push(testSession);
                await chrome.storage.local.set({ focusLogs: debugLogs });
                
                console.log('✅ Debug log added. Total logs:', debugLogs.length);
                sendResponse({ success: true, logsCount: debugLogs.length });
                break;
                
            case 'reload_websites':
                console.log('🔄 Reloading websites from settings...');
                await initializeRoleWebsites();
                sendResponse({ success: true, message: 'Websites reloaded' });
                break;
                
            default:
                console.log('Unknown message type:', message.type);
                sendResponse({ success: false, error: 'Unknown message type' });
        }
    } catch (error) {
        console.error('❌ Error handling message:', error);
        sendResponse({ success: false, error: error.message });
    }
    
    return true;
});

chrome.runtime.onStartup.addListener(async () => {
    console.log('🚀 AuroCore extension starting up...');
    await initializeRoleWebsites();
    
    const result = await chrome.storage.local.get(['timerState']);
    if (result.timerState) {
        timerState = result.timerState;
        
        if (timerState.isRunning && !timerState.isPaused) {
            console.log('⏱️ Restoring running timer...');
            chrome.alarms.create('timerTick', { delayInMinutes: 0.0167, periodInMinutes: 0.0167 });
            chrome.alarms.create('idleCheck', { delayInMinutes: 1, periodInMinutes: 1 });
        }
    }
});

chrome.runtime.onInstalled.addListener(async () => {
    console.log('📦 AuroCore extension installed/updated');
    await initializeRoleWebsites();
});

console.log('✅ AuroCore background script loaded');

// Initialize websites when script loads
initializeRoleWebsites();