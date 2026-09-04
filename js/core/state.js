/**
 * QORA TECH — Solar Smart Cold Storage
 * Global Reactive State Store with Real ESP32 Hardware Integration (USB & Wi-Fi),
 * Sensor Health & Failure Caching, Hybrid Energy Balancer, and Northeast India Crop Registry.
 */

import { DEFAULT_PRODUCE_PROFILES, ZONE_SPECS } from '../config/produce-profiles.js';

class GlobalStateStore {
  constructor() {
    this.listeners = new Map();

    this.state = {
      user: null, // { uid, email, displayName, phone, organization, location, userType, status, isAdmin }
      DEMO_MODE: false, // Default is FALSE: Real hardware is the default
      firebaseConnected: false,

      // --- HARDWARE CONNECTION STATUS ---
      connection: {
        usbConnected: false,
        wifiConnected: false,
        mode: 'OFFLINE', // 'OFFLINE' | 'USB' | 'WIFI' | 'DUAL' | 'DEMO'
        statusLabel: 'DEVICE OFFLINE',
        statusColor: 'var(--brand-rose, #f43f5e)',
        lastPacketTime: null,
        lastPacketFormatted: 'Never',
        deviceId: 'ESP32-COLD-01',
        firmware: 'v2.4.0',
        ipAddress: '192.168.1.45',
        rssi: -65,
        uptimeSeconds: 0
      },

      // --- THREE PHYSICAL STORAGE COMPARTMENTS ---
      // LEFT (Zone 1: 2–8°C), CENTER (Zone 2: 0–2°C [Coldest]), RIGHT (Zone 3: 8–15°C)
      zones: {
        1: {
          id: 1,
          name: 'ZONE 1 – COOL STORAGE',
          compartment: 'LEFT COMPARTMENT',
          location: 'LEFT',
          crop: 'Green Beans (French Beans)',
          cropId: 'green_beans',
          variety: 'Contender',
          batchId: 'BATCH-GB101',
          targetTempMin: 2.0,
          targetTempMax: 8.0,
          targetHumidityMin: 88.0,
          targetHumidityMax: 96.0,
          temperature: 5.4,
          humidity: 87.2,
          initialWeight: 140.0,
          currentWeight: 135.8,
          weightLoss: 4.2,
          weightLossPercent: 3.00,
          weightLossRisk: 'LOW',
          ethylene: 0.28,
          coolingStatus: 'ACTIVE',
          sensorStatus: 'ONLINE',
          sensorHealth: {
            temperature: { status: 'ONLINE', lastValid: 5.4, lastTime: new Date().toLocaleTimeString() },
            humidity: { status: 'ONLINE', lastValid: 87.2, lastTime: new Date().toLocaleTimeString() },
            weight: { status: 'ONLINE', lastValid: 135.8, lastTime: new Date().toLocaleTimeString() },
            ethylene: { status: 'ONLINE', lastValid: 0.28, lastTime: new Date().toLocaleTimeString() }
          },
          lastUpdated: new Date().toISOString()
        },
        2: {
          id: 2,
          name: 'ZONE 2 – DEEP COLD STORAGE',
          compartment: 'CENTER COMPARTMENT',
          location: 'CENTER',
          crop: 'Cabbage (Golden Acre)',
          cropId: 'cabbage',
          variety: 'Golden Acre',
          batchId: 'BATCH-CB202',
          targetTempMin: 0.0,
          targetTempMax: 2.0,
          targetHumidityMin: 90.0,
          targetHumidityMax: 98.0,
          temperature: 1.1,
          humidity: 92.1,
          initialWeight: 280.0,
          currentWeight: 276.4,
          weightLoss: 3.6,
          weightLossPercent: 1.29,
          weightLossRisk: 'LOW',
          ethylene: 0.12,
          coolingStatus: 'ACTIVE',
          sensorStatus: 'ONLINE',
          sensorHealth: {
            temperature: { status: 'ONLINE', lastValid: 1.1, lastTime: new Date().toLocaleTimeString() },
            humidity: { status: 'ONLINE', lastValid: 92.1, lastTime: new Date().toLocaleTimeString() },
            weight: { status: 'ONLINE', lastValid: 276.4, lastTime: new Date().toLocaleTimeString() },
            ethylene: { status: 'ONLINE', lastValid: 0.12, lastTime: new Date().toLocaleTimeString() }
          },
          lastUpdated: new Date().toISOString()
        },
        3: {
          id: 3,
          name: 'ZONE 3 – COOL / MODERATE STORAGE',
          compartment: 'RIGHT COMPARTMENT',
          location: 'RIGHT',
          crop: 'Naga King Chilli (Bhut Jolokia)',
          cropId: 'naga_chilli',
          variety: 'Bhut Jolokia GI',
          batchId: 'BATCH-NC303',
          targetTempMin: 8.0,
          targetTempMax: 15.0,
          targetHumidityMin: 80.0,
          targetHumidityMax: 92.0,
          temperature: 11.8,
          humidity: 81.4,
          initialWeight: 95.0,
          currentWeight: 91.2,
          weightLoss: 3.8,
          weightLossPercent: 4.00,
          weightLossRisk: 'LOW',
          ethylene: 0.52,
          coolingStatus: 'ACTIVE',
          sensorStatus: 'ONLINE',
          sensorHealth: {
            temperature: { status: 'ONLINE', lastValid: 11.8, lastTime: new Date().toLocaleTimeString() },
            humidity: { status: 'ONLINE', lastValid: 81.4, lastTime: new Date().toLocaleTimeString() },
            weight: { status: 'ONLINE', lastValid: 91.2, lastTime: new Date().toLocaleTimeString() },
            ethylene: { status: 'ONLINE', lastValid: 0.52, lastTime: new Date().toLocaleTimeString() }
          },
          lastUpdated: new Date().toISOString()
        }
      },

      // --- HYBRID SOLAR, BATTERY & AC POWER BALANCE ---
      energy: {
        solarPowerKw: 0.82,          // 820 W
        solarVoltageV: 118.5,
        solarCurrentA: 6.9,
        acPowerKw: 0.62,             // 620 W
        acVoltageV: 230.0,
        acCurrentA: 2.7,
        gridPowerKw: 0.00,           // 0 W
        batterySoc: 78,              // 78%
        batteryVoltageV: 52.4,
        batteryCurrentA: 3.8,
        batteryStatus: 'CHARGING',
        source: 'SOLAR',             // 'SOLAR' | 'BATTERY' | 'GRID' | 'HYBRID'
        energySurplusKw: 0.20,       // 0.82 - 0.62 = +0.20 kW
        compressorStatus: 'ACTIVE'
      },

      // ESP32 Hardware Diagnostics
      device: {
        deviceId: 'ESP32-COLD-01',
        firmware: 'v2.4.0',
        online: false,
        lastSeen: null,
        wifiSsid: 'QoraTech-AgroNet',
        wifiRssi: -65,
        ipAddress: '192.168.1.45',
        uptimeSeconds: 0,
        freeHeapBytes: 184500,
        firebaseLatencyMs: 0
      },

      // Northeast India Produce Batches
      batches: [
        {
          id: 'BATCH-GB101',
          name: 'Green Beans (French Beans)',
          crop: 'Green Beans',
          cropId: 'green_beans',
          variety: 'Contender',
          zoneId: 1,
          farmer: 'Tsering Agro Farms',
          location: 'Dirang, Arunachal Pradesh',
          initialWeight: 140.0,
          currentWeight: 135.8,
          dateStored: new Date(Date.now() - 86400000 * 4).toISOString().split('T')[0],
          harvestDate: new Date(Date.now() - 86400000 * 5).toISOString().split('T')[0],
          expectedShelfLifeDays: 12,
          freshnessScore: 88,
          spoilageRisk: 'LOW',
          shelfLifeRemainingDays: 8,
          recommendation: 'SAFE TO STORE',
          status: 'ACTIVE'
        },
        {
          id: 'BATCH-CB202',
          name: 'Cabbage (Golden Acre)',
          crop: 'Cabbage',
          cropId: 'cabbage',
          variety: 'Golden Acre',
          zoneId: 2,
          farmer: 'Shillong Plateau Growers',
          location: 'East Khasi Hills, Meghalaya',
          initialWeight: 280.0,
          currentWeight: 276.4,
          dateStored: new Date(Date.now() - 86400000 * 8).toISOString().split('T')[0],
          harvestDate: new Date(Date.now() - 86400000 * 9).toISOString().split('T')[0],
          expectedShelfLifeDays: 60,
          freshnessScore: 92,
          spoilageRisk: 'LOW',
          shelfLifeRemainingDays: 52,
          recommendation: 'SAFE TO STORE',
          status: 'ACTIVE'
        },
        {
          id: 'BATCH-NC303',
          name: 'Naga King Chilli (Bhut Jolokia)',
          crop: 'Naga King Chilli',
          cropId: 'naga_chilli',
          variety: 'Bhut Jolokia GI',
          zoneId: 3,
          farmer: 'Kohima Organic Farmers Society',
          location: 'Kohima, Nagaland',
          initialWeight: 95.0,
          currentWeight: 91.2,
          dateStored: new Date(Date.now() - 86400000 * 5).toISOString().split('T')[0],
          harvestDate: new Date(Date.now() - 86400000 * 6).toISOString().split('T')[0],
          expectedShelfLifeDays: 24,
          freshnessScore: 82,
          spoilageRisk: 'MODERATE',
          shelfLifeRemainingDays: 19,
          recommendation: 'SELL SOON',
          status: 'ACTIVE'
        },
        {
          id: 'BATCH-LK304',
          name: 'Turmeric (Lakadong GI)',
          crop: 'Turmeric',
          cropId: 'turmeric',
          variety: 'Lakadong High Curcumin',
          zoneId: 3,
          farmer: 'Jaintia Organic Producers',
          location: 'Jowai, Meghalaya',
          initialWeight: 210.0,
          currentWeight: 206.5,
          dateStored: new Date(Date.now() - 86400000 * 14).toISOString().split('T')[0],
          harvestDate: new Date(Date.now() - 86400000 * 16).toISOString().split('T')[0],
          expectedShelfLifeDays: 75,
          freshnessScore: 94,
          spoilageRisk: 'LOW',
          shelfLifeRemainingDays: 61,
          recommendation: 'SAFE TO STORE',
          status: 'ACTIVE'
        }
      ],

      cropProfiles: { ...DEFAULT_PRODUCE_PROFILES },

      // Sensor Calibration Registry
      calibration: {
        'loadcell-z1': { id: 'loadcell-z1', zone: 1, type: 'Load Cell (HX711 - Left)', status: 'CALIBRATED', lastCalibrated: '2026-08-20', zeroOffset: 84200, factor: 420.5, unit: 'kg' },
        'loadcell-z2': { id: 'loadcell-z2', zone: 2, type: 'Load Cell (HX711 - Center)', status: 'CALIBRATED', lastCalibrated: '2026-08-20', zeroOffset: 91450, factor: 419.8, unit: 'kg' },
        'loadcell-z3': { id: 'loadcell-z3', zone: 3, type: 'Load Cell (HX711 - Right)', status: 'CALIBRATED', lastCalibrated: '2026-08-20', zeroOffset: 78910, factor: 421.2, unit: 'kg' }
      },

      // Active Alerts
      alerts: []
    };

    // Heartbeat checker to automatically detect device offline state
    this.startHeartbeatWatcher();
  }

