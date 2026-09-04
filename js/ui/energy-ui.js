/**
 * QORA TECH — Hybrid Solar Energy & Power Management UI
 * Solar PV Generation, AC Compressor Consumption, Energy Balance,
 * Battery SoC, Time to Full, Backup Runtime, and Animated Energy Flow.
 */

import { store } from '../core/state.js';

export class EnergyUI {
  render() {
    const container = document.getElementById('view-energy');
    if (!container) return;

    const energy = store.get('energy');
    const isSurplus = energy.energySurplusKw >= 0;

    container.innerHTML = `
      <!-- Header -->
      <div class="energy-header glass-card mb-6">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div class="flex items-center gap-2">
              <span class="qora-pill-brand">QORA TECH</span>
              <span class="badge badge-amber"><i data-lucide="sun" class="icon-sm"></i> HYBRID SOLAR + AC ENERGY SYSTEM</span>
            </div>
            <h2 class="text-2xl font-bold mt-1">Hybrid Solar Generation & Energy Management</h2>
            <p class="text-sm text-muted">Solar PV Array • Inverter AC Air Conditioner • 48V Lithium Battery Storage • Grid Intertie</p>
          </div>

          <!-- Energy Operating Mode Buttons -->
          <div class="energy-mode-selector">
            <label class="text-2xs text-muted block mb-1 font-bold uppercase">Operating Energy Mode</label>
            <div class="mode-btn-group">
              ${[
                { id: 'SOLAR_PRIORITY', label: 'Solar Priority', icon: 'sun' },
                { id: 'NORMAL', label: 'Balanced', icon: 'zap' },
                { id: 'ENERGY_SAVING', label: 'Eco Saver', icon: 'leaf' },
                { id: 'CRITICAL', label: 'Backup Only', icon: 'shield-alert' }
              ].map(m => `
                <button class="energy-mode-btn ${energy.energyMode === m.id ? 'active' : ''}" data-mode="${m.id}">
                  <i data-lucide="${m.icon}" class="icon-xs"></i> ${m.label}
                </button>
              `).join('')}
            </div>
          </div>
        </div>
      </div>

      <!-- Core 4 KPI Cards: Solar Gen, AC Load, Balance, Battery -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <!-- 1. Solar Generation -->
        <div class="glass-card stat-card border-amber">
          <div class="flex justify-between items-center mb-1">
            <span class="stat-label text-amber"><i data-lucide="sun" class="icon-xs inline"></i> SOLAR GENERATION</span>
            <span class="badge badge-warning text-2xs">PV ACTIVE</span>
          </div>
          <div class="stat-number text-amber">${energy.solarPowerKw.toFixed(2)} <span class="text-sm font-normal">kW</span></div>
          <div class="text-xs text-muted">Array: ${energy.solarVoltageV}V • ${energy.solarCurrentA}A</div>
          <div class="flex justify-between text-2xs text-dim mt-2 pt-2 border-t border-glass">
            <span>Today: <b>${energy.solarDailyKWh} kWh</b></span>
            <span>Month: <b>${energy.solarMonthlyKWh} kWh</b></span>
          </div>
        </div>

        <!-- 2. AC Air Conditioner Consumption -->
        <div class="glass-card stat-card border-cyan">
          <div class="flex justify-between items-center mb-1">
            <span class="stat-label text-cyan"><i data-lucide="snowflake" class="icon-xs inline"></i> AC CONSUMPTION</span>
            <span class="badge badge-normal text-2xs">INVERTER VFD</span>
          </div>
          <div class="stat-number text-cyan">${energy.acPowerKw.toFixed(2)} <span class="text-sm font-normal">kW</span></div>
          <div class="text-xs text-muted">AC: ${energy.acVoltageV}V • ${energy.acCurrentA}A (Peak: ${energy.acPeakPowerKw} kW)</div>
          <div class="flex justify-between text-2xs text-dim mt-2 pt-2 border-t border-glass">
            <span>Today: <b>${energy.acDailyKWh} kWh</b></span>
            <span>Runtime: <b>${energy.acRuntimeHrs} hrs</b></span>
          </div>
        </div>

        <!-- 3. Energy Balance (Surplus / Deficit) -->
        <div class="glass-card stat-card ${isSurplus ? 'border-emerald' : 'border-rose'}">
          <div class="flex justify-between items-center mb-1">
            <span class="stat-label ${isSurplus ? 'text-emerald' : 'text-rose'}">
              <i data-lucide="scale" class="icon-xs inline"></i> ENERGY BALANCE
            </span>
            <span class="badge ${isSurplus ? 'badge-normal' : 'badge-critical'} text-2xs">
              ${isSurplus ? 'SURPLUS' : 'DEFICIT'}
            </span>
          </div>
          <div class="stat-number ${isSurplus ? 'text-emerald' : 'text-rose'}">
            ${isSurplus ? '+' : ''}${energy.energySurplusKw.toFixed(2)} <span class="text-sm font-normal">kW</span>
          </div>
          <div class="text-xs text-muted">Solar (${energy.solarPowerKw} kW) - AC (${energy.acPowerKw} kW) - Other (${energy.otherLoadKw} kW)</div>
          <div class="text-2xs font-bold ${isSurplus ? 'text-emerald' : 'text-amber'} mt-2 pt-2 border-t border-glass">
            BATTERY ACTION: ${energy.batteryChargingStatus}
          </div>
        </div>

        <!-- 4. Battery Bank & Runtime -->
        <div class="glass-card stat-card border-purple">
          <div class="flex justify-between items-center mb-1">
            <span class="stat-label text-purple"><i data-lucide="battery-charging" class="icon-xs inline"></i> BATTERY BANK</span>
            <span class="badge badge-purple text-2xs">${energy.batteryVoltageV}V</span>
          </div>
          <div class="stat-number text-purple">${energy.batterySoc}% <span class="text-xs font-normal">(${energy.batteryCapacityKwh} kWh)</span></div>
          <div class="text-xs text-muted">Charge Current: ${energy.batteryCurrentA}A • Temp: ${energy.batteryTempC}°C</div>
          <div class="flex justify-between text-2xs text-dim mt-2 pt-2 border-t border-glass">
            <span>Time to Full: <b>${energy.timeToFullText}</b></span>
            <span>Backup: <b>${energy.backupTimeText}</b></span>
          </div>
        </div>
      </div>

      <!-- ANIMATED ENERGY FLOW DIAGRAM -->
      <div class="glass-card mb-8">
        <h3 class="font-bold text-base flex items-center gap-2 mb-4">
          <i data-lucide="activity" class="text-emerald"></i> Active Hybrid Energy Flow Visualization
        </h3>

        <div class="energy-flow-visual-box">
          <!-- Solar Source -->
          <div class="flow-node flow-solar active-glow">
            <div class="node-icon"><i data-lucide="sun"></i></div>
            <div class="node-title">SOLAR PV ARRAY</div>
            <div class="node-val text-amber font-bold">${energy.solarPowerKw.toFixed(2)} kW</div>
          </div>

          <div class="flow-line active-line"><div class="flow-dot"></div></div>

          <!-- Central Controller -->
          <div class="flow-node flow-controller active-glow">
            <div class="node-icon"><i data-lucide="cpu"></i></div>
            <div class="node-title">ENERGY MANAGEMENT</div>
            <div class="node-val text-cyan font-bold">${energy.energyMode.replace('_', ' ')}</div>
          </div>

          <div class="flow-line active-line"><div class="flow-dot"></div></div>

          <!-- Distribution Splits -->
          <div class="flow-subsystems-grid">
            <!-- AC Cold Storage Load -->
            <div class="sub-node sub-ac active-glow">
              <i data-lucide="snowflake" class="text-cyan icon-sm"></i>
              <div>
                <span class="font-bold text-xs block">AC AIR CONDITIONER</span>
                <span class="text-2xs text-muted">${energy.acPowerKw.toFixed(2)} kW (Three-Zone Cooling)</span>
              </div>
            </div>

            <!-- Battery Bank -->
            <div class="sub-node sub-battery ${energy.batteryChargingStatus === 'CHARGING' ? 'active-glow' : ''}">
              <i data-lucide="battery-charging" class="text-emerald icon-sm"></i>
              <div>
                <span class="font-bold text-xs block">BATTERY (48V LiFePO4)</span>
                <span class="text-2xs text-muted">${energy.batterySoc}% • ${energy.batteryChargingStatus}</span>
              </div>
            </div>

            <!-- Grid -->
            <div class="sub-node sub-grid">
              <i data-lucide="zap" class="text-dim icon-sm"></i>
              <div>
                <span class="font-bold text-xs block text-muted">GRID SUPPORT</span>
                <span class="text-2xs text-dim">0.00 kW (Zero Grid Reliance)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
    if (window.lucide) window.lucide.createIcons();
  }

  bindEvents() {
    document.querySelectorAll('.energy-mode-btn').forEach(btn => {
      btn.onclick = () => {
        const mode = btn.getAttribute('data-mode');
        store.set('energy.energyMode', mode);
        this.render();
      };
    });
  }
}

export const energyUI = new EnergyUI();
