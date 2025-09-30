let timerState = {
    isRunning: false,
    isPaused: false,
    currentRole: null,
    focusTime: 0,
    isOnValidSite: false
};

let chosenRole = '';
let selectedMode = 'quickSession';
let focusMinutes = 25;
let breakMinutes = 5;

// Load defaults from storage (including custom presets)
let defaults = JSON.parse(localStorage.getItem('defaults')) || {
    quickSession: [25, 5],
    deepSession: [90, 15],
    custom: [25, 5],
};

// Load custom sessions
let customSessions = JSON.parse(localStorage.getItem('customSessions')) || [];

// Function to update mode selector with custom presets
function updateModeSelector() {
    // Clear existing custom options
    const existingCustoms = modesSelector.querySelectorAll('.custom-option');
    existingCustoms.forEach(option => option.remove());
    
    // Add custom sessions to the selector
    customSessions.forEach(session => {
        const option = document.createElement('option');
        option.value = session.name.toLowerCase().replace(/\s+/g, '');
        option.textContent = session.name;
        option.className = 'custom-option';
        modesSelector.appendChild(option);
        
        // Add to defaults for easy access
        defaults[option.value] = [session.focus, session.break];
    });
}

const datalist = document.getElementById("roles");
const startTimerBtn = document.getElementById('start-timer-btn');
const settingsBtn = document.getElementById('settings-btn');
const logsBtn = document.getElementById('logs-btn');

const focusMinutesEl = document.getElementById('focus-minutes');
const breakMinutesEl = document.getElementById('break-minutes');
const clockEl = document.getElementById('clock');
const timerEl = document.getElementById('timer');
const clockModeEl = document.getElementById('clock-mode');
const sessionCounterEl = document.getElementById('session-counter');

const modesSelector = document.getElementById("modes-selector");
const roleInput = document.getElementById("role");

const buttonContainer = document.createElement('div');
buttonContainer.className = 'timer-controls';
buttonContainer.style.cssText = 'margin-top: 10px; display: none; gap: 10px; justify-content: center;';

const pauseBtn = document.createElement('button');
pauseBtn.id = 'pause-timer-btn';  
pauseBtn.textContent = 'Pause';
pauseBtn.className = 'timer-control-btn';
pauseBtn.style.cssText = `
    background-color: #1d1d1d;
    color: aliceblue;
    font-weight: 900;
    font-size: 16px;
    border: none;
    border-radius: 10px;
    padding: 10px 20px;
    cursor: pointer;
    transition: all 0.3s;
    margin: 5px;
`;

const stopBtn = document.createElement('button');
stopBtn.id = 'stop-timer-btn';
stopBtn.textContent = 'Stop';
stopBtn.className = 'timer-control-btn';
stopBtn.style.cssText = `
    background-color: #1d1d1d;
    color: aliceblue;
    font-weight: 900;
    font-size: 16px;
    border: none;
    border-radius: 10px;
    padding: 10px 20px;
    cursor: pointer;
    transition: all 0.3s;
    margin: 5px;
`;

buttonContainer.appendChild(pauseBtn);
buttonContainer.appendChild(stopBtn);
startTimerBtn.parentNode.insertBefore(buttonContainer, startTimerBtn.nextSibling);

const websiteStatus = document.createElement('div');
websiteStatus.id = 'website-status';
websiteStatus.style.cssText = `
    margin-top: 10px; 
    padding: 8px; 
    border-radius: 10px; 
    font-size: 12px; 
    text-align: center; 
    display: none;
    background-color: #1d1d1d;
    color: aliceblue;
    font-weight: 700;
    border: 1px solid #333;
`;
buttonContainer.parentNode.insertBefore(websiteStatus, buttonContainer.nextSibling);

roleInput.addEventListener("input", () => {
    chosenRole = roleInput.value.trim();
});

modesSelector.addEventListener('change', () => {
    selectedMode = modesSelector.value;
    refreshMinutes();
});

focusMinutesEl.addEventListener('change', () => {
    focusMinutes = parseInt(focusMinutesEl.value) || 25;
    updateClockDisplay();
});

