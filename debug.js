// Debug and testing utilities for AuroCore Extension

console.log('AuroCore Debug Script Loaded');

// Test extension functionality
async function testExtension() {
    console.log('🔍 Testing AuroCore Extension...');
    
    try {
        // Test background script communication
        console.log('📡 Testing background script communication...');
        const response = await chrome.runtime.sendMessage({ type: 'get_timer_state' });
        console.log('✅ Background script responsive:', response);
        
        // Test storage
        console.log('💾 Testing Chrome storage...');
        await chrome.storage.local.set({ test: 'debugging' });
        const testResult = await chrome.storage.local.get(['test']);
        console.log('✅ Storage working:', testResult);
        
        // Test data structure
        console.log('📊 Testing data structure...');
        const { data } = await import('./aurocore_sections.js');
        console.log('✅ Data loaded:', data.sections.length, 'sections');
        
        // Log all available roles
        const allRoles = new Set();
        data.sections.forEach(section => {
            section.roles.forEach(role => allRoles.add(role));
        });
        console.log('✅ Available roles:', Array.from(allRoles));
        
        console.log('🎉 All tests passed!');
        
    } catch (error) {
        console.error('❌ Extension test failed:', error);
        return false;
    }
    
    return true;
}

// Test website validation
function testWebsiteValidation() {
    console.log('🌐 Testing website validation...');
    
    const testCases = [
        { url: 'https://www.figma.com/design/test', role: 'Designer', expected: true },
        { url: 'https://github.com/user/repo', role: 'Developer', expected: true },
        { url: 'https://scholar.google.com/search', role: 'Student', expected: true },
        { url: 'https://facebook.com', role: 'Designer', expected: false },
        { url: 'https://linkedin.com/in/user', role: 'Manager', expected: true }
    ];
    
    testCases.forEach(test => {
        // This would need to be tested in background script context
        console.log(`Testing: ${test.url} for ${test.role} - Expected: ${test.expected}`);
    });
}

// Simulate timer workflow
async function simulateTimerWorkflow() {
    console.log('⏱️ Simulating timer workflow...');
    
    try {
        // Start timer
        console.log('▶️ Starting timer...');
        await chrome.runtime.sendMessage({
            type: 'start_timer',
            role: 'Developer',
            sessionMinutes: 1, // Short for testing
            breakMinutes: 1
        });
        
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        
        // Check state
        const state = await chrome.runtime.sendMessage({ type: 'get_timer_state' });
        console.log('📊 Timer state:', state);
        
        // Pause timer
        console.log('⏸️ Pausing timer...');
        await chrome.runtime.sendMessage({ type: 'pause_timer' });
        
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        
        // Resume timer
        console.log('▶️ Resuming timer...');
        await chrome.runtime.sendMessage({ type: 'resume_timer' });
        
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        
        // Stop timer
        console.log('⏹️ Stopping timer...');
        await chrome.runtime.sendMessage({ type: 'stop_timer' });
        
        console.log('✅ Timer workflow simulation completed');
        
    } catch (error) {
        console.error('❌ Timer workflow simulation failed:', error);
    }
}

// Check logs
async function checkLogs() {
    console.log('📋 Checking logs...');
    
    try {
        const response = await chrome.runtime.sendMessage({ type: 'get_logs' });
        console.log('📝 Current logs:', response.logs);
        console.log('📊 Total sessions:', response.logs?.length || 0);
        
    } catch (error) {
        console.error('❌ Failed to check logs:', error);
    }
}

// Initialize debugging
if (typeof chrome !== 'undefined' && chrome.runtime) {
    console.log('🚀 AuroCore Debug Mode Active');
    
    // Auto-run tests
    setTimeout(async () => {
        const success = await testExtension();
        if (success) {
            testWebsiteValidation();
            // Uncomment to test timer workflow
            // await simulateTimerWorkflow();
            await checkLogs();
        }
    }, 1000);
    
    // Make functions available globally for manual testing
    window.auroDebug = {
        testExtension,
        testWebsiteValidation,
        simulateTimerWorkflow,
        checkLogs
    };
    
    console.log('🛠️ Debug functions available as window.auroDebug');
}