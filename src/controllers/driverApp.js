import { checkAuthState, logoutUser } from '../services/auth.js';
import { db, auth, storage } from '../config/firebase.js';
import { doc, onSnapshot, query, collection, where, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { initModals, openProfileModal, openChatModal } from '../services/modals.js';

let currentJobId = null;

// 1. Authenticate and Route
checkAuthState((authData) => {
    if (!authData || authData.role !== 'driver') {
        window.location.href = '/index.html'; 
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
        statusText.innerText = "Upload failed. Please check your connection.";
        statusText.style.color = "#ff4444";
    }
};

// 4. Smart Job Feed (Searching vs Active Route)
const loadAvailableJobs = () => {
    // Look for both open jobs AND jobs this driver has claimed
    const jobsQuery = query(collection(db, "jobs"), where("status", "in", ["searching", "claimed"]));
    
    onSnapshot(jobsQuery, (snapshot) => {
        const list = document.getElementById('driver-live-list');
        if(!list) return;
        list.innerHTML = ''; 
        
        let hasActiveJob = false;

        // First pass: Check if the driver has an active route already
        snapshot.forEach(jobDoc => {
            const job = jobDoc.data();
            if (job.status === 'claimed' && job.driverId === auth.currentUser.uid) {
                hasActiveJob = true;
                currentJobId = jobDoc.id;
                document.getElementById('chat-fab').style.display = 'flex'; // Unlock chat
                
                // Show the Active Route View
                const div = document.createElement('div');
                div.style = "background:var(--bg-card); padding:20px; border-radius:12px; margin-bottom:15px; border: 2px solid #4CAF50;";
                div.innerHTML = `
                    <h3 style="margin:0 0 10px 0; color:#4CAF50;"><i class="fas fa-route"></i> Active Route</h3>
                    <p style="color:#ccc; margin-bottom: 20px;">${job.stops.length} Stops • <strong>$${job.price.toFixed(2)}</strong></p>
                    <button class="btn-complete-job" data-id="${jobDoc.id}" style="background:#4CAF50; color:#fff; padding:15px; border:none; border-radius:8px; font-weight:bold; width:100%; cursor:pointer;">
                        <i class="fas fa-check-double"></i> Mark as Delivered
                    </button>
                `;
                list.appendChild(div);
            }
        });

        // Second pass: If they don't have an active job, show them all the available searching jobs
        if (!hasActiveJob) {
            currentJobId = null;
            document.getElementById('chat-fab').style.display = 'none'; // Lock chat
            
            let foundSearching = false;
            snapshot.forEach(jobDoc => {
                const job = jobDoc.data();
                if (job.status === 'searching') {
                    foundSearching = true;
                    const div = document.createElement('div');
                    div.style = "background:var(--bg-card); padding:20px; border-radius:12px; margin-bottom:15px; border: 1px solid var(--border);";
                    div.innerHTML = `
                        <h3 style="margin:0;">${job.stops.length} Stops</h3>
                        <h2 style="color:#FF6600;">$${job.price.toFixed(2)}</h2>
                        <button class="btn-claim-job" data-id="${jobDoc.id}" style="background:#FF6600; color:#fff; padding:15px; border:none; border-radius:8px; font-weight:bold; width:100%; cursor:pointer;">
                            Start Route
                        </button>
                    `;
                    list.appendChild(div);
                }
            });

            if (!foundSearching) {
                list.innerHTML = '<p style="color:#888; text-align:center; padding:20px;">No active routes currently available. Waiting for shops...</p>';
            }
        }

        // Attach event listeners to the generated buttons
        document.querySelectorAll('.btn-claim-job').forEach(btn => {
            btn.addEventListener('click', (e) => claimJob(e.target.getAttribute('data-id')));
        });
        document.querySelectorAll('.btn-complete-job').forEach(btn => {
            btn.addEventListener('click', (e) => completeJob(e.target.getAttribute('data-id')));
        });
    });
};

// 5. Job Engines (Claim & Complete)
const claimJob = async (jobId) => {
    try {
        await updateDoc(doc(db, "jobs", jobId), { 
            status: "claimed", 
            driverId: auth.currentUser.uid, 
            driverName: auth.currentUser.email.split('@')[0] 
        });
    } catch (error) {
        alert("Failed to claim route. Another driver might have grabbed it!");
    }
};

const completeJob = async (jobId) => {
    if(confirm("Are you sure you have delivered all the parts?")) {
        try {
            await updateDoc(doc(db, "jobs", jobId), { status: "completed" });
            alert("Great job! Route completed and funds added to your account.");
        } catch (error) {
            alert("Failed to complete route.");
        }
    }
};

// 6. UI Interaction Mapping
document.addEventListener('DOMContentLoaded', () => {
    initModals();

    document.getElementById('btn-profile')?.addEventListener('click', openProfileModal);

    const chatFab = document.getElementById('chat-fab');
    if (chatFab) chatFab.addEventListener('click', () => openChatModal(currentJobId));
    
    document.getElementById('btn-logout')?.addEventListener('click', async () => {
        await logoutUser();
        window.location.href = '/index.html';
    });

    document.getElementById('btn-upload-license')?.addEventListener('click', () => {
        document.getElementById('license-upload').click();
    });

    document.getElementById('license-upload')?.addEventListener('change', (e) => {
        handleLicenseUpload(e.target.files[0]);
    });
});