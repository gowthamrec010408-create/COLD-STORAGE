/**
 * Solar Smart Cold Storage — Unified Cloud Database Service Layer
 * Dual-Sync Engine: Synchronizes all user registrations, approvals, produce batches,
 * sensor calibrations, audit logs, and hardware telemetry across BOTH
 * Cloud Firestore and Firebase Realtime Database (RTDB) with offline-first localStorage fallback.
 */

import { fb } from '../config/firebase-config.js';
import { store } from '../core/state.js';
import { alertEngine } from '../core/alerts.js';

const BATCHES_CACHE_KEY = 'qoratech_produce_batches';
const CALIBRATION_CACHE_KEY = 'qoratech_sensor_calibration';
const USERS_CACHE_KEY = 'qoratech_registered_users';
const AUDIT_LOGS_CACHE_KEY = 'qoratech_audit_logs';

export class FirebaseService {
  constructor() {
    this.rtdbListeners = [];
    this.firestoreListeners = [];
    this.isListening = false;
  }

  // ==========================================================================
  // 1. REALTIME DATABASE (TELEMETRY & HARDWARE SYNC)
  // ==========================================================================

  /**
   * Start listening to Realtime Database stream under /live/storageUnit01/
   */
  async startRealtimeListeners() {
    if (!fb.isLive || !fb.rtdb || this.isListening) return;

    try {
      const { ref, onValue, off } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js');

      // Primary live telemetry node: /live/storageUnit01
      const liveRef = ref(fb.rtdb, 'live/storageUnit01');
      const unsubLive = onValue(liveRef, (snapshot) => {
        const val = snapshot.val();
        if (val) {
          store.applyTelemetry(val, 'wifi');

          // Evaluate alerts on live zones
          [1, 2, 3].forEach(zId => {
            const z = store.get(`zones.${zId}`);
            if (z) alertEngine.evaluateZone(zId, z);
          });
        }
      }, (error) => {
        console.warn('Firebase RTDB live sync warning:', error);
      });

      // Fallback: direct /zones node
      const zonesRef = ref(fb.rtdb, 'zones');
      const unsubZones = onValue(zonesRef, (snapshot) => {
        const val = snapshot.val();
        if (val) {
          store.applyTelemetry({
            zone1: val[1] || val.zone1,
            zone2: val[2] || val.zone2,
            zone3: val[3] || val.zone3
          }, 'wifi');
        }
      });

      this.rtdbListeners.push(() => off(liveRef, 'value', unsubLive));
      this.rtdbListeners.push(() => off(zonesRef, 'value', unsubZones));

      this.isListening = true;
      store.set('firebaseConnected', true);
      console.log('📡 Firebase Realtime Database listeners active.');
    } catch (err) {
      console.warn('Could not establish Firebase Realtime listeners:', err);
    }
  }

  /**
   * Stop all active listeners
   */
  stopRealtimeListeners() {
    this.rtdbListeners.forEach(unsub => {
      try { unsub(); } catch (e) {}
    });
    this.rtdbListeners = [];
    this.isListening = false;

    this.firestoreListeners.forEach(unsub => {
      try { unsub(); } catch (e) {}
    });
    this.firestoreListeners = [];
  }

  /**
   * Push telemetry reading to Realtime Database
   */
  async pushTelemetry(zoneId, telemetryData) {
    if (!fb.isLive || !fb.rtdb) return false;
    try {
      const { ref, update } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js');
      
      const liveRef = ref(fb.rtdb, `live/storageUnit01/zone${zoneId}`);
      await update(liveRef, {
        ...telemetryData,
        timestamp: Date.now()
      });

      return true;
    } catch (err) {
      console.error('Failed to push telemetry to RTDB:', err);
      return false;
    }
  }

  // ==========================================================================
  // 2. USER MANAGEMENT & APPROVAL STATUS (DUAL SYNC: FIRESTORE + RTDB)
  // ==========================================================================

