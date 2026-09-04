/**
 * QORA TECH — Industrial Three-Zone Dashboard Controller
 * Prioritizes: System Status Bar -> Exactly 3 Equal-Dimension Zone Cards -> Compact Energy & AI Summary.
 * Ultra-fast targeted DOM updates on incoming telemetry.
 */

import { setupNavigation } from './navigation.js';
import { store } from './core/state.js';
import { initializeFirebase } from './config/firebase-config.js';
import { fbService } from './services/firebase-service.js';
import { seasonalAdvisor } from './seasonal-advisor.js';

class DashboardPage {
  constructor() {
    this.activeFilter = 'user'; // 'user' | 'all' | 'z1' | 'z2' | 'z3'
  }

  async init() {
    try {
      // 1. Setup shell navigation
      setupNavigation('dashboard');

      // 2. Render initial HTML skeleton immediately
      this.render();

      // 3. Register fine-grained real-time state subscribers
      store.subscribe('connection', () => this.updateStatusBadges());
      store.subscribe('zones.1', () => this.updateZoneDOM(1));
      store.subscribe('zones.2', () => this.updateZoneDOM(2));
      store.subscribe('zones.3', () => this.updateZoneDOM(3));
      store.subscribe('energy', () => this.updateEnergyDOM());
      store.subscribe('alerts', () => this.updateAlertsDOM());

      // 4. Initialize Firebase service listeners non-blockingly
      try {
        await initializeFirebase();
        await fbService.startRealtimeListeners();
      } catch (fbErr) {
        console.warn('Firebase init warning:', fbErr);
      }
    } catch (err) {
      console.error('Dashboard initialization error:', err);
      this.render();
    }
  }

