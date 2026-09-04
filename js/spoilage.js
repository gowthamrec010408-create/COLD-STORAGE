/**
 * QORA TECH — AI Produce Spoilage & Shelf-Life Estimation Controller
 * Clean layout: Select Batch -> Freshness (/100) -> Spoilage Risk -> Remaining Days -> Recommendation ("AI-ASSISTED ESTIMATE")
 */

import { setupNavigation } from './navigation.js';
import { store } from './core/state.js';
import { predictionEngine } from './engine/prediction-engine.js';
import { ZONE_SPECS } from './config/produce-profiles.js';

class SpoilagePage {
  constructor() {
    this.selectedZone = 1;
    this.simulatedParams = null;
  }

  init() {
    setupNavigation('spoilage');
    this.render();
  }

  render() {
    const container = document.getElementById('spoilage-content');
    if (!container) return;

    const zone = store.get(`zones.${this.selectedZone}`);
    const spec = ZONE_SPECS[this.selectedZone];
    const crop = zone.crop;

    const currentTemp = this.simulatedParams ? this.simulatedParams.temp : zone.temperature;
    const currentHum = this.simulatedParams ? this.simulatedParams.hum : zone.humidity;
    const currentEth = this.simulatedParams ? this.simulatedParams.ethylene : zone.ethylene;
    const currentWeight = this.simulatedParams ? this.simulatedParams.weight : zone.currentWeight;
    const durationDays = this.simulatedParams ? this.simulatedParams.days : 4.0;

    const prediction = predictionEngine.predict({
      produceType: crop,
      variety: zone.variety,
      zone: this.selectedZone,
      currentTemp,
      currentHumidity: currentHum,
      tempFluctuation: 0.2,
      initialWeight: zone.initialWeight,
      currentWeight,
      ethylene: currentEth,
      ethyleneTrendRate: 1.0,
      storageDurationDays: durationDays,
      hoursOutsideTarget: 0
    });

    const riskColor = prediction.spoilageRisk === 'LOW' ? '#10b981' :
                      prediction.spoilageRisk === 'MEDIUM' ? '#f59e0b' : '#ef4444';

    container.innerHTML = `
      <!-- Header -->
      <div class="glass-card mb-6">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div class="flex items-center gap-2">
              <span class="badge badge-cyan"><i data-lucide="sparkles" class="icon-sm"></i> AI SPOILAGE MODEL</span>
              <span class="badge badge-neutral font-bold text-3xs">AI-ASSISTED ESTIMATE</span>
            </div>
            <h1 class="text-2xl font-bold mt-1">Produce Freshness & Spoilage Prediction</h1>
            <p class="text-xs text-muted">Multi-factor biological respiration and transpiration estimation.</p>
          </div>

          <!-- Select Batch / Zone Dropdown -->
          <div class="flex items-center gap-2">
            <label class="text-xs text-muted font-bold">SELECT BATCH:</label>
            <select class="form-control text-xs" id="batch-zone-select">
              ${[1, 2, 3].map(zId => {
                const z = store.get(`zones.${zId}`);
                return `<option value="${zId}" ${this.selectedZone === zId ? 'selected' : ''}>Zone ${zId}: ${z.crop} (${z.batchId})</option>`;
              }).join('')}
            </select>
          </div>
        </div>
      </div>

      <!-- Core 4 Output Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <!-- 1. FRESHNESS SCORE -->
        <div class="glass-card stat-card" style="border-top: 4px solid var(--brand-emerald);">
          <span class="stat-label text-muted">FRESHNESS SCORE</span>
          <div class="stat-number text-3xl font-black text-emerald mt-1" id="val-freshness">
            ${prediction.freshnessScore}<span class="text-base text-muted font-normal"> / 100</span>
          </div>
          <span class="stat-sub text-muted font-bold">AI-ASSISTED ESTIMATE</span>
        </div>

        <!-- 2. SPOILAGE RISK -->
        <div class="glass-card stat-card" style="border-top: 4px solid ${riskColor};">
          <span class="stat-label text-muted">SPOILAGE RISK</span>
          <div class="stat-number text-3xl font-black mt-1" id="val-risk" style="color: ${riskColor};">
            ${prediction.spoilageRisk}
          </div>
          <span class="stat-sub text-muted font-bold">Respiration Status</span>
        </div>

        <!-- 3. ESTIMATED REMAINING SHELF LIFE -->
        <div class="glass-card stat-card" style="border-top: 4px solid var(--brand-cyan);">
          <span class="stat-label text-muted">EST. REMAINING SHELF LIFE</span>
          <div class="stat-number text-3xl font-black text-cyan mt-1" id="val-shelf-life">
            ${prediction.remainingShelfLifeDays} <span class="text-base text-muted font-normal">DAYS</span>
          </div>
          <span class="stat-sub text-muted font-bold">${prediction.remainingShelfLifeText}</span>
        </div>

        <!-- 4. RECOMMENDATION -->
        <div class="glass-card stat-card" style="border-top: 4px solid var(--brand-amber);">
          <span class="stat-label text-muted">RECOMMENDATION</span>
          <div class="stat-number text-2xl font-black mt-1" id="val-recommendation">
            <span class="badge ${prediction.sellPriority === 'SELL FIRST' ? 'badge-critical' : prediction.sellPriority === 'SELL SOON' ? 'badge-warning' : 'badge-normal'} text-sm font-bold">
              ${prediction.recommendedAction}
            </span>
          </div>
          <span class="stat-sub text-muted font-bold mt-1">Market Priority Queue</span>
        </div>
      </div>

      <!-- What-If Simulation Sandbox Sliders -->
      <div class="glass-card mb-8">
        <div class="flex justify-between items-center mb-4">
          <h3 class="font-bold text-base flex items-center gap-2">
            <i data-lucide="sliders" class="text-cyan"></i> Interactive What-If Scenario Sandbox
          </h3>
          <button class="btn btn-2xs btn-outline" id="btn-reset-sliders">Reset to Live Values</button>
        </div>
        <p class="text-xs text-muted mb-6">Test hypothetical chamber temperature increases, humidity drops, or ethylene accumulation to see real-time shelf life recalculations.</p>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <!-- Temp Slider -->
          <div class="form-group">
            <div class="flex justify-between text-xs font-bold mb-1">
              <span>Compartment Temperature</span>
              <span class="text-cyan" id="slider-temp-val">${currentTemp.toFixed(1)}°C</span>
            </div>
            <input type="range" class="w-full" id="slider-temp" min="-5" max="30" step="0.5" value="${currentTemp}" />
            <span class="text-3xs text-muted">Target: ${spec.tempSafeMin}–${spec.tempSafeMax}°C</span>
          </div>

          <!-- Humidity Slider -->
          <div class="form-group">
            <div class="flex justify-between text-xs font-bold mb-1">
              <span>Relative Humidity</span>
              <span class="text-emerald" id="slider-hum-val">${currentHum.toFixed(1)}%</span>
            </div>
            <input type="range" class="w-full" id="slider-hum" min="50" max="100" step="1" value="${currentHum}" />
            <span class="text-3xs text-muted">Target: ${spec.humSafeMin}–${spec.humSafeMax}%</span>
          </div>

          <!-- Ethylene Slider -->
          <div class="form-group">
            <div class="flex justify-between text-xs font-bold mb-1">
              <span>Ethylene Gas Concentration</span>
              <span class="text-purple" id="slider-eth-val">${currentEth.toFixed(2)} ppm</span>
            </div>
            <input type="range" class="w-full" id="slider-eth" min="0" max="5" step="0.05" value="${currentEth}" />
            <span class="text-3xs text-muted">Safe Limit: &lt; 0.50 ppm</span>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
    if (window.lucide) window.lucide.createIcons();
  }

  bindEvents() {
    const batchSelect = document.getElementById('batch-zone-select');
    if (batchSelect) {
      batchSelect.onchange = () => {
        this.selectedZone = parseInt(batchSelect.value, 10);
        this.simulatedParams = null;
        this.render();
      };
    }

    const sliderTemp = document.getElementById('slider-temp');
    const sliderHum = document.getElementById('slider-hum');
    const sliderEth = document.getElementById('slider-eth');

    const handleSliderChange = () => {
      this.simulatedParams = {
        temp: parseFloat(sliderTemp.value),
        hum: parseFloat(sliderHum.value),
        ethylene: parseFloat(sliderEth.value),
        weight: store.get(`zones.${this.selectedZone}.currentWeight`),
        days: 4.0
      };
      this.render();
    };

    if (sliderTemp) sliderTemp.oninput = handleSliderChange;
    if (sliderHum) sliderHum.oninput = handleSliderChange;
    if (sliderEth) sliderEth.oninput = handleSliderChange;

    const resetBtn = document.getElementById('btn-reset-sliders');
    if (resetBtn) {
      resetBtn.onclick = () => {
        this.simulatedParams = null;
        this.render();
      };
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new SpoilagePage().init();
});
