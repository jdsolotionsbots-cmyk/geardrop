import { checkAuthState, logoutUser } from '../services/auth.js';
import { db } from '../config/firebase.js';
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";

// 1. Strictly Authenticate Admin
checkAuthState((authData) => {
    if (!authData || !authData.isAdmin) {
        // If anyone besides you tries to access this page, boot them instantly
        window.location.href = '/index.html'; 
    } else {
        loadPendingDrivers();
    }
});

// 2. Real-time Pending Driver Feed
const loadPendingDrivers = () => {
    const driversRef = collection(db, "drivers");
    const pendingQuery = query(driversRef, where("status", "==", "pending_approval"));

    // onSnapshot keeps this list updating live without needing to refresh the page
    onSnapshot(pendingQuery, (snapshot) => {
        const container = document.getElementById('admin-driver-approvals');
        
        if (snapshot.empty) {
            container.innerHTML = `
                <h2>Pending Driver Approvals</h2>
                <p style="color:var(--text-muted);">No pending approvals. You're all caught up!</p>
            `;
            return;
        }

        container.innerHTML = '<h2>Pending Driver Approvals</h2>';
        
        snapshot.forEach(docSnap => {
            const driver = docSnap.data();
            const driverId = docSnap.id;
            
            // Build the driver card UI
            const div = document.createElement('div');
            div.style = "background:var(--bg-card); padding:20px; border-radius:8px; border:1px solid var(--border); margin-bottom:15px;";
            
            // Check if they actually uploaded a license
            const licenseHtml = driver.licensePhoto 
                ? `<img src="${driver.licensePhoto}" style="max-width:200px; display:block; margin-bottom:15px; border-radius:4px; border: 1px solid var(--border);">` 
                : '<p style="color:#ff4444; margin-bottom: 15px;">No license uploaded yet.</p>';

            div.innerHTML = `
                <p style="margin-top:0;"><strong>${driver.name || 'Unnamed Driver'}</strong> (${driver.email})</p>
                ${licenseHtml}
                <button class="btn btn-primary btn-approve" data-id="${driverId}" ${!driver.licensePhoto ? 'disabled' : ''}>
                    <i class="fas fa-check-circle"></i> Approve Driver
                </button>
            `;
            container.appendChild(div);
        });

        // Attach listeners to the newly created "Approve" buttons
        document.querySelectorAll('.btn-approve').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                // Alternatively, if they clicked the icon inside the button, grab the closest button's ID
                const actualId = id || e.target.closest('.btn-approve').getAttribute('data-id');
                approveDriver(actualId);
            });
        });
    });
};

// 3. Database Update Logic
const approveDriver = async (driverId) => {
    try {
        await updateDoc(doc(db, "drivers", driverId), { status: 'active' });
        // The onSnapshot listener will automatically remove them from the list!
    } catch (error) {
        console.error("Error approving driver:", error);
        alert("Failed to approve driver. Check your database permissions.");
    }
};

// 4. UI Events
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btn-logout').addEventListener('click', async () => {
        await logoutUser();
        window.location.href = '/index.html';
    });
});