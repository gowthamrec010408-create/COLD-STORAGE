/**
 * QORA TECH — Smart Selling Page Controller
 * Prioritizes batches for market dispatch to minimize post-harvest loss.
 */

import { setupNavigation } from './navigation.js';
import { store } from './core/state.js';
import { SmartSellingEngine } from './engine/smart-selling.js';
import { ReportGenerator } from './services/report-generator.js';

class SellingPage {
  init() {
    setupNavigation('selling');
    this.render();
    store.subscribe('batches', () => this.render());
  }

  render() {
    const container = document.getElementById('selling-content');
    if (!container) return;

    const batches = store.get('batches') || [];
    const zoneTelemetry = {
      1: store.get('zones.1'),
      2: store.get('zones.2'),
      3: store.get('zones.3')
    };

    const rankedBatches = SmartSellingEngine.rankBatches(batches, zoneTelemetry);
    const summary = SmartSellingEngine.getSellingSummary(rankedBatches);

    container.innerHTML = `
      <!-- Header -->
      <div class="glass-card mb-6">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div class="flex items-center gap-2">
              <span class="badge badge-amber"><i data-lucide="trending-up" class="icon-sm"></i> POST-HARVEST LOGISTICS</span>
              <span class="text-xs text-muted">Quality & Expiry Driven Dispatch Model</span>
            </div>
            <h1 class="text-2xl font-bold mt-1">Smart Selling & Market Dispatch Priority</h1>
            <p class="text-xs text-muted">Dynamically ranks produce batches across Zones 1–3 to eliminate spoilage and maximize grower profits.</p>
          </div>

          <div class="flex items-center gap-3">
            <button class="btn btn-outline" id="export-manifest-btn">
              <i data-lucide="file-text"></i> Export Dispatch Manifest
            </button>
            <a href="batches.html" class="btn btn-primary">
              <i data-lucide="plus-circle"></i> Add Batch
            </a>
          </div>
        </div>
      </div>

      <!-- Quick Summary Stats Grid -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div class="glass-card stat-card border-rose">
          <div class="stat-header">
            <span class="stat-label">SELL FIRST (URGENT)</span>
            <span class="badge badge-critical font-bold">Priority 1</span>
          </div>
          <div class="stat-number text-rose">${summary.sellFirstCount} Batches</div>
          <p class="stat-sub text-rose font-medium">Immediate market dispatch recommended</p>
        </div>

        <div class="glass-card stat-card border-amber">
          <div class="stat-header">
            <span class="stat-label">SELL SOON</span>
            <span class="badge badge-warning font-bold">Priority 2</span>
          </div>
          <div class="stat-number text-amber">${summary.sellSoonCount} Batches</div>
          <p class="stat-sub text-amber font-medium">Dispatch within 48–72 hours</p>
        </div>

        <div class="glass-card stat-card border-emerald">
          <div class="stat-header">
            <span class="stat-label">SAFE TO STORE</span>
            <span class="badge badge-normal font-bold">Priority 3</span>
          </div>
          <div class="stat-number text-emerald">${summary.safeCount} Batches</div>
          <p class="stat-sub text-emerald font-medium">Optimal storage conditions holding</p>
        </div>

        <div class="glass-card stat-card">
          <div class="stat-header">
            <span class="stat-label">TOTAL INVENTORY</span>
            <i data-lucide="package" class="text-muted"></i>
          </div>
          <div class="stat-number">${summary.totalWeightKg} <span class="text-sm font-normal">kg</span></div>
          <p class="stat-sub text-muted">Across 3 Storage Zones</p>
        </div>
      </div>

      <!-- Ranked Batches Priority Table -->
      <div class="glass-card mb-8">
        <div class="flex justify-between items-center mb-4">
          <h3 class="font-bold text-base flex items-center gap-2">
            <i data-lucide="list-ordered" class="text-amber"></i> Quality-Ranked Produce Queue
          </h3>
          <span class="text-xs text-muted">Sorted automatically by Urgency Score</span>
        </div>

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Batch & Produce</th>
                <th>Zone</th>
                <th>Mass & Loss</th>
                <th>Age</th>
                <th>Freshness</th>
                <th>Est. Shelf Life</th>
                <th>Action Recommendation</th>
                <th>Dispatch</th>
              </tr>
            </thead>
            <tbody>
              ${rankedBatches.map((batch, index) => {
                const pred = batch.prediction;
                const m = pred.metrics;

                return `
                  <tr class="batch-row ${batch.priorityLevel === 1 ? 'row-urgent' : ''}">
                    <td class="font-black text-lg">#${index + 1}</td>
                    <td>
                      <div class="font-bold">${batch.name}</div>
                      <div class="text-3xs text-muted">${batch.variety} • <span class="font-mono">${batch.id}</span></div>
                      <div class="text-3xs text-muted">Farmer: ${batch.farmer}</div>
                    </td>
                    <td>
                      <span class="badge zone-tag-${batch.zoneId}">Zone ${batch.zoneId}</span>
                    </td>
                    <td>
                      <div class="font-bold">${batch.currentWeight} kg</div>
                      <div class="text-3xs text-rose font-medium">-${m.weightLossKg} kg (${m.weightLossPercent}%)</div>
                    </td>
                    <td>
                      <div class="font-semibold">${batch.durationDays} Days</div>
                      <div class="text-3xs text-muted">Stored: ${batch.dateStored}</div>
                    </td>
                    <td>
                      <div class="flex items-center gap-2">
                        <span class="font-black text-sm">${pred.freshnessScore}%</span>
                        <div class="mini-progress-bar">
                          <div class="mini-progress-fill" style="width: ${pred.freshnessScore}%; background: ${pred.freshnessScore > 75 ? '#10b981' : pred.freshnessScore > 50 ? '#f59e0b' : '#ef4444'}"></div>
                        </div>
                      </div>
                      <div class="text-3xs text-muted font-bold">${pred.spoilageRisk} RISK</div>
                    </td>
                    <td>
                      <div class="font-black text-cyan text-sm">${pred.remainingShelfLifeText}</div>
                      <div class="text-3xs text-muted">${pred.qualityTrend}</div>
                    </td>
                    <td>
                      <span class="badge ${batch.badgeClass}">
                        ${batch.marketActionText}
                      </span>
                    </td>
                    <td>
                      <button class="btn btn-xs btn-outline dispatch-btn" data-id="${batch.id}">
                        <i data-lucide="check-circle" class="icon-xs text-emerald"></i> Dispatch
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    this.bindEvents();
    if (window.lucide) window.lucide.createIcons();
  }

  bindEvents() {
    document.getElementById('export-manifest-btn')?.addEventListener('click', () => {
      ReportGenerator.exportPDF('quality');
    });

    document.querySelectorAll('.dispatch-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        if (confirm(`Mark batch ${id} as dispatched to market?`)) {
          const batches = store.get('batches') || [];
          const updated = batches.filter(b => b.id !== id);
          store.set('batches', updated);
          this.render();
        }
      });
    });
  }
}

const page = new SellingPage();
page.init();