  /**
   * Save User Profile to BOTH Cloud Firestore & Firebase Realtime Database + LocalStorage
   */
  async saveUser(userData) {
    if (!userData || !userData.uid) return false;

    const timestamp = new Date().toISOString();
    const cleanUser = {
      ...userData,
      updatedAt: timestamp
    };

    // 1. Immediately cache locally
    try {
      const stored = localStorage.getItem(USERS_CACHE_KEY);
      let users = stored ? JSON.parse(stored) : [];
      const idx = users.findIndex(u => u.uid === cleanUser.uid || (u.email && u.email.toLowerCase() === (cleanUser.email || '').toLowerCase()));
      if (idx >= 0) {
        users[idx] = { ...users[idx], ...cleanUser };
      } else {
        users.push(cleanUser);
      }
      localStorage.setItem(USERS_CACHE_KEY, JSON.stringify(users));
    } catch (e) {
      console.warn('Error saving user to local cache:', e);
    }

    let savedCloud = false;

    // 2. Persist to Cloud Firestore
    if (fb.isLive && fb.firestore) {
      try {
        const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
        const userRef = doc(fb.firestore, 'users', cleanUser.uid);
        await setDoc(userRef, cleanUser, { merge: true });
        console.log(`☁️ [Firestore] User ${cleanUser.uid} (${cleanUser.displayName || cleanUser.email}) saved.`);
        savedCloud = true;
      } catch (err) {
        console.warn(`⚠️ Cloud Firestore save failed for user ${cleanUser.uid}:`, err);
      }
    }

    // 3. Persist to Firebase Realtime Database
    if (fb.isLive && fb.rtdb) {
      try {
        const { ref, set } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js');
        const rtdbUserRef = ref(fb.rtdb, `users/${cleanUser.uid}`);
        await set(rtdbUserRef, cleanUser);

        // If status is pending, also mirror under pendingUsers for quick indexed lookup
        if (cleanUser.status === 'pending') {
          const pendingRef = ref(fb.rtdb, `pendingUsers/${cleanUser.uid}`);
          await set(pendingRef, {
            uid: cleanUser.uid,
            displayName: cleanUser.displayName,
            email: cleanUser.email,
            phone: cleanUser.phone,
            nerState: cleanUser.nerState || 'Assam',
            createdAt: cleanUser.createdAt || timestamp
          });
        }
        console.log(`☁️ [Realtime DB] User ${cleanUser.uid} saved successfully.`);
        savedCloud = true;
      } catch (err) {
        console.warn(`⚠️ Realtime Database save failed for user ${cleanUser.uid}:`, err);
      }
    }

    return savedCloud || true;
  }

  /**
   * Fetch all users from Cloud Firestore and Realtime Database (with local cache fallback)
   */
  async getUsers() {
    let localUsers = [];
    try {
      const stored = localStorage.getItem(USERS_CACHE_KEY);
      if (stored) localUsers = JSON.parse(stored);
    } catch (e) {}

    const userMap = new Map();
    localUsers.forEach(u => {
      if (u.uid) userMap.set(u.uid, u);
    });

    let fetchedFromCloud = false;

    // 1. Fetch from Cloud Firestore
    if (fb.isLive && fb.firestore) {
      try {
        const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
        const colRef = collection(fb.firestore, 'users');
        const snapshot = await getDocs(colRef);
        
        if (!snapshot.empty) {
          snapshot.forEach(doc => {
            const data = doc.data();
            const uid = doc.id || data.uid;
            userMap.set(uid, { uid, ...data });
          });
          fetchedFromCloud = true;
          console.log(`✅ [Firestore] Loaded users from Cloud Firestore.`);
        }
      } catch (err) {
        console.warn('⚠️ Error fetching users from Cloud Firestore:', err);
      }
    }

    // 2. Fetch from Firebase Realtime Database
    if (fb.isLive && fb.rtdb) {
      try {
        const { ref, get } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js');
        const usersRef = ref(fb.rtdb, 'users');
        const snapshot = await get(usersRef);

        if (snapshot.exists()) {
          const val = snapshot.val();
          Object.keys(val).forEach(k => {
            const u = val[k];
            if (u && (u.uid || k)) {
              const uid = u.uid || k;
              const existing = userMap.get(uid);
              // Merge, preferring newer status if available
              userMap.set(uid, { ...existing, ...u, uid });
            }
          });
          fetchedFromCloud = true;
          console.log(`✅ [Realtime DB] Loaded users from Realtime Database.`);
        }
      } catch (err) {
        console.warn('⚠️ Error fetching users from Realtime Database:', err);
      }
    }

    const mergedUsers = Array.from(userMap.values());
    if (mergedUsers.length > 0) {
      try {
        localStorage.setItem(USERS_CACHE_KEY, JSON.stringify(mergedUsers));
      } catch (e) {}
    }

    // If cloud database was empty but local has users, seed them to cloud database
    if (!fetchedFromCloud && localUsers.length > 0 && fb.isLive) {
      for (const u of localUsers) {
        this.saveUser(u).catch(() => {});
      }
    }

    return mergedUsers.length > 0 ? mergedUsers : localUsers;
  }

