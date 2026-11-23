
// ========================================
// ExpenseFlow - Firebase Configuration
// ========================================

import {
    initializeApp,
    getApp,
    getApps
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

const firebaseConfig = {
    apiKey: "AIzaSyA1mc83E6I8WpwQJli6pzXhSDinN-KKfjo",
    authDomain: "expense-tracker-119c9.firebaseapp.com",
    projectId: "expense-tracker-119c9",
    storageBucket: "expense-tracker-119c9.firebasestorage.app",
    messagingSenderId: "735834095269",
    appId: "1:735834095269:web:7dfd617e1463868f4e974c",
    measurementId: "G-908YHLPYRW"
};

const app = getApps().length > 0
    ? getApp()
    : initializeApp(firebaseConfig);

// IMPORTANT: Export app using a named export
export { app };
export default app;

console.log("Firebase project:", app.options.projectId);

