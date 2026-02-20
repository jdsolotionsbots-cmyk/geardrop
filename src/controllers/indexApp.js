import { auth, db } from '../config/firebase.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

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
// 2. SHOP AUTHENTICATION
// ==========================================
document.getElementById('btn-shop-email-reg')?.addEventListener('click', async (e) => {
    e.preventDefault();
    const btn = e.currentTarget;
    btn.innerText = "Processing..."; // Visual feedback!
    
    const email = document.getElementById('shop-reg-email').value;
    const password = document.getElementById('shop-reg-password').value;
    const name = document.getElementById('shop-reg-name').value;
    const business = document.getElementById('shop-reg-business').value;
    const phone = document.getElementById('shop-reg-phone').value;

    if(!email || !password || !name) {
        btn.innerText = "Missing Fields!";
        btn.style.background = "#ff3333";
        return;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, 'users', userCredential.user.uid), {
            email: email, name: name, businessName: business, phone: phone, role: 'dealer', status: 'active'
        });
        btn.innerText = "Success! Redirecting...";
        btn.style.background = "#4CAF50"; // Turn Green
        window.location.href = '/dealer.html';
    } catch (error) {
        console.error("Shop Reg Error:", error);
        btn.innerText = "Error: " + error.code; // Show exact error on button
        btn.style.background = "#ff3333"; // Turn Red
    }
});

document.getElementById('btn-shop-email-login')?.addEventListener('click', async (e) => {
    e.preventDefault();
    const btn = e.currentTarget;
    btn.innerText = "Logging in...";
    const email = document.getElementById('shop-login-email').value;
    const password = document.getElementById('shop-login-password').value;
    
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
        const role = userDoc.exists() ? userDoc.data().role : 'dealer';
        window.location.href = role === 'driver' ? '/driver.html' : '/dealer.html';
    } catch (error) {
        btn.innerText = "Invalid Email or Password";
        btn.style.background = "#ff3333";
    }
});

// ==========================================
// 3. DRIVER AUTHENTICATION
// ==========================================
document.getElementById('btn-driver-email-reg')?.addEventListener('click', async (e) => {
    e.preventDefault();
    const btn = e.currentTarget;
    btn.innerText = "Processing...";
    
    const email = document.getElementById('driver-reg-email').value;
    const password = document.getElementById('driver-reg-password').value;
    const name = document.getElementById('driver-reg-name').value;
    const vehicle = document.getElementById('driver-reg-vehicle').value;
    const phone = document.getElementById('driver-reg-phone').value;

    if(!email || !password || !name) {
        btn.innerText = "Missing Fields!";
        btn.style.background = "#ff3333";
        return;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, 'drivers', userCredential.user.uid), {
            email: email, name: name, vehicle: vehicle, phone: phone, role: 'driver', status: 'pending' 
        });
        // Also save to 'users' collection so checkAuthState can find the role
        await setDoc(doc(db, 'users', userCredential.user.uid), {
            email: email, role: 'driver'
        });
        btn.innerText = "Success! Redirecting...";
        btn.style.background = "#4CAF50";
        window.location.href = '/driver.html';
    } catch (error) {
        console.error("Driver Reg Error:", error);
        btn.innerText = "Error: " + error.code;
        btn.style.background = "#ff3333";
    }
});

document.getElementById('btn-driver-email-login')?.addEventListener('click', async (e) => {
    e.preventDefault();
    const btn = e.currentTarget;
    btn.innerText = "Logging in...";
    const email = document.getElementById('driver-login-email').value;
    const password = document.getElementById('driver-login-password').value;
    
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
        const role = userDoc.exists() ? userDoc.data().role : 'driver';
        window.location.href = role === 'dealer' ? '/dealer.html' : '/driver.html';
    } catch (error) {
        btn.innerText = "Invalid Email or Password";
        btn.style.background = "#ff3333";
    }
});