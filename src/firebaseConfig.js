import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBD3sXrW6OogLQiNEgq0gOcsaUnN96mMAY",
  authDomain: "geardrop-87e9a.firebaseapp.com",
  projectId: "geardrop-87e9a",
  storageBucket: "geardrop-87e9a.firebasestorage.app"
};

// Initialize Firebase for the Web App
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);