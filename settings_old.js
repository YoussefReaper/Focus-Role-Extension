
let currentDefaults = {
    quickSession: [25, 5],
    deepSession: [90, 15],
    custom: [25, 5]
};

let customSessions = [];

const focusMinutesQuick = document.getElementById('focus-minutes-quick');
const breakMinutesQuick = document.getElementById('break-minutes-quick');
const focusMinutesDeep = document.getElementById('focus-minutes-deep');
const breakMinutesDeep = document.getElementById('break-minutes-deep');

const nameInput = document.getElementById('name-input');
const createCustomBtn = document.querySelector('.create-custom');
const clearCustomBtn = document.querySelector('.clear-custom');

async function initializeSettings() {
    loadSettings();
    displayCurrentSettings();
    setupEventListeners();
}

function loadSettings() {
    const storedDefaults = JSON.parse(localStorage.getItem('defaults'));
    if (storedDefaults) {
        currentDefaults = { ...currentDefaults, ...storedDefaults };
    }
    const storedCustom = JSON.parse(localStorage.getItem('customSessions'));
    if (storedCustom) {
        customSessions = storedCustom;
    }
}

function displayCurrentSettings() {
    focusMinutesQuick.value = currentDefaults.quickSession[0];
    breakMinutesQuick.value = currentDefaults.quickSession[1];
    focusMinutesDeep.value = currentDefaults.deepSession[0];
    breakMinutesDeep.value = currentDefaults.deepSession[1];
    
    displayCustomSessions();
}

function displayCustomSessions() {
    const existingCustoms = document.querySelectorAll('.custom-session-display');
    existingCustoms.forEach(el => el.remove());
    
    customSessions.forEach((session, index) => {
        createCustomSessionDisplay(session, index);
    });
}

function createCustomSessionDisplay(session, index) {
    const customDiv = document.createElement('div');
    customDiv.className = 'custom-session-display';
    customDiv.style.cssText = `
        margin: 15px 0;
        padding: 15px;
        border: 1px solid #333;
        border-radius: 10px;
        background-color: #1d1d1d;
    `;
    
    customDiv.innerHTML = `
        <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 10px;">
            <span class="default-text" style="font-weight: bold;">${session.name}</span>
            <button class="delete-custom" data-index="${index}" style="
                background-color: #1d1d1d;
                color: aliceblue;
                border: none;
                padding: 8px 16px;
                border-radius: 10px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 900;
                margin-left: auto;
                transition: all 0.3s;
            " onmouseenter="this.style.transform='scale(1.05)'; this.style.boxShadow='0 0 5px violet';" 
               onmouseleave="this.style.transform='scale(1)'; this.style.boxShadow='none';">Delete</button>
        </div>
        <div class="default-time">
            <div>
                <label>Session (in min)</label>
                <input type="number" value="${session.focus}" class="focus-minutes custom-focus" data-index="${index}" min="1" max="180">
            </div>
            <div>
                <label>Break (in min)</label>
                <input type="number" value="${session.break}" class="break-minutes custom-break" data-index="${index}" min="1" max="60">
            </div>
        </div>
    `;
    
    const customSection = document.querySelector('.custom');
    customSection.parentNode.insertBefore(customDiv, customSection);
    
    const deleteBtn = customDiv.querySelector('.delete-custom');
    const focusInput = customDiv.querySelector('.custom-focus');
    const breakInput = customDiv.querySelector('.custom-break');
    
    deleteBtn.addEventListener('click', () => deleteCustomSession(index));
    focusInput.addEventListener('change', () => updateCustomSession(index, 'focus', focusInput.value));
    breakInput.addEventListener('change', () => updateCustomSession(index, 'break', breakInput.value));
}

function setupEventListeners() {
    focusMinutesQuick.addEventListener('change', () => {
        currentDefaults.quickSession[0] = parseInt(focusMinutesQuick.value) || 25;
        saveSettings();
    });
    
    breakMinutesQuick.addEventListener('change', () => {
        currentDefaults.quickSession[1] = parseInt(breakMinutesQuick.value) || 5;
        saveSettings();
    });
    
    focusMinutesDeep.addEventListener('change', () => {
        currentDefaults.deepSession[0] = parseInt(focusMinutesDeep.value) || 90;
        saveSettings();
    });
    
    breakMinutesDeep.addEventListener('change', () => {
        currentDefaults.deepSession[1] = parseInt(breakMinutesDeep.value) || 15;
        saveSettings();
    });
    
    createCustomBtn.addEventListener('click', createCustomSession);
    clearCustomBtn.addEventListener('click', clearAllCustomSessions);
    
    addSaveButton();
    addImportExportButtons();
}

function createCustomSession() {
    const sessionName = nameInput.value.trim();
    if (!sessionName) {
        alert('Please enter a session name');
        return;
    }
    if (customSessions.some(session => session.name.toLowerCase() === sessionName.toLowerCase())) {
        alert('A session with this name already exists');
        return;
    }
    
    const focusInput = document.getElementById('focus-minutes-custom');
    const breakInput = document.getElementById('break-minutes-custom');
    const focusMinutes = parseInt(focusInput.value) || 25;
    const breakMinutes = parseInt(breakInput.value) || 5;
    
    const newSession = {
        name: sessionName,
        focus: focusMinutes,
        break: breakMinutes
    };
    
    customSessions.push(newSession);
    currentDefaults[sessionName.toLowerCase().replace(/\s+/g, '')] = [focusMinutes, breakMinutes];
    
    nameInput.value = '';
    focusInput.value = 25;
    breakInput.value = 5;
    
    saveSettings();
    displayCustomSessions();
}
function deleteCustomSession(index) {
    if (confirm('Are you sure you want to delete this custom session?')) {
        const sessionName = customSessions[index].name;
        const key = sessionName.toLowerCase().replace(/\s+/g, '');
        
        customSessions.splice(index, 1);
        delete currentDefaults[key];
        
        saveSettings();
        displayCustomSessions();
    }
}
function updateCustomSession(index, field, value) {
    const intValue = parseInt(value) || (field === 'focus' ? 25 : 5);
    customSessions[index][field] = intValue;
    
    const sessionName = customSessions[index].name;
    const key = sessionName.toLowerCase().replace(/\s+/g, '');
    currentDefaults[key] = [customSessions[index].focus, customSessions[index].break];
    
    saveSettings();
}