  render() {
    const container = document.getElementById('dashboard-content');
    if (!container) return;

    const user = store.get('user');
    const advice = seasonalAdvisor.generateUserAdvice(user);
    const topPick = advice.topPick;

    container.innerHTML = `
      <!-- 1. TOP SYSTEM STATUS BAR -->
      <div class="glass-card mb-4" style="padding: 1rem 1.5rem;">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div class="flex items-center gap-3">
            <div class="qora-pill-brand">QORA TECH</div>
            <div>
              <h1 class="text-xl font-black">SOLAR SMART COLD STORAGE</h1>
              <span class="text-3xs text-muted font-bold tracking-wider uppercase">Facility Unit #01 • Real-Time Environmental Telemetry</span>
            </div>
          </div>

          <!-- Top Status Badges (ESP32, Firebase, Cooling) -->
          <div class="flex flex-wrap items-center gap-3" id="system-status-badges">
            <!-- ESP32 Status -->
            <a href="devices.html" class="status-pill" id="dash-esp32-status" style="background: rgba(244, 63, 94, 0.12); color: var(--brand-rose); border: 1px solid rgba(244, 63, 94, 0.3);" title="Click to open ESP32 & USB Serial Hub">
              <span class="pulse-dot" id="dash-esp32-dot" style="background: var(--brand-rose);"></span>
              <span id="dash-esp32-text">ESP32: DEVICE OFFLINE</span>
            </a>

            <!-- Firebase Status -->
            <div class="status-pill pill-live" id="dash-firebase-status">
              <span class="pulse-dot"></span>
              <span>Firebase: CONNECTED</span>
            </div>

            <!-- Cooling Status -->
            <div class="status-pill pill-cooling" id="dash-cooling-status">
              <span class="pulse-dot"></span>
              <span id="dash-cooling-text">Cooling: ACTIVE</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. NER PERSONALIZED SEASONAL CROP ADVISOR CARD -->
      <div class="glass-card mb-6" style="border-left: 4px solid var(--brand-emerald); background: linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(13, 21, 39, 0.88) 100%);">
        <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div class="space-y-1">
            <div class="flex flex-wrap items-center gap-2">
              <span class="badge badge-normal text-3xs font-bold">
                <i data-lucide="sprout" class="icon-2xs"></i> NER PERSONAL ADVISOR
              </span>
              <span class="text-xs font-bold text-emerald">${advice.state}</span>
              <span class="text-3xs text-muted font-mono">• ${advice.season.name} (${advice.season.tempRange}, RH ${advice.season.rh})</span>
            </div>
            <h2 class="text-base sm:text-lg font-bold">
              Personalized Recommendation for <span class="text-emerald">${user?.displayName || 'Farmer'}</span>: 
              <span class="text-cyan">${topPick?.crop.name || 'Ginger'}</span>
            </h2>
            <p class="text-xs text-muted">${advice.seasonalActionText}</p>
          </div>

          <div class="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
            <div class="p-2.5 bg-card-dark rounded-lg border border-glass text-center min-w-28">
              <span class="text-3xs text-muted uppercase font-bold block">Best Zone</span>
              <span class="text-sm font-black text-cyan">Zone ${topPick.bestZoneId}</span>
              <span class="text-3xs text-muted block font-mono">${topPick.targetRange}</span>
            </div>

            <div class="p-2.5 bg-card-dark rounded-lg border border-glass text-center min-w-28">
              <span class="text-3xs text-muted uppercase font-bold block">Suitability</span>
              <span class="text-sm font-black text-emerald">${topPick.score}%</span>
              <span class="text-3xs text-emerald font-bold block">${topPick.tier}</span>
            </div>

            <button class="btn btn-primary btn-sm py-2.5 px-4" id="btn-open-advisor-modal" style="box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);">
              <i data-lucide="sparkles" class="icon-xs"></i>
              <span>WHAT SHOULD I STORE?</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 3. THREE EQUAL-DIMENSION MAIN ZONE CARDS -->
      <div class="three-zones-physical-grid mb-8" id="three-zones-grid">
        ${this.renderZoneCardHTML(1, 'ZONE 1', 'LEFT COMPARTMENT', '2–8°C', 'zone-1-border')}
        ${this.renderZoneCardHTML(2, 'ZONE 2', 'CENTER COMPARTMENT (COLDEST)', '0–2°C', 'zone-2-border')}
        ${this.renderZoneCardHTML(3, 'ZONE 3', 'RIGHT COMPARTMENT', '8–15°C', 'zone-3-border')}
      </div>

      <!-- 4. COMPACT ENERGY & AI SPOILAGE OVERVIEW -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <!-- Energy Snapshot -->
        <div class="glass-card">
          <div class="flex justify-between items-center mb-4">
            <h3 class="font-bold text-base flex items-center gap-2">
              <i data-lucide="zap" class="text-amber icon-sm"></i> Hybrid Solar & Energy Snapshot
            </h3>
            <a href="energy.html" class="text-xs text-cyan font-bold hover:underline">Full Energy View &rarr;</a>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center mb-4">
            <div class="p-3 bg-card-dark rounded-lg border border-glass">
              <span class="text-3xs text-muted font-bold block uppercase">Solar Power</span>
              <span class="text-lg font-black text-amber" id="dash-solar-val">820 W</span>
            </div>
            <div class="p-3 bg-card-dark rounded-lg border border-glass">
              <span class="text-3xs text-muted font-bold block uppercase">AC Consumption</span>
              <span class="text-lg font-black text-cyan" id="dash-ac-val">620 W</span>
            </div>
            <div class="p-3 bg-card-dark rounded-lg border border-glass">
              <span class="text-3xs text-muted font-bold block uppercase">Battery Storage</span>
              <span class="text-lg font-black text-purple" id="dash-batt-val">78%</span>
            </div>
            <div class="p-3 bg-card-dark rounded-lg border border-glass">
              <span class="text-3xs text-muted font-bold block uppercase">Power Source</span>
              <span class="text-lg font-black text-emerald" id="dash-source-val">SOLAR</span>
            </div>
          </div>

          <div class="p-2.5 bg-card-dark rounded-lg border border-glass text-xs flex justify-between items-center">
            <span class="text-muted">Grid Import: <strong class="text-emerald" id="dash-grid-val">0 W</strong></span>
            <span class="text-muted">Net Surplus: <strong class="text-emerald" id="dash-surplus-val">+200 W</strong></span>
          </div>
        </div>

        <!-- AI Spoilage & Batch Priority Summary -->
        <div class="glass-card">
          <div class="flex justify-between items-center mb-4">
            <h3 class="font-bold text-base flex items-center gap-2">
              <i data-lucide="sparkles" class="text-cyan icon-sm"></i> AI Produce Spoilage & Shelf-Life
            </h3>
            <a href="spoilage.html" class="text-xs text-cyan font-bold hover:underline">AI Studio &rarr;</a>
          </div>

          <div class="space-y-2 text-xs" id="dash-batches-summary">
            <div class="flex justify-between items-center p-2.5 bg-card-dark rounded-lg border border-glass">
              <div>
                <span class="font-bold">Green Beans (Zone 1)</span>
                <span class="text-3xs text-muted block">BATCH-GB101 • 135.8 kg</span>
              </div>
              <div class="text-right">
                <span class="badge badge-normal text-3xs font-bold">SAFE TO STORE</span>
                <span class="text-3xs text-muted block mt-0.5">8 Days Remaining</span>
              </div>
            </div>

            <div class="flex justify-between items-center p-2.5 bg-card-dark rounded-lg border border-glass">
              <div>
                <span class="font-bold">Cabbage (Zone 2)</span>
                <span class="text-3xs text-muted block">BATCH-CB202 • 276.4 kg</span>
              </div>
              <div class="text-right">
                <span class="badge badge-normal text-3xs font-bold">SAFE TO STORE</span>
                <span class="text-3xs text-muted block mt-0.5">52 Days Remaining</span>
              </div>
            </div>

            <div class="flex justify-between items-center p-2.5 bg-card-dark rounded-lg border border-glass">
              <div>
                <span class="font-bold">Naga King Chilli (Zone 3)</span>
                <span class="text-3xs text-muted block">BATCH-NC303 • 91.2 kg</span>
              </div>
              <div class="text-right">
                <span class="badge badge-warning text-3xs font-bold">SELL SOON</span>
                <span class="text-3xs text-muted block mt-0.5">19 Days Remaining</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 5. WHAT SHOULD I STORE MODAL -->
      <div id="advisor-modal-overlay" class="hidden" style="position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 1rem;">
        <div class="glass-card" style="width: 100%; max-width: 900px; max-height: 90vh; overflow-y: auto; padding: 1.75rem; border: 1px solid var(--border-glass-bright); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);">
          <div class="flex justify-between items-start mb-4 border-b border-glass pb-3">
            <div>
              <div class="flex items-center gap-2">
                <span class="badge badge-normal text-3xs">🌦️ NER PERSONALIZED ADVISOR</span>
                <span class="text-xs text-muted">${advice.state} • ${advice.season.name}</span>
              </div>
              <h2 class="text-xl font-black mt-1">Northeast Horticultural Storage Decision Matrix</h2>
              <p class="text-xs text-muted">Multi-factor recommendation ranking based on real-time sensor streams and produce physiological corridors.</p>
            </div>
            <button class="btn btn-xs btn-outline" id="btn-close-advisor-modal">
              <i data-lucide="x" class="icon-sm"></i>
            </button>
          </div>

          <!-- Scoring Weights Pill Bar -->
          <div class="p-3 bg-card-dark rounded-lg border border-glass text-xs mb-4">
            <span class="text-3xs font-bold text-muted uppercase tracking-wider block mb-1.5">Scoring Model Weights:</span>
            <div class="flex flex-wrap gap-2 text-3xs font-mono">
              <span class="p-1 rounded bg-cyan-light text-cyan">Temp: 30%</span>
              <span class="p-1 rounded bg-emerald-light text-emerald">Humidity: 15%</span>
              <span class="p-1 rounded bg-amber-light text-amber">Capacity: 15%</span>
              <span class="p-1 rounded bg-purple-light text-purple">Freshness: 15%</span>
              <span class="p-1 rounded bg-card-hover text-muted">Weight Loss: 10%</span>
              <span class="p-1 rounded bg-card-hover text-muted">Ethylene: 10%</span>
              <span class="p-1 rounded bg-card-hover text-muted">Duration: 5%</span>
            </div>
          </div>

          <!-- Filter Navigation Tabs -->
          <div class="flex flex-wrap gap-2 mb-4" id="advisor-filter-tabs">
            <button class="admin-tab-btn active" data-filter="user">My Cultivated Crops</button>
            <button class="admin-tab-btn" data-filter="all">All NER Profiles</button>
            <button class="admin-tab-btn" data-filter="z1">Zone 1 (2–8°C)</button>
            <button class="admin-tab-btn" data-filter="z2">Zone 2 (0–2°C)</button>
            <button class="admin-tab-btn" data-filter="z3">Zone 3 (8–15°C)</button>
          </div>

          <!-- Ranked Crops Matrix Container -->
          <div id="advisor-ranking-list" class="space-y-3">
            <!-- Dynamically populated via renderAdvisorRankings() -->
          </div>
        </div>
      </div>
    `;

    this.bindAdvisorModalEvents();
    if (window.lucide) window.lucide.createIcons();

    // Initial DOM population
    this.updateStatusBadges();
    [1, 2, 3].forEach(id => this.updateZoneDOM(id));
    this.updateEnergyDOM();
  }

