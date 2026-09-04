/**
 * QORA TECH — Zones Page Controller
 * Deep Dive into 3 Physical Storage Compartments:
 * Zone 1 (Left 2–8°C), Zone 2 (Center 0–2°C), Zone 3 (Right 8–15°C)
 */

import { setupNavigation } from './navigation.js';
import { store } from './core/state.js';
import { predictionEngine } from './engine/prediction-engine.js';
import { ZONE_SPECS } from './config/produce-profiles.js';
import { initializeFirebase } from './config/firebase-config.js';
import { fbService } from './services/firebase-service.js';

class ZonesPage {
  async init() {
    setupNavigation('zones');
    await initializeFirebase();
    await fbService.startRealtimeListeners();

    this.render();
    store.subscribe('zones.1', () => this.render());
    store.subscribe('zones.2', () => this.render());
    store.subscribe('zones.3', () => this.render());
  }

  render() {
    const container = document.getElementById('zones-content');
    if (!container) return;

    container.innerHTML = `
      <!-- Header -->
      <div class="glass-card mb-6">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div class="flex items-center gap-2">
              <span class="qora-pill-brand">QORA TECH</span>
              <span class="badge badge-cyan"><i data-lucide="layers" class="icon-sm"></i> 3-ZONE COMPARTMENTS</span>
            </div>
            <h1 class="text-2xl font-bold mt-1">Multi-Zone Environmental Monitoring</h1>
            <p class="text-xs text-muted">Deep dive into independent temperature corridors, humidity levels, continuous weight loss, and ethylene.</p>
          </div>

          <a href="dashboard.html" class="btn btn-outline btn-sm">
            <i data-lucide="arrow-left"></i> Back to Dashboard
          </a>
        </div>
      </div>

      <!-- 3 Compartments Detailed Cards -->
      <div class="three-zones-physical-grid mb-8">
        ${[1, 2, 3].map(id => this.renderDetailedZoneCard(id)).join('')}
      </div>

      <!-- Micro-Climate Technical Specifications Table -->
      <div class="glass-card">
        <h3 class="font-bold text-base flex items-center gap-2 mb-4">
          <i data-lucide="info" class="text-cyan"></i> Compartment Specifications & Crop Compatibility
        </h3>

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Zone Compartment</th>
                <th>Target Temperature</th>
                <th>Target Humidity</th>
                <th>Active Produce</th>
                <th>Chilling Sensitivity Protection</th>
                <th>Recommended Northeast Crops</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><span class="badge zone-tag-1">ZONE 1 (LEFT)</span></td>
                <td class="font-bold text-emerald">2.0°C – 8.0°C</td>
                <td>85% – 95% RH</td>
                <td class="font-semibold">${store.get('zones.1.crop')} (${store.get('zones.1.variety')})</td>
                <td>Moderate Chilling Safe</td>
                <td class="text-xs text-muted">Green Beans, Seed Potato, Temperate Fruits, Naga Tree Tomato</td>
              </tr>
              <tr>
                <td><span class="badge zone-tag-2">ZONE 2 (CENTER)</span></td>
                <td class="font-bold text-cyan">0.0°C – 2.0°C (Coldest)</td>
                <td>90% – 98% RH</td>
                <td class="font-semibold">${store.get('zones.2.crop')} (${store.get('zones.2.variety')})</td>
                <td>Maximum Respiration Suppression</td>
                <td class="text-xs text-muted">Cabbage, Cauliflower, Broccoli, Carrots, Radish, Green Peas</td>
              </tr>
              <tr>
                <td><span class="badge zone-tag-3">ZONE 3 (RIGHT)</span></td>
                <td class="font-bold text-purple">8.0°C – 15.0°C</td>
                <td>80% – 92% RH</td>
                <td class="font-semibold">${store.get('zones.3.crop')} (${store.get('zones.3.variety')})</td>
                <td>Cold-Sweetening & Chill Discoloration Prevention</td>
                <td class="text-xs text-muted">Bhut Jolokia, Table Potato, Fresh Ginger, Lakadong Turmeric</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
  }

  renderDetailedZoneCard(zoneId) {
    const zone = store.get(`zones.${zoneId}`);
    const spec = ZONE_SPECS[zoneId];
    if (!zone || !spec) return '';

    const h = zone.sensorHealth;

    return `
      <div class="glass-card zone-physical-card zone-${zoneId}-border">
        <div>
          <!-- Compartment Header -->
          <div class="flex justify-between items-start mb-3">
            <div>
              <span class="text-3xs font-black tracking-wider text-muted uppercase block">${spec.compartment}</span>
              <h2 class="text-lg font-black mt-0.5">${spec.name}</h2>
              <span class="text-xs text-muted font-bold">${zone.crop} (${zone.variety})</span>
            </div>
            <div class="text-right">
              <span class="badge badge-emerald text-3xs font-bold">${zone.sensorStatus}</span>
              <span class="text-3xs text-muted block mt-1">Target: <b>${spec.tempTargetMin}–${spec.tempTargetMax}°C</b></span>
            </div>
          </div>

          <!-- 4 Core Metrics Detail -->
          <div class="space-y-2 mb-4">
            <!-- 1. Temperature -->
            <div class="p-2.5 bg-card-dark rounded-lg border border-glass">
              <div class="flex justify-between items-center text-xs">
                <span class="text-muted flex items-center gap-1"><i data-lucide="thermometer" class="icon-xs text-cyan"></i> Temperature:</span>
                <span class="font-black text-base text-cyan">
                  ${h.temperature.status === 'ONLINE' ? zone.temperature.toFixed(1) + '°C' : 'OFFLINE (' + h.temperature.lastValid + '°C)'}
                </span>
              </div>
              <div class="text-3xs text-dim flex justify-between mt-1">
                <span>Safe Range: ${spec.tempTargetMin}–${spec.tempTargetMax}°C</span>
                <span class="text-emerald">Delta: ${(zone.temperature - ((spec.tempTargetMin + spec.tempTargetMax)/2)).toFixed(1)}°C</span>
              </div>
            </div>

            <!-- 2. Humidity -->
            <div class="p-2.5 bg-card-dark rounded-lg border border-glass">
              <div class="flex justify-between items-center text-xs">
                <span class="text-muted flex items-center gap-1"><i data-lucide="droplets" class="icon-xs text-emerald"></i> Humidity:</span>
                <span class="font-black text-base text-emerald">
                  ${h.humidity.status === 'ONLINE' ? zone.humidity.toFixed(1) + '%' : 'OFFLINE (' + h.humidity.lastValid + '%)'}
                </span>
              </div>
              <div class="text-3xs text-dim flex justify-between mt-1">
                <span>Target: ${spec.humTargetMin}–${spec.humTargetMax}%</span>
                <span class="text-emerald">Status: Optimal</span>
              </div>
            </div>

            <!-- 3. Weight & Transpiration Loss -->
            <div class="p-2.5 bg-card-dark rounded-lg border border-glass">
              <div class="flex justify-between items-center text-xs">
                <span class="text-muted flex items-center gap-1"><i data-lucide="scale" class="icon-xs text-amber"></i> Load Cell Mass:</span>
                <span class="font-black text-base text-amber">
                  ${h.weight.status === 'ONLINE' ? zone.currentWeight.toFixed(1) + ' kg' : 'OFFLINE (' + h.weight.lastValid + ' kg)'}
                </span>
              </div>
              <div class="text-3xs text-dim flex justify-between mt-1">
                <span>Initial: ${zone.initialWeight} kg</span>
                <span class="text-rose">Loss: -${zone.weightLoss} kg (${zone.weightLossPercent}%)</span>
              </div>
            </div>

            <!-- 4. Ethylene -->
            <div class="p-2.5 bg-card-dark rounded-lg border border-glass">
              <div class="flex justify-between items-center text-xs">
                <span class="text-muted flex items-center gap-1"><i data-lucide="wind" class="icon-xs text-purple"></i> Ethylene Gas:</span>
                <span class="font-black text-base text-purple">
                  ${h.ethylene.status === 'ONLINE' ? zone.ethylene.toFixed(2) + ' ppm' : 'OFFLINE (' + h.ethylene.lastValid + ' ppm)'}
                </span>
              </div>
              <div class="text-3xs text-dim flex justify-between mt-1">
                <span>Threshold: &lt; 0.50 ppm</span>
                <span class="${zone.ethylene > 0.5 ? 'text-amber' : 'text-emerald'}">Purge Fan: ${zone.ethylene > 0.5 ? 'AUTO PURGE' : 'OFF'}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Action Link to AI Studio -->
        <a href="spoilage.html" class="btn btn-outline btn-sm w-full mt-2" style="border-color: var(--brand-cyan); color: var(--brand-cyan);">
          <span>RUN AI PREDICTION ON ZONE ${zoneId}</span>
          <i data-lucide="sparkles" class="icon-xs"></i>
        </a>
      </div>
    `;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new ZonesPage().init();
});