  startHeartbeatWatcher() {
    setInterval(() => {
      if (this.state.DEMO_MODE) return;
      const conn = this.state.connection;
      if (conn.lastPacketTime) {
        const elapsedSec = (Date.now() - conn.lastPacketTime) / 1000;
        if (elapsedSec > 12 && conn.mode !== 'OFFLINE') {
          // No packet received in 12s -> Mark offline
          this.setOfflineState();
        }
      }
    }, 3000);
  }

  setOfflineState() {
    this.state.connection.mode = 'OFFLINE';
    this.state.connection.statusLabel = 'DEVICE OFFLINE';
    this.state.connection.statusColor = 'var(--brand-rose, #f43f5e)';
    this.state.device.online = false;
    this.notify('connection');
    this.notify('device');
  }

  setConnectionSource(source, isActive) {
    if (source === 'usb') {
      this.state.connection.usbConnected = isActive;
    } else if (source === 'wifi') {
      this.state.connection.wifiConnected = isActive;
    }
    this.recomputeConnectionMode();
  }

  recomputeConnectionMode() {
    if (this.state.DEMO_MODE) {
      this.state.connection.mode = 'DEMO';
      this.state.connection.statusLabel = 'DEMO MODE';
      this.state.connection.statusColor = 'var(--brand-amber, #f59e0b)';
      this.state.device.online = true;
    } else if (this.state.connection.usbConnected && this.state.connection.wifiConnected) {
      this.state.connection.mode = 'DUAL';
      this.state.connection.statusLabel = 'REAL DEVICE (USB + Wi-Fi)';
      this.state.connection.statusColor = 'var(--brand-emerald, #10b981)';
      this.state.device.online = true;
    } else if (this.state.connection.usbConnected) {
      this.state.connection.mode = 'USB';
      this.state.connection.statusLabel = 'REAL DEVICE (USB Serial)';
      this.state.connection.statusColor = 'var(--brand-emerald, #10b981)';
      this.state.device.online = true;
    } else if (this.state.connection.wifiConnected) {
      this.state.connection.mode = 'WIFI';
      this.state.connection.statusLabel = 'REAL DEVICE (Wi-Fi)';
      this.state.connection.statusColor = 'var(--brand-emerald, #10b981)';
      this.state.device.online = true;
    } else {
      this.state.connection.mode = 'OFFLINE';
      this.state.connection.statusLabel = 'DEVICE OFFLINE';
      this.state.connection.statusColor = 'var(--brand-rose, #f43f5e)';
      this.state.device.online = false;
    }

    this.notify('connection');
    this.notify('device');
  }

