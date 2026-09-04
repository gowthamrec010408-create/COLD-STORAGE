/**
 * Solar Smart Cold Storage — Sensor Calibration Management UI
 * Provides HX711 Load Cell Zero-Tare, 2-Point Known Weight calibration,
 * electrochemical ethylene baseline zeroing, and sensor offset configuration.
 */

import { store } from '../core/state.js';
import { calibrationService } from '../services/calibration.js';

export class CalibrationUI {
  render() {
    const container = document.getElementById('view-calibration');
    if (!container) return;

    const registry = store.get('calibration') || {};
    const sensors = Object.values(registry);

    container.innerHTML = `
      <!-- Header -->
      <div class="calibration-header glass-card mb-6">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div class="flex items-center gap-2">
              <span class="badge badge-amber"><i data-lucide="sliders" class="icon-sm"></i> HARDWARE INSTRUMENTATION</span>
              <span class="text-xs text-muted">Field ADC & Transducer Offsets</span>
            </div>
            <h2 class="text-2xl font-bold mt-1">Sensor Calibration & Zero Tare Suite</h2>
            <p class="text-sm text-muted">Calibrate HX711 load cells, baseline electrochemical ethylene probes, and thermal RTD offsets.</p>
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
        <div class="table-header-box mb-4">
          <h3 class="font-bold text-lg flex items-center gap-2">
            <i data-lucide="check-circle-2" class="text-emerald"></i> Calibrated Transducers & Probes (${sensors.length})
          </h3>
          <span class="text-xs text-muted">Stored in ESP32 Non-Volatile EEPROM / Firestore</span>
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
                    <span class="badge ${s.status === 'CALIBRATED' ? 'badge-normal' : 'badge-neutral'}">
                      ${s.status}
                    </span>
                  </td>
                  <td class="text-xs text-muted">${s.lastCalibrated}</td>
                  <td class="font-mono text-sm">${s.zeroOffset}</td>
                  <td class="font-mono text-sm font-bold text-cyan">${s.factor}</td>
                  <td class="font-bold">${s.unit}</td>
                  <td>
                    <div class="flex items-center gap-1">
                      ${s.id.startsWith('loadcell') ? `
                        <button class="btn btn-xs btn-primary tare-btn" data-id="${s.id}" title="Zero scale with empty tray">
                          <i data-lucide="scale" class="icon-xs"></i> Tare
                        </button>
                        <button class="btn btn-xs btn-outline calibrate-btn" data-id="${s.id}" title="Calibrate with known reference mass">
                          <i data-lucide="sliders" class="icon-xs"></i> Calibrate
                        </button>
                      ` : s.id.startsWith('ethylene') ? `
                        <button class="btn btn-xs btn-primary zero-gas-btn" data-id="${s.id}" title="Zero in fresh air">
                          <i data-lucide="wind" class="icon-xs"></i> Zero Air
                        </button>
                        <button class="btn btn-xs btn-outline calibrate-btn" data-id="${s.id}">
                          <i data-lucide="sliders" class="icon-xs"></i> Span
                        </button>
                      ` : `
                        <button class="btn btn-xs btn-outline calibrate-btn" data-id="${s.id}">
                          <i data-lucide="edit-3" class="icon-xs"></i> Edit
                        </button>
                      `}
                      <button class="btn btn-xs btn-outline reset-cal-btn" data-id="${s.id}" title="Reset to factory">
                        <i data-lucide="rotate-ccw" class="icon-xs text-muted"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Calibration Modal for Known Weight -->
      <div class="modal-overlay hidden" id="cal-modal">
        <div class="modal-card glass-card">
          <div class="modal-head">
            <h3 class="font-bold text-lg" id="cal-modal-title">2-Point Sensor Calibration</h3>
            <button class="modal-close" id="close-cal-modal">&times;</button>
          </div>
          <form id="cal-form" class="modal-body mt-4">
            <input type="hidden" id="cal-sensor-id" />
            
            <div class="form-group mb-3">
              <label>Reference Standard / Known Test Mass (<span id="cal-unit-label">kg</span>)</label>
              <input type="number" step="0.01" class="form-control" id="cal-reference-val" placeholder="e.g. 20.0" required />
              <span class="text-xs text-muted">Place certified reference calibration weight onto scale.</span>
            </div>

            <div class="form-group mb-3">
              <label>Zero Offset</label>
              <input type="number" step="0.01" class="form-control" id="cal-offset-val" />
            </div>

            <div class="form-group mb-3">
              <label>Calculated Calibration Factor</label>
              <input type="number" step="0.01" class="form-control" id="cal-factor-val" />
            </div>

            <div class="modal-actions mt-6 flex justify-end gap-3">
              <button type="button" class="btn btn-outline" id="cancel-cal-modal">Cancel</button>
              <button type="submit" class="btn btn-primary">Save Calibration Parameters</button>
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
    document.getElementById('cancel-cal-modal')?.addEventListener('click', closeModal);

    // Tare Buttons
    document.querySelectorAll('.tare-btn').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-id');
        try {
          calibrationService.tareLoadCell(id);
          alert(`✅ Load cell [${id}] Zero-Tare successful. Current offset registered.`);
          this.render();
        } catch (e) {
          alert('Tare error: ' + e.message);
        }
      };
    });

    // Zero Gas Probes
    document.querySelectorAll('.zero-gas-btn').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-id');
        calibrationService.zeroEthyleneSensor(id);
        alert(`✅ Ethylene sensor [${id}] baseline zeroed against fresh ambient air standard.`);
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

    // Calibration Form Save
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

export const calibrationUI = new CalibrationUI();
