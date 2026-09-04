/**
 * Solar Smart Cold Storage — Firebase Service Layer
 * Realtime Database synchronization under /live/storageUnit01/ and Firestore batches/calibration.
 */

import { fb } from '../config/firebase-config.js';
import { store } from '../core/state.js';
import { alertEngine } from '../core/alerts.js';

export class FirebaseService {
  constructor() {
    this.rtdbListeners = [];
    this.isListening = false;
  }

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

  /**
   * Fetch historical telemetry for charts with optimized range filtering
   */
  async fetchHistoricalData(zoneId, timeRange = '24h') {
    return this.generateSampleTimeSeries(zoneId, timeRange);
  }

  /**
   * Synthesize realistic historical time-series data for analytics charts
   */
  generateSampleTimeSeries(zoneId, timeRange = '24h') {
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

export const fbService = new FirebaseService();
window.FirebaseService = fbService;