  setDemoMode(enabled) {
    this.state.DEMO_MODE = enabled;
    this.recomputeConnectionMode();
  }

  /**
   * Apply incoming telemetry packet from USB Serial, Wi-Fi Firebase, or Demo Simulator
   */
  applyTelemetry(packet, source = 'usb') {
    if (!packet || typeof packet !== 'object') return;

    const now = Date.now();
    const timeFormatted = new Date(now).toLocaleTimeString();

    this.state.connection.lastPacketTime = now;
    this.state.connection.lastPacketFormatted = timeFormatted;

    if (source === 'usb') {
      this.state.connection.usbConnected = true;
    } else if (source === 'wifi') {
      this.state.connection.wifiConnected = true;
    }

    this.recomputeConnectionMode();

    // 1. Process Zone Telemetry
    [1, 2, 3].forEach(zId => {
      const zKey = `zone${zId}`;
      const zData = packet[zKey];
      if (zData && this.state.zones[zId]) {
        this.updateZoneSensorData(zId, zData, timeFormatted);
      }
    });

    // 2. Process Energy Telemetry
    if (packet.energy) {
      const e = packet.energy;
      if (e.solarPower !== undefined) this.state.energy.solarPowerKw = Number((e.solarPower / 1000).toFixed(2));
      if (e.acPower !== undefined) this.state.energy.acPowerKw = Number((e.acPower / 1000).toFixed(2));
      if (e.batterySOC !== undefined) this.state.energy.batterySoc = Math.round(e.batterySOC);
      if (e.batteryVoltage !== undefined) this.state.energy.batteryVoltageV = Number(e.batteryVoltage.toFixed(1));
      if (e.gridPower !== undefined) this.state.energy.gridPowerKw = Number((e.gridPower / 1000).toFixed(2));
      if (e.source) this.state.energy.source = e.source;

      // Calculate surplus
      const surplus = this.state.energy.solarPowerKw - this.state.energy.acPowerKw;
      this.state.energy.energySurplusKw = Number(surplus.toFixed(2));

      this.notify('energy');
    }

    // 3. Process System / Device Metadata
    if (packet.system || packet.deviceId) {
      const sys = packet.system || {};
      if (packet.deviceId) this.state.device.deviceId = packet.deviceId;
      if (sys.firmware) this.state.device.firmware = sys.firmware;
      if (sys.ip) this.state.device.ipAddress = sys.ip;
      if (sys.rssi !== undefined) this.state.device.wifiRssi = sys.rssi;
      if (sys.uptime !== undefined) this.state.device.uptimeSeconds = sys.uptime;
      if (sys.cooling) this.state.energy.compressorStatus = sys.cooling;
      this.state.device.lastSeen = new Date().toISOString();
      this.notify('device');
    }

    // Direct event dispatch for targeted DOM updaters
    this.notify('telemetry', { packet, source });
  }

