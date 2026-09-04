/**
 * Solar Smart Cold Storage — AI Spoilage & Freshness Prediction Dedicated UI
 * Features multi-parameter biological scoring, visual explainability breakdown,
 * confidence indicators, and interactive 'What-If' environmental simulator.
 */

import { store } from '../core/state.js';
import { predictionEngine } from '../engine/prediction-engine.js';
import { DEFAULT_PRODUCE_PROFILES, ZONE_SPECS } from '../config/produce-profiles.js';

export class PredictionUI {
  constructor() {
    this.selectedZone = 1;
    this.simulatedParams = null; // Used for What-If interactive sandbox
  }

  render() {
    const container = document.getElementById('view-prediction');
    if (!container) return;

    const zone = store.get(`zones.${this.selectedZone}`);
    const spec = ZONE_SPECS[this.selectedZone];
    const crop = zone.crop;

    // Use simulated params if user moved sliders, else use real live telemetry
    const currentTemp = this.simulatedParams ? this.simulatedParams.temp : zone.temperature;
    const currentHum = this.simulatedParams ? this.simulatedParams.hum : zone.humidity;
    const currentEth = this.simulatedParams ? this.simulatedParams.ethylene : zone.ethylene;
    const currentWeight = this.simulatedParams ? this.simulatedParams.weight : zone.currentWeight;
    const durationDays = this.simulatedParams ? this.simulatedParams.days : 4.5;

    // Run prediction
    const prediction = predictionEngine.predict({
      produceType: crop,
      variety: zone.variety,
      zone: this.selectedZone,
      currentTemp,
      currentHumidity: currentHum,
      tempFluctuation: 0.3,
      initialWeight: zone.initialWeight,
      currentWeight,
      ethylene: currentEth,
      ethyleneTrendRate: zone.ethyleneTrend,
      storageDurationDays: durationDays,
      hoursOutsideTarget: currentTemp > spec.tempSafeMax ? 8 : 0
    });

    const m = prediction.metrics;
    const fc = prediction.factorContribution;

    const riskColor = prediction.spoilageRisk === 'LOW' ? '#10b981' :
                      prediction.spoilageRisk === 'MEDIUM' ? '#f59e0b' :
                      prediction.spoilageRisk === 'HIGH' ? '#f97316' : '#ef4444';

    container.innerHTML = `
      <!-- Prediction Page Header -->
      <div class="prediction-header glass-card mb-6">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div class="flex items-center gap-2">
              <span class="badge badge-emerald"><i data-lucide="sparkles" class="icon-sm"></i> AI ENGINE v2.4</span>
              <span class="text-xs text-muted">Multi-Factor Respiration & Transpiration Model</span>
            </div>
            <h2 class="text-2xl font-bold mt-1">Produce Freshness & Spoilage Prediction</h2>
            <p class="text-sm text-muted">Combines real-time thermal stress, moisture deficit, load-cell mass loss & ethylene gas dynamics.</p>
          </div>

          <!-- Zone Selector Switcher -->
          <div class="zone-switcher-tabs">
            ${[1, 2, 3].map(zId => `
              <button class="zone-tab-btn ${this.selectedZone === zId ? 'active' : ''}" data-zone="${zId}">
                Zone ${zId} (${store.get(`zones.${zId}.crop`)})
              </button>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Main Prediction Output Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        <!-- 1. Freshness Score & Core KPI Card (5 cols) -->
        <div class="lg:col-span-5 glass-card prediction-hero-card">
          <div class="flex justify-between items-center mb-4">
            <span class="font-bold text-sm text-muted uppercase">Target Batch: ${zone.crop} (${zone.variety})</span>
            <span class="badge badge-neutral">Zone ${this.selectedZone}</span>
          </div>

          <div class="freshness-meter-wrapper text-center my-6">
            <div class="freshness-gauge" id="pred-gauge" style="--score-color: ${riskColor}; --score-deg: ${prediction.freshnessScore * 3.6}deg;">
              <div class="gauge-center">
                <span class="gauge-score font-black" id="pred-gauge-score">${prediction.freshnessScore}</span>
                <span class="gauge-max">/ 100</span>
                <span class="gauge-title">FRESHNESS SCORE</span>
              </div>
            </div>
          </div>

          <div class="prediction-kpi-grid">
            <div class="kpi-box">
              <span class="kpi-label">Spoilage Risk</span>
              <span class="kpi-value font-bold" id="pred-spoilage-risk" style="color: ${riskColor}">${prediction.spoilageRisk}</span>
            </div>
            <div class="kpi-box">
              <span class="kpi-label">Est. Remaining Life</span>
              <span class="kpi-value font-bold text-cyan" id="pred-remaining-life">${prediction.remainingShelfLifeText}</span>
            </div>
            <div class="kpi-box">
              <span class="kpi-label">Quality Trend</span>
              <span class="kpi-value font-bold ${prediction.qualityTrend === 'STABLE' ? 'text-emerald' : 'text-amber'}" id="pred-quality-trend">${prediction.qualityTrend}</span>
            </div>
            <div class="kpi-box">
              <span class="kpi-label">Recommended Action</span>
              <span class="kpi-value font-bold text-xs badge ${prediction.sellPriority === 'SELL FIRST' ? 'badge-critical' : prediction.sellPriority === 'SELL SOON' ? 'badge-warning' : 'badge-normal'}" id="pred-recommended-action">
                ${prediction.recommendedAction}
              </span>
            </div>
          </div>

          <!-- Confidence & Scientific Disclaimer Note -->
          <div class="prediction-meta-note mt-6">
            <div class="flex justify-between text-xs text-muted mb-1">
              <span>Prediction Confidence</span>
              <span class="font-bold text-emerald" id="pred-confidence">${prediction.predictionConfidence}%</span>
            </div>
            <div class="progress-bar-bg">
              <div class="progress-bar-fill bg-emerald" id="pred-confidence-bar" style="width: ${prediction.predictionConfidence}%"></div>
            </div>
            <p class="text-xs text-muted italic mt-3">
              <i data-lucide="info" class="icon-xs inline"></i> ${prediction.disclaimer}
            </p>
          </div>
        </div>

        <!-- 2. Combined Spoilage Risk Factor Matrix (Explainability) (7 cols) -->
        <div class="lg:col-span-7 glass-card">
          <div class="flex justify-between items-center mb-4">
            <h3 class="font-bold text-lg flex items-center gap-2">
              <i data-lucide="bar-chart-3" class="text-emerald"></i> Spoilage Risk Factor Breakdown
            </h3>
            <span class="text-xs text-muted">Why did the prediction change?</span>
          </div>

          <p class="text-sm text-muted mb-6">
            The AI engine isolates distinct physiological stress pathways to explain exact causes of quality degradation:
          </p>

          <div class="factor-breakdown-list">
            <!-- Factor 1: Temperature Stress -->
            <div class="factor-row">
              <div class="factor-info">
                <div class="factor-title">
                  <span><i data-lucide="thermometer" class="text-emerald"></i> Thermal Stress</span>
                  <span class="factor-status ${m.thermalPenalty > 25 ? 'text-rose font-bold' : 'text-emerald'}" id="factor-temp-status">${m.tempStatus}</span>
                </div>
                <div class="factor-sub" id="factor-temp-sub">Current: ${m.currentTemp}°C (Optimal: ${m.targetTempRange})</div>
              </div>
              <div class="factor-bar-col">
                <div class="progress-bar-bg">
                  <div class="progress-bar-fill bg-emerald" id="factor-temp-bar" style="width: ${Math.min(100, m.thermalPenalty)}%"></div>
                </div>
                <span class="factor-penalty-num" id="factor-temp-val">${m.thermalPenalty} pts penalty</span>
              </div>
            </div>

            <!-- Factor 2: Humidity Stress -->
            <div class="factor-row">
              <div class="factor-info">
                <div class="factor-title">
                  <span><i data-lucide="droplets" class="text-cyan"></i> Moisture Deficit / Excess</span>
                  <span class="factor-status ${m.humidityPenalty > 20 ? 'text-amber font-bold' : 'text-emerald'}" id="factor-hum-status">${m.humidityStatus}</span>
                </div>
                <div class="factor-sub" id="factor-hum-sub">Current: ${m.currentHumidity}%RH (Target: ${m.targetHumidityRange})</div>
              </div>
              <div class="factor-bar-col">
                <div class="progress-bar-bg">
                  <div class="progress-bar-fill bg-cyan" id="factor-hum-bar" style="width: ${Math.min(100, m.humidityPenalty)}%"></div>
                </div>
                <span class="factor-penalty-num" id="factor-hum-val">${m.humidityPenalty} pts penalty</span>
              </div>
            </div>

            <!-- Factor 3: Load Cell Weight Loss -->
            <div class="factor-row">
              <div class="factor-info">
                <div class="factor-title">
                  <span><i data-lucide="scale" class="text-amber"></i> Weight Loss & Transpiration</span>
                  <span class="factor-status ${m.weightLossRisk === 'HIGH' ? 'text-rose font-bold' : m.weightLossRisk === 'MEDIUM' ? 'text-amber' : 'text-emerald'}" id="factor-weight-status">${m.weightLossRisk} RISK (${m.weightLossTrend})</span>
                </div>
                <div class="factor-sub" id="factor-weight-sub">Lost: ${m.weightLossKg} kg (${m.weightLossPercent}%) from ${m.initialWeightKg} kg initial</div>
              </div>
              <div class="factor-bar-col">
                <div class="progress-bar-bg">
                  <div class="progress-bar-fill bg-amber" id="factor-weight-bar" style="width: ${Math.min(100, m.weightPenalty)}%"></div>
                </div>
                <span class="factor-penalty-num" id="factor-weight-val">${m.weightPenalty} pts penalty</span>
              </div>
            </div>

            <!-- Factor 4: Ethylene Ripening Gas -->
            <div class="factor-row">
              <div class="factor-info">
                <div class="factor-title">
                  <span><i data-lucide="wind" class="text-purple"></i> Ethylene Gas Ripening</span>
                  <span class="factor-status ${m.ethylenePenalty > 30 ? 'text-rose font-bold' : 'text-emerald'}" id="factor-eth-status">${m.ethyleneStatus}</span>
                </div>
                <div class="factor-sub" id="factor-eth-sub">Current: ${m.currentEthylenePpm} ppm (Trend: +${m.ethyleneTrendPercent}%)</div>
              </div>
              <div class="factor-bar-col">
                <div class="progress-bar-bg">
                  <div class="progress-bar-fill bg-purple" id="factor-eth-bar" style="width: ${Math.min(100, m.ethylenePenalty)}%"></div>
                </div>
                <span class="factor-penalty-num" id="factor-eth-val">${m.ethylenePenalty} pts penalty</span>
              </div>
            </div>

            <!-- Factor 5: Biological Senescence Age -->
            <div class="factor-row">
              <div class="factor-info">
                <div class="factor-title">
                  <span><i data-lucide="clock" class="text-indigo"></i> Inherent Storage Age</span>
                  <span class="factor-status text-muted" id="factor-age-status">${m.storageDurationDays} Days Stored</span>
                </div>
                <div class="factor-sub">Chronological duration elapsed in storage</div>
              </div>
              <div class="factor-bar-col">
                <div class="progress-bar-bg">
                  <div class="progress-bar-fill bg-indigo" id="factor-age-bar" style="width: ${Math.min(100, m.senescencePenalty)}%"></div>
                </div>
                <span class="factor-penalty-num" id="factor-age-val">${m.senescencePenalty} pts penalty</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Interactive "What-If" Environmental Sandbox -->
      <div class="glass-card what-if-container">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h3 class="font-bold text-lg flex items-center gap-2">
              <i data-lucide="sliders" class="text-cyan"></i> Interactive 'What-If' Parameter Sandbox
            </h3>
            <p class="text-xs text-muted">Drag sliders to test hypothetical refrigeration spikes or weight loss on produce shelf-life in real time.</p>
          </div>
          <button class="btn btn-sm btn-outline" id="reset-whatif-btn">
            <i data-lucide="rotate-ccw"></i> Reset to Live ESP32 Telemetry
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
          <!-- Slider 1: Temperature -->
          <div class="slider-group">
            <div class="flex justify-between text-sm mb-1">
              <span>Temperature</span>
              <span class="font-bold text-emerald" id="slider-temp-val">${currentTemp}°C</span>
            </div>
            <input type="range" min="-2" max="25" step="0.5" value="${currentTemp}" class="range-slider" id="whatif-temp" />
            <span class="text-xs text-muted">Target: ${spec.tempTargetMin}-${spec.tempTargetMax}°C</span>
          </div>

          <!-- Slider 2: Humidity -->
          <div class="slider-group">
            <div class="flex justify-between text-sm mb-1">
              <span>Humidity</span>
              <span class="font-bold text-cyan" id="slider-hum-val">${currentHum}%</span>
            </div>
            <input type="range" min="40" max="100" step="1" value="${currentHum}" class="range-slider" id="whatif-hum" />
            <span class="text-xs text-muted">Target: ${spec.humidityTargetMin}-${spec.humidityTargetMax}%</span>
          </div>

          <!-- Slider 3: Ethylene -->
          <div class="slider-group">
            <div class="flex justify-between text-sm mb-1">
              <span>Ethylene Gas</span>
              <span class="font-bold text-purple" id="slider-eth-val">${currentEth} ppm</span>
            </div>
            <input type="range" min="0.0" max="3.0" step="0.05" value="${currentEth}" class="range-slider" id="whatif-eth" />
            <span class="text-xs text-muted">Critical: > 1.20 ppm</span>
          </div>

          <!-- Slider 4: Stored Weight -->
          <div class="slider-group">
            <div class="flex justify-between text-sm mb-1">
              <span>Current Weight</span>
              <span class="font-bold text-amber" id="slider-weight-val">${currentWeight} kg</span>
            </div>
            <input type="range" min="${(zone.initialWeight * 0.7).toFixed(0)}" max="${zone.initialWeight}" step="0.5" value="${currentWeight}" class="range-slider" id="whatif-weight" />
            <span class="text-xs text-muted">Initial: ${zone.initialWeight} kg</span>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
    if (window.lucide) window.lucide.createIcons();
  }

