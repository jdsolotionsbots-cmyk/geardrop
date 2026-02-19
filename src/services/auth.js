import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, provider, db } from "../config/firebase.js"; // Importing your secure config!

const ADMIN_EMAIL = "juandsol18@gmail.com";

// 1. Google Login & Role Assignment
export const loginUser = async (role) => {
    try {
        const res = await signInWithPopup(auth, provider);
        const user = res.user;

        // Save user role in Firestore
        await setDoc(doc(db, "users", user.uid), { 
            role: role, 
            email: user.email 
        }, { merge: true });
        
        // If they signed up as a driver, create their pending profile
        if (role === 'driver') {
            const driverSnap = await getDoc(doc(db, "drivers", user.uid));
            if (!driverSnap.exists()) {
                await setDoc(doc(db, "drivers", user.uid), { 
                    name: user.displayName, 
                    email: user.email, 
                    status: 'pending_approval' 
                });
            }
        }
        return user;
    } catch(error) {
        console.error("Login failed:", error.message);
        alert("Error logging in: " + error.message);
    }
};

// 2. Secure Logout
export const logoutUser = async () => {
    try {
        await signOut(auth);
    } catch(error) {
        console.error("Logout failed:", error);
    }
};

// 3. The Auth State Monitor (Session Manager)
export const checkAuthState = (callback) => {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const isAdmin = user.email === ADMIN_EMAIL;
            
            // Get their role from the database
            const uSnap = await getDoc(doc(db, "users", user.uid));
            const role = uSnap.exists() ? uSnap.data().role : 'dealer';

            // Send the user data back to whatever page asked for it
            callback({ user, role, isAdmin });
        } else {
            callback(null); // No one is logged in
        }
    });
};