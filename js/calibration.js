/**
 * QORA TECH — Sensor Calibration Page Controller
 * HX711 Load Cell Tare, 2-point mass calibration, and ethylene baseline offsets.
 */

import { setupNavigation } from './navigation.js';
import { store } from './core/state.js';
import { calibrationService } from './services/calibration.js';

class CalibrationPage {
  init() {
    setupNavigation('calibration');
    this.render();
    store.subscribe('calibration', () => this.render());
  }

  render() {
    const container = document.getElementById('calibration-content');
    if (!container) return;

    const registry = store.get('calibration') || {};
    const sensors = Object.values(registry);

    container.innerHTML = `
      <!-- Header -->
      <div class="glass-card mb-6">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div class="flex items-center gap-2">
              <span class="badge badge-amber"><i data-lucide="sliders" class="icon-sm"></i> HARDWARE INSTRUMENTATION</span>
              <span class="text-xs text-muted">Field ADC & Transducer Offsets</span>
            </div>
            <h1 class="text-2xl font-bold mt-1">Sensor Calibration & Zero Tare Suite</h1>
            <p class="text-xs text-muted">Calibrate HX711 load cells, baseline electrochemical ethylene probes, and thermal RTD offsets.</p>
          </div>

          <div class="flex items-center gap-2">
            <button class="btn btn-outline" id="tare-all-loadcells-btn">
              <i data-lucide="scale"></i> Tare All Load Cells
            </button>
          </div>
        </div>
      </div>

      <!-- Sensor Calibration Table -->
      <div class="glass-card mb-8">
        <div class="flex justify-between items-center mb-4">
          <h3 class="font-bold text-base flex items-center gap-2">
            <i data-lucide="check-circle-2" class="text-emerald"></i> Calibrated Transducers & Probes (${sensors.length})
          </h3>
          <span class="text-3xs text-muted">Stored in ESP32 Non-Volatile EEPROM / Firestore</span>
        </div>

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Sensor ID</th>
                <th>Zone</th>
                <th>Transducer Type</th>
                <th>Status</th>
                <th>Last Calibrated</th>
                <th>Zero Offset</th>
                <th>Calibration Factor</th>
                <th>Unit</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${sensors.map(s => `
                <tr>
                  <td class="font-mono font-bold">${s.id}</td>
                  <td><span class="badge zone-tag-${s.zone}">Zone ${s.zone}</span></td>
                  <td class="font-medium">${s.type}</td>
                  <td>
                    <span class="badge ${s.status === 'CALIBRATED' ? 'badge-normal' : 'badge-neutral'} text-3xs">
                      ${s.status}
                    </span>
                  </td>
                  <td class="text-xs text-muted">${s.lastCalibrated}</td>
                  <td class="font-mono text-xs">${s.zeroOffset}</td>
                  <td class="font-mono text-xs font-bold text-cyan">${s.factor}</td>
                  <td class="font-bold">${s.unit}</td>
                  <td>
                    <div class="flex items-center gap-1">
                      ${s.id.startsWith('loadcell') ? `
                        <button class="btn btn-2xs btn-primary tare-btn" data-id="${s.id}" title="Zero scale with empty tray">
                          <i data-lucide="scale" class="icon-2xs"></i> Tare
                        </button>
                        <button class="btn btn-2xs btn-outline calibrate-btn" data-id="${s.id}" title="Calibrate with known reference mass">
                          <i data-lucide="sliders" class="icon-2xs"></i> Calibrate
                        </button>
                      ` : s.id.startsWith('ethylene') ? `
                        <button class="btn btn-2xs btn-primary zero-gas-btn" data-id="${s.id}" title="Zero in fresh air">
                          <i data-lucide="wind" class="icon-2xs"></i> Zero Air
                        </button>
                      ` : `
                        <button class="btn btn-2xs btn-outline calibrate-btn" data-id="${s.id}">
                          <i data-lucide="edit-3" class="icon-2xs"></i> Edit
                        </button>
                      `}
                      <button class="btn btn-2xs btn-outline reset-cal-btn" data-id="${s.id}" title="Reset to factory">
                        <i data-lucide="rotate-ccw" class="icon-2xs text-muted"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Calibration Modal -->
      <div class="modal-overlay hidden" id="cal-modal">
        <div class="modal-card glass-card">
          <div class="modal-head">
            <h3 class="font-bold text-base flex items-center gap-2" id="cal-modal-title">
              <i data-lucide="sliders" class="text-amber"></i> Calibrate Sensor Probe
            </h3>
            <button class="modal-close" id="close-cal-modal">&times;</button>
          </div>

          <form id="cal-form" class="modal-body mt-4 space-y-3">
            <input type="hidden" id="cal-sensor-id" />

            <div class="p-3 bg-card-dark rounded-lg border border-glass text-xs space-y-1">
              <span class="font-bold text-cyan block">2-Point Known Calibration Procedure</span>
              <p class="text-3xs text-muted">Place a certified known reference mass or standard calibration buffer on the sensor.</p>
            </div>

            <div class="form-group">
              <label>Known Reference Value (<span id="cal-unit-label">kg</span>)</label>
              <input type="number" id="cal-reference-val" class="form-control" step="0.1" value="20.0" required />
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div class="form-group">
                <label>ADC Zero Offset</label>
                <input type="number" id="cal-offset-val" class="form-control" required />
              </div>
              <div class="form-group">
                <label>Calibration Factor</label>
                <input type="number" id="cal-factor-val" class="form-control" step="0.01" required />
              </div>
            </div>

            <div class="modal-actions mt-4 flex justify-end gap-3">
              <button type="button" class="btn btn-outline" id="close-cal-modal-btn-2">Cancel</button>
              <button type="submit" class="btn btn-primary">Save & Apply to EEPROM</button>
            </div>
          </form>
        </div>
      </div>
    `;

    this.bindEvents();
    if (window.lucide) window.lucide.createIcons();
  }

  bindEvents() {
    const modal = document.getElementById('cal-modal');
    const closeModal = () => modal?.classList.add('hidden');
    const openModal = () => modal?.classList.remove('hidden');

    document.getElementById('close-cal-modal')?.addEventListener('click', closeModal);
    document.getElementById('close-cal-modal-btn-2')?.addEventListener('click', closeModal);

    // Tare single
    document.querySelectorAll('.tare-btn').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-id');
        calibrationService.tareLoadCell(id);
        alert(`✅ Load cell [${id}] tared to 0.00 kg.`);
        this.render();
      };
    });

    // Zero air for ethylene
    document.querySelectorAll('.zero-gas-btn').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-id');
        calibrationService.zeroEthyleneGas(id);
        alert(`✅ Gas sensor [${id}] zero baseline saved (0.00 ppm).`);
        this.render();
      };
    });

    // Calibrate / Edit buttons
    document.querySelectorAll('.calibrate-btn').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-id');
        const sensor = store.get(`calibration.${id}`);
        if (!sensor) return;

        document.getElementById('cal-sensor-id').value = id;
        document.getElementById('cal-modal-title').textContent = `Calibrate: ${sensor.type} (${sensor.id})`;
        document.getElementById('cal-unit-label').textContent = sensor.unit;
        document.getElementById('cal-reference-val').value = sensor.id.startsWith('loadcell') ? '20.0' : '1.0';
        document.getElementById('cal-offset-val').value = sensor.zeroOffset;
        document.getElementById('cal-factor-val').value = sensor.factor;

        openModal();
      };
    });

    // Save calibration
    const form = document.getElementById('cal-form');
    if (form) {
      form.onsubmit = (e) => {
        e.preventDefault();
        const id = document.getElementById('cal-sensor-id').value;
        const refVal = Number(document.getElementById('cal-reference-val').value);
        const offset = Number(document.getElementById('cal-offset-val').value);
        const factor = Number(document.getElementById('cal-factor-val').value);

        if (id.startsWith('loadcell') && refVal > 0) {
          calibrationService.calibrateWithKnownWeight(id, refVal);
        } else {
          calibrationService.saveSensorParams(id, { zeroOffset: offset, factor });
        }

        closeModal();
        alert(`✅ Calibration saved for [${id}].`);
        this.render();
      };
    }

    // Reset buttons
    document.querySelectorAll('.reset-cal-btn').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-id');
        if (confirm(`Reset [${id}] to factory calibration parameters?`)) {
          calibrationService.resetToFactory(id);
          this.render();
        }
      };
    });

    // Tare all load cells
    document.getElementById('tare-all-loadcells-btn')?.addEventListener('click', () => {
      ['loadcell-z1', 'loadcell-z2', 'loadcell-z3'].forEach(id => calibrationService.tareLoadCell(id));
      alert('✅ All 3 Storage Zone Load Cells tared to 0.00 kg.');
      this.render();
    });
  }
}

const page = new CalibrationPage();
page.init();
