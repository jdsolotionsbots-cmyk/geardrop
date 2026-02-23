import { checkAuthState, logoutUser } from '../services/auth.js';
import { db } from '../config/firebase.js';
import { collection, query, where, onSnapshot, doc, updateDoc, orderBy } from "firebase/firestore";

let map;
let driverMarkers = {};

checkAuthState((authData) => {
    if (!authData || authData.role !== 'admin') {
        window.location.href = '/index.html'; 
    } else {
        setupNavigation();
        initAdminMap();
        loadGodModeStats();   
        loadAllDrivers();
        loadAllShops();
    }
});

const initAdminMap = () => {
    if (map || !document.getElementById('admin-map')) return;
    map = L.map('admin-map').setView([43.2557, -79.8711], 12); // Centered on Hamilton
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(map);
    setTimeout(() => { map.invalidateSize(); }, 500); 
};

const setupNavigation = () => {
    const tabs = ['dispatch', 'drivers', 'shops'];
    tabs.forEach(tab => {
        document.getElementById(`nav-${tab}`)?.addEventListener('click', () => {
            tabs.forEach(t => {
                document.getElementById(`nav-${t}`).classList.remove('active');
                document.getElementById(`view-${t}`).classList.remove('active');
            });
            document.getElementById(`nav-${tab}`).classList.add('active');
            document.getElementById(`view-${tab}`).classList.add('active');
            const titles = { 'dispatch': 'Master God Mode', 'drivers': 'Driver Fleet', 'shops': 'Partner Shops' };
            document.getElementById('page-title').innerText = titles[tab];
            if(tab === 'dispatch') setTimeout(() => { map.invalidateSize(); }, 100);
        });
    });
};

// 🔥 THE BULLETPROOF GLOBAL CLICK LISTENER 🔥
// This replaces attachGridListeners and never breaks when Firebase redraws the screen!
document.addEventListener('click', async (e) => {
    // 1. Check if they clicked the Chat Button (or the icon inside it)
    const chatBtn = e.target.closest('.btn-chat');
    if (chatBtn) {
        const name = chatBtn.getAttribute('data-name');
        document.getElementById('chat-modal-title').innerText = `Chat with ${name}`;
        document.getElementById('admin-chat-modal').style.display = 'flex';
        return;
    }

    // 2. Check if they clicked the Approve/Revoke Button
    const toggleBtn = e.target.closest('.btn-toggle');
    if (toggleBtn) {
        const id = toggleBtn.getAttribute('data-id');
        const collectionName = toggleBtn.getAttribute('data-col');
        const nextStatus = toggleBtn.getAttribute('data-next');
        if(confirm(`Are you sure you want to change this account to ${nextStatus.toUpperCase()}?`)) {
            await updateDoc(doc(db, collectionName, id), { status: nextStatus });
        }
        return;
    }
});