breakMinutesEl.addEventListener('change', () => {
    breakMinutes = parseInt(breakMinutesEl.value) || 5;
});

startTimerBtn.addEventListener('click', handleStartTimer);
// Add hover effects to match your button style
pauseBtn.addEventListener('mouseenter', () => {
    pauseBtn.style.transform = 'scale(1.05)';
    pauseBtn.style.boxShadow = '0 0 5px violet';
});
pauseBtn.addEventListener('mouseleave', () => {
    pauseBtn.style.transform = 'scale(1)';
    pauseBtn.style.boxShadow = 'none';
});

stopBtn.addEventListener('mouseenter', () => {
    stopBtn.style.transform = 'scale(1.05)';
    stopBtn.style.boxShadow = '0 0 5px violet';
});
stopBtn.addEventListener('mouseleave', () => {
    stopBtn.style.transform = 'scale(1)';
    stopBtn.style.boxShadow = 'none';
});

pauseBtn.addEventListener('click', handlePauseTimer);
stopBtn.addEventListener('click', handleStopTimer);

settingsBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('settings.html') });
});

window.addEventListener('storage', (event) => {
    if (event.key === 'customSessions' || event.key === 'defaults') {
        console.log('🔄 Settings updated, refreshing presets...');
        // Reload custom sessions
        customSessions = JSON.parse(localStorage.getItem('customSessions')) || [];
        defaults = JSON.parse(localStorage.getItem('defaults')) || {
            quickSession: [25, 5],
            deepSession: [90, 15],
            custom: [25, 5],
        };
        // Update mode selector
        updateModeSelector();
    }
});

logsBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('logs.html') });
});

async function handleStartTimer() {
    if (!chosenRole) {
        alert('Please select a role first!');
        return;
    }
    
    // Add visual feedback
    startTimerBtn.textContent = '...';
    startTimerBtn.disabled = true;
    
    try {
        if (timerState.isPaused) {
            const response = await chrome.runtime.sendMessage({
                type: 'resume_timer'
            });
            
            if (response.success) {
                // Small delay to ensure background script has updated
                setTimeout(async () => {
                    await refreshUIFromBackground();
                }, 100);
            }
        } else {
            const response = await chrome.runtime.sendMessage({
                type: 'start_timer',
                role: chosenRole,
                sessionMinutes: focusMinutes,
                breakMinutes: breakMinutes
            });
            
            if (response.success) {
                // Small delay to ensure background script has updated
                setTimeout(async () => {
                    await refreshUIFromBackground();
                }, 100);
            }
        }
    } finally {
        // Reset button state
        startTimerBtn.disabled = false;
        if (timerState.isPaused) {
            startTimerBtn.textContent = 'Resume';
        } else {
            startTimerBtn.textContent = 'Start';
        }
    }
}

async function handlePauseTimer() {
    // Add visual feedback
    pauseBtn.textContent = '...';
    pauseBtn.disabled = true;
    
    try {
        const response = await chrome.runtime.sendMessage({
            type: 'pause_timer'
        });
        
        if (response.success) {
            // Small delay to ensure background script has updated
            setTimeout(async () => {
                await refreshUIFromBackground();
            }, 100);
        }
    } finally {
        pauseBtn.disabled = false;
    }
}

async function handleStopTimer() {
    // Add visual feedback
    stopBtn.textContent = '...';
    stopBtn.disabled = true;
    
    try {
        const response = await chrome.runtime.sendMessage({
            type: 'stop_timer'
        });
        
        if (response.success) {
            // Small delay to ensure background script has updated
            setTimeout(async () => {
                await refreshUIFromBackground();
            }, 100);
        }
    } finally {
        stopBtn.disabled = false;
        stopBtn.textContent = 'Stop';
    }
}

function updateUIForRunningTimer() {
    timerState.isRunning = true;
    timerState.isPaused = false;
    
    startTimerBtn.style.display = 'none';
    buttonContainer.style.display = 'flex';
    websiteStatus.style.display = 'block';
    
    pauseBtn.textContent = 'Pause';
    clockModeEl.textContent = 'Focus';
    
    roleInput.disabled = true;
    modesSelector.disabled = true;
    focusMinutesEl.disabled = true;
    breakMinutesEl.disabled = true;
}

