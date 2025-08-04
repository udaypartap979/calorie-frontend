import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyB3BIjZI-qBQXOFYs5KeOY1aEn26mgJd5g",
    authDomain: "calorie-9e078.firebaseapp.com",
    projectId: "calorie-9e078",
    storageBucket: "calorie-9e078.firebasestorage.app",
    messagingSenderId: "790473281739",
    appId: "1:790473281739:web:9310dbd67618e5fdc88b4e",
    measurementId: "G-QFLTPQSWQE"
  };

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);

export { app, auth };