const loadAllDrivers = () => {
    onSnapshot(collection(db, "drivers"), (snapshot) => {
        const grid = document.getElementById('grid-drivers');
        if (!grid) return;
        
        let htmlString = snapshot.empty ? '<p style="color:#888;">No drivers found.</p>' : '';

        snapshot.forEach(docSnap => {
            const user = docSnap.data();
            const isPending = user.status === 'pending';
            
            // Map Logic
            if (user.status === 'active' && user.lat && user.lng) {
                if (!driverMarkers[docSnap.id]) {
                    const iconHtml = `<div style="background:#FF6600; color:#fff; width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:3px solid #000; box-shadow:0 0 15px rgba(255,102,0,0.8);"><i class="fas fa-truck-fast" style="font-size:12px;"></i></div>`;
                    const customIcon = L.divIcon({ html: iconHtml, className: '' });
                    driverMarkers[docSnap.id] = L.marker([user.lat, user.lng], {icon: customIcon}).addTo(map).bindPopup(`<b>${user.name || 'Driver'}</b>`);
                } else {
                    driverMarkers[docSnap.id].setLatLng([user.lat, user.lng]);
                }
            } else if (driverMarkers[docSnap.id]) {
                map.removeLayer(driverMarkers[docSnap.id]);
                delete driverMarkers[docSnap.id];
            }

            // HTML Builder
            htmlString += `
                <div class="user-card">
                    <div class="user-header">
                        <div>
                            <strong style="font-size:1.2rem; color:#fff;">${user.name || 'Unknown'}</strong><br>
                            <small style="color:#888;">${user.email || 'No email'}</small>
                        </div>
                        <span class="status-badge" style="background:${isPending ? '#FF990022' : '#4CAF5022'}; color:${isPending ? '#FF9900' : '#4CAF50'}; border: 1px solid ${isPending ? '#FF9900' : '#4CAF50'};">
                            ${user.status}
                        </span>
                    </div>
                    ${user.licensePhoto ? `<a href="${user.licensePhoto}" target="_blank" style="color:#FF6600; font-size:0.9rem; margin-bottom:15px; display:inline-block;"><i class="fas fa-id-card"></i> View License Photo</a>` : '<span style="color:#555; font-size:0.9rem; margin-bottom:15px; display:inline-block;"><i class="fas fa-times-circle"></i> No License Uploaded</span>'}
                    
                    <div class="btn-group">
                        <button class="action-btn btn-chat" data-name="${user.name}" style="background:#333;"><i class="fas fa-comment"></i> Chat</button>
                        <button class="action-btn btn-toggle" data-id="${docSnap.id}" data-col="drivers" data-next="${isPending ? 'active' : 'pending'}" style="background:${isPending ? '#4CAF50' : '#ff4444'};">
                            ${isPending ? 'Approve' : 'Revoke'}
                        </button>
                    </div>
                </div>`;
        });
        
        grid.innerHTML = htmlString;
    });
};

const loadAllShops = () => {
    const shopQuery = query(collection(db, "users"), where("role", "==", "shop"));
    onSnapshot(shopQuery, (snapshot) => {
        const grid = document.getElementById('grid-shops');
        if (!grid) return;
        
        let htmlString = snapshot.empty ? '<p style="color:#888;">No shops found.</p>' : '';
        
        snapshot.forEach(docSnap => {
            const user = docSnap.data();
            const isPending = user.status === 'pending';
            htmlString += `
                <div class="user-card">
                    <div class="user-header">
                        <div><strong style="font-size:1.2rem; color:#fff;">${user.name || 'Unknown'}</strong><br><small style="color:#888;">${user.email}</small></div>
                        <span class="status-badge" style="background:${isPending ? '#FF990022' : '#4CAF5022'}; color:${isPending ? '#FF9900' : '#4CAF50'}; border: 1px solid ${isPending ? '#FF9900' : '#4CAF50'};">${user.status}</span>
                    </div>
                    <div class="btn-group">
                        <button class="action-btn btn-chat" data-name="${user.name}" style="background:#333;"><i class="fas fa-comment"></i> Chat</button>
                        <button class="action-btn btn-toggle" data-id="${docSnap.id}" data-col="users" data-next="${isPending ? 'active' : 'pending'}" style="background:${isPending ? '#4CAF50' : '#ff4444'};">
                            ${isPending ? 'Approve' : 'Suspend'}
                        </button>
                    </div>
                </div>`;
        });
        
        grid.innerHTML = htmlString;
    });
};

// Chat Send Button Logic
document.getElementById('btn-admin-send')?.addEventListener('click', () => {
    const input = document.getElementById('admin-chat-input');
    if(input.value.trim() !== "") {
        const history = document.getElementById('chat-history');
        history.innerHTML += `<div style="margin-top:10px; background:rgba(255,102,0,0.1); padding:10px; border-radius:8px; color:#fff;"><strong>Admin:</strong> ${input.value}</div>`;
        input.value = "";
        history.scrollTop = history.scrollHeight;
    }
});

const loadGodModeStats = () => {
    onSnapshot(collection(db, "jobs"), (snapshot) => {
        let rev = 0; let orders = 0;
        snapshot.forEach(d => {
            if (d.data().status === 'claimed' || d.data().status === 'completed') rev += d.data().price;
            if (d.data().status === 'searching' || d.data().status === 'claimed') orders++;
        });
        const revEl = document.getElementById('stat-revenue');
        const ordEl = document.getElementById('stat-active-orders');
        if(revEl) revEl.innerText = "$" + rev.toFixed(2);
        if(ordEl) ordEl.innerText = orders;
    });
};

document.getElementById('btn-logout')?.addEventListener('click', async () => {
    await logoutUser();
    window.location.href = '/index.html';
});