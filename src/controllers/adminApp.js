import { checkAuthState, logoutUser } from '../services/auth.js';
import { db } from '../config/firebase.js';
import { collection, query, where, onSnapshot, doc, updateDoc, orderBy } from "firebase/firestore";

// 1. Strictly Authenticate Admin
checkAuthState((authData) => {
    // Note: Make sure your account in Firebase has the role: 'admin'
    if (!authData || authData.role !== 'admin') {
        window.location.href = '/index.html'; 
    } else {
        loadPendingDrivers();
        loadGodModeStats();   // NEW: Revenue & Order counters
        loadLiveOrderFeed();  // NEW: Live city radar
    }
});

// ==========================================
// 1. DRIVER APPROVAL SYSTEM (Working perfectly)
// ==========================================
const loadPendingDrivers = () => {
    const driversRef = collection(db, "drivers");
    const pendingQuery = query(driversRef, where("status", "==", "pending"));

    onSnapshot(pendingQuery, (snapshot) => {
        const container = document.getElementById('admin-driver-approvals');
        if (!container) return;

        if (snapshot.empty) {
            container.innerHTML = `
                <h2 style="color:#FF6600;">Pending Approvals</h2>
                <p style="color:#888;">No pending approvals. You're all caught up!</p>
            `;
            return;
        }

        container.innerHTML = '<h2 style="color:#FF6600;">Pending Approvals</h2>';
        
        snapshot.forEach(docSnap => {
            const driver = docSnap.data();
            const driverId = docSnap.id;
            
            const div = document.createElement('div');
            div.style = "background:#111; padding:20px; border-radius:12px; border:1px solid #333; margin-bottom:15px;";
            
            const licenseHtml = driver.licensePhoto 
                ? `<img src="${driver.licensePhoto}" style="max-width:100%; height:150px; object-fit:cover; margin-bottom:15px; border-radius:8px;">` 
                : '<p style="color:#ff3333; margin-bottom:15px;">No license uploaded yet.</p>';

            div.innerHTML = `
                <p style="margin:0 0 10px 0; font-size:1.1rem;"><strong>${driver.name}</strong> <br><small style="color:#888;">${driver.email}</small></p>
                <p style="margin:0 0 15px 0; color:#FF6600;"><i class="fas fa-car"></i> ${driver.vehicle}</p>
                ${licenseHtml}
                <button class="btn-approve" data-id="${driverId}" style="width:100%; background:#4CAF50; color:white; border:none; padding:12px; border-radius:8px; cursor:pointer; font-weight:bold;">
                    <i class="fas fa-check-circle"></i> Approve Driver
                </button>
            `;
            container.appendChild(div);
        });

        document.querySelectorAll('.btn-approve').forEach(btn => {
            btn.addEventListener('click', (e) => approveDriver(e.target.closest('.btn-approve').getAttribute('data-id')));
        });
    });
};

const approveDriver = async (driverId) => {
    try {
        await updateDoc(doc(db, "drivers", driverId), { status: 'active' });
    } catch (error) {
        alert("Failed to approve driver.");
    }
};

// ==========================================
// 2. LIVE REVENUE & STATS ENGINE
// ==========================================
const loadGodModeStats = () => {
    onSnapshot(collection(db, "jobs"), (snapshot) => {
        let totalRevenue = 0;
        let activeOrdersCount = 0;

        snapshot.forEach(docSnap => {
            const job = docSnap.data();
            
            // Calculate Money (Only count jobs that are claimed or finished)
            if (job.status === 'claimed' || job.status === 'completed') {
                totalRevenue += job.price;
            }
            // Count Live Orders
            if (job.status === 'searching' || job.status === 'claimed') {
                activeOrdersCount++;
            }
        });

        // Push data to your Admin Dashboard UI
        const revUI = document.getElementById('stat-revenue');
        const ordersUI = document.getElementById('stat-active-orders');
        
        if (revUI) revUI.innerText = "$" + totalRevenue.toFixed(2);
        if (ordersUI) ordersUI.innerText = activeOrdersCount;
    });
};

// ==========================================
// 3. LIVE ORDER RADAR (Watch everything)
// ==========================================
const loadLiveOrderFeed = () => {
    // Sort by newest first
    const jobsQuery = query(collection(db, "jobs"), orderBy("time", "desc"));

    onSnapshot(jobsQuery, (snapshot) => {
        const feedContainer = document.getElementById('admin-live-feed');
        if (!feedContainer) return;

        feedContainer.innerHTML = ''; // Clear old feed

        snapshot.forEach(docSnap => {
            const job = docSnap.data();
            const jobId = docSnap.id;
            
            // Determine colors based on status
            let statusColor = "#888"; // default
            if (job.status === 'searching') statusColor = "#FF9900"; // Orange
            if (job.status === 'claimed') statusColor = "#4CAF50"; // Green
            
            feedContainer.innerHTML += `
                <div style="background:#111; border-left: 4px solid ${statusColor}; padding:15px; margin-bottom:15px; border-radius:8px;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                        <strong style="color:${statusColor}; text-transform:uppercase;">${job.status}</strong>
                        <strong style="color:#fff;">$${job.price.toFixed(2)}</strong>
                    </div>
                    <p style="margin:0 0 5px 0; color:#ccc;">${job.stops.length} Stops Requested</p>
                    <p style="margin:0; color:#888; font-size:0.9rem;">
                        <i class="fas fa-steering-wheel"></i> ${job.driverName ? job.driverName : 'No driver yet'}
                    </p>
                    <button class="btn-admin-chat" data-id="${jobId}" style="margin-top:10px; background:#333; color:white; border:none; padding:8px 15px; border-radius:6px; cursor:pointer;">
                        <i class="fas fa-headset"></i> Intercept Chat
                    </button>
                </div>
            `;
        });

        // Connect the "Intercept Chat" buttons
        document.querySelectorAll('.btn-admin-chat').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.closest('.btn-admin-chat').getAttribute('data-id');
                // You will be able to hijack the chat room using the exact same modals.js we built earlier!
                alert("Master Chat intercepting Route ID: " + id + "\\n(Full UI coming in the next step!)");
            });
        });
    });
};

// 4. Logout
document.getElementById('btn-logout')?.addEventListener('click', async () => {
    await logoutUser();
    window.location.href = '/index.html';
});