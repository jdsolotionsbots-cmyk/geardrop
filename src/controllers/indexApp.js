import { auth, db } from '../firebase.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

console.log("🟢 SYSTEM CHECK 1: indexApp.js is connected!");

// Force the Javascript to wait half a second so the HTML has time to load!
setTimeout(() => {
    console.log("🟢 SYSTEM CHECK 2: Searching for buttons...");

    // UI & Modals
    document.getElementById('card-open-shop')?.addEventListener('click', () => { document.getElementById('shop-modal').style.display = 'flex'; });
    document.getElementById('card-open-driver')?.addEventListener('click', () => { document.getElementById('driver-modal').style.display = 'flex'; });
    document.getElementById('close-shop-modal')?.addEventListener('click', () => { document.getElementById('shop-modal').style.display = 'none'; });
    document.getElementById('close-driver-modal')?.addEventListener('click', () => { document.getElementById('driver-modal').style.display = 'none'; });

    // Shop Tabs
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

    // Driver Tabs
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
    // SHOP CREATION
    // ==========================================
    const shopRegBtn = document.getElementById('btn-shop-email-reg');
    console.log("🟢 SYSTEM CHECK 3: Create Shop Button Found?", shopRegBtn !== null ? "YES!" : "NO!");

    shopRegBtn?.addEventListener('click', async (e) => {
        e.preventDefault();
        console.log("🚨 BUTTON CLICKED!");
        
        const btn = e.target;
        btn.innerText = "Processing...";
        
        const email = document.getElementById('shop-reg-email').value;
        const password = document.getElementById('shop-reg-password').value;
        const name = document.getElementById('shop-reg-name').value;
        const business = document.getElementById('shop-reg-business').value;
        const phone = document.getElementById('shop-reg-phone').value;

        if(!email || !password || !name) {
            btn.innerText = "Missing Fields!";
            btn.style.background = "#ff3333";
            console.log("❌ Failed: Missing fields");
            return;
        }

        try {
            console.log("⏳ Contacting Firebase Auth...");
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            console.log("✅ Auth Success! User UID:", userCredential.user.uid);
            
            console.log("⏳ Saving to Firestore...");
            await setDoc(doc(db, 'users', userCredential.user.uid), {
                email: email, name: name, businessName: business, phone: phone, role: 'shop', status: 'active'
            });
            
            console.log("✅ Firestore Success! Teleporting to map...");
            btn.innerText = "Success! Redirecting...";
            btn.style.background = "#4CAF50";
            window.location.href = '/dealer.html';
        } catch (error) {
            console.error("🔥 FIREBASE ERROR:", error);
            btn.innerText = "Error: " + error.code;
            btn.style.background = "#ff3333";
        }
    });

    // ==========================================
    // SHOP LOGIN
    // ==========================================
    document.getElementById('btn-shop-email-login')?.addEventListener('click', async (e) => {
        e.preventDefault();
        const btn = e.target;
        btn.innerText = "Logging in...";
        const email = document.getElementById('shop-login-email').value;
        const password = document.getElementById('shop-login-password').value;
        
        try {
            await signInWithEmailAndPassword(auth, email, password);
            window.location.href = '/dealer.html';
        } catch (error) {
            console.error("Login Error:", error);
            btn.innerText = "Invalid Email or Password";
            btn.style.background = "#ff3333";
        }
    });

    // ==========================================
    // DRIVER CREATION
    // ==========================================
    document.getElementById('btn-driver-email-reg')?.addEventListener('click', async (e) => {
        e.preventDefault();
        const btn = e.target;
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
            btn.innerText = "Success! Redirecting...";
            btn.style.background = "#4CAF50";
            window.location.href = '/driver.html';
        } catch (error) {
            console.error("Driver Reg Error:", error);
            btn.innerText = "Error: " + error.code;
            btn.style.background = "#ff3333";
        }
    });

    // ==========================================
    // DRIVER LOGIN
    // ==========================================
    document.getElementById('btn-driver-email-login')?.addEventListener('click', async (e) => {
        e.preventDefault();
        const btn = e.target;
        btn.innerText = "Logging in...";
        const email = document.getElementById('driver-login-email').value;
        const password = document.getElementById('driver-login-password').value;
        
        try {
            await signInWithEmailAndPassword(auth, email, password);
            window.location.href = '/driver.html';
        } catch (error) {
            console.error("Driver Login Error:", error);
            btn.innerText = "Invalid Email or Password";
            btn.style.background = "#ff3333";
        }
    });

}, 500); // <-- This is the magic delay!s