function updateUIForPausedTimer() {
    timerState.isPaused = true;
    
    startTimerBtn.style.display = 'block';
    startTimerBtn.textContent = 'Resume';
    pauseBtn.textContent = 'Resume';
    
    websiteStatus.style.display = 'none';
    clockModeEl.textContent = 'Paused';
}

function updateUIForStoppedTimer() {
    timerState.isRunning = false;
    timerState.isPaused = false;
    
    startTimerBtn.style.display = 'block';
    startTimerBtn.textContent = 'Start';
    buttonContainer.style.display = 'none';
    websiteStatus.style.display = 'none';
    
    clockModeEl.textContent = 'Focus';
    
    // Reset session counter display
    sessionCounterEl.textContent = 'Session #0';
    sessionCounterEl.style.color = '#888';
    sessionCounterEl.classList.remove('completed');
    
    roleInput.disabled = false;
    modesSelector.disabled = false;
    focusMinutesEl.disabled = false;
    breakMinutesEl.disabled = false;
    
    updateClockDisplay();
}

function refreshMinutes() {
    if (selectedMode && defaults[selectedMode]) {
        const values = defaults[selectedMode];
        focusMinutes = values[0];
        breakMinutes = values[1];
    } else {
        focusMinutes = 25;
        breakMinutes = 5;
    }
    
    focusMinutesEl.value = focusMinutes;
    breakMinutesEl.value = breakMinutes;
    updateClockDisplay();
}

function updateClockDisplay() {
    if (!timerState.isRunning) {
        const totalSeconds = focusMinutes * 60;
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        if (hours > 0) {
            clockEl.textContent = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        } else {
            clockEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
    }
}

function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    } else {
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
        case 'timer_update':
            if (timerState.isRunning && !timerState.isPaused) {
                clockEl.textContent = formatTime(message.focusTime);
                timerState.focusTime = message.focusTime;
                timerState.isOnValidSite = message.isOnValidSite;
                
                // Update session counter
                if (message.sessionCounter) {
                    sessionCounterEl.textContent = `Session #${message.sessionCounter}`;
                }
                
                // Show completion notification
                if (message.sessionCompleted && !sessionCounterEl.classList.contains('completed')) {
                    sessionCounterEl.classList.add('completed');
                    sessionCounterEl.style.color = '#00ff00';
                    sessionCounterEl.textContent = `Session #${message.sessionCounter} ✓`;
                }
                
                updateWebsiteStatus();
            }
            break;
            
        case 'website_status':
            timerState.isOnValidSite = message.isValid;
            updateWebsiteStatus();
            break;
            
        case 'timer_paused_idle':
            updateUIForPausedTimer();
            websiteStatus.textContent = message.message;
            websiteStatus.style.background = '#ff9500';
            websiteStatus.style.color = 'white';
            break;
    }
});

function updateWebsiteStatus() {
    if (!timerState.isRunning || timerState.isPaused) {
        websiteStatus.style.display = 'none';
        return;
    }
    
    websiteStatus.style.display = 'block';
    
    if (timerState.isOnValidSite) {
        websiteStatus.textContent = `✓ Tracking focus time for ${chosenRole}`;
        websiteStatus.style.backgroundColor = '#1d1d1d';
        websiteStatus.style.color = '#00ff00';
        websiteStatus.style.border = '1px solid #00ff00';
    } else {
        websiteStatus.textContent = `⚠ You're not on any ${chosenRole} website`;
        websiteStatus.style.backgroundColor = '#1d1d1d';
        websiteStatus.style.color = '#ff6b6b';
        websiteStatus.style.border = '1px solid #ff6b6b';
    }
}

