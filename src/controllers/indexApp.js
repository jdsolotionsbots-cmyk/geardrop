import { auth, db } from '../firebase.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

// ==========================================
// 1. UI & MODAL LOGIC
// ==========================================
document.getElementById('card-open-shop')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('shop-modal').style.display = 'flex';
});

document.getElementById('card-open-driver')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('driver-modal').style.display = 'flex';
});

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

// ==========================================
// 2. SHOP AUTHENTICATION (EMAIL/PASSWORD)
// ==========================================
document.getElementById('btn-shop-email-reg')?.addEventListener('click', async () => {
    const email = document.getElementById('shop-reg-email').value;
    const password = document.getElementById('shop-reg-password').value;
    const name = document.getElementById('shop-reg-name').value;
    const business = document.getElementById('shop-reg-business').value;
    const phone = document.getElementById('shop-reg-phone').value;

    if(!email || !password || !name) return alert("Please fill out all fields!");

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await setDoc(doc(db, 'users', user.uid), {
            email: email,
            name: name,
            businessName: business,
            phone: phone,
            role: 'shop',
            status: 'active'
        });

        window.location.href = '/dealer.html';
    } catch (error) {
        alert("Error creating account: " + error.message);
    }
});

document.getElementById('btn-shop-email-login')?.addEventListener('click', async () => {
    const email = document.getElementById('shop-login-email').value;
    const password = document.getElementById('shop-login-password').value;
    
    try {
        await signInWithEmailAndPassword(auth, email, password);
        window.location.href = '/dealer.html';
    } catch (error) {
        alert("Login failed: " + error.message);
    }
});

// ==========================================
// 3. DRIVER AUTHENTICATION (EMAIL/PASSWORD)
// ==========================================
document.getElementById('btn-driver-email-reg')?.addEventListener('click', async () => {
    const email = document.getElementById('driver-reg-email').value;
    const password = document.getElementById('driver-reg-password').value;
    const name = document.getElementById('driver-reg-name').value;
    const vehicle = document.getElementById('driver-reg-vehicle').value;
    const phone = document.getElementById('driver-reg-phone').value;

    if(!email || !password || !name) return alert("Please fill out all fields!");

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await setDoc(doc(db, 'drivers', user.uid), {
            email: email,
            name: name,
            vehicle: vehicle,
            phone: phone,
            role: 'driver',
            status: 'pending' 
        });

        window.location.href = '/driver.html';
    } catch (error) {
        alert("Error submitting application: " + error.message);
    }
});

document.getElementById('btn-driver-email-login')?.addEventListener('click', async () => {
    const email = document.getElementById('driver-login-email').value;
    const password = document.getElementById('driver-login-password').value;
    
    try {
        await signInWithEmailAndPassword(auth, email, password);
        window.location.href = '/driver.html';
    } catch (error) {
        alert("Login failed: " + error.message);
    }
});