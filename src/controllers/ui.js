// --- BULLETPROOF MODAL UI LOGIC ---

// Open Modals
document.getElementById('card-open-shop')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('shop-modal').style.display = 'flex';
});

document.getElementById('card-open-driver')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('driver-modal').style.display = 'flex';
});

// Close Modals
document.getElementById('close-shop-modal')?.addEventListener('click', () => {
    document.getElementById('shop-modal').style.display = 'none';
});
document.getElementById('close-driver-modal')?.addEventListener('click', () => {
    document.getElementById('driver-modal').style.display = 'none';
});

// Tab Switching - Shop
document.getElementById('tab-shop-login')?.addEventListener('click', () => {
    document.getElementById('tab-shop-login').classList.add('active');
    document.getElementById('tab-shop-signup').classList.remove('active');
    document.getElementById('form-shop-login').classList.remove('hidden');
    document.getElementById('form-shop-signup').classList.add('hidden');
});
document.getElementById('tab-shop-signup')?.addEventListener('click', () => {
    document.getElementById('tab-shop-signup').classList.add('active');
    document.getElementById('tab-shop-login').classList.remove('active');
    document.getElementById('form-shop-signup').classList.remove('hidden');
    document.getElementById('form-shop-login').classList.add('hidden');
});

// Tab Switching - Driver
document.getElementById('tab-driver-login')?.addEventListener('click', () => {
    document.getElementById('tab-driver-login').classList.add('active');
    document.getElementById('tab-driver-signup').classList.remove('active');
    document.getElementById('form-driver-login').classList.remove('hidden');
    document.getElementById('form-driver-signup').classList.add('hidden');
});
document.getElementById('tab-driver-signup')?.addEventListener('click', () => {
    document.getElementById('tab-driver-signup').classList.add('active');
    document.getElementById('tab-driver-login').classList.remove('active');
    document.getElementById('form-driver-signup').classList.remove('hidden');
    document.getElementById('form-driver-login').classList.add('hidden');
});