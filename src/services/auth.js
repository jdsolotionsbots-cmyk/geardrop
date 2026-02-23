import { auth, db } from '../config/firebase.js';
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

export const checkAuthState = (callback) => {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            try {
                // 1. Check if they are a Shop or Admin
                let userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists()) {
                    callback({ ...user, role: userDoc.data().role });
                    return;
                }
                
                // 2. Check if they are a Driver
                let driverDoc = await getDoc(doc(db, 'drivers', user.uid));
                if (driverDoc.exists()) {
                    callback({ ...user, role: driverDoc.data().role });
                    return;
                }

                callback(null); // No ID badge found = kick out
            } catch (error) {
                callback(null);
            }
        } else {
            callback(null); // Not logged in = kick out
        }
    });
};

export const logoutUser = () => signOut(auth);