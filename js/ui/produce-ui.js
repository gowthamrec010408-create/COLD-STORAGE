/**
 * QORA TECH — Produce Batches & Northeast India Crop Database UI
 * Features intelligent Zone Selection Algorithm (Best Match & Alternative Zone),
 * batch management, and configurable crop profile registry with "Add New Crop".
 */

import { store } from '../core/state.js';
import { DEFAULT_PRODUCE_PROFILES, recommendZoneForCrop } from '../config/produce-profiles.js';

export class ProduceUI {
  render() {
    const container = document.getElementById('view-produce');
    if (!container) return;

    const batches = store.get('batches') || [];
    const profiles = store.get('cropProfiles') || DEFAULT_PRODUCE_PROFILES;

    container.innerHTML = `
      <!-- Header -->
      <div class="produce-header glass-card mb-6">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div class="flex items-center gap-2">
              <span class="qora-pill-brand">QORA TECH</span>
              <span class="badge badge-emerald"><i data-lucide="package" class="icon-sm"></i> BATCH REGISTRY</span>
            </div>
            <h2 class="text-2xl font-bold mt-1">Produce Batches & Northeast Crop Profiles</h2>
            <p class="text-sm text-muted">Intelligent cultivar zone recommendation, chilling sensitivity safeguards, and storage tracking.</p>
          </div>

          <div class="flex gap-2">
            <button class="btn btn-outline" id="btn-add-new-crop">
              <i data-lucide="plus"></i> Add New Crop Profile
            </button>
            <button class="btn btn-primary" id="open-add-batch-btn">
              <i data-lucide="plus-circle"></i> Register Produce Batch
            </button>
          </div>
        </div>
      </div>

      <!-- Active Stored Batches Table -->
      <div class="glass-card mb-8">
        <div class="table-header-box mb-4">
          <h3 class="font-bold text-lg flex items-center gap-2">
            <i data-lucide="box" class="text-emerald"></i> Active Stored Batches (${batches.length})
          </h3>
        </div>

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Batch ID</th>
                <th>Produce & Variety</th>
                <th>Zone Compartment</th>
                <th>Farmer & Farm Origin</th>
                <th>Stored Date</th>
                <th>Initial Mass</th>
                <th>Current Mass</th>
                <th>Weight Loss</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${batches.map(b => {
                const loss = Number((b.initialWeight - b.currentWeight).toFixed(1));
                const lossPct = Number(((loss / (b.initialWeight || 1)) * 100).toFixed(2));

                return `
                  <tr>
                    <td class="font-mono font-bold">${b.id}</td>
                    <td>
                      <div class="font-bold">${b.name}</div>
                      <div class="text-xs text-muted">${b.variety}</div>
                    </td>
                    <td>
                      <span class="badge zone-tag-${b.zoneId}">
                        Zone ${b.zoneId} (${b.zoneId === 1 ? 'Left 2-8°C' : b.zoneId === 2 ? 'Center 0-2°C' : 'Right 8-15°C'})
                      </span>
                    </td>
                    <td>
                      <div class="font-semibold">${b.farmer}</div>
                      <div class="text-xs text-muted">${b.location}</div>
                    </td>
                    <td class="text-xs font-semibold">${b.dateStored}</td>
                    <td>${b.initialWeight} kg</td>
                    <td class="font-bold">${b.currentWeight} kg</td>
                    <td>
                      <span class="${lossPct > 4 ? 'text-rose font-bold' : 'text-muted'}">
                        -${loss} kg (${lossPct}%)
                      </span>
                    </td>
                    <td>
                      <button class="btn btn-xs btn-outline delete-batch-btn" data-id="${b.id}">
                        <i data-lucide="trash-2" class="icon-xs text-rose"></i>
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Northeast India Crop Profiles Database Showcase -->
      <div class="glass-card">
        <div class="table-header-box mb-4">
          <h3 class="font-bold text-lg flex items-center gap-2">
            <i data-lucide="book-open" class="text-cyan"></i> Northeast India Horticultural Profiles (${Object.keys(profiles).length})
          </h3>
          <span class="text-xs text-muted">Configurable storage bounds & chilling injury sensitivities</span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          ${Object.values(profiles).map(p => `
            <div class="crop-profile-card">
              <div class="flex justify-between items-start">
                <div>
                  <h4 class="font-bold text-base">${p.name}</h4>
                  <p class="text-xs text-muted italic">${p.scientificName || ''}</p>
                </div>
                <span class="badge ${p.recommendedZone === 1 ? 'zone-tag-1' : p.recommendedZone === 2 ? 'zone-tag-2' : 'zone-tag-3'}">
                  Zone ${p.recommendedZone}
                </span>
              </div>
              <div class="crop-meta-grid my-3 text-xs">
                <div>Corridor: <b>${p.tempMin}–${p.tempMax}°C</b></div>
                <div>Humidity: <b>${p.humidityMin}–${p.humidityMax}%</b></div>
                <div>Ethylene: <b>${p.ethyleneSensitivity}</b></div>
                <div>Shelf Life: <b>${p.baseShelfLifeDays} Days</b></div>
              </div>
              <p class="text-xs text-muted">${p.storageNotes || 'Standard storage profile.'}</p>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- REGISTER BATCH MODAL WITH ZONE SELECTION ALGORITHM -->
      <div class="modal-overlay hidden" id="add-batch-modal">
        <div class="modal-card glass-card">
          <div class="modal-head">
            <h3 class="font-bold text-lg">Register Produce Batch</h3>
            <button class="modal-close" id="close-add-batch-btn">&times;</button>
          </div>
          <form id="add-batch-form" class="modal-body mt-4">
            <div class="form-group mb-3">
              <label>Select Crop Profile</label>
              <select class="form-control" id="batch-crop-select" required>
                ${Object.values(profiles).map(p => `
                  <option value="${p.id}">${p.name} (${p.category || 'Produce'})</option>
                `).join('')}
              </select>
            </div>

            <!-- Intelligent Zone Recommendation Box (Auto-Updated) -->
            <div class="p-3 bg-card-dark rounded-lg border border-emerald mb-4" id="zone-rec-box">
              <div class="flex justify-between items-center text-xs">
                <span class="text-emerald font-bold flex items-center gap-1">
                  <i data-lucide="sparkles" class="icon-xs"></i> RECOMMENDED BEST ZONE
                </span>
                <span class="badge badge-normal font-bold" id="rec-best-zone-tag">ZONE 3 (RIGHT)</span>
              </div>
              <p class="text-xs text-muted mt-1.5" id="rec-reason-text">
                Naga King Chilli requires 9–13°C. Zone 3 (Right) prevents chilling injury.
              </p>
              <div class="text-2xs text-dim mt-1" id="rec-alt-text">
                Alternative Zone: Zone 1 (Cool Storage)
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div class="form-group">
                <label>Variety / Cultivar</label>
                <input type="text" class="form-control" id="batch-variety" placeholder="e.g. GI Certified / Local" required />
              </div>

              <div class="form-group">
                <label>Assigned Zone Compartment</label>
                <select class="form-control" id="batch-zone-select" required>
                  <option value="1">Zone 1 — Cool Storage (Left: 2–8°C)</option>
                  <option value="2">Zone 2 — Deep Cold Storage (Center: 0–2°C [Coldest])</option>
                  <option value="3" selected>Zone 3 — Cool / Moderate (Right: 8–15°C)</option>
                </select>
              </div>

              <div class="form-group">
                <label>Initial Stored Mass (kg)</label>
                <input type="number" step="0.1" min="1" class="form-control" id="batch-weight" placeholder="e.g. 100" required />
              </div>

              <div class="form-group">
                <label>Farmer / Grower Name</label>
                <input type="text" class="form-control" id="batch-farmer" placeholder="e.g. Tsering Dorjee" required />
              </div>

              <div class="form-group">
                <label>Origin Location / District</label>
                <input type="text" class="form-control" id="batch-location" placeholder="e.g. Dirang, Arunachal" required />
              </div>

              <div class="form-group">
                <label>Harvest Date</label>
                <input type="date" class="form-control" id="batch-harvest" required />
              </div>
            </div>

            <div class="modal-actions mt-6 flex justify-end gap-3">
              <button type="button" class="btn btn-outline" id="cancel-batch-btn">Cancel</button>
              <button type="submit" class="btn btn-primary">Save & Register Batch</button>
            </div>
          </form>
        </div>
      </div>
    `;

    this.bindEvents();
    if (window.lucide) window.lucide.createIcons();
  }

  bindEvents() {
    const modal = document.getElementById('add-batch-modal');
    const openBtn = document.getElementById('open-add-batch-btn');
    const closeBtn = document.getElementById('close-add-batch-btn');
    const cancelBtn = document.getElementById('cancel-batch-btn');
    const form = document.getElementById('add-batch-form');
    const cropSelect = document.getElementById('batch-crop-select');
    const zoneSelect = document.getElementById('batch-zone-select');

    const harvestInput = document.getElementById('batch-harvest');
    if (harvestInput) harvestInput.value = new Date().toISOString().split('T')[0];

    const toggleModal = (show) => {
      if (modal) {
        if (show) modal.classList.remove('hidden');
        else modal.classList.add('hidden');
      }
    };

    if (openBtn) openBtn.onclick = () => {
      this.updateZoneRecommendation();
      toggleModal(true);
    };
    if (closeBtn) closeBtn.onclick = () => toggleModal(false);
    if (cancelBtn) cancelBtn.onclick = () => toggleModal(false);

    // Live Zone Recommendation Trigger on Crop Selection
    if (cropSelect) {
      cropSelect.onchange = () => this.updateZoneRecommendation();
    }

    if (form) {
      form.onsubmit = (e) => {
        e.preventDefault();
        const cropId = cropSelect.value;
        const profile = store.get(`cropProfiles.${cropId}`) || DEFAULT_PRODUCE_PROFILES[cropId];
        const variety = document.getElementById('batch-variety').value;
        const zoneId = Number(zoneSelect.value);
        const weight = Number(document.getElementById('batch-weight').value);
        const farmer = document.getElementById('batch-farmer').value;
        const location = document.getElementById('batch-location').value;
        const harvestDate = document.getElementById('batch-harvest').value;

        const newBatch = {
          id: `BATCH-${cropId.substring(0, 2).toUpperCase()}${Math.floor(100 + Math.random() * 900)}`,
          name: profile ? profile.name : 'Produce Batch',
          cropId,
          variety,
          zoneId,
          farmer,
          location,
          initialWeight: weight,
          currentWeight: weight,
          dateStored: new Date().toISOString().split('T')[0],
          harvestDate,
          expectedShelfLifeDays: profile ? profile.baseShelfLifeDays : 14
        };

        const currentBatches = store.get('batches') || [];
        store.set('batches', [newBatch, ...currentBatches]);
        toggleModal(false);
        this.render();
      };
    }

    document.querySelectorAll('.delete-batch-btn').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-id');
        if (confirm(`Remove batch ${id}?`)) {
          const current = store.get('batches') || [];
          store.set('batches', current.filter(b => b.id !== id));
          this.render();
        }
      };
    });

