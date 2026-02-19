import { checkAuthState, logoutUser } from '../services/auth.js';
import { db, auth, storage } from '../config/firebase.js';
import { doc, onSnapshot, query, collection, where, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { initModals, openProfileModal, openChatModal } from '../services/modals.js';
let currentJobId = null;

// 1. Authenticate and Route
checkAuthState((authData) => {
    if (!authData || authData.role !== 'driver') {
        window.location.href = '/index.html'; // Boot non-drivers back to splash
    } else {
        listenToDriverStatus();
    }
});

// 2. Real-time Status Monitor (Pending vs Active)
const listenToDriverStatus = () => {
    onSnapshot(doc(db, "drivers", auth.currentUser.uid), (documentSnapshot) => {
        if (documentSnapshot.exists() && documentSnapshot.data().status === 'active') {
            document.getElementById('driver-pending-view').style.display = 'none';
            document.getElementById('driver-active-view').style.display = 'block';
            loadAvailableJobs();
        } else {
            document.getElementById('driver-pending-view').style.display = 'block';
            document.getElementById('driver-active-view').style.display = 'none';
        }
    });
};

// 3. Secure File Upload Logic
const handleLicenseUpload = async (file) => {
    if (!file) return;
    const statusText = document.getElementById('upload-status');
    statusText.innerText = "Uploading to secure server...";
    
    try {
        const storageRef = ref(storage, `licenses/${auth.currentUser.uid}.jpg`);
        const snap = await uploadBytes(storageRef, file);
        const url = await getDownloadURL(snap.ref);
        
        await updateDoc(doc(db, "drivers", auth.currentUser.uid), { licensePhoto: url });
        statusText.innerText = "Uploaded successfully! Waiting for Admin approval.";
    } catch (error) {
        console.error("Upload failed:", error);
        statusText.innerText = "Upload failed. Please check your connection and try again.";
        statusText.style.color = "#ff4444";
    }
};

// 4. Live Job Feed
const loadAvailableJobs = () => {
    const activeJobsQuery = query(collection(db, "jobs"), where("status", "==", "searching"));
    
    onSnapshot(activeJobsQuery, (snapshot) => {
        const list = document.getElementById('driver-live-list');
        list.innerHTML = snapshot.empty ? '<p style="color:#888;">No active routes currently available.</p>' : '';
        
        snapshot.forEach(jobDoc => {
            const job = jobDoc.data();
            const jobId = jobDoc.id;
            
            // Generate the DOM for each job
            const div = document.createElement('div');
            div.style = "background:var(--bg-card); padding:20px; border-radius:12px; margin-bottom:15px; border: 1px solid var(--border);";
            div.innerHTML = `
                <h3 style="margin:0;">${job.stops.length} Stops</h3>
                <h2 style="color:#4CAF50;">$${job.price.toFixed(2)}</h2>
                <button class="btn btn-primary full-width btn-claim-job" data-id="${jobId}">Start Route</button>
            `;
            list.appendChild(div);
        });

        // We must attach event listeners *after* rendering the HTML
        document.querySelectorAll('.btn-claim-job').forEach(btn => {
            btn.addEventListener('click', (e) => claimJob(e.target.getAttribute('data-id')));
        });
    });
};

// 5. Job Claiming Engine
const claimJob = async (jobId) => {
    try {
        await updateDoc(doc(db, "jobs", jobId), { 
            status: "claimed", 
            driverId: auth.currentUser.uid, 
            driverName: auth.currentUser.displayName || "GearDrop Driver" 
        });
        
        currentJobId = jobId;
        document.getElementById('chat-fab').style.display = 'flex'; // Unlock chat functionality
        alert("Route Started! You can now chat directly with the shop.");
        // We will wire up the actual chat listeners when we build the Modals Controller
    } catch (error) {
        console.error("Error claiming job:", error);
        alert("Failed to claim route. Another driver might have grabbed it!");
    }
};

// 6. UI Interaction Mapping
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
    // Logout Handler
    document.getElementById('btn-logout').addEventListener('click', async () => {
        await logoutUser();
        window.location.href = '/index.html';
    });

    // Hidden Input Trigger
    document.getElementById('btn-upload-license').addEventListener('click', () => {
        document.getElementById('license-upload').click();
    });

    // File Selection Listener
    document.getElementById('license-upload').addEventListener('change', (e) => {
        handleLicenseUpload(e.target.files[0]);
    });
});