  /**
   * Update User Status (approved, rejected, pending, disabled) in BOTH Cloud Databases
   */
  async updateUserStatus(uid, newStatus) {
    const timestamp = new Date().toISOString();

    // 1. Update local cache
    try {
      const stored = localStorage.getItem(USERS_CACHE_KEY);
      if (stored) {
        const users = JSON.parse(stored);
        const idx = users.findIndex(u => u.uid === uid);
        if (idx >= 0) {
          users[idx].status = newStatus;
          users[idx].statusUpdatedAt = timestamp;
          users[idx].updatedAt = timestamp;
          localStorage.setItem(USERS_CACHE_KEY, JSON.stringify(users));
        }
      }
    } catch (e) {}

    // 2. Update Firestore document
    if (fb.isLive && fb.firestore) {
      try {
        const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
        const userRef = doc(fb.firestore, 'users', uid);
        await setDoc(userRef, {
          status: newStatus,
          statusUpdatedAt: timestamp,
          updatedAt: timestamp
        }, { merge: true });
        console.log(`☁️ [Firestore] User ${uid} status updated to '${newStatus}'.`);
      } catch (err) {
        console.warn(`⚠️ Error updating user status in Firestore:`, err);
      }
    }

    // 3. Update Realtime Database
    if (fb.isLive && fb.rtdb) {
      try {
        const { ref, update, remove } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js');
        const rtdbUserRef = ref(fb.rtdb, `users/${uid}`);
        await update(rtdbUserRef, {
          status: newStatus,
          statusUpdatedAt: timestamp,
          updatedAt: timestamp
        });

        // If no longer pending, remove from pendingUsers node
        if (newStatus !== 'pending') {
          const pendingRef = ref(fb.rtdb, `pendingUsers/${uid}`);
          await remove(pendingRef).catch(() => {});
        }
        console.log(`☁️ [Realtime DB] User ${uid} status updated to '${newStatus}'.`);
      } catch (err) {
        console.warn(`⚠️ Error updating user status in RTDB:`, err);
      }
    }

    return true;
  }

  /**
   * Realtime Listener for All Users across Firestore & Realtime Database
   */
  async subscribeUsers(callback) {
    let unsubs = [];

    // 1. Subscribe to Firestore users collection
    if (fb.isLive && fb.firestore) {
      try {
        const { collection, onSnapshot } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
        const colRef = collection(fb.firestore, 'users');
        const unsub = onSnapshot(colRef, (snapshot) => {
          if (!snapshot.empty) {
            const users = [];
            snapshot.forEach(doc => users.push({ uid: doc.id, ...doc.data() }));
            localStorage.setItem(USERS_CACHE_KEY, JSON.stringify(users));
            if (callback) callback(users);
          }
        }, (err) => {
          console.warn('Firestore users subscription notice:', err);
        });
        unsubs.push(unsub);
        this.firestoreListeners.push(unsub);
      } catch (e) {}
    }

    // 2. Subscribe to Realtime Database users node
    if (fb.isLive && fb.rtdb) {
      try {
        const { ref, onValue, off } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js');
        const usersRef = ref(fb.rtdb, 'users');
        const unsub = onValue(usersRef, (snapshot) => {
          if (snapshot.exists()) {
            const val = snapshot.val();
            const users = Object.keys(val).map(k => ({ uid: k, ...val[k] }));
            localStorage.setItem(USERS_CACHE_KEY, JSON.stringify(users));
            if (callback) callback(users);
          }
        }, (err) => {
          console.warn('RTDB users subscription notice:', err);
        });
        unsubs.push(() => off(usersRef, 'value', unsub));
        this.rtdbListeners.push(() => off(usersRef, 'value', unsub));
      } catch (e) {}
    }

    return () => {
      unsubs.forEach(fn => { try { fn(); } catch (e) {} });
    };
  }

