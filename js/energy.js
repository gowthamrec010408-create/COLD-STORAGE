/**
 * QORA TECH — Hybrid Solar Energy & Solar-Driven Battery Charging Controller
 * Displays key solar & power metrics and dynamic battery charging time calculated from solar panel output.
 */

import { setupNavigation } from './navigation.js';
import { store } from './core/state.js';

class EnergyPage {
  constructor() {
    this.customSolarWattage = null; // Used when testing what-if solar slider
    this.batteryCapacityKwh = 5.0;  // 48V 100Ah LiFePO4 bank = 5.0 kWh
    this.chargeEfficiency = 0.92;   // 92% MPPT conversion efficiency
  }

  init() {
    setupNavigation('energy');
    this.render();
    store.subscribe('energy', () => this.render());
  }

  calculateChargingMetrics(solarW, acW, battPct) {
    const totalCapacityWh = this.batteryCapacityKwh * 1000;
    const storedWh = (battPct / 100) * totalCapacityWh;
    const remainingWh = Math.max(0, totalCapacityWh - storedWh);

    const netSurplusW = Math.max(0, solarW - acW);
    const effectiveChargingW = netSurplusW * this.chargeEfficiency;

    let timeToFullFormatted = '';
    let chargingStatusText = '';
    let backupHours = 0;

    if (battPct >= 100) {
      timeToFullFormatted = 'Fully Charged (100%)';
      chargingStatusText = 'Float / Maintenance Mode';
    } else if (effectiveChargingW > 0) {
      const hoursDecimal = remainingWh / effectiveChargingW;
      const hours = Math.floor(hoursDecimal);
      const minutes = Math.round((hoursDecimal - hours) * 60);

      if (hours === 0) {
        timeToFullFormatted = `${minutes} min`;
      } else {
        timeToFullFormatted = `${hours} hr ${minutes} min`;
      }
      chargingStatusText = `Solar Charging active (+${Math.round(netSurplusW)} W to battery)`;
    } else {
      timeToFullFormatted = 'Not Charging (Solar Output ≤ AC Load)';
      chargingStatusText = 'Discharging / Battery Buffer Mode';
      if (acW > 0) {
        backupHours = Number((storedWh / acW).toFixed(1));
      }
    }

    return {
      totalCapacityWh,
      storedWh,
      remainingWh,
      netSurplusW,
      effectiveChargingW,
      timeToFullFormatted,
      chargingStatusText,
      backupHours
    };
  }