    document.getElementById('btn-add-new-crop')?.addEventListener('click', () => {
      const name = prompt('Enter New Crop Name (e.g. Khasi Mandarin):');
      if (name) {
        const id = name.toLowerCase().replace(/\s+/g, '_');
        const minTemp = Number(prompt('Minimum Recommended Temperature (°C):', '4.0')) || 4.0;
        const maxTemp = Number(prompt('Maximum Recommended Temperature (°C):', '8.0')) || 8.0;
        const zone = minTemp >= 8 ? 3 : maxTemp <= 2 ? 2 : 1;

        const newProfile = {
          id,
          name,
          tempMin: minTemp,
          tempMax: maxTemp,
          tempOptimal: (minTemp + maxTemp) / 2,
          humidityMin: 90.0,
          humidityMax: 95.0,
          ethyleneSensitivity: 'MEDIUM',
          baseShelfLifeDays: 21,
          recommendedZone: zone
        };

        const profiles = store.get('cropProfiles');
        profiles[id] = newProfile;
        store.set('cropProfiles', { ...profiles });
        alert(`✅ Crop Profile '${name}' registered successfully!`);
        this.render();
      }
    });
  }

  updateZoneRecommendation() {
    const cropSelect = document.getElementById('batch-crop-select');
    const zoneSelect = document.getElementById('batch-zone-select');
    if (!cropSelect) return;

    const cropId = cropSelect.value;
    const rec = recommendZoneForCrop(cropId);

    const tag = document.getElementById('rec-best-zone-tag');
    const reason = document.getElementById('rec-reason-text');
    const alt = document.getElementById('rec-alt-text');

    if (tag) tag.textContent = `ZONE ${rec.bestZone} (${rec.bestZone === 1 ? 'LEFT: 2–8°C' : rec.bestZone === 2 ? 'CENTER: 0–2°C' : 'RIGHT: 8–15°C'})`;
    if (reason) reason.textContent = rec.reason;
    if (alt) alt.textContent = `Alternative Option: Zone ${rec.alternativeZone}`;

    if (zoneSelect) zoneSelect.value = String(rec.bestZone);
  }
}

export const produceUI = new ProduceUI();