function clearAllCustomSessions() {
    if (confirm('Are you sure you want to delete all custom sessions?')) {
        customSessions.forEach(session => {
            const key = session.name.toLowerCase().replace(/\s+/g, '');
            delete currentDefaults[key];
        });
        
        customSessions = [];
        saveSettings();
        displayCustomSessions();
    }
}
function saveSettings() {
    localStorage.setItem('defaults', JSON.stringify(currentDefaults));
    localStorage.setItem('customSessions', JSON.stringify(customSessions));
    
    showSaveConfirmation();
}

function showSaveConfirmation() {
    const confirmation = document.createElement('div');
    confirmation.textContent = 'Settings saved!';
    confirmation.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #34c759;
        color: white;
        padding: 10px 15px;
        border-radius: 5px;
        z-index: 1000;
        font-size: 14px;
    `;
    
    document.body.appendChild(confirmation);
    
    setTimeout(() => {
        confirmation.remove();
    }, 2000);
}
function addSaveButton() {
    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save All Settings';
    saveBtn.style.cssText = `
        background-color: #1d1d1d;
        color: aliceblue;
        border: none;
        padding: 10px 20px;
        border-radius: 10px;
        cursor: pointer;
        font-size: 16px;
        font-weight: 900;
        margin: 20px 0;
        width: 100%;
        transition: all 0.3s;
    `;
    
    saveBtn.addEventListener('mouseenter', () => {
        saveBtn.style.transform = 'scale(1.05)';
        saveBtn.style.boxShadow = '0 0 5px violet';
    });
    saveBtn.addEventListener('mouseleave', () => {
        saveBtn.style.transform = 'scale(1)';
        saveBtn.style.boxShadow = 'none';
    });
    
    saveBtn.addEventListener('click', () => {
        saveSettings();
    });
    
    document.body.appendChild(saveBtn);
}

function addImportExportButtons() {
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = 'margin: 20px 0; display: flex; gap: 10px;';
    
    const exportBtn = document.createElement('button');
    exportBtn.textContent = 'Export Settings';
    exportBtn.style.cssText = `
        background-color: #1d1d1d;
        color: aliceblue;
        border: none;
        padding: 10px 20px;
        border-radius: 10px;
        cursor: pointer;
        font-size: 16px;
        font-weight: 900;
        transition: all 0.3s;
        margin: 5px;
    `;
    
    exportBtn.addEventListener('mouseenter', () => {
        exportBtn.style.transform = 'scale(1.05)';
        exportBtn.style.boxShadow = '0 0 5px violet';
    });
    exportBtn.addEventListener('mouseleave', () => {
        exportBtn.style.transform = 'scale(1)';
        exportBtn.style.boxShadow = 'none';
    });
    
    const importBtn = document.createElement('button');
    importBtn.textContent = 'Import Settings';
    importBtn.style.cssText = `
        background-color: #1d1d1d;
        color: aliceblue;
        border: none;
        padding: 10px 20px;
        border-radius: 10px;
        cursor: pointer;
        font-size: 16px;
        font-weight: 900;
        transition: all 0.3s;
        margin: 5px;
    `;
    
    importBtn.addEventListener('mouseenter', () => {
        importBtn.style.transform = 'scale(1.05)';
        importBtn.style.boxShadow = '0 0 5px violet';
    });
    importBtn.addEventListener('mouseleave', () => {
        importBtn.style.transform = 'scale(1)';
        importBtn.style.boxShadow = 'none';
    });
    
    const importInput = document.createElement('input');
    importInput.type = 'file';
    importInput.accept = '.json';
    importInput.style.display = 'none';
    
    exportBtn.addEventListener('click', exportSettings);
    importBtn.addEventListener('click', () => importInput.click());
    importInput.addEventListener('change', importSettings);
    
    buttonContainer.appendChild(exportBtn);
    buttonContainer.appendChild(importBtn);
    buttonContainer.appendChild(importInput);
    
    document.body.appendChild(buttonContainer);
}

function exportSettings() {
    const settings = {
        defaults: currentDefaults,
        customSessions: customSessions,
        exportDate: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `aurocore_settings_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
}

function importSettings(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const settings = JSON.parse(e.target.result);
            
            if (settings.defaults && settings.customSessions) {
                currentDefaults = settings.defaults;
                customSessions = settings.customSessions;
                
                saveSettings();
                displayCurrentSettings();
                
                alert('Settings imported successfully!');
            } else {
                alert('Invalid settings file format');
            }
        } catch (error) {
            alert('Error reading settings file');
        }
    };
    
    reader.readAsText(file);
}

document.addEventListener('DOMContentLoaded', () => {
    initializeSettings();
    addImportExportButtons();
});
