/**
 * Solar Smart Cold Storage — Historical Telemetry & Analytics UI
 * Uses Chart.js to render multi-parameter historical graphs across
 * 1h, 6h, 24h, 7d, and 30d windows for Zones 1-3.
 */

import { store } from '../core/state.js';
import { firebaseService } from '../services/firebase-service.js';

export class AnalyticsUI {
  constructor() {
    this.selectedZone = 1;
    this.selectedRange = '24h';
    this.charts = {};
  }

  render() {
    const container = document.getElementById('view-analytics');
    if (!container) return;

    container.innerHTML = `
      <!-- Header -->
      <div class="analytics-header glass-card mb-6">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div class="flex items-center gap-2">
              <span class="badge badge-cyan"><i data-lucide="line-chart" class="icon-sm"></i> TIME-SERIES TELEMETRY</span>
              <span class="text-xs text-muted">Indexed Historical Queries</span>
            </div>
            <h2 class="text-2xl font-bold mt-1">Sensor Telemetry & Historical Trends</h2>
            <p class="text-sm text-muted">Analyze environmental stability, cumulative transpiration loss, and ethylene gas spikes.</p>
          </div>

          <!-- Controls: Zone + Time Range Filters -->
          <div class="flex flex-wrap items-center gap-3">
            <div class="zone-switcher-tabs">
              ${[1, 2, 3].map(zId => `
                <button class="zone-tab-btn analytics-zone-btn ${this.selectedZone === zId ? 'active' : ''}" data-zone="${zId}">
                  Zone ${zId}
                </button>
              `).join('')}
            </div>

            <div class="time-range-tabs">
              ${['1h', '6h', '24h', '7d', '30d'].map(range => `
                <button class="range-btn ${this.selectedRange === range ? 'active' : ''}" data-range="${range}">
                  ${range.toUpperCase()}
                </button>
              `).join('')}
            </div>
          </div>
        </div>
      </div>

      <!-- Charts Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <!-- 1. Temperature Trend vs Target Corridor Chart -->
        <div class="glass-card chart-card">
          <div class="chart-header flex justify-between items-center mb-4">
            <h3 class="font-bold text-base flex items-center gap-2">
              <i data-lucide="thermometer" class="text-emerald"></i> Temperature Corridor (°C)
            </h3>
            <span class="text-xs text-muted" id="temp-chart-range-label">Window: ${this.selectedRange}</span>
          </div>
          <div class="chart-canvas-wrapper">
            <canvas id="chart-temperature"></canvas>
          </div>
        </div>

        <!-- 2. Humidity Progression Chart -->
        <div class="glass-card chart-card">
          <div class="chart-header flex justify-between items-center mb-4">
            <h3 class="font-bold text-base flex items-center gap-2">
              <i data-lucide="droplets" class="text-cyan"></i> Relative Humidity (%RH)
            </h3>
            <span class="text-xs text-muted">Target: 85–95%</span>
          </div>
          <div class="chart-canvas-wrapper">
            <canvas id="chart-humidity"></canvas>
          </div>
        </div>

        <!-- 3. HX711 Weight Loss Chart -->
        <div class="glass-card chart-card">
          <div class="chart-header flex justify-between items-center mb-4">
            <h3 class="font-bold text-base flex items-center gap-2">
              <i data-lucide="scale" class="text-amber"></i> Load Cell Weight Loss (kg)
            </h3>
            <span class="text-xs text-muted">Continuous Transpiration</span>
          </div>
          <div class="chart-canvas-wrapper">
            <canvas id="chart-weight"></canvas>
          </div>
        </div>

        <!-- 4. Ethylene Gas ppm & Freshness Trend Chart -->
        <div class="glass-card chart-card">
          <div class="chart-header flex justify-between items-center mb-4">
            <h3 class="font-bold text-base flex items-center gap-2">
              <i data-lucide="wind" class="text-purple"></i> Ethylene Gas (ppm) & Freshness (%)
            </h3>
            <span class="text-xs text-muted">Climacteric Acceleration</span>
          </div>
          <div class="chart-canvas-wrapper">
            <canvas id="chart-ethylene"></canvas>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
    this.renderCharts();
    if (window.lucide) window.lucide.createIcons();
  }

  bindEvents() {
    document.querySelectorAll('.analytics-zone-btn').forEach(btn => {
      btn.onclick = () => {
        this.selectedZone = Number(btn.getAttribute('data-zone'));
        this.render();
      };
    });

    document.querySelectorAll('.range-btn').forEach(btn => {
      btn.onclick = () => {
        this.selectedRange = btn.getAttribute('data-range');
        this.render();
      };
    });
  }

  async renderCharts() {
    if (!window.Chart) {
      console.warn('Chart.js library loading...');
      return;
    }

    const data = await firebaseService.fetchHistoricalData(this.selectedZone, this.selectedRange);

    // Destroy existing charts to avoid canvas overlap
    Object.keys(this.charts).forEach(key => {
      if (this.charts[key]) this.charts[key].destroy();
    });

    // Chart 1: Temperature
    const ctxTemp = document.getElementById('chart-temperature')?.getContext('2d');
    if (ctxTemp) {
      this.charts.temp = new Chart(ctxTemp, {
        type: 'line',
        data: {
          labels: data.labels,
          datasets: [{
            label: `Zone ${this.selectedZone} Temp (°C)`,
            data: data.temperature,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            borderWidth: 2,
            tension: 0.35,
            fill: true
          }]
        },
        options: this.getChartOptions('°C')
      });
    }

    // Chart 2: Humidity
    const ctxHum = document.getElementById('chart-humidity')?.getContext('2d');
    if (ctxHum) {
      this.charts.hum = new Chart(ctxHum, {
        type: 'line',
        data: {
          labels: data.labels,
          datasets: [{
            label: `Zone ${this.selectedZone} Humidity (%)`,
            data: data.humidity,
            borderColor: '#06b6d4',
            backgroundColor: 'rgba(6, 182, 212, 0.1)',
            borderWidth: 2,
            tension: 0.35,
            fill: true
          }]
        },
        options: this.getChartOptions('%RH')
      });
    }

    // Chart 3: Weight
    const ctxWeight = document.getElementById('chart-weight')?.getContext('2d');
    if (ctxWeight) {
      this.charts.weight = new Chart(ctxWeight, {
        type: 'line',
        data: {
          labels: data.labels,
          datasets: [{
            label: `Weight (kg)`,
            data: data.weight,
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            borderWidth: 2,
            tension: 0.2,
            fill: true
          }]
        },
        options: this.getChartOptions('kg')
      });
    }

    // Chart 4: Ethylene & Freshness
    const ctxEth = document.getElementById('chart-ethylene')?.getContext('2d');
    if (ctxEth) {
      this.charts.eth = new Chart(ctxEth, {
        type: 'line',
        data: {
          labels: data.labels,
          datasets: [
            {
              label: `Ethylene (ppm)`,
              data: data.ethylene,
              borderColor: '#a855f7',
              backgroundColor: 'rgba(168, 85, 247, 0.1)',
              borderWidth: 2,
              yAxisID: 'y1',
              tension: 0.35
            },
            {
              label: `Freshness Score (%)`,
              data: data.freshness,
              borderColor: '#10b981',
              borderDash: [5, 5],
              borderWidth: 2,
              yAxisID: 'y2',
              tension: 0.3
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: { legend: { labels: { color: '#94a3b8', font: { size: 11 } } } },
          scales: {
            x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
            y1: { type: 'linear', position: 'left', grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#a855f7' } },
            y2: { type: 'linear', position: 'right', min: 0, max: 100, grid: { drawOnChartArea: false }, ticks: { color: '#10b981' } }
          }
        }
      });
    }
  }

  getChartOptions(unit) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { color: '#94a3b8', font: { size: 11 } } },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${ctx.raw} ${unit}`
          }
        }
      },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8', maxTicksLimit: 8 } },
        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } }
      }
    };
  }
}

export const analyticsUI = new AnalyticsUI();
