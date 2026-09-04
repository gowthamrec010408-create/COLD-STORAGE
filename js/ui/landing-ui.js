/**
 * Solar Smart Cold Storage — Landing Page UI Component
 * High-impact presentation for agricultural solar smart storage system.
 */

import { store } from '../core/state.js';

export function renderLandingView() {
  const container = document.getElementById('view-landing');
  if (!container) return;

    const energy = store.get('energy') || {};
    const zones = [1, 2, 3].map(id => store.get(`zones.${id}`) || {});

    const solarWatts = energy.solarPowerKw ? Math.round(energy.solarPowerKw * 1000) : 3850;
    const batterySoc = energy.batterySoc !== undefined ? energy.batterySoc : 78;
    const batteryVolts = energy.batteryVoltageV !== undefined ? energy.batteryVoltageV : 52.4;

    container.innerHTML = `
      <!-- Hero Section -->
      <section class="landing-hero">
        <div class="hero-backdrop-glow"></div>
        <div class="hero-content">
          <div class="hero-badge">
            <span class="pulse-dot"></span>
            <span>SOLAR-POWERED • 3-ZONE COLD STORAGE • AI PREDICTION</span>
          </div>
          <h1 class="hero-title">
            Next-Generation Post-Harvest <br/>
            <span class="gradient-text">IoT + AI Spoilage Prevention</span>
          </h1>
          <p class="hero-subtitle">
            Intelligent solar-driven multi-zone cold chain monitoring. Track independent zone micro-climates, 
            continuous weight-loss transpiration, and ethylene surges to prevent spoilage and prioritize high-value market sales.
          </p>
          <div class="hero-actions">
            <button class="btn btn-primary btn-lg shadow-emerald" id="landing-open-dashboard-btn">
              <i data-lucide="layout-dashboard"></i> Open Live Dashboard
            </button>
            <button class="btn btn-glass btn-lg" id="landing-explore-ai-btn">
              <i data-lucide="sparkles"></i> Explore AI Engine
            </button>
            <button class="btn btn-outline btn-lg" id="landing-demo-btn">
              <i data-lucide="play-circle" class="text-emerald"></i> Instant Farmer Demo
            </button>
          </div>

          <!-- Quick Live Telemetry Preview Pill -->
          <div class="hero-live-strip glass-card mt-8">
            <div class="strip-item">
              <span class="strip-label"><i data-lucide="sun" class="text-amber"></i> Solar Generation</span>
              <span class="strip-val" id="strip-solar">${solarWatts} W</span>
            </div>
            <div class="strip-divider"></div>
            <div class="strip-item">
              <span class="strip-label"><i data-lucide="battery-charging" class="text-emerald"></i> Battery Storage</span>
              <span class="strip-val" id="strip-battery">${batterySoc}% (${batteryVolts}V)</span>
            </div>
            <div class="strip-divider"></div>
            <div class="strip-item">
              <span class="strip-label"><i data-lucide="cpu" class="text-cyan"></i> ESP32 Controller</span>
              <span class="strip-val text-emerald">ONLINE (12 Sensors)</span>
            </div>
            <div class="strip-divider"></div>
            <div class="strip-item">
              <span class="strip-label"><i data-lucide="shield-check" class="text-indigo"></i> Grid Dependence</span>
              <span class="strip-val text-emerald">0% (100% Solar)</span>
            </div>
          </div>
        </div>
      </section>

    <!-- Three-Zone Architecture Showcase -->
    <section class="landing-section">
      <div class="section-header text-center">
        <span class="section-tag">THREE INDEPENDENT STORAGE ZONES</span>
        <h2 class="section-title">Optimized Microclimates for Every Crop Type</h2>
        <p class="section-desc">
          Each zone maintains independent target temperatures, humidity controls, 
          dedicated HX711 load-cells, and electrochemical ethylene gas sensors.
        </p>
      </div>

      <div class="landing-zones-grid">
        <!-- Zone 1 Card -->
        <div class="zone-preview-card glass-card border-emerald">
          <div class="zone-card-header">
            <div class="zone-tag tag-emerald">ZONE 1</div>
            <span class="target-corridor">Target: 10–13°C</span>
          </div>
          <h3 class="zone-name">Tropical & Solanaceous</h3>
          <p class="zone-crops">Tomatoes, Potatoes, Chillies, Bananas</p>
          <div class="zone-preview-metrics">
            <div class="p-metric">
              <span class="p-label">Temp</span>
              <span class="p-val text-emerald">${zones[0].temperature}°C</span>
            </div>
            <div class="p-metric">
              <span class="p-label">Humidity</span>
              <span class="p-val">${zones[0].humidity}%</span>
            </div>
            <div class="p-metric">
              <span class="p-label">Ethylene</span>
              <span class="p-val">${zones[0].ethylene} ppm</span>
            </div>
            <div class="p-metric">
              <span class="p-label">Weight</span>
              <span class="p-val">${zones[0].currentWeight} kg</span>
            </div>
          </div>
          <div class="zone-feature-list">
            <div><i data-lucide="check" class="text-emerald"></i> Prevents chilling injury</div>
            <div><i data-lucide="check" class="text-emerald"></i> Dedicated HX711 tare & load cell</div>
          </div>
        </div>

        <!-- Zone 2 Card -->
        <div class="zone-preview-card glass-card border-cyan">
          <div class="zone-card-header">
            <div class="zone-tag tag-cyan">ZONE 2</div>
            <span class="target-corridor">Target: 0–2°C</span>
          </div>
          <h3 class="zone-name">Deep Chill & Deciduous</h3>
          <p class="zone-crops">Apples, Carrots, Cabbage, Leafy Greens</p>
          <div class="zone-preview-metrics">
            <div class="p-metric">
              <span class="p-label">Temp</span>
              <span class="p-val text-cyan">${zones[1].temperature}°C</span>
            </div>
            <div class="p-metric">
              <span class="p-label">Humidity</span>
              <span class="p-val">${zones[1].humidity}%</span>
            </div>
            <div class="p-metric">
              <span class="p-label">Ethylene</span>
              <span class="p-val">${zones[1].ethylene} ppm</span>
            </div>
            <div class="p-metric">
              <span class="p-label">Weight</span>
              <span class="p-val">${zones[1].currentWeight} kg</span>
            </div>
          </div>
          <div class="zone-feature-list">
            <div><i data-lucide="check" class="text-cyan"></i> Near-zero respiration slowing</div>
            <div><i data-lucide="check" class="text-cyan"></i> High humidity saturation lock</div>
          </div>
        </div>

        <!-- Zone 3 Card -->
        <div class="zone-preview-card glass-card border-purple">
          <div class="zone-card-header">
            <div class="zone-tag tag-purple">ZONE 3</div>
            <span class="target-corridor">Target: 0–8°C</span>
          </div>
          <h3 class="zone-name">Temperate & Legumes</h3>
          <p class="zone-crops">Green Beans, Peas, Cucumbers, Zucchini</p>
          <div class="zone-preview-metrics">
            <div class="p-metric">
              <span class="p-label">Temp</span>
              <span class="p-val text-purple">${zones[2].temperature}°C</span>
            </div>
            <div class="p-metric">
              <span class="p-label">Humidity</span>
              <span class="p-val">${zones[2].humidity}%</span>
            </div>
            <div class="p-metric">
              <span class="p-label">Ethylene</span>
              <span class="p-val">${zones[2].ethylene} ppm</span>
            </div>
            <div class="p-metric">
              <span class="p-label">Weight</span>
              <span class="p-val">${zones[2].currentWeight} kg</span>
            </div>
          </div>
          <div class="zone-feature-list">
            <div><i data-lucide="check" class="text-purple"></i> Flexible moderate chill envelope</div>
            <div><i data-lucide="check" class="text-purple"></i> Early ethylene climacteric alert</div>
          </div>
        </div>
      </div>
    </section>

    <!-- System Flow Diagram & Features -->
    <section class="landing-section">
      <div class="section-header text-center">
        <span class="section-tag">END-TO-END WORKFLOW</span>
        <h2 class="section-title">From Solar Photons to Smart Selling Insights</h2>
      </div>

      <div class="landing-flow-container glass-card">
        <div class="flow-step">
          <div class="flow-icon"><i data-lucide="sun"></i></div>
          <h4>1. Solar Power</h4>
          <p>PV array + MPPT battery bank powers cooling compressors & ESP32 controller 24/7.</p>
        </div>
        <div class="flow-arrow"><i data-lucide="arrow-right"></i></div>
        <div class="flow-step">
          <div class="flow-icon"><i data-lucide="cpu"></i></div>
          <h4>2. Multi-Zone IoT</h4>
          <p>ESP32 samples temperature, humidity, HX711 weight, & ethylene gas across 3 zones.</p>
        </div>
        <div class="flow-arrow"><i data-lucide="arrow-right"></i></div>
        <div class="flow-step">
          <div class="flow-icon"><i data-lucide="flame"></i></div>
          <h4>3. Firebase Realtime</h4>
          <p>Instant cloud telemetry sync, historical aggregation, and mobile alert notifications.</p>
        </div>
        <div class="flow-arrow"><i data-lucide="arrow-right"></i></div>
        <div class="flow-step">
          <div class="flow-icon"><i data-lucide="sparkles"></i></div>
          <h4>4. AI Spoilage & Selling</h4>
          <p>Multi-parameter biological scoring calculates freshness score & ranks batches for market.</p>
        </div>
      </div>
    </section>

    <!-- Call to Action Banner -->
    <section class="landing-cta-banner glass-card mt-12 mb-12">
      <div class="cta-text">
        <h2>Ready to Eliminate Post-Harvest Losses?</h2>
        <p>Register your farm storage unit or log in with verified technician credentials.</p>
      </div>
      <div class="cta-actions">
        <a href="#login" class="btn btn-primary btn-lg">Create Farm Account</a>
      </div>
    </section>
  `;

  // Bind all hero buttons
  const openDashboard = async () => {
    const { authService } = await import('../core/auth.js');
    const user = store.get('user');
    if (!user || user.status !== 'approved') {
      await authService.quickDemoLogin('farmer');
    }
    window.location.hash = '#dashboard';
  };

  const openPrediction = async () => {
    const { authService } = await import('../core/auth.js');
    const user = store.get('user');
    if (!user || user.status !== 'approved') {
      await authService.quickDemoLogin('farmer');
    }
    window.location.hash = '#prediction';
  };

  document.getElementById('landing-open-dashboard-btn')?.addEventListener('click', openDashboard);
  document.getElementById('landing-explore-ai-btn')?.addEventListener('click', openPrediction);
  document.getElementById('landing-demo-btn')?.addEventListener('click', openDashboard);

  if (window.lucide) window.lucide.createIcons();
}