async function initializePopup() {
    console.log('🔄 Initializing popup...');
    
    try {
        const response = await chrome.runtime.sendMessage({ type: 'get_timer_state' });
        console.log('📊 Timer state from background:', response);
        
        if (response && response.timerState) {
            const bgTimerState = response.timerState;
            
            // Update local timer state
            timerState = {
                isRunning: bgTimerState.isRunning,
                isPaused: bgTimerState.isPaused,
                currentRole: bgTimerState.currentRole,
                focusTime: bgTimerState.currentSessionFocusTime,
                isOnValidSite: false
            };
            
            if (bgTimerState.isRunning) {
                console.log(`⏱️ Timer is running for role: ${bgTimerState.currentRole}`);
                
                // Set the role in UI
                chosenRole = bgTimerState.currentRole;
                roleInput.value = chosenRole;
                
                // Update clock display
                if (bgTimerState.currentSessionFocusTime > 0) {
                    clockEl.textContent = formatTime(bgTimerState.currentSessionFocusTime);
                }
                
                // Update session counter
                if (bgTimerState.sessionCounter > 0) {
                    sessionCounterEl.textContent = `Session #${bgTimerState.sessionCounter}`;
                    if (bgTimerState.currentSessionCompleted) {
                        sessionCounterEl.style.color = '#00ff00';
                        sessionCounterEl.textContent = `Session #${bgTimerState.sessionCounter} ✓`;
                        sessionCounterEl.classList.add('completed');
                    }
                }
                
                // Update UI based on state
                if (bgTimerState.isPaused) {
                    console.log('⏸️ Timer is paused');
                    updateUIForPausedTimer();
                } else {
                    console.log('▶️ Timer is running');
                    updateUIForRunningTimer();
                }
            } else {
                console.log('⏹️ Timer is stopped');
                updateUIForStoppedTimer();
                refreshMinutes();
            }
        } else {
            console.log('🔄 No timer state found, initializing fresh');
            updateUIForStoppedTimer();
            refreshMinutes();
        }
    } catch (error) {
        console.error('❌ Could not get timer state:', error);
        updateUIForStoppedTimer();
        refreshMinutes();
    }
    
    console.log('✅ Popup initialization complete');
}

async function refreshUIFromBackground() {
    try {
        const response = await chrome.runtime.sendMessage({ type: 'get_timer_state' });
        
        if (response && response.timerState) {
            const bgTimerState = response.timerState;
            
            // Update local timer state
            timerState = {
                isRunning: bgTimerState.isRunning,
                isPaused: bgTimerState.isPaused,
                currentRole: bgTimerState.currentRole,
                focusTime: bgTimerState.currentSessionFocusTime,
                isOnValidSite: false
            };
            
            // Update role in UI
            if (bgTimerState.currentRole) {
                chosenRole = bgTimerState.currentRole;
                roleInput.value = chosenRole;
            }
            
            // Update clock display
            if (bgTimerState.currentSessionFocusTime > 0) {
                clockEl.textContent = formatTime(bgTimerState.currentSessionFocusTime);
            } else {
                updateClockDisplay();
            }
            
            // Update session counter
            if (bgTimerState.sessionCounter > 0) {
                sessionCounterEl.textContent = `Session #${bgTimerState.sessionCounter}`;
                if (bgTimerState.currentSessionCompleted) {
                    sessionCounterEl.style.color = '#00ff00';
                    sessionCounterEl.textContent = `Session #${bgTimerState.sessionCounter} ✓`;
                    sessionCounterEl.classList.add('completed');
                } else {
                    sessionCounterEl.style.color = '#888';
                    sessionCounterEl.classList.remove('completed');
                }
            } else {
                sessionCounterEl.textContent = 'Session #0';
                sessionCounterEl.style.color = '#888';
                sessionCounterEl.classList.remove('completed');
            }
            
            // Update UI based on state
            if (bgTimerState.isRunning) {
                if (bgTimerState.isPaused) {
                    updateUIForPausedTimer();
                } else {
                    updateUIForRunningTimer();
                }
            } else {
                updateUIForStoppedTimer();
            }
            
            console.log('✅ UI refreshed from background state');
        }
    } catch (error) {
        console.error('❌ Could not refresh UI from background:', error);
    }
}

// Initialize when popup opens
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔄 Loading popup...');
    
    // Load custom presets first
    updateModeSelector();
    
    // Then initialize popup
    initializePopup();
});

// Also refresh when popup becomes visible (for cases where it was cached)
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        console.log('🔄 Popup became visible, refreshing...');
        setTimeout(async () => {
            await refreshUIFromBackground();
        }, 50);
    }
});