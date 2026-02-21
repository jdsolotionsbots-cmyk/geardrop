import { checkAuthState, logoutUser } from '../services/auth.js';
import { db, auth } from '../config/firebase.js';
import { collection, addDoc, onSnapshot, doc } from "firebase/firestore";
import { initModals, openProfileModal, openChatModal } from '../services/modals.js';
let map;
let currentJobId = null;

// 1. Authenticate and Initialize
checkAuthState((authData) => {
    if (!authData || authData.role !== 'shop') {
        window.location.href = '/index.html'; // Kick out unauthorized users
    } else {
        initMap();
        loadGoogleMapsAPI(); // Securely load places autocomplete
    }
});

// 2. Map & UI Setup
const initMap = () => {
    if (map || !document.getElementById('map')) return;
    map = L.map('map').setView([43.2557, -79.8711], 13); // Centered on Hamilton
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(map);
    setTimeout(() => { map.invalidateSize(); }, 500); 
};

// Dynamically load Google Maps to protect the API key
const loadGoogleMapsAPI = () => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_KEY}&libraries=places`;
    script.async = true;
    document.head.appendChild(script);
    script.onload = () => attachAutocompleteToInputs();
};

const attachAutocompleteToInputs = () => {
    if (!window.google) return;
    document.querySelectorAll('.stop-address').forEach(input => {
        if (!input.dataset.mapped) {
            const auto = new google.maps.places.Autocomplete(input, { componentRestrictions: { country: "ca" } });
            auto.addListener('place_changed', calculateMultiPrice);
            input.dataset.mapped = "true";
        }
    });
};

// 3. Pricing Logic
const calculateMultiPrice = () => {
    const stops = document.querySelectorAll('.stop-address').length;
    if (stops === 0) return;
    const sub = 7.50 + ((stops - 1) * 3.50) + (stops * 5); // Base math from prototype
    document.getElementById('live-price').innerText = "$" + (sub * 1.13).toFixed(2);
};

// 4. Event Listeners
document.addEventListener('DOMContentLoaded', () => {
// Initialize the modal HTML
    initModals();

    // Wire up the top nav profile button
    document.getElementById('btn-profile').addEventListener('click', openProfileModal);

    // Wire up the floating chat button
    const chatFab = document.getElementById('chat-fab');
    if (chatFab) {
        chatFab.addEventListener('click', () => openChatModal(currentJobId));
    }    
    // Logout
    document.getElementById('btn-logout').addEventListener('click', async () => {
        await logoutUser();
        window.location.href = '/index.html';
    });

    // Add Stop
    document.getElementById('btn-add-stop').addEventListener('click', () => {
        const container = document.getElementById('stops-container');
        const count = container.children.length + 1;
        
        const div = document.createElement('div');
        div.className = 'stop-entry';
        div.style = "background: var(--bg-card); padding: 15px; border-radius: 8px; margin-bottom: 15px; border-left: 3px solid var(--primary);";
        
        div.innerHTML = `
            <div style="display:flex; justify-content:space-between;">
                <small style="color:var(--primary); font-weight:bold;">STOP ${count}</small>
                <i class="fas fa-times btn-remove-stop" style="cursor:pointer; color:#888;"></i>
            </div>
            <input type="text" placeholder="Address..." class="input-dark stop-address" style="margin-top:10px;">
            <input type="text" placeholder="Part Details / PO#" class="input-dark stop-details" style="margin-bottom:0;">
        `;
        
        container.appendChild(div);
        
        // Setup remove button functionality
        div.querySelector('.btn-remove-stop').addEventListener('click', (e) => {
            e.target.closest('.stop-entry').remove();
            calculateMultiPrice();
        });

        attachAutocompleteToInputs();
        calculateMultiPrice();
    });

    // Submit Job to Firestore
    document.getElementById('btn-confirm-route').addEventListener('click', async () => {
        const stops = [];
        document.querySelectorAll('.stop-entry').forEach(el => {
            stops.push({ 
                address: el.querySelector('.stop-address').value, 
                details: el.querySelector('.stop-details').value 
            });
        });

        try {
            const price = parseFloat(document.getElementById('live-price').innerText.replace('$',''));
            const docRef = await addDoc(collection(db, "jobs"), {
                dealerId: auth.currentUser.uid, 
                stops: stops, 
                price: price,
                status: 'searching', 
                time: new Date()
            });
            
            currentJobId = docRef.id;
            const banner = document.getElementById('order-status-banner');
            banner.innerHTML = `<div style="background:#4CAF50; color:white; padding:15px; border-radius:8px;">Searching for Driver...</div>`;
            
            // Listen for driver pickup
            onSnapshot(doc(db, "jobs", currentJobId), (snap) => {
                const data = snap.data();
                if (data && data.status === 'claimed') {
                    banner.innerHTML = `<div style="background:#4CAF50; color:white; padding:15px; border-radius:8px;">Route Claimed by ${data.driverName || 'Driver'}!</div>`;
                }
            });
        } catch(error) { 
            console.error("Failed to post job:", error); 
        }
    });
});