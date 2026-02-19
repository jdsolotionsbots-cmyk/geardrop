import { db, auth } from '../config/firebase.js';
import { doc, getDoc, setDoc, collection, addDoc, onSnapshot, query, orderBy } from "firebase/firestore";

let activeChatListener = null;
let currentChatJobId = null;

// 1. Inject the HTML into the page
export const initModals = () => {
    // Build Profile Modal
    document.getElementById('profile-modal').innerHTML = `
        <div class="modal-content">
            <i class="fas fa-times close-modal" id="close-profile" style="position: absolute; top: 20px; right: 20px; font-size: 1.5rem; cursor: pointer; color: var(--text-muted);"></i>
            <h2>My Profile</h2>
            <input type="text" id="prof-name" class="input-dark" placeholder="Business or Full Name">
            <input type="tel" id="prof-phone" class="input-dark" placeholder="Phone Number">
            <button id="btn-save-profile" class="btn btn-primary full-width">Save Profile</button>
        </div>
    `;

    // Build Chat Modal
    document.getElementById('chat-modal').innerHTML = `
        <div class="modal-content" style="height: 60vh; display: flex; flex-direction: column;">
            <i class="fas fa-times close-modal" id="close-chat" style="position: absolute; top: 20px; right: 20px; font-size: 1.5rem; cursor: pointer; color: var(--text-muted);"></i>
            <h3 style="margin-top:0;">Live Dispatch Chat</h3>
            <div id="chat-messages" style="flex:1; overflow-y:auto; margin-bottom:15px; display:flex; flex-direction:column; gap:10px;"></div>
            <div style="display:flex; gap:10px;">
                <input type="text" id="chat-input" class="input-dark" style="margin:0;" placeholder="Type a message...">
                <button id="btn-send-message" class="btn btn-primary"><i class="fas fa-paper-plane"></i></button>
            </div>
        </div>
    `;

    // Attach Close Button Listeners
    document.getElementById('close-profile').addEventListener('click', () => {
        document.getElementById('profile-modal').style.display = 'none';
    });
    document.getElementById('close-chat').addEventListener('click', () => {
        document.getElementById('chat-modal').style.display = 'none';
    });

    // Attach Action Listeners
    document.getElementById('btn-save-profile').addEventListener('click', saveProfile);
    document.getElementById('btn-send-message').addEventListener('click', sendMessage);
};

// 2. Profile Logic
export const openProfileModal = async () => {
    const snap = await getDoc(doc(db, "users", auth.currentUser.uid));
    if (snap.exists()) {
        document.getElementById('prof-name').value = snap.data().name || '';
        document.getElementById('prof-phone').value = snap.data().phone || '';
    }
    document.getElementById('profile-modal').style.display = 'flex';
};

const saveProfile = async () => {
    const name = document.getElementById('prof-name').value;
    const phone = document.getElementById('prof-phone').value;
    
    await setDoc(doc(db, "users", auth.currentUser.uid), { name, phone }, { merge: true });
    
    document.getElementById('profile-modal').style.display = 'none';
    alert("Profile Saved!");
};

// 3. Chat Logic
export const openChatModal = (jobId) => {
    if (!jobId) return;
    currentChatJobId = jobId;
    document.getElementById('chat-modal').style.display = 'flex';
    
    // Clear previous listeners so we don't get duplicate messages
    if (activeChatListener) activeChatListener(); 
    
    const messagesRef = collection(db, `jobs/${jobId}/messages`);
    const q = query(messagesRef, orderBy("time", "asc"));
    
    activeChatListener = onSnapshot(q, (snap) => {
        const box = document.getElementById('chat-messages');
        box.innerHTML = '';
        snap.forEach(d => {
            const m = d.data();
            const isMe = m.senderId === auth.currentUser.uid;
            box.innerHTML += `<div style="align-self: ${isMe ? 'flex-end' : 'flex-start'}; background: ${isMe ? 'var(--primary)' : '#333'}; padding:10px; border-radius:10px; max-width:80%;">${m.text}</div>`;
        });
        box.scrollTop = box.scrollHeight;
    });
};

const sendMessage = async () => {
    const text = document.getElementById('chat-input').value;
    if (!text || !currentChatJobId) return;
    
    await addDoc(collection(db, `jobs/${currentChatJobId}/messages`), {
        senderId: auth.currentUser.uid, 
        text: text, 
        time: new Date()
    });
    document.getElementById('chat-input').value = '';
};