  bindEvents() {
    // Zone tabs
    document.querySelectorAll('.zone-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.selectedZone = Number(btn.getAttribute('data-zone'));
        this.simulatedParams = null; // reset sandbox
        this.render();
      });
    });

    // What-If Sliders (Live Drag & Drop Handler without destroying inputs)
    const tempSlider = document.getElementById('whatif-temp');
    const humSlider = document.getElementById('whatif-hum');
    const ethSlider = document.getElementById('whatif-eth');
    const weightSlider = document.getElementById('whatif-weight');

    const updateSandboxLive = () => {
      if (!tempSlider || !humSlider || !ethSlider || !weightSlider) return;

      const temp = Number(tempSlider.value);
      const hum = Number(humSlider.value);
      const eth = Number(ethSlider.value);
      const weight = Number(weightSlider.value);

      this.simulatedParams = { temp, hum, ethylene: eth, weight, days: 4.5 };

      // Update Slider Value Labels
      const lblTemp = document.getElementById('slider-temp-val');
      const lblHum = document.getElementById('slider-hum-val');
      const lblEth = document.getElementById('slider-eth-val');
      const lblWeight = document.getElementById('slider-weight-val');

      if (lblTemp) lblTemp.textContent = `${temp}°C`;
      if (lblHum) lblHum.textContent = `${hum}%`;
      if (lblEth) lblEth.textContent = `${eth.toFixed(2)} ppm`;
      if (lblWeight) lblWeight.textContent = `${weight.toFixed(1)} kg`;

      // Re-run AI calculation
      const zone = store.get(`zones.${this.selectedZone}`);
      const spec = ZONE_SPECS[this.selectedZone];
      const prediction = predictionEngine.predict({
        produceType: zone.crop,
        variety: zone.variety,
        zone: this.selectedZone,
        currentTemp: temp,
        currentHumidity: hum,
        tempFluctuation: 0.3,
        initialWeight: zone.initialWeight,
        currentWeight: weight,
        ethylene: eth,
        ethyleneTrendRate: zone.ethyleneTrend,
        storageDurationDays: 4.5,
        hoursOutsideTarget: temp > spec.tempSafeMax ? 8 : 0
      });

      const m = prediction.metrics;
      const riskColor = prediction.spoilageRisk === 'LOW' ? '#10b981' :
                        prediction.spoilageRisk === 'MEDIUM' ? '#f59e0b' :
                        prediction.spoilageRisk === 'HIGH' ? '#f97316' : '#ef4444';

      // Update Live Gauge & KPI
      const gauge = document.getElementById('pred-gauge');
      const gaugeScore = document.getElementById('pred-gauge-score');
      const riskEl = document.getElementById('pred-spoilage-risk');
      const remainingLifeEl = document.getElementById('pred-remaining-life');
      const qualityTrendEl = document.getElementById('pred-quality-trend');
      const recActionEl = document.getElementById('pred-recommended-action');
      const confEl = document.getElementById('pred-confidence');
      const confBar = document.getElementById('pred-confidence-bar');

      if (gauge) {
        gauge.style.setProperty('--score-color', riskColor);
        gauge.style.setProperty('--score-deg', `${prediction.freshnessScore * 3.6}deg`);
      }
      if (gaugeScore) gaugeScore.textContent = prediction.freshnessScore;
      if (riskEl) {
        riskEl.textContent = prediction.spoilageRisk;
        riskEl.style.color = riskColor;
      }
      if (remainingLifeEl) remainingLifeEl.textContent = prediction.remainingShelfLifeText;
      if (qualityTrendEl) {
        qualityTrendEl.textContent = prediction.qualityTrend;
        qualityTrendEl.className = `kpi-value font-bold ${prediction.qualityTrend === 'STABLE' ? 'text-emerald' : 'text-amber'}`;
      }
      if (recActionEl) {
        recActionEl.textContent = prediction.recommendedAction;
        recActionEl.className = `kpi-value font-bold text-xs badge ${prediction.sellPriority === 'SELL FIRST' ? 'badge-critical' : prediction.sellPriority === 'SELL SOON' ? 'badge-warning' : 'badge-normal'}`;
      }
      if (confEl) confEl.textContent = `${prediction.predictionConfidence}%`;
      if (confBar) confBar.style.width = `${prediction.predictionConfidence}%`;

      // Update Factor Breakdown Bars
      const fTempStatus = document.getElementById('factor-temp-status');
      const fTempSub = document.getElementById('factor-temp-sub');
      const fTempBar = document.getElementById('factor-temp-bar');
      const fTempVal = document.getElementById('factor-temp-val');
      if (fTempStatus) {
        fTempStatus.textContent = m.tempStatus;
        fTempStatus.className = `factor-status ${m.thermalPenalty > 25 ? 'text-rose font-bold' : 'text-emerald'}`;
      }
      if (fTempSub) fTempSub.textContent = `Current: ${m.currentTemp}°C (Optimal: ${m.targetTempRange})`;
      if (fTempBar) fTempBar.style.width = `${Math.min(100, m.thermalPenalty)}%`;
      if (fTempVal) fTempVal.textContent = `${m.thermalPenalty} pts penalty`;

      const fHumStatus = document.getElementById('factor-hum-status');
      const fHumSub = document.getElementById('factor-hum-sub');
      const fHumBar = document.getElementById('factor-hum-bar');
      const fHumVal = document.getElementById('factor-hum-val');
      if (fHumStatus) {
        fHumStatus.textContent = m.humidityStatus;
        fHumStatus.className = `factor-status ${m.humidityPenalty > 20 ? 'text-amber font-bold' : 'text-emerald'}`;
      }
      if (fHumSub) fHumSub.textContent = `Current: ${m.currentHumidity}%RH (Target: ${m.targetHumidityRange})`;
      if (fHumBar) fHumBar.style.width = `${Math.min(100, m.humidityPenalty)}%`;
      if (fHumVal) fHumVal.textContent = `${m.humidityPenalty} pts penalty`;

      const fWeightStatus = document.getElementById('factor-weight-status');
      const fWeightSub = document.getElementById('factor-weight-sub');
      const fWeightBar = document.getElementById('factor-weight-bar');
      const fWeightVal = document.getElementById('factor-weight-val');
      if (fWeightStatus) {
        fWeightStatus.textContent = `${m.weightLossRisk} RISK (${m.weightLossTrend})`;
        fWeightStatus.className = `factor-status ${m.weightLossRisk === 'HIGH' ? 'text-rose font-bold' : m.weightLossRisk === 'MEDIUM' ? 'text-amber' : 'text-emerald'}`;
      }
      if (fWeightSub) fWeightSub.textContent = `Lost: ${m.weightLossKg} kg (${m.weightLossPercent}%) from ${m.initialWeightKg} kg initial`;
      if (fWeightBar) fWeightBar.style.width = `${Math.min(100, m.weightPenalty)}%`;
      if (fWeightVal) fWeightVal.textContent = `${m.weightPenalty} pts penalty`;

      const fEthStatus = document.getElementById('factor-eth-status');
      const fEthSub = document.getElementById('factor-eth-sub');
      const fEthBar = document.getElementById('factor-eth-bar');
      const fEthVal = document.getElementById('factor-eth-val');
      if (fEthStatus) {
        fEthStatus.textContent = m.ethyleneStatus;
        fEthStatus.className = `factor-status ${m.ethylenePenalty > 30 ? 'text-rose font-bold' : 'text-emerald'}`;
      }
      if (fEthSub) fEthSub.textContent = `Current: ${m.currentEthylenePpm} ppm (Trend: +${m.ethyleneTrendPercent}%)`;
      if (fEthBar) fEthBar.style.width = `${Math.min(100, m.ethylenePenalty)}%`;
      if (fEthVal) fEthVal.textContent = `${m.ethylenePenalty} pts penalty`;
    };

    if (tempSlider) tempSlider.addEventListener('input', updateSandboxLive);
    if (humSlider) humSlider.addEventListener('input', updateSandboxLive);
    if (ethSlider) ethSlider.addEventListener('input', updateSandboxLive);
    if (weightSlider) weightSlider.addEventListener('input', updateSandboxLive);

    document.getElementById('reset-whatif-btn')?.addEventListener('click', () => {
      this.simulatedParams = null;
      this.render();
    });
  }
}

export const predictionUI = new PredictionUI();