  /**
   * Realtime Listener for a Single User's Status (Used on pending.html on Phone)
   */
  async subscribeUserStatus(uid, callback) {
    let unsubs = [];

    if (!uid) return () => {};

    // 1. Subscribe to RTDB single user
    if (fb.isLive && fb.rtdb) {
      try {
        const { ref, onValue, off } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js');
        const userRef = ref(fb.rtdb, `users/${uid}`);
        const unsub = onValue(userRef, (snapshot) => {
          if (snapshot.exists()) {
            const user = snapshot.val();
            if (callback) callback(user);
          }
        });
        unsubs.push(() => off(userRef, 'value', unsub));
      } catch (e) {}
    }

    // 2. Subscribe to Firestore single user
    if (fb.isLive && fb.firestore) {
      try {
        const { doc, onSnapshot } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
        const userDocRef = doc(fb.firestore, 'users', uid);
        const unsub = onSnapshot(userDocRef, (snap) => {
          if (snap.exists()) {
            const user = snap.data();
            if (callback) callback({ uid, ...user });
          }
        });
        unsubs.push(unsub);
      } catch (e) {}
    }

    return () => {
      unsubs.forEach(fn => { try { fn(); } catch (e) {} });
    };
  }

  // ==========================================================================
  // 3. PRODUCE BATCHES CRUD & REAL-TIME SYNC (FIRESTORE + RTDB)
  // ==========================================================================

  /**
   * Save or Update a Produce Batch in Cloud Firestore + Realtime Database + LocalStorage
   */
  async saveProduceBatch(batchData) {
    const batchId = batchData.id || `BATCH-${Date.now().toString().slice(-6)}`;
    const cleanBatch = {
      ...batchData,
      id: batchId,
      updatedAt: new Date().toISOString()
    };

    // 1. Update in-memory state & localStorage
    const currentBatches = this.getCachedBatches();
    const existingIdx = currentBatches.findIndex(b => b.id === batchId);
    let updatedBatches;
    if (existingIdx >= 0) {
      updatedBatches = [...currentBatches];
      updatedBatches[existingIdx] = cleanBatch;
    } else {
      updatedBatches = [cleanBatch, ...currentBatches];
    }
    this.setCachedBatches(updatedBatches);
    store.set('batches', updatedBatches);

    // 2. Persist to Cloud Firestore
    if (fb.isLive && fb.firestore) {
      try {
        const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
        const docRef = doc(fb.firestore, 'produceBatches', batchId);
        await setDoc(docRef, cleanBatch, { merge: true });
        console.log(`☁️ [Firestore] Batch ${batchId} synced.`);
      } catch (err) {
        console.warn(`⚠️ Cloud Firestore save failed for batch ${batchId}:`, err);
      }
    }

    // 3. Persist to Realtime Database
    if (fb.isLive && fb.rtdb) {
      try {
        const { ref, set } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js');
        const batchRef = ref(fb.rtdb, `produceBatches/${batchId}`);
        await set(batchRef, cleanBatch);
        console.log(`☁️ [Realtime DB] Batch ${batchId} synced.`);
      } catch (err) {
        console.warn(`⚠️ RTDB save failed for batch ${batchId}:`, err);
      }
    }

    return cleanBatch;
  }