  updateZoneSensorData(zoneId, zData, timeFormatted) {
    const zone = this.state.zones[zoneId];
    if (!zone) return;

    // Helper for sensor health and failure fallback
    const checkSensor = (sensorKey, rawVal, minLimit, maxLimit, unit) => {
      const health = zone.sensorHealth[sensorKey];
      const isNum = typeof rawVal === 'number' && !isNaN(rawVal);
      const inRange = isNum && rawVal >= minLimit && rawVal <= maxLimit;

      if (inRange) {
        health.status = 'ONLINE';
        health.lastValid = rawVal;
        health.lastTime = timeFormatted;
        zone[sensorKey === 'loadCell' ? 'currentWeight' : sensorKey] = rawVal;
      } else if (rawVal === null || rawVal === undefined || !inRange) {
        // Sensor failure detected
        health.status = 'OFFLINE';
      }
    };

    if (zData.temperature !== undefined) {
      checkSensor('temperature', zData.temperature, -15, 60, '°C');
    }
    if (zData.humidity !== undefined) {
      checkSensor('humidity', zData.humidity, 10, 100, '%');
    }
    if (zData.weight !== undefined) {
      checkSensor('weight', zData.weight, 0.1, 1000, 'kg');
    }
    if (zData.ethylene !== undefined) {
      checkSensor('ethylene', zData.ethylene, 0.0, 100.0, 'ppm');
    }

    if (zData.cooling) zone.coolingStatus = zData.cooling;
    if (zData.sensorStatus) zone.sensorStatus = zData.sensorStatus;

    // Calculate weight loss
    if (zone.initialWeight && zone.currentWeight) {
      zone.weightLoss = Number((zone.initialWeight - zone.currentWeight).toFixed(2));
      zone.weightLossPercent = Number(((zone.weightLoss / zone.initialWeight) * 100).toFixed(2));
    }

    zone.lastUpdated = new Date().toISOString();
    this.notify(`zones.${zoneId}`);
  }