  render() {
    const container = document.getElementById('energy-content');
    if (!container) return;

    const energy = store.get('energy');
    const liveSolarW = Math.round(energy.solarPowerKw * 1000);
    const activeSolarW = this.customSolarWattage !== null ? this.customSolarWattage : liveSolarW;
    const acW = Math.round(energy.acPowerKw * 1000);
    const gridW = Math.round(energy.gridPowerKw * 1000);
    const battPct = energy.batterySoc;
    const source = energy.source || 'SOLAR';
    const isSurplus = (activeSolarW - acW) >= 0;

    const calc = this.calculateChargingMetrics(activeSolarW, acW, battPct);

    container.innerHTML = `
      <!-- Header -->
      <div class="glass-card mb-6">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div class="flex items-center gap-2">
              <span class="badge badge-amber"><i data-lucide="sun" class="icon-sm"></i> HYBRID SOLAR POWER</span>
              <span class="text-xs text-muted">Off-Grid Solar PV + Battery Storage</span>
            </div>
            <h1 class="text-2xl font-bold mt-1">Solar Generation & Battery Charging Analysis</h1>
            <p class="text-xs text-muted">Real-time photovoltaic output, compressor load, and solar-driven battery charging time.</p>
          </div>

          <div class="status-pill pill-live">
            <span class="pulse-dot"></span>
            <span>POWER SOURCE: <strong>${source}</strong></span>
          </div>
        </div>
      </div>

      <!-- 5 Key Energy Metrics Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <!-- 1. SOLAR POWER -->
        <div class="glass-card stat-card" style="border-top: 4px solid var(--brand-amber);">
          <span class="stat-label text-amber"><i data-lucide="sun" class="icon-xs inline mr-1"></i> SOLAR POWER</span>
          <div class="stat-number text-2xl text-amber mt-1" id="disp-solar-w">${activeSolarW} <span class="text-xs font-normal">W</span></div>
          <span class="stat-sub text-muted font-bold">${this.customSolarWattage !== null ? 'Sandbox Output' : 'Live PV Output'}</span>
        </div>

        <!-- 2. AC CONSUMPTION -->
        <div class="glass-card stat-card" style="border-top: 4px solid var(--brand-cyan);">
          <span class="stat-label text-cyan"><i data-lucide="snowflake" class="icon-xs inline mr-1"></i> AC CONSUMPTION</span>
          <div class="stat-number text-2xl text-cyan mt-1">${acW} <span class="text-xs font-normal">W</span></div>
          <span class="stat-sub text-muted font-bold">Compressor Draw</span>
        </div>

        <!-- 3. BATTERY SOC -->
        <div class="glass-card stat-card" style="border-top: 4px solid var(--brand-purple);">
          <span class="stat-label text-purple"><i data-lucide="battery-charging" class="icon-xs inline mr-1"></i> BATTERY SOC</span>
          <div class="stat-number text-2xl text-purple mt-1">${battPct}%</div>
          <span class="stat-sub text-muted font-bold">${energy.batteryVoltageV || 52.4}V • ${(calc.storedWh/1000).toFixed(2)} kWh</span>
        </div>

        <!-- 4. GRID IMPORT -->
        <div class="glass-card stat-card" style="border-top: 4px solid var(--brand-emerald);">
          <span class="stat-label text-emerald"><i data-lucide="zap" class="icon-xs inline mr-1"></i> GRID IMPORT</span>
          <div class="stat-number text-2xl text-emerald mt-1">${gridW} <span class="text-xs font-normal">W</span></div>
          <span class="stat-sub text-emerald font-bold">100% Solar Off-Grid</span>
        </div>

        <!-- 5. POWER SOURCE -->
        <div class="glass-card stat-card" style="border-top: 4px solid var(--brand-emerald);">
          <span class="stat-label text-muted">NET SURPLUS</span>
          <div class="stat-number text-2xl ${isSurplus ? 'text-emerald' : 'text-rose'} mt-1">
            ${isSurplus ? '+' : ''}${activeSolarW - acW} <span class="text-xs font-normal">W</span>
          </div>
          <span class="stat-sub ${isSurplus ? 'text-emerald' : 'text-amber'} font-bold">
            ${isSurplus ? 'Direct to Battery' : 'Drawing Battery'}
          </span>
        </div>
      </div>

      <!-- DYNAMIC BATTERY CHARGING TIME BASED ON SOLAR PANEL OUTPUT -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        
        <!-- Main Charging Time KPI Card (7 cols) -->
        <div class="lg:col-span-7 glass-card" style="border-left: 4px solid var(--brand-amber);">
          <div class="flex justify-between items-center mb-4">
            <h3 class="font-bold text-base flex items-center gap-2 text-amber">
              <i data-lucide="clock" class="text-amber"></i> Battery Charging Time (Solar-Driven)
            </h3>
            <span class="badge badge-warning text-3xs font-bold font-mono">MPPT SOLAR ALGORITHM</span>
          </div>

          <!-- Estimated Time Display -->
          <div class="p-4 bg-card-dark rounded-lg border border-glass mb-4">
            <span class="text-3xs text-muted font-bold uppercase tracking-wider block">Estimated Time to Full 100% Charge</span>
            <div class="text-3xl font-black text-amber mt-1" id="charging-time-val">
              ${calc.timeToFullFormatted}
            </div>
            <div class="text-xs text-muted mt-1 flex items-center gap-2">
              <span class="pulse-dot" style="background: ${isSurplus ? 'var(--brand-emerald)' : 'var(--brand-rose)'};"></span>
              <span>${calc.chargingStatusText}</span>
            </div>
          </div>

          <!-- Battery SoC Progress Bar -->
          <div class="mb-4">
            <div class="flex justify-between text-xs font-bold mb-1.5">
              <span>Battery Bank State of Charge (48V 100Ah / 5.0 kWh Bank)</span>
              <span class="text-purple">${battPct}% Charged</span>
            </div>
            <div style="height: 12px; background: rgba(255,255,255,0.06); border-radius: var(--radius-full); overflow: hidden; border: 1px solid var(--border-glass);">
              <div style="width: ${battPct}%; height: 100%; background: linear-gradient(90deg, #10b981 0%, #06b6d4 50%, #a855f7 100%); transition: width 0.4s ease;"></div>
            </div>
            <div class="flex justify-between text-3xs text-muted mt-1">
              <span>Current Stored: <b>${(calc.storedWh/1000).toFixed(2)} kWh</b></span>
              <span>Remaining to Charge: <b>${(calc.remainingWh/1000).toFixed(2)} kWh</b></span>
            </div>
          </div>

          <!-- Dynamic Solar Charging Formula Breakdown -->
          <div class="p-3 bg-card-dark rounded-lg border border-glass text-xs space-y-2">
            <div class="font-bold text-2xs text-muted uppercase">Solar Charge Rate Calculation:</div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center text-xs">
              <div class="p-2 bg-glass rounded">
                <span class="text-3xs text-muted block">Solar Panel Output</span>
                <strong class="text-amber">${activeSolarW} W</strong>
              </div>
              <div class="p-2 bg-glass rounded">
                <span class="text-3xs text-muted block">AC Compressor Load</span>
                <strong class="text-cyan">-${acW} W</strong>
              </div>
              <div class="p-2 bg-glass rounded">
                <span class="text-3xs text-muted block">Effective Charge Power</span>
                <strong class="text-emerald">${Math.round(calc.effectiveChargingW)} W (92% Eff)</strong>
              </div>
            </div>
            <div class="text-3xs text-dim text-center pt-1">
              Formula: <em>Time = (Remaining ${(calc.remainingWh/1000).toFixed(2)} kWh) ÷ (Net Solar Surplus ${Math.round(calc.effectiveChargingW)} W) = <strong>${calc.timeToFullFormatted}</strong></em>
            </div>
          </div>
        </div>

        <!-- Interactive Solar Panel Output Simulator (5 cols) -->
        <div class="lg:col-span-5 glass-card">
          <div class="flex justify-between items-center mb-3">
            <h3 class="font-bold text-base flex items-center gap-2">
              <i data-lucide="sun-medium" class="text-amber"></i> Test Solar Panel Output
            </h3>
            ${this.customSolarWattage !== null ? `
              <button class="btn btn-2xs btn-outline text-3xs" id="btn-reset-solar">Reset to Live (${liveSolarW}W)</button>
            ` : ''}
          </div>

          <p class="text-xs text-muted mb-4">
            Adjust the slider below to test how different solar panel harvest outputs (sunlight intensity) impact the battery charging duration.
          </p>

          <!-- Slider -->
          <div class="form-group mb-4">
            <div class="flex justify-between text-xs font-bold mb-1">
              <span>Solar Panel Generation Wattage</span>
              <span class="text-amber font-mono" id="slider-solar-label">${activeSolarW} Watts</span>
            </div>
            <input type="range" class="w-full" id="solar-watt-slider" min="0" max="2500" step="50" value="${activeSolarW}" />
            <div class="flex justify-between text-3xs text-muted mt-1">
              <span>0 W (Night / Rainy)</span>
              <span>1200 W (Clear Sky)</span>
              <span>2500 W (Peak Sun)</span>
            </div>
          </div>

          <!-- Quick Preset Buttons -->
          <div class="space-y-2">
            <span class="text-3xs font-bold text-muted uppercase block">Quick Sun Scenarios:</span>
            <div class="grid grid-cols-3 gap-2">
              <button class="btn btn-xs btn-outline preset-solar-btn" data-watts="400">
                ☁️ Low Sun (400W)
              </button>
              <button class="btn btn-xs btn-outline preset-solar-btn" data-watts="820">
                ⛅ Normal (820W)
              </button>
              <button class="btn btn-xs btn-outline preset-solar-btn" data-watts="1600">
                ☀️ Peak Sun (1.6kW)
              </button>
            </div>
          </div>

          <div class="mt-4 pt-3 border-t border-glass text-3xs text-muted">
            💡 <em>Higher solar generation increases the net surplus wattage fed into the 48V MPPT charge controller, exponentially reducing time to full charge.</em>
          </div>
        </div>

      </div>
    `;

    this.bindEvents();
    if (window.lucide) window.lucide.createIcons();
  }

  bindEvents() {
    const slider = document.getElementById('solar-watt-slider');
    const sliderLabel = document.getElementById('slider-solar-label');

    if (slider) {
      slider.oninput = () => {
        this.customSolarWattage = parseInt(slider.value, 10);
        if (sliderLabel) sliderLabel.textContent = `${this.customSolarWattage} Watts`;
        this.render();
      };
    }

    const resetBtn = document.getElementById('btn-reset-solar');
    if (resetBtn) {
      resetBtn.onclick = () => {
        this.customSolarWattage = null;
        this.render();
      };
    }

    document.querySelectorAll('.preset-solar-btn').forEach(btn => {
      btn.onclick = () => {
        this.customSolarWattage = parseInt(btn.getAttribute('data-watts'), 10);
        this.render();
      };
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new EnergyPage().init();
});
