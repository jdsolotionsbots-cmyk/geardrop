import { checkAuthState, logoutUser } from '../services/auth.js';
import { db, auth } from '../config/firebase.js'; // Using your original config!
import { collection, addDoc, doc, getDoc, updateDoc, onSnapshot, query, where } from "firebase/firestore";

let map;
let pickupPin, dropoffPin, routeLine;
let routeData = { pickup: null, dropoff: null, distanceKm: 0, price: 0 };

// 1. App Initialization
checkAuthState((authData) => {
    if (!authData || authData.role !== 'driver') return window.location.href = '/index.html';
    initMap();
    setupNavigation();
    listenToMyOrders(); 
});
const initMap = () => {
    if (map) return;
    map = L.map('map').setView([43.2557, -79.8711], 12); 
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(map);
    setTimeout(() => { map.invalidateSize(); }, 500); 
};

// 2. Tab Navigation
const setupNavigation = () => {
    const btnNew = document.getElementById('nav-new');
    const btnHistory = document.getElementById('nav-history');
    const viewNew = document.getElementById('view-new');
    const viewHistory = document.getElementById('view-history');

    btnNew.onclick = () => {
        btnNew.classList.add('active'); btnHistory.classList.remove('active');
        viewNew.style.display = 'block'; viewHistory.style.display = 'none';
        setTimeout(() => { map.invalidateSize(); }, 100); 
    };
    btnHistory.onclick = () => {
        btnHistory.classList.add('active'); btnNew.classList.remove('active');
        viewHistory.style.display = 'block'; viewNew.style.display = 'none';
    };
};

