/**
 * Solar Smart Cold Storage — Firebase Configuration & CDN Initializer
 * Loads Firebase v10 Modular SDK via ES Modules CDN.
 * Provides fallback mock services when credentials are not yet configured.
 */

// User's live Firebase project configuration
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyDIgWuDVHqBak_NQHcdwJbGB2T8VRjQ93c",
  authDomain: "cold-storage-3a452.firebaseapp.com",
  databaseURL: "https://cold-storage-3a452-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "cold-storage-3a452",
  storageBucket: "cold-storage-3a452.firebasestorage.app",
  messagingSenderId: "450114755152",
  appId: "1:450114755152:web:573f2b2f9fa8af142a4f55",
  measurementId: "G-TF7L7RKXXC"
};

const STORAGE_KEY = 'solarsmart_firebase_config';

export function getStoredFirebaseConfig() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.warn('Could not read saved Firebase config:', e);
  }
  return DEFAULT_FIREBASE_CONFIG;
}

export function saveFirebaseConfig(config) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    return true;
  } catch (e) {
    console.error('Failed to persist Firebase config:', e);
    return false;
  }
}

export function isUsingDemoConfig() {
  const config = getStoredFirebaseConfig();
  return config.apiKey.includes('Demo') || config.projectId.includes('Demo');
}

/**
 * Modular Firebase instances container
 */
export const fb = {
  app: null,
  auth: null,
  firestore: null,
  rtdb: null,
  analytics: null,
  initialized: false,
  isLive: false
};

/**
 * Initialize Firebase SDK via CDN
 */
export async function initializeFirebase() {
  const config = getStoredFirebaseConfig();

  // If running with mock/demo placeholder keys, we operate in high-fidelity local/simulator mode
  if (isUsingDemoConfig()) {
    console.log('⚡ Running in Standalone / Virtual IoT Simulator Mode. Configure real Firebase keys in Settings.');
    fb.initialized = true;
    fb.isLive = false;
    return fb;
  }

  try {
    // Dynamic import from official gstatic CDN for modular ESM support
    const { initializeApp, getApps } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js');
    const { getAuth } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
    const { getFirestore } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
    const { getDatabase } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js');

    if (!getApps().length) {
      fb.app = initializeApp(config);
    } else {
      fb.app = getApps()[0];
    }

    fb.auth = getAuth(fb.app);
    fb.firestore = getFirestore(fb.app);
    fb.rtdb = getDatabase(fb.app);

    // Optional Analytics
    try {
      const { getAnalytics, isSupported } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js');
      if (await isSupported()) {
        fb.analytics = getAnalytics(fb.app);
      }
    } catch (analyticsErr) {
      // Analytics is optional and can fail in restricted environments
    }

    fb.initialized = true;
    fb.isLive = true;

    console.log('✅ Firebase initialized successfully with Realtime Database, Firestore & Analytics:', config.projectId);
    return fb;
  } catch (error) {
    console.warn('⚠️ Firebase dynamic CDN init failed or offline. Operating with high-fidelity local telemetry:', error);
    fb.initialized = true;
    fb.isLive = false;
    return fb;
  }
}
