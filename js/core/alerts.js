/**
 * Solar Smart Cold Storage — Alerts & Real-time Notification Engine
 * Monitors multi-zone thresholds, hardware health, and AI prediction warnings.
 * Generates visual toast notifications, persistent event logs, and synthesized audio cues.
 */

import { store } from './state.js';
import { ZONE_SPECS } from '../config/produce-profiles.js';

export class AlertEngine {
  constructor() {
    this.audioCtx = null;
    this.lastTriggerTimes = new Map();
    this.initAudio();
  }

  initAudio() {
    // Lazy initialize Web Audio API on first user interaction
    const initCtx = () => {
      if (!this.audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          this.audioCtx = new AudioContext();
        }
      }
      window.removeEventListener('click', initCtx);
    };
    window.addEventListener('click', initCtx);
  }

  playBeep(type = 'warning') {
    if (!this.audioCtx) return;
    try {
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      if (type === 'critical') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, this.audioCtx.currentTime); // A5
        osc.frequency.setValueAtTime(440, this.audioCtx.currentTime + 0.15); // A4
        gain.gain.setValueAtTime(0.2, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.4);
        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.4);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, this.audioCtx.currentTime); // D5
        gain.gain.setValueAtTime(0.15, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.25);
        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.25);
      }
    } catch (e) {
      console.warn('Audio alert cue muted:', e);
    }
  }

  /**
   * Evaluate telemetry for Zone 1, 2, 3 against safety bounds
   */
  evaluateZone(zoneId, zoneData) {
    const spec = ZONE_SPECS[zoneId];
    if (!spec || !zoneData) return;

    const now = Date.now();
    const rateLimit = (alertKey, cooldownSec = 120) => {
      const last = this.lastTriggerTimes.get(alertKey) || 0;
      if (now - last > cooldownSec * 1000) {
        this.lastTriggerTimes.set(alertKey, now);
        return true;
      }
      return false;
    };

    // 1. Temperature Bounds Check
    const temp = zoneData.temperature;
    if (temp !== undefined && temp !== null && !isNaN(temp)) {
      if (temp > spec.tempSafeMax && rateLimit(`temp_high_z${zoneId}`, 180)) {
        this.dispatch({
          zoneId,
          level: 'CRITICAL',
          type: 'TEMP_HIGH',
          title: `Zone ${zoneId}: Critical High Temperature`,
          message: `Temperature has climbed to ${temp.toFixed(1)}°C (Safe Max: ${spec.tempSafeMax}°C). Check cooling system.`
        });
      } else if (temp < spec.tempSafeMin && rateLimit(`temp_low_z${zoneId}`, 180)) {
        this.dispatch({
          zoneId,
          level: 'CRITICAL',
          type: 'TEMP_LOW',
          title: `Zone ${zoneId}: Chilling Risk (Low Temp)`,
          message: `Temperature dropped to ${temp.toFixed(1)}°C (Safe Min: ${spec.tempSafeMin}°C). Potential frost/chilling injury.`
        });
      }
    }

    // 2. Humidity Bounds Check
    const hum = zoneData.humidity;
    if (hum !== undefined && !isNaN(hum)) {
      if (hum < (spec.humidityTargetMin - 10) && rateLimit(`hum_low_z${zoneId}`, 300)) {
        this.dispatch({
          zoneId,
          level: 'WARNING',
          type: 'HUMIDITY_LOW',
          title: `Zone ${zoneId}: Low Humidity Warning`,
          message: `Humidity dropped to ${hum.toFixed(1)}%RH. Risk of produce dehydration and weight loss.`
        });
      }
    }

    // 3. Ethylene Gas Bounds Check
    const eth = zoneData.ethylene;
    if (eth !== undefined && !isNaN(eth)) {
      if (eth >= 1.0 && rateLimit(`eth_crit_z${zoneId}`, 120)) {
        this.dispatch({
          zoneId,
          level: 'CRITICAL',
          type: 'ETHYLENE_HIGH',
          title: `Zone ${zoneId}: High Ethylene Gas Detected`,
          message: `Ethylene reached ${eth.toFixed(2)} ppm. Severe risk of accelerated senescence. Ventilate immediately.`
        });
      } else if (zoneData.ethyleneTrend > 25 && rateLimit(`eth_rise_z${zoneId}`, 180)) {
        this.dispatch({
          zoneId,
          level: 'WARNING',
          type: 'ETHYLENE_RISING',
          title: `Zone ${zoneId}: Ethylene Rising Rapidly`,
          message: `Ethylene trend is +${zoneData.ethyleneTrend.toFixed(1)}%. Inspect ripe batches.`
        });
      }
    }

    // 4. Weight Loss Check
    if (zoneData.weightLossPercent >= 5.5 && rateLimit(`weight_loss_z${zoneId}`, 300)) {
      this.dispatch({
        zoneId,
        level: 'WARNING',
        type: 'WEIGHT_LOSS_HIGH',
        title: `Zone ${zoneId}: Elevated Weight Loss (${zoneData.weightLossPercent}%)`,
        message: `Produce has lost ${zoneData.weightLoss} kg. Check moisture retention and seal.`
      });
    }

    // 5. Hardware Sensor Health Check
    if (zoneData.sensorHealth) {
      Object.entries(zoneData.sensorHealth).forEach(([sensorName, status]) => {
        if (status === 'OFFLINE' && rateLimit(`hw_offline_${sensorName}_z${zoneId}`, 300)) {
          this.dispatch({
            zoneId,
            level: 'CRITICAL',
            type: 'HARDWARE_OFFLINE',
            title: `Zone ${zoneId}: ${sensorName.toUpperCase()} Sensor Disconnected`,
            message: `Hardware signal lost from ${sensorName} probe. Fallback control active.`
          });
        }
      });
    }
  }

  /**
   * Dispatch alert to store and show UI toast
   */
  dispatch(alertData) {
    const alert = store.addAlert(alertData);
    this.playBeep(alertData.level === 'CRITICAL' ? 'critical' : 'warning');
    this.showToast(alert);
  }

  /**
   * Render transient toast banner in DOM
   */
  showToast(alert) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${alert.level.toLowerCase()} animate-slide-in`;
    toast.innerHTML = `
      <div class="toast-icon">
        <i data-lucide="${alert.level === 'CRITICAL' ? 'alert-triangle' : 'alert-circle'}"></i>
      </div>
      <div class="toast-content">
        <div class="toast-title">${alert.title}</div>
        <div class="toast-message">${alert.message}</div>
      </div>
      <button class="toast-close" aria-label="Close alert">&times;</button>
    `;

    toast.querySelector('.toast-close').onclick = () => toast.remove();

    container.appendChild(toast);
    if (window.lucide) window.lucide.createIcons();

    setTimeout(() => {
      if (toast.parentNode) {
        toast.classList.add('animate-fade-out');
        setTimeout(() => toast.remove(), 300);
      }
    }, 7000);
  }
}

export const alertEngine = new AlertEngine();
