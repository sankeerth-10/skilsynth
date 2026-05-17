import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAv1U2srhI9MWICv_lVuq4W4EI23oW3MEg",
  authDomain: "skilsynth.firebaseapp.com",
  projectId: "skilsynth",
  storageBucket: "skilsynth.firebasestorage.app",
  messagingSenderId: "52052907400",
  appId: "1:52052907400:web:7baae0fbded92f0be0163d",
  measurementId: "G-LB7P7MKDTW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Initialize Analytics conditionally to avoid issues during SSR or restricted environments
let analytics;
isSupported().then((supported) => {
  if (supported) {
    analytics = getAnalytics(app);
  }
});

export { app, analytics, auth, googleProvider, signInWithPopup, signOut, onAuthStateChanged };