// 3. Free Address Autocomplete (Nominatim)
const setupAutocomplete = (inputId, resultsId, type) => {
    const input = document.getElementById(inputId);
    const resultsBox = document.getElementById(resultsId);
    let timeout = null;

    input.addEventListener('input', (e) => {
        clearTimeout(timeout);
        const query = e.target.value;
        if (query.length < 4) { resultsBox.style.display = 'none'; return; }

        timeout = setTimeout(async () => {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=5&viewbox=-80.0,43.4,-79.6,43.1&bounded=1`);
            const data = await res.json();
            
            resultsBox.innerHTML = '';
            if (data.length > 0) {
                resultsBox.style.display = 'block';
                data.forEach(place => {
                    const div = document.createElement('div');
                    div.className = 'autocomplete-item';
                    div.innerText = place.display_name;
                    div.onclick = () => {
                        input.value = place.display_name;
                        resultsBox.style.display = 'none';
                        setMapPin(type, place.lat, place.lon, place.display_name);
                    };
                    resultsBox.appendChild(div);
                });
            }
        }, 500);
    });

    document.addEventListener('click', (e) => {
        if(e.target !== input) resultsBox.style.display = 'none';
    });
};

setupAutocomplete('pickup-input', 'pickup-results', 'pickup');
setupAutocomplete('dropoff-input', 'dropoff-results', 'dropoff');

// 4. Map Pins & Distance Math (RESTORED!)
const setMapPin = (type, lat, lon, addressName) => {
    const coords = [parseFloat(lat), parseFloat(lon)];
    
    if (type === 'pickup') {
        if (pickupPin) map.removeLayer(pickupPin);
        pickupPin = L.marker(coords).addTo(map).bindPopup("Pickup").openPopup();
        routeData.pickup = { address: addressName, lat: coords[0], lng: coords[1] };
    } else {
        if (dropoffPin) map.removeLayer(dropoffPin);
        dropoffPin = L.marker(coords).addTo(map).bindPopup("Drop-off").openPopup();
        routeData.dropoff = { address: addressName, lat: coords[0], lng: coords[1] };
    }

    map.setView(coords, 13);

    if (routeData.pickup && routeData.dropoff) {
        if (routeLine) map.removeLayer(routeLine);
        
        routeLine = L.polyline([
            [routeData.pickup.lat, routeData.pickup.lng],
            [routeData.dropoff.lat, routeData.dropoff.lng]
        ], { color: '#FF6600', weight: 4, dashArray: '10, 10' }).addTo(map);
        map.fitBounds(routeLine.getBounds(), { padding: [30, 30] });

        const meters = map.distance([routeData.pickup.lat, routeData.pickup.lng], [routeData.dropoff.lat, routeData.dropoff.lng]);
        routeData.distanceKm = (meters / 1000) * 1.3; 

        routeData.price = 7.50 + (routeData.distanceKm * 1.50);
        
        document.getElementById('route-distance').innerText = routeData.distanceKm.toFixed(1) + " km";
        document.getElementById('live-price').innerText = "$" + routeData.price.toFixed(2);
        
        const btn = document.getElementById('btn-confirm-route');
        btn.disabled = false;
        btn.innerHTML = `<i class="fas fa-satellite-dish"></i> Broadcast Job for $${routeData.price.toFixed(2)}`;
    }
};

// =====================================================================
// 🟢 LIVE DRIVER TRACKER ("THE GOD VIEW") 🟢
// =====================================================================

let driverMarker = null;

const carIcon = L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/3204/3204121.png', 
    iconSize: [40, 40],
    iconAnchor: [20, 20] 
});

console.log("Starting Live Tracker...");
const driverRef = doc(db, "drivers", "Audi_A5_SLine_01");

onSnapshot(driverRef, (docSnap) => {
    if (docSnap.exists()) {
        const data = docSnap.data();
        const lat = data.lat;
        const lng = data.lng;

        console.log(`Live heartbeat received: ${lat}, ${lng}`);

        if (!driverMarker) {
            driverMarker = L.marker([lat, lng], { icon: carIcon }).addTo(map);
            driverMarker.bindPopup("<b>Juan's Audi A5</b><br>Status: ON DUTY");
        } else {
            driverMarker.setLatLng([lat, lng]);
        }
    }
});

// =====================================================================

// 5. Submit Job
document.getElementById('btn-confirm-route')?.addEventListener('click', async () => {
    const details = document.getElementById('job-details').value;
    if (!details) return alert("Please add the part details or Invoice number.");

    try {
        const btn = document.getElementById('btn-confirm-route');
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Broadcasting...';
        btn.disabled = true;

        await addDoc(collection(db, "jobs"), {
            dealerId: auth.currentUser.uid,
            pickup: routeData.pickup.address,
            dropoff: routeData.dropoff.address,
            details: details,
            distance: routeData.distanceKm.toFixed(1),
            price: parseFloat(routeData.price.toFixed(2)),
            status: 'searching',
            time: new Date()
        });
        
        document.getElementById('nav-history').click();
        document.getElementById('job-details').value = "";
        btn.innerHTML = `Enter addresses to calculate`;

    } catch(error) { 
        alert("Failed to submit route.");
    }
});

// 6. Live Order Tracking
const listenToMyOrders = () => {
    const q = query(collection(db, "jobs"), where("dealerId", "==", auth.currentUser.uid));
    
    onSnapshot(q, (snapshot) => {
        const grid = document.getElementById('shop-jobs-list');
        if (!grid) return;
        
        grid.innerHTML = '';
        if (snapshot.empty) {
            grid.innerHTML = '<p style="color:#888;">No active routes. Go dispatch a new job!</p>';
            return;
        }

        snapshot.forEach(doc => {
            const job = doc.data();
            let badgeColor = "#FF9900"; 
            if (job.status === 'claimed') badgeColor = "#4CAF50"; 
            if (job.status === 'completed') badgeColor = "#888"; 

            grid.innerHTML += `
                <div style="background: #111; border: 1px solid #333; padding: 20px; border-radius: 12px; border-left: 4px solid ${badgeColor};">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                        <strong style="color:#fff; font-size:1.1rem;">$${job.price.toFixed(2)}</strong>
                        <span style="background:${badgeColor}22; color:${badgeColor}; border:1px solid ${badgeColor}; padding: 4px 8px; border-radius: 6px; font-size: 0.8rem; font-weight: bold; text-transform: uppercase;">
                            ${job.status}
                        </span>
                    </div>
                    <div style="color:#aaa; font-size:0.9rem; margin-bottom: 8px;"><i class="fas fa-box" style="color:#888; width:20px;"></i> ${job.details || 'Part Delivery'}</div>
                    <div style="color:#aaa; font-size:0.9rem; margin-bottom: 8px;"><i class="fas fa-arrow-up" style="color:var(--primary); width:20px;"></i> ${job.pickup || 'Unknown'}</div>
                    <div style="color:#aaa; font-size:0.9rem;"><i class="fas fa-arrow-down" style="color:#4CAF50; width:20px;"></i> ${job.dropoff || 'Unknown'}</div>
                    
                    ${job.driverName ? `
                    <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #333; color: #fff; font-size: 0.9rem;">
                        <i class="fas fa-user-check" style="color:#4CAF50;"></i> Driver: <strong>${job.driverName}</strong>
                    </div>` : ''}
                </div>
            `;
        });
    });
};

// 7. Profile Modal Logic
document.getElementById('btn-profile')?.addEventListener('click', async () => {
    document.getElementById('profile-modal').style.display = 'flex';
    const docSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
    if (docSnap.exists()) {
        document.getElementById('prof-business').value = docSnap.data().businessName || "";
        document.getElementById('prof-phone').value = docSnap.data().phone || "";
    }
});

document.getElementById('btn-save-profile')?.addEventListener('click', async () => {
    const busName = document.getElementById('prof-business').value;
    const phone = document.getElementById('prof-phone').value;
    await updateDoc(doc(db, "users", auth.currentUser.uid), {
        businessName: busName,
        phone: phone
    });
    alert("Profile Updated!");
    document.getElementById('profile-modal').style.display = 'none';
});

document.getElementById('btn-logout')?.addEventListener('click', async () => {
    await logoutUser();
    window.location.href = '/index.html';
});