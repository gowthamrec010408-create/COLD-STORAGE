/**
 * Solar Smart Cold Storage — Virtual ESP32 Hardware & IoT Simulator
 * Simulates physical micro-controllers, multi-zone sensors, and solar power fluctuations.
 * Includes interactive stress-test scenarios for demonstration and testing.
 */

import { store } from '../core/state.js';
import { alertEngine } from '../core/alerts.js';

export class IoTDeviceSimulator {
  constructor() {
    this.timer = null;
    this.tickCount = 0;
  }

  start(intervalMs = 3000) {
    if (this.timer) clearInterval(this.timer);
    store.set('simulator.active', true);
    store.set('simulator.intervalMs', intervalMs);

    this.timer = setInterval(() => this.tick(), intervalMs);
    console.log(`🤖 Virtual ESP32 Simulator started (${intervalMs}ms interval).`);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    store.set('simulator.active', false);
    console.log('🛑 Virtual ESP32 Simulator stopped.');
  }

  setScenario(scenarioName) {
    store.set('simulator.scenario', scenarioName);
    console.log(`🧪 Simulator Scenario switched to: [${scenarioName.toUpperCase()}]`);
  }

  tick() {
    this.tickCount++;
    const scenario = store.get('simulator.scenario') || 'normal';
    const now = new Date();

    // 1. Simulate Solar & Power telemetry
    this.simulateEnergy(scenario);

    // 2. Simulate Zones 1, 2, 3
    [1, 2, 3].forEach(zoneId => {
      this.simulateZone(zoneId, scenario);
    });

    // 3. Heartbeat for ESP32
    store.set('device.lastSeen', now.toISOString());
    store.set('device.wifiRssi', -55 + Math.round((Math.random() - 0.5) * 6));
    store.set('device.freeHeapBytes', 184000 + Math.round((Math.random() - 0.5) * 2000));
  }

  simulateEnergy(scenario) {
    const energy = store.get('energy') || {};
    let solarKw = energy.solarPowerKw || 3.85;
    let batterySoc = energy.batterySoc !== undefined ? energy.batterySoc : 78;
    let voltage = energy.batteryVoltageV || 52.4;
    let acKw = energy.acPowerKw || 2.10;

    if (scenario === 'solar_drop') {
      solarKw = Math.max(0.45, Number((solarKw - 0.2).toFixed(2)));
      batterySoc = Math.max(22, Number((batterySoc - 0.2).toFixed(1)));
      voltage = Number((48.0 + (batterySoc * 0.05)).toFixed(1));
    } else {
      solarKw = Math.min(4.8, Math.max(2.8, Number((solarKw + (Math.random() - 0.5) * 0.08).toFixed(2))));
      batterySoc = Math.min(98, Number((batterySoc + (solarKw > acKw ? 0.05 : -0.05)).toFixed(1)));
      voltage = Number((50.5 + (batterySoc * 0.024)).toFixed(1));
    }
    const surplus = Number((solarKw - acKw - 0.35).toFixed(2));

    store.set('energy', {
      ...energy,
      solarPowerKw: solarKw,
      solarPowerW: Math.round(solarKw * 1000),
      batterySoc: batterySoc,
      batteryPercent: batterySoc,
      batteryVoltageV: voltage,
      acPowerKw: acKw,
      energySurplusKw: surplus,
      batteryChargingStatus: surplus > 0 ? 'CHARGING' : 'DISCHARGING'
    });
  }

  simulateZone(zoneId, scenario) {
    const zone = store.get(`zones.${zoneId}`);
    if (!zone) return;

    let temp = zone.temperature;
    let hum = zone.humidity;
    let weight = zone.currentWeight;
    let eth = zone.ethylene;
    let ethTrend = zone.ethyleneTrend;
    let weightLossTrend = zone.weightLossTrend;

    // Normal natural micro-noise
    const tempNoise = (Math.random() - 0.5) * 0.08;
    const humNoise = (Math.random() - 0.5) * 0.2;
    const ethNoise = (Math.random() - 0.5) * 0.005;

    temp = Number((temp + tempNoise).toFixed(1));
    hum = Number(Math.min(98, Math.max(70, hum + humNoise)).toFixed(1));
    eth = Number(Math.max(0.02, eth + ethNoise).toFixed(3));

    // SCENARIO SPECIFIC MODIFIERS:
    if (scenario === 'temp_spike' && zoneId === 1) {
      // Temperature climbs in Zone 1
      temp = Number((temp + 0.35).toFixed(1));
      if (temp > 14.5) {
        zone.tempStatus = 'CRITICAL';
      } else if (temp > 13.0) {
        zone.tempStatus = 'WARNING';
      }
    } else if (scenario === 'temp_spike' && zoneId === 2) {
      temp = Number((temp + 0.25).toFixed(1));
    }

    if (scenario === 'ethylene_surge' && zoneId === 3) {
      // Zone 3 Green Beans / Mixed produce starts rapid ethylene production
      eth = Number((eth + 0.06).toFixed(3));
      ethTrend = Number((ethTrend + 4.5).toFixed(1));
      zone.ethyleneStatus = eth > 1.0 ? 'HIGH RIPENING RISK' : 'ETHYLENE RISING';
    }

    if (scenario === 'rapid_loss' && zoneId === 1) {
      // Rapid weight loss due to humidity drop
      weight = Number((weight - 0.4).toFixed(2));
      hum = Number(Math.max(65, hum - 1.2).toFixed(1));
      weightLossTrend = 'ABNORMAL LOSS';
    } else {
      // Gradual natural biological transpiration
      if (this.tickCount % 8 === 0) {
        weight = Number((weight - 0.01).toFixed(2));
      }
    }

    // Min / Max tracking
    const tempMin = Math.min(zone.tempMin || temp, temp);
    const tempMax = Math.max(zone.tempMax || temp, temp);
    const humMin = Math.min(zone.humidityMin || hum, hum);
    const humMax = Math.max(zone.humidityMax || hum, hum);
    const ethMin = Math.min(zone.ethyleneMin || eth, eth);
    const ethMax = Math.max(zone.ethyleneMax || eth, eth);

    const updatedData = {
      ...zone,
      temperature: temp,
      tempMin,
      tempMax,
      humidity: hum,
      humidityMin: humMin,
      humidityMax: humMax,
      currentWeight: weight,
      ethylene: eth,
      ethyleneMin: ethMin,
      ethyleneMax: ethMax,
      ethyleneTrend: ethTrend,
      weightLossTrend,
      lastUpdated: new Date().toISOString()
    };

    store.updateZoneTelemetry(zoneId, updatedData);
    alertEngine.evaluateZone(zoneId, updatedData);
  }
}

export const simulator = new IoTDeviceSimulator();
