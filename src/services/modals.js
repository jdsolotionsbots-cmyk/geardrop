import { auth, db } from '../config/firebase.js';
import { doc, getDoc, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { signOut } from 'firebase/auth';

export const initModals = () => {
    // 1. INJECT PROFILE MODAL HTML AUTOMATICALLY
    if (!document.getElementById('profile-modal')) {
        const profileHTML = `
        <div id="profile-modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:4000; align-items:center; justify-content:center; backdrop-filter:blur(5px);">
            <div style="background:#111; padding:30px; border-radius:20px; width:90%; max-width:400px; border:1px solid #333; color:#fff; position:relative; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
                <button id="close-profile" style="position:absolute; top:15px; right:20px; background:none; border:none; color:#888; font-size:1.5rem; cursor:pointer;">&times;</button>
                <div style="text-align:center; margin-bottom:20px;">
                    <div style="width:80px; height:80px; background:rgba(255,102,0,0.1); border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 15px;">
                        <i class="fas fa-user" style="font-size:2rem; color:#FF6600;"></i>
                    </div>
                    <h2 style="margin:0; color:#fff;">Account Settings</h2>
                </div>
                
                <div id="profile-content" style="background:#222; padding:20px; border-radius:12px; margin-bottom:20px; line-height:1.8; color:#ccc;">
                    Loading profile data...
                </div>
                
                <button id="modal-btn-logout" style="width:100%; padding:15px; background:rgba(255, 51, 51, 0.1); color:#ff3333; border:1px solid #ff3333; border-radius:12px; font-weight:bold; cursor:pointer; font-size:1rem; transition:0.3s;">
                    <i class="fas fa-sign-out-alt"></i> Secure Log Out
                </button>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', profileHTML);

        // Profile Listeners
        document.getElementById('close-profile').addEventListener('click', () => document.getElementById('profile-modal').style.display = 'none');
        
        // Connect the Logout Button to Firebase!
        document.getElementById('modal-btn-logout').addEventListener('click', async () => {
            await signOut(auth);
            window.location.href = '/index.html';
        });
    }

    // 2. INJECT CHAT MODAL HTML AUTOMATICALLY
    if (!document.getElementById('chat-modal')) {
        const chatHTML = `
        <div id="chat-modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:4000; align-items:center; justify-content:center; backdrop-filter:blur(5px);">
            <div style="background:#111; border-radius:20px; width:90%; max-width:400px; border:1px solid #333; color:#fff; display:flex; flex-direction:column; height:65vh; overflow:hidden; position:relative; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
                <div style="background:#222; padding:20px; border-bottom:1px solid #333; display:flex; justify-content:space-between; align-items:center;">
                    <h3 style="margin:0; color:#FF6600;"><i class="fas fa-headset"></i> Live Dispatch Chat</h3>
                    <button id="close-chat" style="background:none; border:none; color:#888; font-size:1.5rem; cursor:pointer;">&times;</button>
                </div>
                <div id="chat-messages" style="flex:1; padding:20px; overflow-y:auto; display:flex; flex-direction:column; gap:10px;">
                    </div>
                <div style="padding:15px; background:#222; border-top:1px solid #333; display:flex; gap:10px;">
                    <input type="text" id="chat-input" placeholder="Message driver..." style="flex:1; padding:12px 15px; border-radius:12px; border:1px solid #444; background:#111; color:#fff; outline:none;">
                    <button id="btn-send-chat" style="background:#FF6600; color:#fff; border:none; padding:0 20px; border-radius:12px; font-weight:bold; cursor:pointer;"><i class="fas fa-paper-plane"></i></button>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', chatHTML);

        // Chat Listeners
        document.getElementById('close-chat').addEventListener('click', () => document.getElementById('chat-modal').style.display = 'none');
    }
};

// ==========================================
// LOAD PROFILE DATA FROM FIREBASE
// ==========================================
export const openProfileModal = async () => {
    document.getElementById('profile-modal').style.display = 'flex';
    const user = auth.currentUser;
    
    if (user) {
        document.getElementById('profile-content').innerHTML = '<div style="text-align:center;"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
        
        // Check "users" (Shops) database
        let snap = await getDoc(doc(db, 'users', user.uid));
        let data = snap.exists() ? snap.data() : null;

        // If not a shop, check "drivers" database
        if (!data) {
            snap = await getDoc(doc(db, 'drivers', user.uid));
            data = snap.exists() ? snap.data() : null;
        }

        if (data) {
            document.getElementById('profile-content').innerHTML = `
                <div style="margin-bottom:10px;"><small style="color:#FF6600; font-weight:bold;">NAME</small><br><span style="font-size:1.1rem; color:#fff;">${data.name || 'User'}</span></div>
                <div style="margin-bottom:10px;"><small style="color:#FF6600; font-weight:bold;">EMAIL</small><br><span style="color:#fff;">${data.email}</span></div>
                <div style="margin-bottom:10px;"><small style="color:#FF6600; font-weight:bold;">ACCOUNT TYPE</small><br><span style="background:#333; padding:4px 10px; border-radius:4px; color:#fff; font-size:0.9rem;">${data.role.toUpperCase()}</span></div>
                ${data.businessName ? `<div><small style="color:#FF6600; font-weight:bold;">BUSINESS</small><br><span style="color:#fff;">${data.businessName}</span></div>` : ''}
                ${data.vehicle ? `<div><small style="color:#FF6600; font-weight:bold;">VEHICLE</small><br><span style="color:#fff;">${data.vehicle}</span></div>` : ''}
            `;
        }
    }
};

// ==========================================
// LIVE CHAT FIREBASE ENGINE
// ==========================================
let chatUnsubscribe = null;

export const openChatModal = (jobId) => {
    if (!jobId) {
        alert("Please create and submit a Route Request before opening the chat!");
        return;
    }
    
    document.getElementById('chat-modal').style.display = 'flex';
    const messagesDiv = document.getElementById('chat-messages');
    messagesDiv.innerHTML = '<div style="text-align:center; color:#666; font-size:0.9rem;">Connecting to dispatch server...</div>';

    // 1. Listen to Firebase database for new messages
    const chatRef = collection(db, 'jobs', jobId, 'messages');
    const q = query(chatRef, orderBy('timestamp', 'asc'));
    
    if (chatUnsubscribe) chatUnsubscribe(); // Cleanup old listeners

    chatUnsubscribe = onSnapshot(q, (snapshot) => {
        messagesDiv.innerHTML = '';
        if(snapshot.empty) {
            messagesDiv.innerHTML = '<div style="text-align:center; color:#666; font-size:0.9rem;">Start the conversation with your driver here.</div>';
        }
        
        snapshot.forEach(docSnap => {
            const msg = docSnap.data();
            const isMe = msg.senderId === auth.currentUser.uid;
            
            // Build the chat bubble (Orange for you, Grey for them)
            const msgEl = document.createElement('div');
            msgEl.style = `max-width:80%; padding:12px 16px; font-size:0.95rem; line-height:1.4; border-radius:16px; ${isMe ? 'background:#FF6600; color:#fff; align-self:flex-end; border-bottom-right-radius:4px;' : 'background:#333; color:#fff; align-self:flex-start; border-bottom-left-radius:4px;'}`;
            msgEl.innerText = msg.text;
            messagesDiv.appendChild(msgEl);
        });
        messagesDiv.scrollTop = messagesDiv.scrollHeight; // Auto-scroll to bottom
    });

    // 2. Sending Logic
    const sendBtn = document.getElementById('btn-send-chat');
    const input = document.getElementById('chat-input');
    
    // Refresh the button to prevent double-sending bugs
    const newSendBtn = sendBtn.cloneNode(true);
    sendBtn.parentNode.replaceChild(newSendBtn, sendBtn);

    newSendBtn.addEventListener('click', async () => {
        const text = input.value.trim();
        if (!text) return;
        input.value = ''; // clear input
        
        // Push message to Firebase!
        await addDoc(collection(db, 'jobs', jobId, 'messages'), {
            text: text,
            senderId: auth.currentUser.uid,
            timestamp: serverTimestamp()
        });
    });
    
    // Allow pressing "Enter" to send
    input.addEventListener('keypress', (e) => {
        if(e.key === 'Enter') newSendBtn.click();
    });
};