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
});// --- MODAL & UI LOGIC ---
// Open Modals
document.getElementById('card-open-shop').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('shop-modal').style.display = 'flex';
});

document.getElementById('card-open-driver').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('driver-modal').style.display = 'flex';
});

// Close Modals
document.getElementById('close-shop-modal').addEventListener('click', () => {
    document.getElementById('shop-modal').style.display = 'none';
});
document.getElementById('close-driver-modal').addEventListener('click', () => {
    document.getElementById('driver-modal').style.display = 'none';
});

// Tab Switching - Shop
document.getElementById('tab-shop-login').addEventListener('click', () => {
    document.getElementById('tab-shop-login').classList.add('active');
    document.getElementById('tab-shop-signup').classList.remove('active');
    document.getElementById('form-shop-login').classList.remove('hidden');
    document.getElementById('form-shop-signup').classList.add('hidden');
});
document.getElementById('tab-shop-signup').addEventListener('click', () => {
    document.getElementById('tab-shop-signup').classList.add('active');
    document.getElementById('tab-shop-login').classList.remove('active');
    document.getElementById('form-shop-signup').classList.remove('hidden');
    document.getElementById('form-shop-login').classList.add('hidden');
});

// Tab Switching - Driver
document.getElementById('tab-driver-login').addEventListener('click', () => {
    document.getElementById('tab-driver-login').classList.add('active');
    document.getElementById('tab-driver-signup').classList.remove('active');
    document.getElementById('form-driver-login').classList.remove('hidden');
    document.getElementById('form-driver-signup').classList.add('hidden');
});
document.getElementById('tab-driver-signup').addEventListener('click', () => {
    document.getElementById('tab-driver-signup').classList.add('active');
    document.getElementById('tab-driver-login').classList.remove('active');
    document.getElementById('form-driver-signup').classList.remove('hidden');
    document.getElementById('form-driver-login').classList.add('hidden');
});