/**
 * Solar Smart Cold Storage — Device Health & Hardware Diagnostics UI
 * Real-time hardware status of ESP32 micro-controller, WiFi RSSI,
 * sensor probe continuity, and interactive hardware simulator controls.
 */

import { store } from '../core/state.js';
import { simulator } from '../services/simulator.js';

export class DevicesUI {
  render() {
    const container = document.getElementById('view-devices');
    if (!container) return;

    const device = store.get('device');
    const sim = store.get('simulator');
    const zones = [1, 2, 3].map(id => store.get(`zones.${id}`));

    container.innerHTML = `
      <!-- Header -->
      <div class="devices-header glass-card mb-6">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div class="flex items-center gap-2">
              <span class="badge badge-emerald"><i data-lucide="cpu" class="icon-sm"></i> HARDWARE ARCHITECTURE</span>
              <span class="text-xs text-muted">ESP32 Dual-Core • FreeRTOS Firmware</span>
            </div>
            <h2 class="text-2xl font-bold mt-1">ESP32 Controller & Sensor Diagnostics</h2>
            <p class="text-sm text-muted">Physical telemetry pipeline, wireless signal integrity, and hardware loop latency.</p>
          </div>

          <!-- Simulator Quick Trigger -->
          <div class="flex items-center gap-3">
            <span class="badge ${sim.active ? 'badge-normal' : 'badge-neutral'}">
              <span class="pulse-dot"></span> Simulator: ${sim.active ? 'RUNNING' : 'STOPPED'}
            </span>
            <button class="btn btn-sm ${sim.active ? 'btn-outline' : 'btn-primary'}" id="toggle-sim-btn">
              <i data-lucide="${sim.active ? 'pause' : 'play'}"></i> ${sim.active ? 'Pause Simulator' : 'Start Simulator'}
            </button>
          </div>
        </div>
      </div>

      <!-- Core Hardware Status Grid -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div class="glass-card stat-card">
          <span class="stat-label">DEVICE IDENTIFIER</span>
          <div class="stat-number text-base font-mono mt-1 text-emerald">${device.deviceId}</div>
          <span class="stat-sub text-muted font-mono">Firmware: ${device.firmwareVersion}</span>
        </div>

        <div class="glass-card stat-card">
          <span class="stat-label">HEARTBEAT & LATENCY</span>
          <div class="stat-number text-lg mt-1 text-cyan">${device.firebaseLatencyMs} <span class="text-xs font-normal">ms</span></div>
          <span class="stat-sub text-muted">Last seen: ${new Date(device.lastSeen).toLocaleTimeString()}</span>
        </div>

        <div class="glass-card stat-card">
          <span class="stat-label">WI-FI RSSI SIGNAL</span>
          <div class="stat-number text-lg mt-1 text-amber">${device.wifiRssi} <span class="text-xs font-normal">dBm</span></div>
          <span class="stat-sub text-emerald">SSID: ${device.wifiSsid}</span>
        </div>

        <div class="glass-card stat-card">
          <span class="stat-label">FREE HEAP MEMORY</span>
          <div class="stat-number text-lg mt-1">${Math.round(device.freeHeapBytes / 1024)} <span class="text-xs font-normal">KB</span></div>
          <span class="stat-sub text-muted">Loop time: ${device.loopTimeMs} ms</span>
        </div>
      </div>

      <!-- Zone Probes Continuity Matrix -->
      <div class="glass-card mb-8">
        <h3 class="font-bold text-lg flex items-center gap-2 mb-4">
          <i data-lucide="activity" class="text-emerald"></i> Physical Sensor Probes Continuity (12 Probes)
        </h3>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          ${zones.map(z => `
            <div class="zone-hw-box p-4 bg-card-dark rounded-xl border border-glass">
              <div class="flex justify-between items-center mb-3">
                <span class="badge zone-tag-${z.id}">ZONE ${z.id} PROBES</span>
                <span class="text-xs text-emerald font-bold">ALL HEALTHY</span>
              </div>
              <div class="space-y-2 text-xs">
                <div class="flex justify-between p-2 bg-glass rounded">
                  <span>Temperature (SHT31 I²C)</span>
                  <span class="badge badge-normal font-bold">ONLINE</span>
                </div>
                <div class="flex justify-between p-2 bg-glass rounded">
                  <span>Humidity (SHT31 I²C)</span>
                  <span class="badge badge-normal font-bold">ONLINE</span>
                </div>
                <div class="flex justify-between p-2 bg-glass rounded">
                  <span>HX711 Load Cell (GPIO 32/33)</span>
                  <span class="badge badge-normal font-bold">ONLINE</span>
                </div>
                <div class="flex justify-between p-2 bg-glass rounded">
                  <span>Ethylene Gas Sensor (ADC / UART)</span>
                  <span class="badge badge-normal font-bold">ONLINE</span>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Hardware Anomaly Stress Simulator Card -->
      <div class="glass-card">
        <div class="flex justify-between items-center mb-4">
          <div>
            <h3 class="font-bold text-lg flex items-center gap-2">
              <i data-lucide="flask-conical" class="text-cyan"></i> Virtual IoT Hardware Anomaly Injector
            </h3>
            <p class="text-xs text-muted">Test system resilience, real-time alert dispatching, and AI spoilage degradation live.</p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-5 gap-3">
          <button class="sim-scenario-btn btn btn-outline ${sim.scenario === 'normal' ? 'active-scenario' : ''}" data-scenario="normal">
            <i data-lucide="check-circle" class="text-emerald"></i> Normal Operation
          </button>
          <button class="sim-scenario-btn btn btn-outline ${sim.scenario === 'solar_drop' ? 'active-scenario' : ''}" data-scenario="solar_drop">
            <i data-lucide="cloud-rain" class="text-amber"></i> Solar PV Drop
          </button>
          <button class="sim-scenario-btn btn btn-outline ${sim.scenario === 'ethylene_surge' ? 'active-scenario' : ''}" data-scenario="ethylene_surge">
            <i data-lucide="wind" class="text-purple"></i> Ethylene Gas Surge
          </button>
          <button class="sim-scenario-btn btn btn-outline ${sim.scenario === 'temp_spike' ? 'active-scenario' : ''}" data-scenario="temp_spike">
            <i data-lucide="flame" class="text-rose"></i> Compressor Thermal Spike
          </button>
          <button class="sim-scenario-btn btn btn-outline ${sim.scenario === 'rapid_loss' ? 'active-scenario' : ''}" data-scenario="rapid_loss">
            <i data-lucide="scale" class="text-rose"></i> Rapid Weight Loss
          </button>
        </div>
      </div>
    `;

    this.bindEvents();
    if (window.lucide) window.lucide.createIcons();
  }

  bindEvents() {
    document.getElementById('toggle-sim-btn')?.addEventListener('click', () => {
      const active = store.get('simulator.active');
      if (active) {
        simulator.stop();
      } else {
        simulator.start(2500);
      }
      this.render();
    });

    document.querySelectorAll('.sim-scenario-btn').forEach(btn => {
      btn.onclick = () => {
        const scenario = btn.getAttribute('data-scenario');
        if (!store.get('simulator.active')) {
          simulator.start(2500);
        }
        simulator.setScenario(scenario);
        this.render();
      };
    });
  }
}

export const devicesUI = new DevicesUI();
