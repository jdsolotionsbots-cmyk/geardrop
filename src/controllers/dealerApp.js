import { checkAuthState, logoutUser } from '../services/auth.js';
import { db, auth } from '../config/firebase.js';
import { collection, addDoc, onSnapshot, doc } from "firebase/firestore";
import { initModals, openProfileModal, openChatModal } from '../services/modals.js';

let map;
let currentJobId = null;

// 1. Authenticate and Initialize
checkAuthState((authData) => {
    if (!authData || authData.role !== 'shop') {
        window.location.href = '/index.html'; // Kick out hackers
    } else {
        initMap();
        // Google Maps has been completely removed! 
    }
});

// 2. Map & UI Setup (100% Free OpenStreetMap)
const initMap = () => {
    if (map || !document.getElementById('map')) return;
    map = L.map('map').setView([43.2557, -79.8711], 13); // Centered on Hamilton
    
    // Free beautiful dark mode map tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(map);
    setTimeout(() => { map.invalidateSize(); }, 500); 
};

// ==========================================
// FREE GPS GEOLOCATION ENGINE
// ==========================================
const getUserLocation = async (inputElement) => {
    inputElement.value = "Locating..."; // Tell the user we are searching
    
    // Ask the browser for the user's location
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(async (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            
            // Move the visual map to their location and drop a pin
            map.setView([lat, lon], 15);
            L.marker([lat, lon]).addTo(map);

            // Translate GPS coordinates into a real Street Address for FREE
            try {
                const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
                const data = await response.json();
                
                // Put the real address into the input box
                inputElement.value = data.display_name; 
                calculateMultiPrice();
            } catch (err) {
                // Backup plan: just paste the GPS coordinates
                inputElement.value = `${lat}, ${lon}`; 
            }
        }, (error) => {
            alert("Please allow location access in your browser pop-up to use this feature!");
            inputElement.value = "";
        });
    } else {
        alert("Geolocation is not supported by your browser");
    }
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
    initModals();

    document.getElementById('btn-profile')?.addEventListener('click', openProfileModal);

    const chatFab = document.getElementById('chat-fab');
    if (chatFab) {
        chatFab.addEventListener('click', () => openChatModal(currentJobId));
    }    
    
    document.getElementById('btn-logout')?.addEventListener('click', async () => {
        await logoutUser();
        window.location.href = '/index.html';
    });

    // Add Stop Button
    document.getElementById('btn-add-stop')?.addEventListener('click', () => {
        const container = document.getElementById('stops-container');
        const count = container.children.length + 1;
        
        const div = document.createElement('div');
        div.className = 'stop-entry';
        div.style = "background: var(--bg-card); padding: 15px; border-radius: 8px; margin-bottom: 15px; border-left: 3px solid var(--primary);";
        
        // Build the HTML with the new "Locate Me" button!
        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <small style="color:var(--primary); font-weight:bold;">STOP ${count}</small>
                <i class="fas fa-times btn-remove-stop" style="cursor:pointer; color:#888;"></i>
            </div>
            <div style="display:flex; gap: 10px; margin-top:10px;">
                <input type="text" placeholder="Type Address manually..." class="input-dark stop-address" style="flex: 1; margin:0;">
                <button class="btn btn-primary btn-locate" style="padding: 10px; min-width: 45px; display:flex; justify-content:center; align-items:center;" title="Use My Location">
                    <i class="fas fa-location-crosshairs"></i>
                </button>
            </div>
            <input type="text" placeholder="Part Details / PO#" class="input-dark stop-details" style="margin-top:10px; width:100%; box-sizing:border-box;">
        `;
        
        container.appendChild(div);
        
        // Remove button logic
        div.querySelector('.btn-remove-stop').addEventListener('click', (e) => {
            e.target.closest('.stop-entry').remove();
            calculateMultiPrice();
        });

        // "Locate Me" GPS button logic
        const inputField = div.querySelector('.stop-address');
        div.querySelector('.btn-locate').addEventListener('click', (e) => {
            e.preventDefault();
            getUserLocation(inputField);
        });

        // Update price when typing manually
        inputField.addEventListener('input', calculateMultiPrice);
        
        calculateMultiPrice();
    });

    // Submit Job to Firestore
    document.getElementById('btn-confirm-route')?.addEventListener('click', async () => {
        const stops = [];
        document.querySelectorAll('.stop-entry').forEach(el => {
            const address = el.querySelector('.stop-address').value;
            if(address) {
                stops.push({ 
                    address: address, 
                    details: el.querySelector('.stop-details').value 
                });
            }
        });

        if(stops.length === 0) return alert("Please add at least one stop!");

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
            alert("Failed to submit route. Check your internet connection.");
        }
    });
});