  /**
   * Delete a Produce Batch from Cloud Firestore + Realtime Database + LocalStorage
   */
  async deleteProduceBatch(batchId) {
    // 1. Update local cache & store
    const currentBatches = this.getCachedBatches();
    const filtered = currentBatches.filter(b => b.id !== batchId);
    this.setCachedBatches(filtered);
    store.set('batches', filtered);

    // 2. Delete from Cloud Firestore
    if (fb.isLive && fb.firestore) {
      try {
        const { doc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
        const docRef = doc(fb.firestore, 'produceBatches', batchId);
        await deleteDoc(docRef);
        console.log(`🗑️ [Firestore] Batch ${batchId} deleted.`);
      } catch (err) {
        console.warn(`⚠️ Cloud Firestore delete failed for ${batchId}:`, err);
      }
    }

    // 3. Delete from Realtime Database
    if (fb.isLive && fb.rtdb) {
      try {
        const { ref, remove } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js');
        const batchRef = ref(fb.rtdb, `produceBatches/${batchId}`);
        await remove(batchRef);
        console.log(`🗑️ [Realtime DB] Batch ${batchId} deleted.`);
      } catch (err) {
        console.warn(`⚠️ RTDB delete failed for ${batchId}:`, err);
      }
    }

    return true;
  }

  /**
   * Fetch all produce batches from Cloud Firestore / RTDB (falls back to local cache)
   */
  async getProduceBatches() {
    let batches = this.getCachedBatches();
    const batchMap = new Map();
    batches.forEach(b => batchMap.set(b.id, b));
    let fetched = false;

    // 1. Try Firestore
    if (fb.isLive && fb.firestore) {
      try {
        const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
        const colRef = collection(fb.firestore, 'produceBatches');
        const snapshot = await getDocs(colRef);
        
        if (!snapshot.empty) {
          snapshot.forEach(doc => {
            batchMap.set(doc.id, { id: doc.id, ...doc.data() });
          });
          fetched = true;
        }
      } catch (err) {
        console.warn('⚠️ Error fetching batches from Firestore:', err);
      }
    }

    // 2. Try Realtime Database
    if (fb.isLive && fb.rtdb) {
      try {
        const { ref, get } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js');
        const rtdbRef = ref(fb.rtdb, 'produceBatches');
        const snap = await get(rtdbRef);
        if (snap.exists()) {
          const val = snap.val();
          Object.keys(val).forEach(k => {
            batchMap.set(k, { id: k, ...val[k] });
          });
          fetched = true;
        }
      } catch (err) {
        console.warn('⚠️ Error fetching batches from RTDB:', err);
      }
    }

    const mergedBatches = Array.from(batchMap.values());
    if (mergedBatches.length > 0) {
      batches = mergedBatches;
      this.setCachedBatches(batches);
    }

    // Seed to cloud if cloud was empty
    if (!fetched && batches.length > 0 && fb.isLive) {
      for (const b of batches) {
        this.saveProduceBatch(b).catch(() => {});
      }
    }

    store.set('batches', batches);
    return batches;
  }

  /**
   * Realtime Listener for Produce Batches from Cloud Firestore & RTDB
   */
  async subscribeProduceBatches(callback) {
    let unsubs = [];

    if (fb.isLive && fb.firestore) {
      try {
        const { collection, onSnapshot } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
        const colRef = collection(fb.firestore, 'produceBatches');
        
        const unsub = onSnapshot(colRef, (snapshot) => {
          if (!snapshot.empty) {
            const batches = [];
            snapshot.forEach(doc => batches.push({ id: doc.id, ...doc.data() }));
            this.setCachedBatches(batches);
            store.set('batches', batches);
            if (callback) callback(batches);
          }
        }, (err) => {
          console.warn('Firestore produceBatches listener error:', err);
        });

        unsubs.push(unsub);
        this.firestoreListeners.push(unsub);
      } catch (err) {}
    }

    if (fb.isLive && fb.rtdb) {
      try {
        const { ref, onValue, off } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js');
        const batchesRef = ref(fb.rtdb, 'produceBatches');
        const unsub = onValue(batchesRef, (snapshot) => {
          if (snapshot.exists()) {
            const val = snapshot.val();
            const batches = Object.keys(val).map(k => ({ id: k, ...val[k] }));
            this.setCachedBatches(batches);
            store.set('batches', batches);
            if (callback) callback(batches);
          }
        });
        unsubs.push(() => off(batchesRef, 'value', unsub));
        this.rtdbListeners.push(() => off(batchesRef, 'value', unsub));
      } catch (err) {}
    }

    return () => {
      unsubs.forEach(fn => { try { fn(); } catch (e) {} });
    };
  }

  getCachedBatches() {
    try {
      const stored = localStorage.getItem(BATCHES_CACHE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return store.get('batches') || [];
  }

  setCachedBatches(batches) {
    try {
      localStorage.setItem(BATCHES_CACHE_KEY, JSON.stringify(batches));
    } catch (e) {}
  }

  // ==========================================================================
  // 4. SENSOR CALIBRATION REGISTRY (FIRESTORE + RTDB)
  // ==========================================================================

  /**
   * Save Sensor Calibration to Cloud Firestore + Realtime Database + LocalStorage
   */
  async saveSensorCalibration(sensorId, calibrationData) {
    const timestamp = new Date().toISOString();
    const cleanData = {
      ...calibrationData,
      id: sensorId,
      updatedAt: timestamp
    };

    // 1. Update State & LocalStorage
    store.set(`calibration.${sensorId}`, cleanData);
    try {
      const stored = localStorage.getItem(CALIBRATION_CACHE_KEY);
      const registry = stored ? JSON.parse(stored) : {};
      registry[sensorId] = cleanData;
      localStorage.setItem(CALIBRATION_CACHE_KEY, JSON.stringify(registry));
    } catch (e) {}

    // 2. Persist to Cloud Firestore
    if (fb.isLive && fb.firestore) {
      try {
        const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
        const calRef = doc(fb.firestore, 'sensorCalibration', sensorId);
        await setDoc(calRef, cleanData, { merge: true });
        console.log(`☁️ [Firestore] Sensor calibration for ${sensorId} saved.`);
      } catch (err) {
        console.warn(`⚠️ Error saving sensor calibration to Firestore:`, err);
      }
    }

    // 3. Persist to Realtime Database
    if (fb.isLive && fb.rtdb) {
      try {
        const { ref, set } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js');
        const calRef = ref(fb.rtdb, `sensorCalibration/${sensorId}`);
        await set(calRef, cleanData);
        console.log(`☁️ [Realtime DB] Sensor calibration for ${sensorId} saved.`);
      } catch (err) {
        console.warn(`⚠️ Error saving sensor calibration to RTDB:`, err);
      }
    }

    return cleanData;
  }

  /**
   * Load Sensor Calibrations from Cloud Firestore / Realtime Database
   */
  async getSensorCalibrations() {
    let registry = store.get('calibration') || {};
    try {
      const stored = localStorage.getItem(CALIBRATION_CACHE_KEY);
      if (stored) registry = JSON.parse(stored);
    } catch (e) {}

    // 1. Try Firestore
    if (fb.isLive && fb.firestore) {
      try {
        const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
        const colRef = collection(fb.firestore, 'sensorCalibration');
        const snapshot = await getDocs(colRef);
        if (!snapshot.empty) {
          snapshot.forEach(doc => {
            registry[doc.id] = { id: doc.id, ...doc.data() };
          });
        }
      } catch (err) {}
    }

    // 2. Try Realtime Database
    if (fb.isLive && fb.rtdb) {
      try {
        const { ref, get } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js');
        const calRef = ref(fb.rtdb, 'sensorCalibration');
        const snapshot = await get(calRef);
        if (snapshot.exists()) {
          const val = snapshot.val();
          Object.keys(val).forEach(k => {
            registry[k] = { id: k, ...val[k] };
          });
        }
      } catch (err) {}
    }

    try {
      localStorage.setItem(CALIBRATION_CACHE_KEY, JSON.stringify(registry));
    } catch (e) {}

    store.set('calibration', registry);
    return registry;
  }

  // ==========================================================================
  // 5. AUDIT LOGS (FIRESTORE + RTDB)
  // ==========================================================================

  /**
   * Save Audit Log event to Firestore + Realtime Database + LocalStorage
   */
  async saveAuditLog(logData) {
    const logId = logData.id || `AUDIT-${Date.now()}`;
    const newLog = {
      id: logId,
      timestamp: new Date().toISOString(),
      ...logData
    };

    // 1. Update LocalStorage
    try {
      const stored = localStorage.getItem(AUDIT_LOGS_CACHE_KEY);
      const logs = stored ? JSON.parse(stored) : [];
      logs.unshift(newLog);
      localStorage.setItem(AUDIT_LOGS_CACHE_KEY, JSON.stringify(logs.slice(0, 100)));
    } catch (e) {}

    // 2. Persist to Firestore
    if (fb.isLive && fb.firestore) {
      try {
        const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
        const docRef = doc(fb.firestore, 'auditLogs', logId);
        await setDoc(docRef, newLog);
      } catch (err) {
        console.warn('⚠️ Error recording audit log in Firestore:', err);
      }
    }

    // 3. Persist to Realtime Database
    if (fb.isLive && fb.rtdb) {
      try {
        const { ref, set } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js');
        const rtdbRef = ref(fb.rtdb, `auditLogs/${logId}`);
        await set(rtdbRef, newLog);
      } catch (err) {
        console.warn('⚠️ Error recording audit log in RTDB:', err);
      }
    }

    return newLog;
  }

  // ==========================================================================
  // 6. DATABASE DIAGNOSTIC & VERIFICATION TEST
  // ==========================================================================

  /**
   * Run live read/write test against Cloud Firestore and Realtime Database
   * Returns complete diagnostic report to verify that data is storing correctly.
   */
  async testDatabaseConnection() {
    const report = {
      timestamp: new Date().toISOString(),
      projectId: fb.app?.options?.projectId || 'cold-storage-3a452',
      firestore: { connected: false, writeOk: false, readOk: false, latencyMs: 0, error: null },
      rtdb: { connected: false, writeOk: false, readOk: false, latencyMs: 0, error: null },
      overallStatus: 'FAIL'
    };

    // 1. Test Cloud Firestore
    if (fb.firestore) {
      const startFs = performance.now();
      try {
        const { doc, setDoc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
        const testDocRef = doc(fb.firestore, 'diagnostics', 'connection_test');
        
        // Write Test
        await setDoc(testDocRef, {
          ping: 'pong',
          testTime: new Date().toISOString(),
          app: 'QoraTech Cold Storage'
        });
        report.firestore.writeOk = true;

        // Read Test
        const testSnap = await getDoc(testDocRef);
        if (testSnap.exists() && testSnap.data().ping === 'pong') {
          report.firestore.readOk = true;
          report.firestore.connected = true;
        }
        report.firestore.latencyMs = Math.round(performance.now() - startFs);
      } catch (fsErr) {
        report.firestore.error = fsErr.message;
        console.error('Firestore diagnostic test failed:', fsErr);
      }
    }

    // 2. Test Realtime Database
    if (fb.rtdb) {
      const startRtdb = performance.now();
      try {
        const { ref, set, get } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js');
        const testRef = ref(fb.rtdb, 'diagnostics/ping');
        
        // Write Test
        await set(testRef, {
          timestamp: Date.now(),
          status: 'ONLINE'
        });
        report.rtdb.writeOk = true;

        // Read Test
        const rtdbSnap = await get(testRef);
        if (rtdbSnap.exists()) {
          report.rtdb.readOk = true;
          report.rtdb.connected = true;
        }
        report.rtdb.latencyMs = Math.round(performance.now() - startRtdb);
      } catch (rtdbErr) {
        report.rtdb.error = rtdbErr.message;
        console.error('RTDB diagnostic test failed:', rtdbErr);
      }
    }

    if (report.firestore.connected || report.rtdb.connected) {
      report.overallStatus = (report.firestore.connected && report.rtdb.connected) ? 'FULL_SYNC' : 'PARTIAL_SYNC';
    }

    return report;
  }

  /**
   * Synthesize historical time-series data for analytics charts
   */
  fetchHistoricalData(zoneId, timeRange = '24h') {
    const pointsCount = timeRange === '24h' ? 24 :
                        timeRange === '7d' ? 28 : 30;

    const baseZone = store.get(`zones.${zoneId}`) || { temperature: 5.4, humidity: 87.2, ethylene: 0.28, initialWeight: 140, currentWeight: 135.8 };
    const baseTemp = baseZone.temperature;
    const baseHum = baseZone.humidity;
    const baseEth = baseZone.ethylene;
    const baseWeight = baseZone.currentWeight;

    const durationMs = timeRange === '24h' ? 86400000 :
                       timeRange === '7d' ? 604800000 : 2592000000;

    const now = Date.now();
    const stepMs = durationMs / pointsCount;

    const labels = [];
    const tempData = [];
    const humData = [];
    const weightData = [];
    const ethyleneData = [];

    for (let i = pointsCount; i >= 0; i--) {
      const t = new Date(now - i * stepMs);
      const label = timeRange === '24h'
        ? t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : `${t.getDate()} ${t.toLocaleString('default', { month: 'short' })}`;

      labels.push(label);

      const noise = (Math.random() - 0.5);
      tempData.push(Number((baseTemp + noise * 0.4).toFixed(1)));
      humData.push(Number((baseHum + noise * 1.5).toFixed(1)));
      weightData.push(Number((baseWeight + (pointsCount - i) * 0.05).toFixed(1)));
      ethyleneData.push(Number(Math.max(0.05, baseEth + noise * 0.05).toFixed(2)));
    }

    return { labels, tempData, humData, weightData, ethyleneData };
  }
}

export const firebaseService = new FirebaseService();
export const fbService = firebaseService;
window.FirebaseService = firebaseService;