  bindAdvisorModalEvents() {
    const modal = document.getElementById('advisor-modal-overlay');
    const openBtn = document.getElementById('btn-open-advisor-modal');
    const closeBtn = document.getElementById('btn-close-advisor-modal');

    if (openBtn && modal) {
      openBtn.onclick = () => {
        modal.classList.remove('hidden');
        this.renderAdvisorRankings();
      };
    }

    if (closeBtn && modal) {
      closeBtn.onclick = () => {
        modal.classList.add('hidden');
      };
    }

    // Modal background click close
    if (modal) {
      modal.onclick = (e) => {
        if (e.target === modal) modal.classList.add('hidden');
      };
    }

    // Filter tabs inside modal
    document.querySelectorAll('#advisor-filter-tabs .admin-tab-btn').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('#advisor-filter-tabs .admin-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeFilter = btn.getAttribute('data-filter');
        this.renderAdvisorRankings();
      };
    });
  }

  renderAdvisorRankings() {
    const listContainer = document.getElementById('advisor-ranking-list');
    if (!listContainer) return;

    const user = store.get('user');
    const advice = seasonalAdvisor.generateUserAdvice(user);
    let items = advice.rankings;

    if (this.activeFilter === 'user') {
      items = items.filter(r => r.isUserCrop);
      if (items.length === 0) items = advice.rankings.slice(0, 4);
    } else if (this.activeFilter === 'z1') {
      items = items.filter(r => r.bestZoneId === 1);
    } else if (this.activeFilter === 'z2') {
      items = items.filter(r => r.bestZoneId === 2);
    } else if (this.activeFilter === 'z3') {
      items = items.filter(r => r.bestZoneId === 3);
    }

    listContainer.innerHTML = items.map(item => `
      <div class="p-3.5 bg-card-dark rounded-xl border border-glass hover:border-glass-bright transition-all">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-2">
          <div class="flex items-center gap-2.5">
            <span class="text-xl">${item.rankIcon}</span>
            <div>
              <div class="flex items-center gap-2">
                <span class="font-bold text-sm text-main">${item.crop.name}</span>
                ${item.isUserCrop ? '<span class="badge badge-emerald text-3xs">MY CROP</span>' : ''}
                ${item.isSeasonFlush ? '<span class="badge badge-amber text-3xs">SEASONAL FLUSH</span>' : ''}
              </div>
              <span class="text-3xs text-muted block font-mono">${item.crop.scientificName || item.crop.category}</span>
            </div>
          </div>

          <div class="flex items-center gap-3 text-right">
            <div>
              <span class="badge ${item.tierBadge} text-3xs font-bold">${item.tier}</span>
              <span class="text-3xs text-muted block font-mono mt-0.5">${item.compartment} (${item.targetRange})</span>
            </div>
            <div class="p-2 bg-card rounded border border-glass text-center min-w-16">
              <span class="text-base font-black ${item.score >= 80 ? 'text-emerald' : item.score >= 60 ? 'text-cyan' : 'text-amber'}">${item.score}%</span>
              <span class="text-3xs text-muted block">Fit Score</span>
            </div>
          </div>
        </div>

        <p class="text-xs text-muted mb-2">${item.reason}</p>
        <p class="text-3xs text-dim italic mb-2.5">${item.storageNotes}</p>

        <!-- Sub-score mini meters -->
        <div class="grid grid-cols-4 sm:grid-cols-7 gap-1.5 pt-2 border-t border-glass text-center text-3xs font-mono">
          <div class="p-1 bg-card rounded"><span class="text-muted block">Temp</span><strong class="text-cyan">${item.breakdown.temp}%</strong></div>
          <div class="p-1 bg-card rounded"><span class="text-muted block">Hum</span><strong class="text-emerald">${item.breakdown.hum}%</strong></div>
          <div class="p-1 bg-card rounded"><span class="text-muted block">Cap</span><strong class="text-amber">${item.breakdown.capacity}%</strong></div>
          <div class="p-1 bg-card rounded"><span class="text-muted block">Fresh</span><strong class="text-purple">${item.breakdown.spoilage}%</strong></div>
          <div class="p-1 bg-card rounded"><span class="text-muted block">Weight</span><strong class="text-muted">${item.breakdown.weightLoss}%</strong></div>
          <div class="p-1 bg-card rounded"><span class="text-muted block">Ethylene</span><strong class="text-muted">${item.breakdown.ethylene}%</strong></div>
          <div class="p-1 bg-card rounded"><span class="text-muted block">Life</span><strong class="text-emerald">${item.expectedDays}d</strong></div>
        </div>
      </div>
    `).join('');

    if (window.lucide) window.lucide.createIcons();
  }

  renderZoneCardHTML(zoneId, name, location, range, borderClass) {
    const z = store.get(`zones.${zoneId}`);
    return `
      <div class="glass-card zone-physical-card ${borderClass}" id="zone-card-${zoneId}">
        <div>
          <!-- Header -->
          <div class="flex justify-between items-start mb-3">
            <div>
              <span class="text-3xs font-black tracking-wider text-muted uppercase block">${location}</span>
              <h2 class="text-lg font-black mt-0.5">${name}</h2>
              <span class="text-xs text-muted font-bold">Target: ${range}</span>
            </div>
            <span class="badge badge-emerald text-3xs font-bold" id="z${zoneId}-sensor-badge">ONLINE</span>
          </div>

          <!-- Stored Produce Tag -->
          <div class="p-2 bg-card-dark rounded border border-glass mb-4 flex justify-between items-center text-xs">
            <span class="text-muted truncate"><i data-lucide="package" class="icon-2xs text-cyan inline mr-1"></i> <strong id="z${zoneId}-crop-name">${z.crop}</strong></span>
            <span class="badge badge-neutral text-3xs" id="z${zoneId}-batch-id">${z.batchId}</span>
          </div>

          <!-- Core 4 Environmental Metrics -->
          <div class="space-y-2 mb-4">
            <!-- 1. Temperature -->
            <div class="flex justify-between items-center p-2.5 bg-card-dark rounded-lg border border-glass">
              <span class="text-xs text-muted flex items-center gap-1.5"><i data-lucide="thermometer" class="icon-xs text-cyan"></i> Temperature</span>
              <span class="text-base font-black text-cyan" id="z${zoneId}-temp-val">${z.temperature.toFixed(1)}°C</span>
            </div>

            <!-- 2. Humidity -->
            <div class="flex justify-between items-center p-2.5 bg-card-dark rounded-lg border border-glass">
              <span class="text-xs text-muted flex items-center gap-1.5"><i data-lucide="droplets" class="icon-xs text-emerald"></i> Humidity</span>
              <span class="text-base font-black text-emerald" id="z${zoneId}-hum-val">${z.humidity.toFixed(1)}%</span>
            </div>

            <!-- 3. Weight -->
            <div class="flex justify-between items-center p-2.5 bg-card-dark rounded-lg border border-glass">
              <span class="text-xs text-muted flex items-center gap-1.5"><i data-lucide="scale" class="icon-xs text-amber"></i> Weight</span>
              <span class="text-base font-black text-amber" id="z${zoneId}-weight-val">${z.currentWeight.toFixed(1)} kg</span>
            </div>

            <!-- 4. Ethylene -->
            <div class="flex justify-between items-center p-2.5 bg-card-dark rounded-lg border border-glass">
              <span class="text-xs text-muted flex items-center gap-1.5"><i data-lucide="wind" class="icon-xs text-purple"></i> Ethylene</span>
              <span class="text-base font-black text-purple" id="z${zoneId}-eth-val">${z.ethylene.toFixed(2)} ppm</span>
            </div>
          </div>

          <!-- Status Row (Cooling & Sensor) -->
          <div class="flex justify-between items-center p-2 bg-card-dark rounded border border-glass text-2xs mb-4">
            <span class="text-muted">Cooling: <strong class="text-cyan" id="z${zoneId}-cooling-val">${z.coolingStatus}</strong></span>
            <span class="text-muted">Sensor: <strong class="text-emerald" id="z${zoneId}-sensor-val">${z.sensorStatus}</strong></span>
          </div>
        </div>

        <!-- Action Link -->
        <a href="zones.html" class="btn btn-outline btn-sm w-full mt-2" style="border-color: var(--brand-cyan); color: var(--brand-cyan);">
          <span>VIEW DETAILS</span>
          <i data-lucide="arrow-right" class="icon-xs"></i>
        </a>
      </div>
    `;
  }

  /**
   * High-performance targeted DOM updater for Zone metrics (zero layout recreation)
   */
  updateZoneDOM(zoneId) {
    const z = store.get(`zones.${zoneId}`);
    if (!z) return;

    const tempEl = document.getElementById(`z${zoneId}-temp-val`);
    const humEl = document.getElementById(`z${zoneId}-hum-val`);
    const weightEl = document.getElementById(`z${zoneId}-weight-val`);
    const ethEl = document.getElementById(`z${zoneId}-eth-val`);
    const sensorBadge = document.getElementById(`z${zoneId}-sensor-badge`);
    const sensorVal = document.getElementById(`z${zoneId}-sensor-val`);
    const coolingVal = document.getElementById(`z${zoneId}-cooling-val`);

    const h = z.sensorHealth;

    if (tempEl) {
      if (h.temperature.status === 'ONLINE') {
        tempEl.textContent = `${z.temperature.toFixed(1)}°C`;
        tempEl.className = 'text-base font-black text-cyan';
      } else {
        tempEl.textContent = `OFFLINE (${h.temperature.lastValid}°C)`;
        tempEl.className = 'text-xs font-bold text-rose';
      }
    }

    if (humEl) {
      if (h.humidity.status === 'ONLINE') {
        humEl.textContent = `${z.humidity.toFixed(1)}%`;
        humEl.className = 'text-base font-black text-emerald';
      } else {
        humEl.textContent = `OFFLINE (${h.humidity.lastValid}%)`;
        humEl.className = 'text-xs font-bold text-rose';
      }
    }

    if (weightEl) {
      if (h.weight.status === 'ONLINE') {
        weightEl.textContent = `${z.currentWeight.toFixed(1)} kg`;
        weightEl.className = 'text-base font-black text-amber';
      } else {
        weightEl.textContent = `OFFLINE (${h.weight.lastValid} kg)`;
        weightEl.className = 'text-xs font-bold text-rose';
      }
    }

    if (ethEl) {
      if (h.ethylene.status === 'ONLINE') {
        ethEl.textContent = `${z.ethylene.toFixed(2)} ppm`;
        ethEl.className = 'text-base font-black text-purple';
      } else {
        ethEl.textContent = `OFFLINE (${h.ethylene.lastValid} ppm)`;
        ethEl.className = 'text-xs font-bold text-rose';
      }
    }

    if (sensorBadge) {
      sensorBadge.textContent = z.sensorStatus;
      sensorBadge.className = `badge ${z.sensorStatus === 'ONLINE' ? 'badge-normal' : 'badge-critical'} text-3xs font-bold`;
    }
    if (sensorVal) sensorVal.textContent = z.sensorStatus;
    if (coolingVal) coolingVal.textContent = z.coolingStatus;
  }

  /**
   * High-performance targeted DOM updater for Energy snapshot
   */
  updateEnergyDOM() {
    const e = store.get('energy');
    if (!e) return;

    const solarEl = document.getElementById('dash-solar-val');
    const acEl = document.getElementById('dash-ac-val');
    const battEl = document.getElementById('dash-batt-val');
    const sourceEl = document.getElementById('dash-source-val');
    const gridEl = document.getElementById('dash-grid-val');
    const surplusEl = document.getElementById('dash-surplus-val');

    if (solarEl) solarEl.textContent = `${Math.round(e.solarPowerKw * 1000)} W`;
    if (acEl) acEl.textContent = `${Math.round(e.acPowerKw * 1000)} W`;
    if (battEl) battEl.textContent = `${e.batterySoc}%`;
    if (sourceEl) sourceEl.textContent = e.source || 'SOLAR';
    if (gridEl) gridEl.textContent = `${Math.round(e.gridPowerKw * 1000)} W`;
    if (surplusEl) {
      const surplusW = Math.round(e.energySurplusKw * 1000);
      surplusEl.textContent = `${surplusW >= 0 ? '+' : ''}${surplusW} W`;
      surplusEl.className = surplusW >= 0 ? 'text-emerald' : 'text-rose';
    }
  }

  /**
   * Update top status pills (ESP32 / Firebase / Cooling)
   */
  updateStatusBadges() {
    const conn = store.get('connection');
    const espText = document.getElementById('dash-esp32-text');
    const espDot = document.getElementById('dash-esp32-dot');
    const espPill = document.getElementById('dash-esp32-status');

    if (espText && conn) {
      espText.textContent = `ESP32: ${conn.statusLabel}`;
      if (espDot) espDot.style.background = conn.statusColor;

      if (conn.mode === 'USB' || conn.mode === 'WIFI' || conn.mode === 'DUAL') {
        espPill.style.background = 'var(--brand-emerald-light)';
        espPill.style.color = 'var(--brand-emerald)';
        espPill.style.borderColor = 'rgba(16, 185, 129, 0.4)';
      } else if (conn.mode === 'DEMO') {
        espPill.style.background = 'var(--brand-amber-light)';
        espPill.style.color = 'var(--brand-amber)';
        espPill.style.borderColor = 'rgba(245, 158, 11, 0.4)';
      } else {
        espPill.style.background = 'rgba(244, 63, 94, 0.12)';
        espPill.style.color = 'var(--brand-rose)';
        espPill.style.borderColor = 'rgba(244, 63, 94, 0.3)';
      }
    }
  }

  updateAlertsDOM() {}
}

document.addEventListener('DOMContentLoaded', () => {
  new DashboardPage().init();
});
