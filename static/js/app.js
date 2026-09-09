/* ==========================================================================
   QORA TECH — Global Client JavaScript Application
   Firebase Project: solar-project-c85b5
   ========================================================================== */

// Official Firebase Project Configuration
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBqkt3YvIKQbMnBFbrD6FpvR4sNbXDomWw",
  authDomain: "solar-project-c85b5.firebaseapp.com",
  databaseURL: "https://solar-project-c85b5-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "solar-project-c85b5",
  storageBucket: "solar-project-c85b5.firebasestorage.app",
  messagingSenderId: "536385864818",
  appId: "1:536385864818:web:eb8b0d65b76a7a3a286eeb",
  measurementId: "G-KCEY47EC1S"
};

let firebaseApp = null;
let firebaseDb = null;
let firebaseAuth = null;

function initFirebase() {
  try {
    if (typeof firebase !== 'undefined') {
      firebaseApp = firebase.initializeApp(FIREBASE_CONFIG);
      if (firebase.database) firebaseDb = firebase.database();
      if (firebase.auth) firebaseAuth = firebase.auth();
      console.log(">> [Firebase] Initialized with Realtime DB & Auth for solar-project-c85b5");
    }
  } catch (err) {
    console.warn(">> [Firebase] Client SDK running with REST/local fallback:", err);
  }
}

// Live Clock Updater
function startLiveClock() {
  const clockEl = document.getElementById('liveClock');
  if (!clockEl) return;
  
  function update() {
    const now = new Date();
    clockEl.innerText = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
  update();
  setInterval(update, 1000);
}

document.addEventListener('DOMContentLoaded', () => {
  initFirebase();
  startLiveClock();
});
