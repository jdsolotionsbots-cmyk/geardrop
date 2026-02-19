// Import the secure tools from your auth service
import { loginUser, checkAuthState } from '../services/auth.js';

// 1. Session Check: If they refresh the page, where should they go?
checkAuthState((authData) => {
    if (authData) {
        // If they are already logged in, route them to their correct dashboard
        if (authData.isAdmin) {
            window.location.href = '/admin.html';
        } else if (authData.role === 'driver') {
            window.location.href = '/driver.html';
        } else {
            window.location.href = '/dealer.html';
        }
    }
});

// 2. Wire up the buttons once the HTML finishes loading
document.addEventListener('DOMContentLoaded', () => {
    
    // Shop Login Button
    const dealerBtn = document.getElementById('btn-login-dealer');
    if (dealerBtn) {
        dealerBtn.addEventListener('click', async () => {
            const user = await loginUser('dealer');
            if (user) window.location.href = '/dealer.html';
        });
    }

    // Driver Login Button
    const driverBtn = document.getElementById('btn-login-driver');
    if (driverBtn) {
        driverBtn.addEventListener('click', async () => {
            const user = await loginUser('driver');
            if (user) window.location.href = '/driver.html';
        });
    }
});