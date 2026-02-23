import { auth, db } from '../config/firebase.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

console.log("🟢 SYSTEM CHECK: indexApp is fully awake!");

// Modals UI
document.getElementById('card-open-shop')?.addEventListener('click', () => { document.getElementById('shop-modal').style.display = 'flex'; });
document.getElementById('card-open-driver')?.addEventListener('click', () => { document.getElementById('driver-modal').style.display = 'flex'; });
document.getElementById('close-shop-modal')?.addEventListener('click', () => { document.getElementById('shop-modal').style.display = 'none'; });
document.getElementById('close-driver-modal')?.addEventListener('click', () => { document.getElementById('driver-modal').style.display = 'none'; });

// Tabs UI
const switchTabs = (type, activeTab) => {
    document.getElementById(`tab-${type}-login`).classList.toggle('active', activeTab === 'login');
    document.getElementById(`tab-${type}-signup`).classList.toggle('active', activeTab === 'signup');
    document.getElementById(`form-${type}-login`).classList.toggle('hidden', activeTab !== 'login');
    document.getElementById(`form-${type}-signup`).classList.toggle('hidden', activeTab !== 'signup');
};
document.getElementById('tab-shop-login')?.addEventListener('click', () => switchTabs('shop', 'login'));
document.getElementById('tab-shop-signup')?.addEventListener('click', () => switchTabs('shop', 'signup'));
document.getElementById('tab-driver-login')?.addEventListener('click', () => switchTabs('driver', 'login'));
document.getElementById('tab-driver-signup')?.addEventListener('click', () => switchTabs('driver', 'signup'));

// --- SHOP CREATION ---
document.getElementById('btn-shop-email-reg')?.addEventListener('click', async (e) => {
    e.preventDefault();
    const btn = e.target; btn.innerText = "Processing...";
    const email = document.getElementById('shop-reg-email')?.value;
    const password = document.getElementById('shop-reg-password')?.value;
    const name = document.getElementById('shop-reg-name')?.value;
    if(!email || !password || !name) return btn.innerText = "Missing Fields!";

    try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, 'users', cred.user.uid), { email, name, role: 'shop', status: 'active' });
        alert("Account Created Successfully!");
        window.location.href = '/dealer.html';
    } catch (error) { btn.innerText = "Error: " + error.code; }
});

// --- SHOP / ADMIN LOGIN ---
document.getElementById('btn-shop-email-login')?.addEventListener('click', async (e) => {
    e.preventDefault();
    const btn = e.target; btn.innerText = "Authenticating...";
    const email = document.getElementById('shop-login-email')?.value;
    const password = document.getElementById('shop-login-password')?.value;
    
    try {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        const userDoc = await getDoc(doc(db, 'users', cred.user.uid));
        
        if (userDoc.exists() && userDoc.data().role === 'admin') {
            alert("Login Successful! Welcome to God Mode.");
            window.location.href = '/admin.html';
        } else {
            alert("Login Successful!");
            window.location.href = '/dealer.html';
        }
    } catch (error) { btn.innerText = "Invalid Login"; }
});

// --- DRIVER LOGIN & REGISTRATION ---
document.getElementById('btn-driver-email-reg')?.addEventListener('click', async (e) => {
    e.preventDefault();
    const btn = e.target; btn.innerText = "Processing...";
    try {
        const email = document.getElementById('driver-reg-email')?.value;
        const password = document.getElementById('driver-reg-password')?.value;
        const name = document.getElementById('driver-reg-name')?.value || "New Driver";
        if (!email || !password) return btn.innerText = "Missing Email/Password!";

        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, 'drivers', cred.user.uid), { email, name, role: 'driver', status: 'pending' });
        alert("Application Submitted Successfully!");
        window.location.href = '/driver.html';
    } catch (error) { btn.innerText = "Error: " + error.code; }
});

document.getElementById('btn-driver-email-login')?.addEventListener('click', async (e) => {
    e.preventDefault();
    const btn = e.target; btn.innerText = "Logging in...";
    try {
        const email = document.getElementById('driver-login-email')?.value;
        const password = document.getElementById('driver-login-password')?.value;
        await signInWithEmailAndPassword(auth, email, password);
        alert("Login Successful!");
        window.location.href = '/driver.html';
    } catch (error) { btn.innerText = "Invalid Login"; }
});

// --- PASSWORD RESET ENGINES ---
document.getElementById('driver-forgot-pass')?.addEventListener('click', async () => {
    const emailInput = document.getElementById('driver-login-email')?.value;
    if (!emailInput) {
        alert("Please type your email address into the Driver login box first, then click 'Forgot Password?'");
        return;
    }
    try {
        await sendPasswordResetEmail(auth, emailInput);
        alert(`Driver password reset link sent to: ${emailInput}\nPlease check your inbox/spam folder.`);
    } catch (error) {
        alert("Error: Could not send reset email. Make sure this email is registered.");
    }
});

document.getElementById('shop-forgot-pass')?.addEventListener('click', async () => {
    const emailInput = document.getElementById('shop-login-email')?.value;
    if (!emailInput) {
        alert("Please type your email address into the Shop login box first, then click 'Forgot Password?'");
        return;
    }
    try {
        await sendPasswordResetEmail(auth, emailInput);
        alert(`Shop password reset link sent to: ${emailInput}\nPlease check your inbox/spam folder.`);
    } catch (error) {
        alert("Error: Could not send reset email. Make sure this email is registered.");
    }
});