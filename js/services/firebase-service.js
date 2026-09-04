/**
 * Solar Smart Cold Storage — Firebase Service Layer
 * Realtime Database synchronization under /live/storageUnit01/ and
 * Cloud Firestore collections: produceBatches, users, sensorCalibration, auditLogs, diagnostics.
 * Includes automatic offline caching with localStorage and two-way sync.
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

      this.rtdbListeners = [
        () => off(liveRef, 'value', unsubLive),
        () => off(zonesRef, 'value', unsubZones)
      ];

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
  // 2. CLOUD FIRESTORE — PRODUCE BATCHES CRUD & REAL-TIME SYNC
  // ==========================================================================

  /**
   * Save or Update a Produce Batch in Cloud Firestore + LocalStorage Cache
   */
  async saveProduceBatch(batchData) {
    const batchId = batchData.id || `BATCH-${Date.now().toString().slice(-6)}`;
    const cleanBatch = {
      ...batchData,
      id: batchId,
      updatedAt: new Date().toISOString()
    };

    // 1. Immediately update in-memory state and localStorage cache
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

    // 2. Persist to Cloud Firestore if connected
    if (fb.isLive && fb.firestore) {
      try {
        const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
        const docRef = doc(fb.firestore, 'produceBatches', batchId);
        await setDoc(docRef, cleanBatch, { merge: true });
        console.log(`☁️ Batch ${batchId} synced to Cloud Firestore.`);
      } catch (err) {
        console.warn(`⚠️ Cloud Firestore save failed for batch ${batchId}, saved locally:`, err);
      }
    }

    return cleanBatch;
  }

  /**
   * Delete a Produce Batch from Cloud Firestore + LocalStorage
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
        console.log(`🗑️ Batch ${batchId} deleted from Cloud Firestore.`);
      } catch (err) {
        console.warn(`⚠️ Cloud Firestore delete failed for ${batchId}:`, err);
      }
    }

    return true;
  }

  /**
   * Fetch all produce batches from Cloud Firestore (falls back to local cache)
   */
  async getProduceBatches() {
    let batches = this.getCachedBatches();

    if (fb.isLive && fb.firestore) {
      try {
        const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
        const colRef = collection(fb.firestore, 'produceBatches');
        const snapshot = await getDocs(colRef);
        
        if (!snapshot.empty) {
          const firestoreBatches = [];
          snapshot.forEach(doc => firestoreBatches.push({ id: doc.id, ...doc.data() }));
          batches = firestoreBatches;
          this.setCachedBatches(batches);
          store.set('batches', batches);
          console.log(`✅ Loaded ${batches.length} batches from Cloud Firestore.`);
        } else if (batches.length > 0) {
          // Push initial default batches to Firestore so cloud database is populated
          console.log(`ℹ️ Firestore produceBatches collection empty. Seeding initial batches to cloud...`);
          for (const b of batches) {
            await this.saveProduceBatch(b);
          }
        }
      } catch (err) {
        console.warn('⚠️ Could not fetch batches from Cloud Firestore, using local cache:', err);
      }
    }

    store.set('batches', batches);
    return batches;
  }

  /**
   * Realtime Listener for Produce Batches from Cloud Firestore
   */
  async subscribeProduceBatches(callback) {
    if (!fb.isLive || !fb.firestore) return null;

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

      this.firestoreListeners.push(unsub);
      return unsub;
    } catch (err) {
      console.warn('Could not initialize Firestore produceBatches subscription:', err);
      return null;
    }
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
  // 3. CLOUD FIRESTORE — USER MANAGEMENT & APPROVAL STATUS
  // ==========================================================================

  /**
   * Save User Profile to Cloud Firestore + LocalStorage
   */
  async saveUser(userData) {
    if (!userData || !userData.uid) return false;

    // 1. Update localStorage
    try {
      const stored = localStorage.getItem(USERS_CACHE_KEY);
      let users = stored ? JSON.parse(stored) : [];
      const idx = users.findIndex(u => u.uid === userData.uid || (u.email && u.email.toLowerCase() === (userData.email || '').toLowerCase()));
      if (idx >= 0) {
        users[idx] = { ...users[idx], ...userData, updatedAt: new Date().toISOString() };
      } else {
        users.push({ ...userData, updatedAt: new Date().toISOString() });
      }
      localStorage.setItem(USERS_CACHE_KEY, JSON.stringify(users));
    } catch (e) {
      console.warn('Error saving user to local cache:', e);
    }

    // 2. Persist to Cloud Firestore
    if (fb.isLive && fb.firestore) {
      try {
        const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
        const userRef = doc(fb.firestore, 'users', userData.uid);
        await setDoc(userRef, {
          ...userData,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        console.log(`☁️ User ${userData.uid} (${userData.displayName || userData.email}) saved to Cloud Firestore.`);
      } catch (err) {
        console.warn(`⚠️ Cloud Firestore save failed for user ${userData.uid}:`, err);
      }
    }

    return true;
  }

  /**
   * Fetch all users from Cloud Firestore (with local cache fallback)
   */
  async getUsers() {
    let localUsers = [];
    try {
      const stored = localStorage.getItem(USERS_CACHE_KEY);
      if (stored) localUsers = JSON.parse(stored);
    } catch (e) {}

    if (fb.isLive && fb.firestore) {
      try {
        const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
        const colRef = collection(fb.firestore, 'users');
        const snapshot = await getDocs(colRef);
        
        if (!snapshot.empty) {
          const firestoreUsers = [];
          snapshot.forEach(doc => firestoreUsers.push({ uid: doc.id, ...doc.data() }));
          localStorage.setItem(USERS_CACHE_KEY, JSON.stringify(firestoreUsers));
          return firestoreUsers;
        } else if (localUsers.length > 0) {
          // Seed local users to Firestore
          for (const u of localUsers) {
            await this.saveUser(u);
          }
        }
      } catch (err) {
        console.warn('⚠️ Error fetching users from Cloud Firestore:', err);
      }
    }

    return localUsers;
  }

  /**
   * Update User Status (approved, rejected, pending, disabled) in Firestore
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
          localStorage.setItem(USERS_CACHE_KEY, JSON.stringify(users));
        }
      }
    } catch (e) {}

    // 2. Update Firestore document
    if (fb.isLive && fb.firestore) {
      try {
        const { doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
        const userRef = doc(fb.firestore, 'users', uid);
        await updateDoc(userRef, {
          status: newStatus,
          statusUpdatedAt: timestamp,
          updatedAt: timestamp
        });
        console.log(`☁️ User ${uid} status updated to ${newStatus} in Cloud Firestore.`);
      } catch (err) {
        console.warn(`⚠️ Error updating user status in Firestore:`, err);
      }
    }

    return true;
  }

  // ==========================================================================
  // 4. CLOUD FIRESTORE — SENSOR CALIBRATION REGISTRY
  // ==========================================================================

  /**
   * Save Sensor Calibration to Cloud Firestore + LocalStorage
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
        console.log(`☁️ Sensor calibration for ${sensorId} saved to Cloud Firestore.`);
      } catch (err) {
        console.warn(`⚠️ Error saving sensor calibration to Firestore:`, err);
      }
    }

    return cleanData;
  }

  /**
   * Load Sensor Calibrations from Cloud Firestore
   */
  async getSensorCalibrations() {
    let registry = store.get('calibration') || {};
    try {
      const stored = localStorage.getItem(CALIBRATION_CACHE_KEY);
      if (stored) registry = JSON.parse(stored);
    } catch (e) {}

    if (fb.isLive && fb.firestore) {
      try {
        const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
        const colRef = collection(fb.firestore, 'sensorCalibration');
        const snapshot = await getDocs(colRef);
        if (!snapshot.empty) {
          const cloudRegistry = {};
          snapshot.forEach(doc => {
            cloudRegistry[doc.id] = { id: doc.id, ...doc.data() };
          });
          registry = cloudRegistry;
          localStorage.setItem(CALIBRATION_CACHE_KEY, JSON.stringify(registry));
        }
      } catch (err) {
        console.warn('⚠️ Error fetching calibration from Cloud Firestore:', err);
      }
    }

    store.set('calibration', registry);
    return registry;
  }

  // ==========================================================================
  // 5. CLOUD FIRESTORE — AUDIT LOGS
  // ==========================================================================

  /**
   * Save Audit Log event to Firestore + LocalStorage
   */
  async saveAuditLog(logData) {
    const newLog = {
      id: logData.id || `AUDIT-${Date.now()}`,
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
        const { collection, addDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
        const colRef = collection(fb.firestore, 'auditLogs');
        await addDoc(colRef, newLog);
      } catch (err) {
        console.warn('⚠️ Error recording audit log in Firestore:', err);
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
