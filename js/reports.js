/**
 * QORA TECH — Operational Reports & Exports Page Controller
 * Handles PDF (jsPDF + autoTable), Excel (SheetJS), and CSV exports.
 */

import { setupNavigation } from './navigation.js';
import { ReportGenerator } from './services/report-generator.js';

class ReportsPage {
  init() {
    setupNavigation('reports');
    this.render();
  }

  render() {
    const container = document.getElementById('reports-content');
    if (!container) return;

    container.innerHTML = `
      <!-- Header -->
      <div class="glass-card mb-6">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div class="flex items-center gap-2">
              <span class="badge badge-emerald"><i data-lucide="file-check" class="icon-sm"></i> AUDIT & COMPLIANCE</span>
              <span class="text-xs text-muted">HACCP & Cold Chain Post-Harvest Documentation</span>
            </div>
            <h1 class="text-2xl font-bold mt-1">Operational Reports & Data Exports</h1>
            <p class="text-xs text-muted">Generate certified PDF certificates, sensor time-series spreadsheets, and dispatch receipts.</p>
          </div>

          <div class="flex items-center gap-3">
            <button class="btn btn-primary" id="quick-pdf-btn">
              <i data-lucide="file-text"></i> Quick Daily PDF
            </button>
            <button class="btn btn-outline" id="quick-excel-btn">
              <i data-lucide="table"></i> Export All to Excel
            </button>
          </div>
        </div>
      </div>

      <!-- Report Generator Cards Grid -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <!-- 1. Daily Operational Log -->
        <div class="glass-card report-card">
          <div>
            <div class="report-icon bg-emerald-light"><i data-lucide="calendar" class="text-emerald"></i></div>
            <h3 class="font-bold text-lg mt-3">Daily Operations & Sensor Audit</h3>
            <p class="text-xs text-muted my-2">Summary of 24h temperature compliance corridors, humidity stability, and load cell weight loss across Zones 1–3.</p>
          </div>
          <div class="flex gap-2 mt-4">
            <button class="btn btn-sm btn-primary flex-1 export-report-btn" data-type="daily" data-format="pdf">
              <i data-lucide="file-text"></i> PDF
            </button>
            <button class="btn btn-sm btn-outline flex-1 export-report-btn" data-type="daily" data-format="xlsx">
              <i data-lucide="table"></i> Excel
            </button>
          </div>
        </div>

        <!-- 2. AI Spoilage & Freshness Assessment -->
        <div class="glass-card report-card">
          <div>
            <div class="report-icon bg-cyan-light"><i data-lucide="sparkles" class="text-cyan"></i></div>
            <h3 class="font-bold text-lg mt-3">AI Spoilage & Freshness Certificate</h3>
            <p class="text-xs text-muted my-2">Batch-by-batch breakdown of remaining shelf life, ethylene gas accumulation, and smart selling recommendations.</p>
          </div>
          <div class="flex gap-2 mt-4">
            <button class="btn btn-sm btn-primary flex-1 export-report-btn" data-type="quality" data-format="pdf">
              <i data-lucide="file-text"></i> PDF
            </button>
            <button class="btn btn-sm btn-outline flex-1 export-report-btn" data-type="quality" data-format="xlsx">
              <i data-lucide="table"></i> Excel
            </button>
          </div>
        </div>

        <!-- 3. Solar Generation & Energy Storage -->
        <div class="glass-card report-card">
          <div>
            <div class="report-icon bg-amber-light"><i data-lucide="sun" class="text-amber"></i></div>
            <h3 class="font-bold text-lg mt-3">Solar Power & Energy Audit</h3>
            <p class="text-xs text-muted my-2">Detailed log of PV kilowatt-hour harvest, battery charge/discharge cycles, and cooling compressor duty cycle efficiency.</p>
          </div>
          <div class="flex gap-2 mt-4">
            <button class="btn btn-sm btn-primary flex-1 export-report-btn" data-type="energy" data-format="pdf">
              <i data-lucide="file-text"></i> PDF
            </button>
            <button class="btn btn-sm btn-outline flex-1 export-report-btn" data-type="energy" data-format="xlsx">
              <i data-lucide="table"></i> Excel
            </button>
          </div>
        </div>
      </div>

      <!-- Raw CSV Fast Export Banner -->
      <div class="glass-card flex flex-col md:flex-row justify-between items-center gap-4 p-6">
        <div>
          <h4 class="font-bold text-base flex items-center gap-2">
            <i data-lucide="download" class="text-emerald"></i> Raw CSV Data Export
          </h4>
          <p class="text-xs text-muted">Export clean comma-separated values compatible with MATLAB, Python pandas, or external IoT databases.</p>
        </div>
        <button class="btn btn-outline" id="raw-csv-btn">
          <i data-lucide="file-spreadsheet"></i> Export CSV Dataset
        </button>
      </div>
    `;

    this.bindEvents();
    if (window.lucide) window.lucide.createIcons();
  }

  bindEvents() {
    document.getElementById('quick-pdf-btn')?.addEventListener('click', () => ReportGenerator.exportPDF('daily'));
    document.getElementById('quick-excel-btn')?.addEventListener('click', () => ReportGenerator.exportExcel('all'));
    document.getElementById('raw-csv-btn')?.addEventListener('click', () => ReportGenerator.exportCSV());

    document.querySelectorAll('.export-report-btn').forEach(btn => {
      btn.onclick = () => {
        const type = btn.getAttribute('data-type');
        const format = btn.getAttribute('data-format');
        if (format === 'pdf') {
          ReportGenerator.exportPDF(type);
        } else {
          ReportGenerator.exportExcel(type);
        }
      };
    });
  }
}

const page = new ReportsPage();
page.init();
