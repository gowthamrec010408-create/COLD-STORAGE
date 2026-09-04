/**
 * QORA TECH — Produce Batches & Northeast India Crop Registry Controller
 * Manages batch inventory, crop profiles, cultivar recommendations, and modals.
 */

import { setupNavigation } from './navigation.js';
import { store } from './core/state.js';
import { DEFAULT_PRODUCE_PROFILES, recommendZoneForCrop } from './config/produce-profiles.js';

class BatchesPage {
  init() {
    setupNavigation('batches');
    this.render();
    store.subscribe('batches', () => this.render());
  }

  render() {
    const container = document.getElementById('batches-content');
    if (!container) return;

    const batches = store.get('batches') || [];
    const profiles = store.get('cropProfiles') || DEFAULT_PRODUCE_PROFILES;

    container.innerHTML = `
      <!-- Header -->
      <div class="glass-card mb-6">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div class="flex items-center gap-2">
              <span class="qora-pill-brand">QORA TECH</span>
              <span class="badge badge-emerald"><i data-lucide="package" class="icon-sm"></i> BATCH REGISTRY</span>
            </div>
            <h1 class="text-2xl font-bold mt-1">Produce Batches & Inventory</h1>
            <p class="text-xs text-muted">Manage active agricultural produce batches across Storage Zones 1, 2, and 3.</p>
          </div>

          <div class="flex gap-2">
            <button class="btn btn-primary" id="open-add-batch-btn">
              <i data-lucide="plus-circle"></i> ADD BATCH
            </button>
          </div>
        </div>
      </div>

      <!-- Active Produce Batches Table -->
      <div class="glass-card mb-8">
        <div class="flex justify-between items-center mb-4">
          <h3 class="font-bold text-base flex items-center gap-2">
            <i data-lucide="box" class="text-emerald"></i> Active Stored Batches (${batches.length})
          </h3>
        </div>

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Batch ID</th>
                <th>Crop & Variety</th>
                <th>Zone</th>
                <th>Initial Mass</th>
                <th>Current Mass</th>
                <th>Storage Date</th>
                <th>Freshness</th>
                <th>Shelf Life</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${batches.map(b => {
                return `
                  <tr>
                    <td class="font-mono font-bold text-cyan">${b.id}</td>
                    <td>
                      <div class="font-bold">${b.crop || b.name}</div>
                      <div class="text-3xs text-muted">${b.variety} • ${b.farmer || 'Local Grower'}</div>
                    </td>
                    <td>
                      <span class="badge zone-tag-${b.zoneId}">Zone ${b.zoneId}</span>
                    </td>
                    <td>${b.initialWeight} kg</td>
                    <td class="font-bold text-amber">${b.currentWeight} kg</td>
                    <td class="text-xs">${b.dateStored}</td>
                    <td>
                      <span class="font-black ${b.freshnessScore >= 80 ? 'text-emerald' : 'text-amber'}">${b.freshnessScore || 88} / 100</span>
                    </td>
                    <td>
                      <span class="font-bold text-cyan">${b.shelfLifeRemainingDays || 8} Days</span>
                    </td>
                    <td>
                      <span class="badge badge-normal font-bold text-3xs">${b.status || 'ACTIVE'}</span>
                    </td>
                    <td>
                      <div class="flex items-center gap-1">
                        <button class="btn btn-2xs btn-outline view-batch-btn" data-id="${b.id}" title="View Details">
                          <i data-lucide="eye" class="icon-xs text-cyan"></i>
                        </button>
                        <button class="btn btn-2xs btn-outline edit-batch-btn" data-id="${b.id}" title="Edit Batch">
                          <i data-lucide="edit-2" class="icon-xs text-amber"></i>
                        </button>
                        <button class="btn btn-2xs btn-outline delete-batch-btn" data-id="${b.id}" title="Delete Batch">
                          <i data-lucide="trash-2" class="icon-xs text-rose"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Add / Register Batch Modal -->
      <div class="modal-overlay hidden" id="add-batch-modal">
        <div class="modal-card glass-card" style="max-width: 500px; width: 100%;">
          <div class="flex justify-between items-center mb-4">
            <h3 class="font-bold text-base flex items-center gap-2">
              <i data-lucide="plus-circle" class="text-emerald"></i> Register New Produce Batch
            </h3>
            <button class="btn btn-2xs btn-outline" id="close-add-modal-btn">&times;</button>
          </div>

          <form id="add-batch-form" class="space-y-3">
            <div class="grid grid-cols-2 gap-3">
              <div class="form-group">
                <label>BATCH ID</label>
                <input type="text" class="form-control" id="form-batch-id" value="BATCH-${Date.now().toString().slice(-4)}" required />
              </div>
              <div class="form-group">
                <label>STORAGE ZONE</label>
                <select class="form-control" id="form-batch-zone">
                  <option value="1">Zone 1 (Left 2–8°C)</option>
                  <option value="2">Zone 2 (Center 0–2°C)</option>
                  <option value="3">Zone 3 (Right 8–15°C)</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div class="form-group">
                <label>CROP NAME</label>
                <input type="text" class="form-control" id="form-batch-crop" placeholder="e.g. Green Beans" required />
              </div>
              <div class="form-group">
                <label>VARIETY</label>
                <input type="text" class="form-control" id="form-batch-variety" placeholder="e.g. Contender" required />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div class="form-group">
                <label>INITIAL WEIGHT (KG)</label>
                <input type="number" class="form-control" id="form-batch-weight" placeholder="100.0" step="0.5" required />
              </div>
              <div class="form-group">
                <label>EXPECTED SHELF LIFE (DAYS)</label>
                <input type="number" class="form-control" id="form-batch-life" placeholder="14" required />
              </div>
            </div>

            <div class="form-group">
              <label>FARMER / ORIGIN</label>
              <input type="text" class="form-control" id="form-batch-farmer" placeholder="e.g. Tsering Agro, Arunachal" />
            </div>

            <div class="flex justify-end gap-2 mt-4 pt-3 border-t border-glass">
              <button type="button" class="btn btn-outline" id="cancel-batch-btn">Cancel</button>
              <button type="submit" class="btn btn-primary">Save Produce Batch</button>
            </div>
          </form>
        </div>
      </div>
    `;

    this.bindEvents();
    if (window.lucide) window.lucide.createIcons();
  }

  bindEvents() {
    const openBtn = document.getElementById('open-add-batch-btn');
    const modal = document.getElementById('add-batch-modal');
    const closeBtn = document.getElementById('close-add-modal-btn');
    const cancelBtn = document.getElementById('cancel-batch-btn');
    const addForm = document.getElementById('add-batch-form');

    if (openBtn && modal) openBtn.onclick = () => modal.classList.remove('hidden');
    if (closeBtn && modal) closeBtn.onclick = () => modal.classList.add('hidden');
    if (cancelBtn && modal) cancelBtn.onclick = () => modal.classList.add('hidden');

    if (addForm) {
      addForm.onsubmit = (e) => {
        e.preventDefault();
        const newBatch = {
          id: document.getElementById('form-batch-id').value,
          crop: document.getElementById('form-batch-crop').value,
          name: document.getElementById('form-batch-crop').value,
          variety: document.getElementById('form-batch-variety').value,
          zoneId: parseInt(document.getElementById('form-batch-zone').value, 10),
          initialWeight: parseFloat(document.getElementById('form-batch-weight').value),
          currentWeight: parseFloat(document.getElementById('form-batch-weight').value),
          expectedShelfLifeDays: parseInt(document.getElementById('form-batch-life').value, 10),
          shelfLifeRemainingDays: parseInt(document.getElementById('form-batch-life').value, 10),
          farmer: document.getElementById('form-batch-farmer').value || 'Local Grower',
          dateStored: new Date().toISOString().split('T')[0],
          freshnessScore: 98,
          status: 'ACTIVE'
        };

        const existing = store.get('batches') || [];
        store.set('batches', [newBatch, ...existing]);
        modal.classList.add('hidden');
        alert(`Batch ${newBatch.id} added successfully!`);
      };
    }

    document.querySelectorAll('.delete-batch-btn').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-id');
        if (confirm(`Remove batch ${id} from storage inventory?`)) {
          const existing = store.get('batches') || [];
          store.set('batches', existing.filter(b => b.id !== id));
        }
      };
    });

    document.querySelectorAll('.view-batch-btn').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-id');
        window.location.href = 'spoilage.html';
      };
    });

    document.querySelectorAll('.edit-batch-btn').forEach(btn => {
      btn.onclick = () => {
        alert('Batch parameters can be updated in AI Spoilage Studio.');
      };
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new BatchesPage().init();
});