  subscribe(key, callback) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key).add(callback);
    try {
      callback(this.get(key));
    } catch (e) {
      console.error(`State callback error for ${key}:`, e);
    }
    return () => this.listeners.get(key)?.delete(callback);
  }

  notify(key, extraData) {
    if (this.listeners.has(key)) {
      const val = extraData !== undefined ? extraData : this.get(key);
      this.listeners.get(key).forEach(cb => {
        try { cb(val); } catch (err) { console.error(`Error in listener ${key}:`, err); }
      });
    }
    if (this.listeners.has('*')) {
      this.listeners.get('*').forEach(cb => {
        try { cb(this.state); } catch (err) {}
      });
    }
  }

  get(key) {
    if (!key) return this.state;
    const parts = key.split('.');
    let curr = this.state;
    for (const part of parts) {
      if (curr === undefined || curr === null) return undefined;
      curr = curr[part];
    }
    return curr;
  }

  set(key, value) {
    const parts = key.split('.');
    let curr = this.state;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!curr[parts[i]]) curr[parts[i]] = {};
      curr = curr[parts[i]];
    }
    curr[parts[parts.length - 1]] = value;
    this.notify(key);
  }

  addAlert(alertData) {
    const newAlert = {
      id: `ALT-${Date.now()}`,
      timestamp: new Date().toISOString(),
      acknowledged: false,
      ...alertData
    };
    this.state.alerts.unshift(newAlert);
    if (this.state.alerts.length > 30) this.state.alerts.pop();
    this.notify('alerts');
    return newAlert;
  }

  acknowledgeAlert(alertId) {
    this.state.alerts = this.state.alerts.map(a => a.id === alertId ? { ...a, acknowledged: true } : a);
    this.notify('alerts');
  }
}

export const store = new GlobalStateStore();
window.AppState = store;
