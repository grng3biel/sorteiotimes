import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBEoOwMKk29ugT2bAUjJR71XFjlgHkp95U",
    authDomain: "sorteadortimesnovo.firebaseapp.com",
    projectId: "sorteadortimesnovo",
    storageBucket: "sorteadortimesnovo.firebasestorage.app",
    messagingSenderId: "1058200793291",
    appId: "1:1058200793291:web:9bbfa817f71b157bd86b4e"
};

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);

export { db };
