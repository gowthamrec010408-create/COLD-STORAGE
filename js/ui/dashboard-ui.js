/**
 * QORA TECH — Three-Zone Solar Smart Cold Storage Dashboard UI
 * 
 * First Screen Layout Order:
 * 1. SYSTEM STATUS BAR (with explicit DEMO MODE / LIVE FIREBASE indicator)
 * 2. THREE-ZONE PHYSICAL STORAGE (Left: 2–8°C | Center: 0–2°C | Right: 8–15°C)
 * 3. HYBRID ENERGY OVERVIEW (Solar Generation, AC Consumption, Battery SoC & Balance)
 * 4. AI SPOILAGE & FRESHNESS SUMMARY
 * 5. REAL-TIME SYSTEM ALERTS
 * 6. RECENT PRODUCE BATCHES
 */

import { store } from '../core/state.js';
import { predictionEngine } from '../engine/prediction-engine.js';
import { ZONE_SPECS } from '../config/produce-profiles.js';

export class DashboardUI {
  constructor() {
    this.subscribed = false;
  }

  render() {
    const container = document.getElementById('view-dashboard');
    if (!container) return;

    const energy = store.get('energy');
    const device = store.get('device');
    const alerts = store.get('alerts') || [];
    const activeAlerts = alerts.filter(a => !a.acknowledged);
    const demoMode = store.get('DEMO_MODE');
    const batches = store.get('batches') || [];

    container.innerHTML = `
      <div class="dashboard-split-layout">
        <!-- ======================================================== -->
        <!-- LEFT SIDEBAR: FACILITY DETAILS, ENERGY & AI CONTROLS     -->
        <!-- ======================================================== -->
        <aside class="dashboard-details-left-col space-y-4">
          <!-- 1. System Unit & Status Card -->
          <div class="glass-card facility-status-card">
            <div class="flex justify-between items-center mb-3">
              <span class="qora-pill-brand">QORA TECH</span>
              <div class="status-pill ${demoMode ? 'pill-demo' : 'pill-live'}" id="toggle-demo-mode-badge" title="Click to toggle Demo Mode / Live Firebase">
                <span class="pulse-dot"></span>
                <span>${demoMode ? 'DEMO MODE' : 'LIVE FIREBASE'}</span>
              </div>
            </div>

            <h2 class="text-base font-black">Storage Unit #01</h2>
            <span class="text-2xs text-muted block uppercase font-bold tracking-wider">3-Zone Hybrid Solar Cold Chain</span>

            <div class="space-y-2 mt-4 pt-3 border-t border-glass text-xs">
              <div class="flex justify-between items-center">
                <span class="text-muted flex items-center gap-1.5"><i data-lucide="cpu" class="icon-xs text-emerald"></i> Controller</span>
                <span class="font-bold text-emerald">ESP32 ONLINE (12 Sensors)</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-muted flex items-center gap-1.5"><i data-lucide="snowflake" class="icon-xs text-cyan"></i> Compressor</span>
                <span class="font-bold text-cyan">ACTIVE (Zone 2 Chill)</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-muted flex items-center gap-1.5"><i data-lucide="zap-off" class="icon-xs text-muted"></i> Grid Dependency</span>
                <span class="font-bold text-emerald">0% (100% Off-Grid Solar)</span>
              </div>
            </div>

            ${activeAlerts.length > 0 ? `
              <div class="dashboard-alert-banner mt-4">
                <i data-lucide="alert-triangle" class="text-amber icon-xs"></i>
                <div class="flex-1 truncate">
                  <span class="font-bold text-2xs block text-amber">${activeAlerts.length} Active Alert</span>
                  <span class="text-2xs text-muted truncate">${activeAlerts[0].title}</span>
                </div>
                <a href="#prediction" class="alert-action-link text-2xs">Inspect &rarr;</a>
              </div>
            ` : ''}
          </div>

          <!-- 2. Hybrid Solar & Power Flow Card -->
          <div class="glass-card energy-details-card">
            <div class="flex justify-between items-center mb-3">
              <h3 class="font-bold text-sm flex items-center gap-1.5">
                <i data-lucide="zap" class="text-amber icon-xs"></i> Hybrid Power Balance
              </h3>
              <a href="#energy" class="text-2xs text-cyan font-bold hover:underline">Analytics &rarr;</a>
            </div>

            <div class="grid grid-cols-2 gap-2 text-center mb-3">
              <div class="p-2.5 bg-card-dark rounded-lg border border-glass">
                <span class="text-3xs text-muted font-bold block uppercase">Solar Array</span>
                <span class="text-lg font-black text-amber">${energy.solarPowerKw.toFixed(2)} kW</span>
                <span class="text-3xs text-muted block mt-0.5">${energy.solarDailyKWh} kWh/day</span>
              </div>
              <div class="p-2.5 bg-card-dark rounded-lg border border-glass">
                <span class="text-3xs text-muted font-bold block uppercase">AC Load</span>
                <span class="text-lg font-black text-cyan">${energy.acPowerKw.toFixed(2)} kW</span>
                <span class="text-3xs text-muted block mt-0.5">${energy.acDailyKWh} kWh/day</span>
              </div>
            </div>

            <div class="p-2.5 bg-card-dark rounded-lg border border-glass space-y-1.5 text-xs">
              <div class="flex justify-between items-center">
                <span class="text-muted">Net Surplus / Deficit:</span>
                <span class="font-black ${energy.energySurplusKw >= 0 ? 'text-emerald' : 'text-rose'}">
                  ${energy.energySurplusKw >= 0 ? '+' : ''}${energy.energySurplusKw.toFixed(2)} kW
                </span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-muted">Battery Storage:</span>
                <span class="font-black text-emerald">${energy.batterySoc}% (${energy.batteryVoltageV}V)</span>
              </div>
              <div class="progress-bar-bg mt-1">
                <div class="progress-bar-fill bg-emerald" style="width: ${energy.batterySoc}%"></div>
              </div>
              <div class="flex justify-between text-3xs text-muted pt-1">
                <span>Status: <b>${energy.batteryChargingStatus}</b></span>
                <span>Est. Backup: <b>${energy.backupTimeText}</b></span>
              </div>
            </div>
          </div>

          <!-- 3. AI Spoilage & Freshness Summary Card -->
          <div class="glass-card ai-summary-card">
            <div class="flex justify-between items-center mb-3">
              <h3 class="font-bold text-sm flex items-center gap-1.5">
                <i data-lucide="sparkles" class="text-emerald icon-xs"></i> AI Spoilage Intelligence
              </h3>
              <a href="#prediction" class="text-2xs text-emerald font-bold hover:underline">AI Studio &rarr;</a>
            </div>

            <div class="grid grid-cols-3 gap-2 text-center mb-3">
              <div class="p-2 bg-card-dark rounded-lg">
                <span class="text-3xs text-muted font-bold block">AVG SCORE</span>
                <span class="text-lg font-black text-emerald">88%</span>
              </div>
              <div class="p-2 bg-card-dark rounded-lg">
                <span class="text-3xs text-muted font-bold block">RISK</span>
                <span class="text-lg font-black text-amber">LOW-MED</span>
              </div>
              <div class="p-2 bg-card-dark rounded-lg">
                <span class="text-3xs text-muted font-bold block">SELLING</span>
                <span class="text-lg font-black text-rose">URGENT</span>
              </div>
            </div>

            <div class="p-2.5 bg-card-dark rounded-lg border border-glass text-xs space-y-1">
              <span class="text-3xs font-bold text-muted uppercase block">AI Selling Action:</span>
              <span class="font-bold text-amber block">Prioritize Zone 3 Bhut Jolokia</span>
              <span class="text-2xs text-muted block">Ethylene rising +12.5%. Dispatch within 48h for peak market price.</span>
            </div>
          </div>

          <!-- 4. Quick Action Buttons -->
          <div class="glass-card quick-actions-card space-y-2">
            <span class="text-3xs text-muted font-bold uppercase block tracking-wider mb-2">Facility Quick Actions</span>
            <a href="#produce" class="btn btn-sm btn-primary w-full flex items-center justify-center gap-2">
              <i data-lucide="package-plus" class="icon-xs"></i> Manage Stored Batches
            </a>
            <div class="grid grid-cols-2 gap-2">
              <a href="#smart-selling" class="btn btn-xs btn-outline flex items-center justify-center gap-1">
                <i data-lucide="trending-up" class="icon-xs text-amber"></i> Smart Selling
              </a>
              <a href="#calibration" class="btn btn-xs btn-outline flex items-center justify-center gap-1">
                <i data-lucide="sliders" class="icon-xs text-cyan"></i> Calibration
              </a>
            </div>
          </div>
        </aside>

        <!-- ======================================================== -->
        <!-- RIGHT MAIN: 3 PHYSICAL COMPARTMENTS & LIVE TELEMETRY     -->
        <!-- ======================================================== -->
        <main class="dashboard-main-right-col space-y-6">
          <!-- Section Header -->
          <div class="zone-section-header glass-card flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 p-4">
            <div>
              <span class="section-tag">PHYSICAL THREE-COMPARTMENT ARRANGEMENT</span>
              <h2 class="text-lg font-bold">Independent Environmental & Mass Transpiration Monitoring</h2>
            </div>
            <span class="text-xs text-muted font-semibold bg-card-dark px-3 py-1.5 rounded-lg border border-glass">
              Left (2–8°C) • Center (0–2°C Coldest) • Right (8–15°C)
            </span>
          </div>

          <!-- Three Physical Storage Zone Cards Grid -->
          <div class="three-zones-physical-grid">
            ${[1, 2, 3].map(zId => this.renderZoneCard(zId)).join('')}
          </div>

          <!-- Active Stored Batches Matrix -->
          <div class="glass-card active-batches-matrix">
            <div class="flex justify-between items-center mb-4">
              <div>
                <h3 class="font-bold text-base flex items-center gap-2">
                  <i data-lucide="package" class="text-cyan"></i> Active Northeast Produce Batches in Storage (${batches.length})
                </h3>
                <p class="text-xs text-muted">Continuous real-time load-cell weight tracking and storage duration monitoring.</p>
              </div>
              <a href="#produce" class="btn btn-xs btn-primary">+ Add New Batch</a>
            </div>

            <div class="overflow-x-auto">
              <table class="data-table w-full text-xs">
                <thead>
                  <tr>
                    <th>Crop & Variety</th>
                    <th>Storage Zone</th>
                    <th>Current Weight</th>
                    <th>Transpiration Loss</th>
                    <th>Storage Date</th>
                    <th>Freshness Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${batches.map(b => {
                    return `
                      <tr>
                        <td>
                          <span class="font-bold block">${b.name}</span>
                          <span class="text-muted text-2xs">${b.variety} • ${b.farmer}</span>
                        </td>
                        <td>
                          <span class="badge zone-tag-${b.zoneId}">Zone ${b.zoneId} (${ZONE_SPECS[b.zoneId]?.compartment.split(' ')[0]})</span>
                        </td>
                        <td class="font-mono font-bold">${b.currentWeight} kg</td>
                        <td class="text-rose font-medium">-${(b.initialWeight - b.currentWeight).toFixed(1)} kg (${(((b.initialWeight - b.currentWeight)/b.initialWeight)*100).toFixed(1)}%)</td>
                        <td class="text-muted font-mono">${b.dateStored}</td>
                        <td>
                          <span class="badge ${b.zoneId === 3 ? 'badge-warning' : 'badge-normal'}">
                            ${b.zoneId === 3 ? 'Ethylene Surge' : 'Optimal Chill'}
                          </span>
                        </td>
                        <td>
                          <a href="#smart-selling" class="btn btn-2xs btn-outline">Analyze &rarr;</a>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    `;

    this.bindEvents();
    if (!this.subscribed) {
      this.subscribeStateUpdates();
      this.subscribed = true;
    }
    if (window.lucide) window.lucide.createIcons();
  }

  renderZoneCard(zoneId) {
    const zone = store.get(`zones.${zoneId}`);
    const spec = ZONE_SPECS[zoneId];
    if (!zone || !spec) return '';

    const prediction = predictionEngine.predict({
      produceType: zone.crop,
      cropId: zone.cropId,
      variety: zone.variety,
      zone: zoneId,
      currentTemp: zone.temperature,
      currentHumidity: zone.humidity,
      initialWeight: zone.initialWeight,
      currentWeight: zone.currentWeight,
      ethylene: zone.ethylene,
      ethyleneTrendRate: zone.ethyleneTrend,
      storageDurationDays: 5
    });

    const tempStatusClass = zone.tempStatus === 'NORMAL' ? 'badge-normal' :
                            zone.tempStatus.includes('WARNING') ? 'badge-warning' : 'badge-critical';

    const ethStatusClass = zone.ethyleneStatus === 'NORMAL' ? 'badge-normal' :
                           zone.ethyleneStatus === 'ETHYLENE RISING' ? 'badge-warning' : 'badge-critical';

    const weightRiskClass = zone.weightLossRisk === 'LOW' ? 'badge-normal' :
                            zone.weightLossRisk === 'MEDIUM' ? 'badge-warning' : 'badge-critical';

    const freshScore = prediction.freshnessScore;
    const freshColor = freshScore >= 80 ? '#10b981' : freshScore >= 60 ? '#f59e0b' : '#f43f5e';

    return `
      <div class="zone-physical-card glass-card zone-${zoneId}-border" id="zone-card-${zoneId}">
        <!-- Physical Compartment Header -->
        <div class="zone-compartment-head">
          <div>
            <span class="zone-location-tag">${spec.compartment}</span>
            <h3 class="zone-title-main">${spec.name}</h3>
            <span class="zone-crop-active font-semibold text-xs text-muted">${zone.crop} (${zone.variety})</span>
          </div>
          <div class="text-right">
            <span class="target-corridor-title text-2xs text-muted uppercase block">Target Range</span>
            <span class="target-corridor-val font-black text-sm text-emerald">${spec.tempTargetMin}–${spec.tempTargetMax}°C</span>
          </div>
        </div>

        <!-- 4 Core Independent Sensors Grid -->
        <div class="zone-sensors-quad my-3">
          <!-- 1. Independent Temperature -->
          <div class="sensor-mini-box">
            <div class="flex justify-between items-center text-2xs text-muted mb-1">
              <span><i data-lucide="thermometer" class="icon-2xs text-emerald inline"></i> Temp</span>
              <span class="badge ${tempStatusClass} text-2xs">${zone.tempStatus}</span>
            </div>
            <div class="sensor-val-line">
              <span class="text-xl font-black">${zone.temperature.toFixed(1)}</span>
              <span class="text-xs text-muted">°C</span>
            </div>
            <div class="text-2xs text-dim">Min: ${zone.tempMin}°C • Max: ${zone.tempMax}°C</div>
          </div>

          <!-- 2. Independent Humidity -->
          <div class="sensor-mini-box">
            <div class="flex justify-between items-center text-2xs text-muted mb-1">
              <span><i data-lucide="droplets" class="icon-2xs text-cyan inline"></i> RH</span>
              <span class="badge ${zone.humidityStatus === 'NORMAL' ? 'badge-normal' : 'badge-warning'} text-2xs">${zone.humidityStatus}</span>
            </div>
            <div class="sensor-val-line">
              <span class="text-xl font-black">${zone.humidity.toFixed(1)}</span>
              <span class="text-xs text-muted">%</span>
            </div>
            <div class="text-2xs text-dim">Target: ${spec.humidityTargetMin}–${spec.humidityTargetMax}%</div>
          </div>

          <!-- 3. Independent HX711 Load Cell -->
          <div class="sensor-mini-box">
            <div class="flex justify-between items-center text-2xs text-muted mb-1">
              <span><i data-lucide="scale" class="icon-2xs text-amber inline"></i> HX711 Mass</span>
              <span class="badge ${weightRiskClass} text-2xs">${zone.weightLossRisk} RISK</span>
            </div>
            <div class="sensor-val-line">
              <span class="text-xl font-black">${zone.currentWeight.toFixed(1)}</span>
              <span class="text-xs text-muted">kg</span>
            </div>
            <div class="text-2xs text-rose font-medium">-${zone.weightLoss} kg (${zone.weightLossPercent}%)</div>
          </div>

          <!-- 4. Independent Ethylene Gas -->
          <div class="sensor-mini-box">
            <div class="flex justify-between items-center text-2xs text-muted mb-1">
              <span><i data-lucide="wind" class="icon-2xs text-purple inline"></i> Ethylene</span>
              <span class="badge ${ethStatusClass} text-2xs">${zone.ethyleneStatus}</span>
            </div>
            <div class="sensor-val-line">
              <span class="text-xl font-black">${zone.ethylene.toFixed(2)}</span>
              <span class="text-xs text-muted">ppm</span>
            </div>
            <div class="text-2xs text-dim">Trend: ↑ ${zone.ethyleneTrend}%</div>
          </div>
        </div>

        <!-- AI Freshness & Status Bottom Bar -->
        <div class="zone-card-bottom-bar flex justify-between items-center pt-3 border-t border-glass text-xs">
          <div class="flex items-center gap-2">
            <div class="ai-donut-micro" style="background: conic-gradient(${freshColor} ${freshScore * 3.6}deg, rgba(255,255,255,0.08) 0deg);">
              <span class="ai-donut-num">${freshScore}%</span>
            </div>
            <div>
              <span class="text-2xs text-muted block font-bold">FRESHNESS SCORE</span>
              <span class="font-bold ${prediction.spoilageRisk === 'LOW' ? 'text-emerald' : prediction.spoilageRisk === 'MEDIUM' ? 'text-amber' : 'text-rose'}">${prediction.spoilageRisk} RISK</span>
            </div>
          </div>

          <div class="text-right">
            <span class="text-2xs text-muted block">SHELF LIFE</span>
            <span class="font-black text-cyan text-sm">${prediction.remainingShelfLifeText}</span>
          </div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    // DEMO_MODE toggle badge
    document.getElementById('toggle-demo-mode-badge')?.addEventListener('click', () => {
      const current = store.get('DEMO_MODE');
      store.set('DEMO_MODE', !current);
      alert(`Switched to: ${!current ? 'DEMO MODE (Simulated Telemetry)' : 'LIVE FIREBASE MODE'}`);
      this.render();
    });
  }

  subscribeStateUpdates() {
    store.subscribe('zones', () => {
      if (window.location.hash === '#dashboard' || window.location.hash === '') {
        this.render();
      }
    });
    store.subscribe('energy', () => {
      if (window.location.hash === '#dashboard' || window.location.hash === '') {
        this.render();
      }
    });
  }
}

export const dashboardUI = new DashboardUI();
