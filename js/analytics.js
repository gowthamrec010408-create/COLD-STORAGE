/**
 * QORA TECH — Historical Telemetry & Analytics Page Controller
 * High-performance on-demand chart renderer (single active canvas, proper cleanup, metric & time range selectors).
 */

import { setupNavigation } from './navigation.js';
import { store } from './core/state.js';
import { fbService } from './services/firebase-service.js';

class AnalyticsPage {
  constructor() {
    this.selectedZone = 1;
    this.selectedMetric = 'temperature'; // 'temperature' | 'humidity' | 'weight' | 'ethylene' | 'energy'
    this.selectedRange = '24h';          // '24h' | '7d' | '30d'
    this.activeChart = null;
  }

  init() {
    setupNavigation('analytics');
    this.render();
  }

  render() {
    const container = document.getElementById('analytics-content');
    if (!container) return;

    const metricTitles = {
      temperature: { label: 'Temperature (°C)', icon: 'thermometer', color: '#06b6d4', desc: 'Real-time & historic temperature corridors' },
      humidity: { label: 'Relative Humidity (%RH)', icon: 'droplets', color: '#10b981', desc: 'Air moisture saturation tracking' },
      weight: { label: 'Load Cell Weight (kg)', icon: 'scale', color: '#f59e0b', desc: 'Continuous transpiration mass loss' },
      ethylene: { label: 'Ethylene Gas (ppm)', icon: 'wind', color: '#a855f7', desc: 'Ripening hormone concentration spikes' },
      energy: { label: 'Solar & AC Energy (Watts)', icon: 'zap', color: '#f59e0b', desc: 'Solar PV generation vs. cooling draw' }
    };

    const currentInfo = metricTitles[this.selectedMetric];

    container.innerHTML = `
      <!-- Header & Metric Selectors -->
      <div class="glass-card mb-6">
        <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <div class="flex items-center gap-2">
              <span class="badge badge-cyan"><i data-lucide="line-chart" class="icon-sm"></i> ON-DEMAND ANALYTICS</span>
              <span class="text-xs text-muted">Single-Canvas High-Speed Rendering</span>
            </div>
            <h1 class="text-2xl font-bold mt-1">Telemetry Trends & Analysis</h1>
            <p class="text-xs text-muted">Select an environmental metric and duration to inspect historical data without browser lag.</p>
          </div>

          <!-- Zone and Time Range Selector -->
          <div class="flex flex-wrap items-center gap-3">
            <!-- Zone Select -->
            <div class="flex items-center gap-1 bg-card-dark p-1 rounded-lg border border-glass">
              ${[1, 2, 3].map(zId => `
                <button class="btn btn-xs zone-select-btn ${this.selectedZone === zId ? 'btn-primary' : 'btn-outline'}" data-zone="${zId}">
                  Zone ${zId}
                </button>
              `).join('')}
            </div>

            <!-- Time Range Select -->
            <div class="flex items-center gap-1 bg-card-dark p-1 rounded-lg border border-glass">
              ${['24h', '7d', '30d'].map(range => `
                <button class="btn btn-xs range-select-btn ${this.selectedRange === range ? 'btn-primary' : 'btn-outline'}" data-range="${range}">
                  ${range === '24h' ? '24 Hours' : range === '7d' ? '7 Days' : '30 Days'}
                </button>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Metric Navigation Tabs -->
        <div class="flex flex-wrap gap-2 mt-6 pt-4 border-t border-glass">
          ${Object.keys(metricTitles).map(mKey => {
            const m = metricTitles[mKey];
            const isActive = this.selectedMetric === mKey;
            return `
              <button class="btn btn-sm metric-tab-btn ${isActive ? 'btn-primary' : 'btn-outline'}" data-metric="${mKey}">
                <i data-lucide="${m.icon}" class="icon-xs"></i>
                <span>${m.label.split('(')[0].trim()}</span>
              </button>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Single Active Chart Card -->
      <div class="glass-card mb-8">
        <div class="flex justify-between items-center mb-4">
          <div class="flex items-center gap-2">
            <i data-lucide="${currentInfo.icon}" style="color: ${currentInfo.color};"></i>
            <div>
              <h2 class="text-base font-bold">${currentInfo.label} — Zone ${this.selectedZone}</h2>
              <span class="text-3xs text-muted">${currentInfo.desc} • Range: ${this.selectedRange}</span>
            </div>
          </div>
          <button class="btn btn-xs btn-outline" id="btn-refresh-chart">
            <i data-lucide="refresh-cw" class="icon-xs"></i> Refresh Chart
          </button>
        </div>

        <!-- Chart Canvas Container -->
        <div style="position: relative; height: 380px; width: 100%;">
          <canvas id="active-telemetry-chart"></canvas>
        </div>
      </div>
    `;

    this.bindEvents();
    this.renderActiveChart();
    if (window.lucide) window.lucide.createIcons();
  }

  bindEvents() {
    document.querySelectorAll('.zone-select-btn').forEach(btn => {
      btn.onclick = () => {
        this.selectedZone = parseInt(btn.getAttribute('data-zone'), 10);
        this.render();
      };
    });

    document.querySelectorAll('.range-select-btn').forEach(btn => {
      btn.onclick = () => {
        this.selectedRange = btn.getAttribute('data-range');
        this.render();
      };
    });

    document.querySelectorAll('.metric-tab-btn').forEach(btn => {
      btn.onclick = () => {
        this.selectedMetric = btn.getAttribute('data-metric');
        this.render();
      };
    });

    const refreshBtn = document.getElementById('btn-refresh-chart');
    if (refreshBtn) {
      refreshBtn.onclick = () => this.renderActiveChart();
    }
  }

  renderActiveChart() {
    if (!window.Chart) return;

    // Destroy existing Chart.js instance to prevent memory leaks and overlapping canvas bugs
    if (this.activeChart) {
      this.activeChart.destroy();
      this.activeChart = null;
    }

    const canvas = document.getElementById('active-telemetry-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const data = fbService.generateSampleTimeSeries(this.selectedZone, this.selectedRange);

    let datasetLabel = '';
    let datasetValues = [];
    let strokeColor = '#06b6d4';
    let bgColor = 'rgba(6, 182, 212, 0.12)';

    if (this.selectedMetric === 'temperature') {
      datasetLabel = `Zone ${this.selectedZone} Temperature (°C)`;
      datasetValues = data.tempData;
      strokeColor = '#06b6d4';
      bgColor = 'rgba(6, 182, 212, 0.12)';
    } else if (this.selectedMetric === 'humidity') {
      datasetLabel = `Zone ${this.selectedZone} Relative Humidity (%)`;
      datasetValues = data.humData;
      strokeColor = '#10b981';
      bgColor = 'rgba(16, 185, 129, 0.12)';
    } else if (this.selectedMetric === 'weight') {
      datasetLabel = `Zone ${this.selectedZone} Weight (kg)`;
      datasetValues = data.weightData;
      strokeColor = '#f59e0b';
      bgColor = 'rgba(245, 158, 11, 0.12)';
    } else if (this.selectedMetric === 'ethylene') {
      datasetLabel = `Zone ${this.selectedZone} Ethylene Gas (ppm)`;
      datasetValues = data.ethyleneData;
      strokeColor = '#a855f7';
      bgColor = 'rgba(168, 85, 247, 0.12)';
    } else if (this.selectedMetric === 'energy') {
      datasetLabel = `Solar PV Generation (Watts)`;
      datasetValues = data.labels.map(() => Math.round(750 + (Math.random() - 0.5) * 120));
      strokeColor = '#f59e0b';
      bgColor = 'rgba(245, 158, 11, 0.12)';
    }

    this.activeChart = new window.Chart(ctx, {
      type: 'line',
      data: {
        labels: data.labels,
        datasets: [{
          label: datasetLabel,
          data: datasetValues,
          borderColor: strokeColor,
          backgroundColor: bgColor,
          borderWidth: 2,
          fill: true,
          tension: 0.35,
          pointRadius: this.selectedRange === '24h' ? 3 : 2,
          pointBackgroundColor: strokeColor
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 400 },
        plugins: {
          legend: { display: true, labels: { color: '#94a3b8', font: { family: 'Inter', size: 12 } } },
          tooltip: { mode: 'index', intersect: false }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#64748b', font: { size: 10 } }
          },
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#64748b', font: { size: 10 } }
          }
        }
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new AnalyticsPage().init();
});
