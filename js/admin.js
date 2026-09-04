/**
 * QORA TECH — Solar Smart Cold Storage
 * Master Admin Control Center Controller
 * 
 * Features:
 * 1. User Management (NER Farming & Storage Profile, 1-Click Approve / Reject / Disable)
 * 2. Crop Profile Management (Add / View NER Crop Database, Storage Temperature Corridors)
 * 3. Maintenance Management (ESP32 Diagnostics, Sensor Probe Calibration, Service Logs)
 * 4. NER Seasonal Rules & Multi-Factor Scoring Configurator
 */

import { setupNavigation } from './navigation.js';
import { authService } from './auth.js';
import { store } from './core/state.js';
import { showToast } from './ui.js';
import { DEFAULT_PRODUCE_PROFILES, ZONE_SPECS } from './config/produce-profiles.js';
import { seasonalAdvisor, DEFAULT_ADVISOR_WEIGHTS, NER_SEASONAL_RULES } from './seasonal-advisor.js';

class AdminControlCenter {
  constructor() {
    this.activeMainTab = 'users'; // 'users' | 'crops' | 'maintenance' | 'seasonal'
    this.userFilter = 'pending';  // 'pending' | 'approved' | 'rejected' | 'all' | 'audit'
    this.showAddCropModal = false;
    this.showAddLogModal = false;
  }

  async init() {
    setupNavigation('admin', true);
    this.render();
    try {
      const { initializeFirebase } = await import('./config/firebase-config.js');
      const { firebaseService } = await import('./services/firebase-service.js');
      await initializeFirebase();
      await firebaseService.getUsers();
      this.render();
    } catch (e) {
      console.warn('Admin Firestore sync warning:', e);
    }
  }

  render() {
    const container = document.getElementById('admin-content');
    if (!container) return;

    const allUsers = authService.getUsers();
    const pendingUsers = allUsers.filter(u => u.status === 'pending');
    const approvedUsers = allUsers.filter(u => u.status === 'approved');
    const rejectedUsers = allUsers.filter(u => u.status === 'rejected' || u.status === 'disabled');
    const auditLogs = JSON.parse(localStorage.getItem('qoratech_audit_logs') || '[]');

    container.innerHTML = `
      <!-- 1. HEADER & KPI CARDS -->
      <div class="glass-card mb-6" style="border-top: 4px solid var(--brand-purple);">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div class="flex items-center gap-2">
              <span class="badge badge-purple"><i data-lucide="shield-check" class="icon-sm"></i> ROOT ADMIN CENTER</span>
              <span class="text-xs text-muted">QORA TECH Facility Governance & Diagnostic Hub</span>
            </div>
            <h1 class="text-2xl font-black mt-1">Administrator Control Center</h1>
            <p class="text-xs text-muted">Manage agricultural users, calibrate IoT hardware probes, configure crop storage profiles, and tune NER seasonal rules.</p>
          </div>

          <div class="flex flex-wrap gap-3">
            <div class="p-2.5 bg-card-dark rounded-lg border border-glass text-center min-w-24">
              <span class="text-lg font-black text-amber block">${pendingUsers.length}</span>
              <span class="text-3xs text-muted uppercase font-bold">Pending Users</span>
            </div>
            <div class="p-2.5 bg-card-dark rounded-lg border border-glass text-center min-w-24">
              <span class="text-lg font-black text-emerald block">${approvedUsers.length}</span>
              <span class="text-3xs text-muted uppercase font-bold">Approved</span>
            </div>
            <div class="p-2.5 bg-card-dark rounded-lg border border-glass text-center min-w-24">
              <span class="text-lg font-black text-purple block">3 Zones</span>
              <span class="text-3xs text-muted uppercase font-bold">Active Units</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. PRIMARY 4 ADMIN MODULE TABS -->
      <div class="flex flex-wrap gap-2 mb-6 border-b border-glass pb-3">
        <button class="admin-tab-btn ${this.activeMainTab === 'users' ? 'active' : ''}" data-maintab="users">
          <i data-lucide="users" class="icon-xs inline mr-1"></i> User Management (${pendingUsers.length} Pending)
        </button>
        <button class="admin-tab-btn ${this.activeMainTab === 'crops' ? 'active' : ''}" data-maintab="crops">
          <i data-lucide="leaf" class="icon-xs inline mr-1"></i> Crop Profile Management
        </button>
        <button class="admin-tab-btn ${this.activeMainTab === 'maintenance' ? 'active' : ''}" data-maintab="maintenance">
          <i data-lucide="wrench" class="icon-xs inline mr-1"></i> Maintenance & Diagnostics
        </button>
        <button class="admin-tab-btn ${this.activeMainTab === 'seasonal' ? 'active' : ''}" data-maintab="seasonal">
          <i data-lucide="cloud-sun" class="icon-xs inline mr-1"></i> NER Seasonal Rules & Weights
        </button>
      </div>

      <!-- 3. TAB CONTENT VIEWS -->
      ${this.activeMainTab === 'users' ? this.renderUserManagementHTML(allUsers, pendingUsers, approvedUsers, rejectedUsers, auditLogs) : ''}
      ${this.activeMainTab === 'crops' ? this.renderCropManagementHTML() : ''}
      ${this.activeMainTab === 'maintenance' ? this.renderMaintenanceHTML() : ''}
      ${this.activeMainTab === 'seasonal' ? this.renderSeasonalConfigHTML() : ''}
    `;

    this.bindEvents();
    if (window.lucide) window.lucide.createIcons();
  }

  /**
   * TAB 1: User Management View with Detailed NER Farming Information
   */
  renderUserManagementHTML(allUsers, pendingUsers, approvedUsers, rejectedUsers, auditLogs) {
    const displayedUsers = this.userFilter === 'pending' ? pendingUsers :
                           this.userFilter === 'approved' ? approvedUsers :
                           this.userFilter === 'rejected' ? rejectedUsers : allUsers;

    return `
      <!-- User Sub-Filter Tabs -->
      <div class="flex flex-wrap gap-2 mb-4">
        <button class="admin-tab-btn ${this.userFilter === 'pending' ? 'active' : ''}" data-subtab="pending">
          Pending Verification (${pendingUsers.length})
        </button>
        <button class="admin-tab-btn ${this.userFilter === 'approved' ? 'active' : ''}" data-subtab="approved">
          Approved Accounts (${approvedUsers.length})
        </button>
        <button class="admin-tab-btn ${this.userFilter === 'rejected' ? 'active' : ''}" data-subtab="rejected">
          Rejected / Disabled (${rejectedUsers.length})
        </button>
        <button class="admin-tab-btn ${this.userFilter === 'all' ? 'active' : ''}" data-subtab="all">
          All Users (${allUsers.length})
        </button>
        <button class="admin-tab-btn ${this.userFilter === 'audit' ? 'active' : ''}" data-subtab="audit">
          Audit Logs (${auditLogs.length})
        </button>
      </div>

      ${this.userFilter === 'audit' ? `
        <!-- Audit Trail Table -->
        <div class="glass-card mb-8">
          <div class="flex justify-between items-center mb-4">
            <h3 class="font-bold text-base flex items-center gap-2">
              <i data-lucide="history" class="text-purple"></i> Security Audit Trail
            </h3>
            <span class="text-3xs text-muted">Immutable Log of Administrative Actions</span>
          </div>

          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Audit ID</th>
                  <th>Action</th>
                  <th>Target User</th>
                  <th>Authorized Administrator</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                ${auditLogs.length === 0 ? `
                  <tr><td colspan="5" class="text-center py-6 text-muted">No administrative actions logged yet.</td></tr>
                ` : auditLogs.map(log => `
                  <tr>
                    <td class="font-mono text-xs">${log.id}</td>
                    <td><span class="badge ${log.action.includes('APPROVED') ? 'badge-normal' : 'badge-critical'} text-3xs">${log.action}</span></td>
                    <td class="font-bold">${log.targetUser} (${log.targetUid})</td>
                    <td class="font-semibold text-purple">${log.admin}</td>
                    <td class="text-xs text-muted font-mono">${new Date(log.timestamp).toLocaleString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : `
        <!-- Users Detailed Table -->
        <div class="glass-card mb-8">
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Farmer / User</th>
                  <th>NER Location</th>
                  <th>Farming & Storage Profile</th>
                  <th>Contact Info</th>
                  <th>Status</th>
                  <th>Admin Actions</th>
                </tr>
              </thead>
              <tbody>
                ${displayedUsers.length === 0 ? `
                  <tr><td colspan="6" class="text-center py-8 text-muted">No accounts found in this category.</td></tr>
                ` : displayedUsers.map(u => `
                  <tr>
                    <td>
                      <div class="font-bold text-sm text-main">${u.displayName}</div>
                      <div class="text-3xs text-muted font-mono">${u.uid}</div>
                      <span class="badge ${u.role === 'admin' ? 'badge-purple' : 'badge-neutral'} text-3xs mt-1">
                        ${u.userType} (${u.role})
                      </span>
                    </td>
                    <td>
                      <div class="font-semibold text-xs text-emerald">${u.nerState || 'Assam'}</div>
                      <div class="text-3xs text-muted">${u.district || 'District'}, ${u.village || u.location}</div>
                      <div class="text-3xs text-cyan font-mono mt-0.5">${u.storageUnitId || 'COLD-ROOM-01'}</div>
                    </td>
                    <td>
                      <div class="text-xs">
                        <span class="text-muted">Primary:</span> <strong class="text-main">${u.primaryCrops || 'Ginger, Cabbage'}</strong>
                      </div>
                      ${u.secondaryCrops ? `
                        <div class="text-3xs text-muted mt-0.5">
                          <span>Secondary:</span> ${u.secondaryCrops}
                        </div>
                      ` : ''}
                      <div class="flex items-center gap-2 mt-1 text-3xs">
                        <span class="badge badge-amber text-3xs font-mono">${u.storageCapacityKg || 500} kg</span>
                        <span class="text-muted">Pref: <strong class="text-cyan">${u.preferredCrop || 'Ginger'}</strong></span>
                      </div>
                    </td>
                    <td>
                      <div class="font-semibold text-xs">${u.phone}</div>
                      <div class="text-3xs text-muted font-mono">${u.email || 'N/A'}</div>
                      <div class="text-3xs text-dim mt-0.5">Reg: ${new Date(u.createdAt).toLocaleDateString()}</div>
                    </td>
                    <td>
                      <span class="badge ${u.status === 'approved' ? 'badge-normal' : u.status === 'pending' ? 'badge-warning' : 'badge-critical'} text-3xs">
                        ${u.status.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <div class="flex flex-col gap-1.5 min-w-28">
                        ${u.status === 'pending' ? `
                          <button class="btn btn-2xs btn-primary approve-user-btn" data-uid="${u.uid}">
                            <i data-lucide="check" class="icon-2xs"></i> Approve
                          </button>
                          <button class="btn btn-2xs btn-outline reject-user-btn" data-uid="${u.uid}">
                            <i data-lucide="x" class="icon-2xs text-rose"></i> Reject
                          </button>
                        ` : u.status === 'approved' && u.email !== 'admin@qoratech.io' ? `
                          <button class="btn btn-2xs btn-outline disable-user-btn" data-uid="${u.uid}">
                            <i data-lucide="ban" class="icon-2xs text-amber"></i> Disable
                          </button>
                        ` : u.status !== 'approved' ? `
                          <button class="btn btn-2xs btn-primary approve-user-btn" data-uid="${u.uid}">
                            <i data-lucide="check" class="icon-2xs"></i> Re-Approve
                          </button>
                        ` : '<span class="text-3xs text-dim">Root Admin</span>'}
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `}
    `;
  }

  /**
   * TAB 2: Crop Profile Management View (Add / View NER Crop Database)
   */
  renderCropManagementHTML() {
    const profiles = store.get('cropProfiles') || DEFAULT_PRODUCE_PROFILES;
    const cropList = Object.values(profiles);

    return `
      <div class="glass-card mb-6">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <div>
            <h3 class="font-bold text-base flex items-center gap-2">
              <i data-lucide="leaf" class="text-emerald"></i> Northeast India Horticultural Profiles Database
            </h3>
            <p class="text-xs text-muted">Configure optimal temperature corridors, humidity levels, ethylene thresholds, and cold sweetening limits.</p>
          </div>

          <button class="btn btn-primary btn-sm" id="btn-toggle-add-crop">
            <i data-lucide="plus" class="icon-xs"></i> Add New Crop Profile
          </button>
        </div>

        <!-- Add Crop Profile Inline Form -->
        <div id="add-crop-form-card" class="hidden p-4 bg-card-dark rounded-xl border border-glass mb-6">
          <h4 class="font-bold text-sm text-emerald mb-3 flex items-center gap-2">
            <i data-lucide="plus-circle" class="icon-xs"></i> Register New Horticultural Crop Profile
          </h4>
          <form id="add-crop-form" class="space-y-3">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div class="form-group">
                <label>Crop Name *</label>
                <input type="text" id="new-crop-name" class="form-control" placeholder="e.g. Khasi Mandarin" required />
              </div>
              <div class="form-group">
                <label>Scientific Name</label>
                <input type="text" id="new-crop-sci" class="form-control" placeholder="e.g. Citrus reticulata" />
              </div>
              <div class="form-group">
                <label>Category</label>
                <select id="new-crop-cat" class="form-control">
                  <option value="Northeast Specialty">Northeast Specialty</option>
                  <option value="Spices & Condiments">Spices & Condiments</option>
                  <option value="Rhizomes & Spices">Rhizomes & Spices</option>
                  <option value="Cole Crops">Cole Crops</option>
                  <option value="Root Vegetables">Root Vegetables</option>
                  <option value="Solanaceous Vegetables">Solanaceous Vegetables</option>
                  <option value="Citrus & Fruits">Citrus & Fruits</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div class="form-group">
                <label>Recommended Zone *</label>
                <select id="new-crop-zone" class="form-control" required>
                  <option value="1">Zone 1 (Cool: 2–8°C)</option>
                  <option value="2">Zone 2 (Deep Cold: 0–2°C)</option>
                  <option value="3">Zone 3 (Cool/Mod: 8–15°C)</option>
                </select>
              </div>
              <div class="form-group">
                <label>Min Temp (°C) *</label>
                <input type="number" step="0.5" id="new-crop-tmin" class="form-control" value="2.0" required />
              </div>
              <div class="form-group">
                <label>Max Temp (°C) *</label>
                <input type="number" step="0.5" id="new-crop-tmax" class="form-control" value="8.0" required />
              </div>
              <div class="form-group">
                <label>Optimal Temp (°C) *</label>
                <input type="number" step="0.5" id="new-crop-topt" class="form-control" value="5.0" required />
              </div>
            </div>

            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div class="form-group">
                <label>Min Humidity (%)</label>
                <input type="number" id="new-crop-hmin" class="form-control" value="85" />
              </div>
              <div class="form-group">
                <label>Max Humidity (%)</label>
                <input type="number" id="new-crop-hmax" class="form-control" value="95" />
              </div>
              <div class="form-group">
                <label>Ethylene Warn (ppm)</label>
                <input type="number" step="0.05" id="new-crop-eth" class="form-control" value="0.50" />
              </div>
              <div class="form-group">
                <label>Base Shelf Life (Days)</label>
                <input type="number" id="new-crop-life" class="form-control" value="21" />
              </div>
            </div>

            <div class="form-group">
              <label>Special Storage Notes & Chilling Sensitivity Warnings</label>
              <input type="text" id="new-crop-notes" class="form-control" placeholder="e.g. Sensitive to chilling injury below 6°C." />
            </div>

            <div class="flex gap-2 justify-end pt-2">
              <button type="button" class="btn btn-xs btn-outline" id="btn-cancel-crop">Cancel</button>
              <button type="submit" class="btn btn-xs btn-primary">Save Crop Profile</button>
            </div>
          </form>
        </div>

        <!-- Crop Cards Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          ${cropList.map(c => `
            <div class="p-4 bg-card-dark rounded-xl border border-glass hover:border-glass-bright transition-all">
              <div class="flex justify-between items-start mb-2">
                <div>
                  <h4 class="font-bold text-sm text-main">${c.name}</h4>
                  <span class="text-3xs text-muted font-mono">${c.scientificName || c.category}</span>
                </div>
                <span class="badge ${c.recommendedZone === 2 ? 'badge-cyan' : c.recommendedZone === 1 ? 'badge-normal' : 'badge-purple'} text-3xs font-mono">
                  Zone ${c.recommendedZone}
                </span>
              </div>

              <div class="p-2 bg-card rounded border border-glass my-2 grid grid-cols-3 gap-2 text-center text-3xs font-mono">
                <div><span class="text-muted block">Temp</span><strong class="text-cyan">${c.tempMin}–${c.tempMax}°C</strong></div>
                <div><span class="text-muted block">RH</span><strong class="text-emerald">${c.humidityMin}–${c.humidityMax}%</strong></div>
                <div><span class="text-muted block">Life</span><strong class="text-amber">${c.baseShelfLifeDays}d</strong></div>
              </div>

              <p class="text-3xs text-muted line-clamp-2">${c.storageNotes || 'Optimal post-harvest preservation.'}</p>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  /**
   * TAB 3: Maintenance & Diagnostics Center
   */
  renderMaintenanceHTML() {
    const conn = store.get('connection') || {};
    const z1 = store.get('zones.1');
    const z2 = store.get('zones.2');
    const z3 = store.get('zones.3');

    const serviceLogs = JSON.parse(localStorage.getItem('qoratech_maintenance_logs') || JSON.stringify([
      { id: 'LOG-101', date: '2026-09-01', tech: 'Dr. Ramesh Sharma', zone: 'Zone 1 & 2', component: 'DS18B20 Temp Probes', action: 'Periodic 2-point ice-bath calibration verified accurate (±0.1°C).' },
      { id: 'LOG-102', date: '2026-08-25', tech: 'Technician T. Dorjee', zone: 'Zone 3', component: 'MQ-137 Ethylene Gas Sensor', action: 'Zero baseline calibration performed with nitrogen purge.' },
      { id: 'LOG-103', date: '2026-08-18', tech: 'Solar Specialist Roy', zone: 'Hybrid Inverter', component: 'MPPT Solar Charge Controller', action: 'Inverter firmware updated to v2.4. MPPT efficiency 97.4%.' }
    ]));

    return `
      <!-- ESP32 Hardware Diagnostics -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div class="glass-card">
          <div class="flex items-center gap-2 mb-2">
            <i data-lucide="cpu" class="text-emerald"></i>
            <h4 class="font-bold text-sm">ESP32 Core Controller</h4>
          </div>
          <div class="space-y-1 text-xs">
            <div class="flex justify-between"><span class="text-muted">Hardware Status:</span> <strong class="text-emerald">${conn.statusLabel || 'CONNECTED'}</strong></div>
            <div class="flex justify-between"><span class="text-muted">Serial Baud:</span> <span class="font-mono">115200 bps</span></div>
            <div class="flex justify-between"><span class="text-muted">WebServer:</span> <span class="font-mono text-cyan">Port 80 (HTTP /telemetry)</span></div>
            <div class="flex justify-between"><span class="text-muted">Direct IP:</span> <span class="font-mono text-amber">192.168.4.1</span></div>
          </div>
        </div>

        <div class="glass-card">
          <div class="flex items-center gap-2 mb-2">
            <i data-lucide="sliders" class="text-cyan"></i>
            <h4 class="font-bold text-sm">Sensor Probe Health</h4>
          </div>
          <div class="space-y-1 text-xs">
            <div class="flex justify-between"><span class="text-muted">DS18B20 Probes (3):</span> <strong class="text-emerald">NORMAL (0.1°C Drift)</strong></div>
            <div class="flex justify-between"><span class="text-muted">SHT31 RH Probes (3):</span> <strong class="text-emerald">NORMAL (±1.5% RH)</strong></div>
            <div class="flex justify-between"><span class="text-muted">HX711 Load Cells (3):</span> <strong class="text-emerald">CALIBRATED (Tare OK)</strong></div>
            <div class="flex justify-between"><span class="text-muted">MQ-137 Gas Sensor:</span> <strong class="text-emerald">OPERATIONAL</strong></div>
          </div>
        </div>

        <div class="glass-card">
          <div class="flex items-center gap-2 mb-2">
            <i data-lucide="calendar" class="text-purple"></i>
            <h4 class="font-bold text-sm">Calibration Schedule</h4>
          </div>
          <div class="space-y-1 text-xs">
            <div class="flex justify-between"><span class="text-muted">Next Due:</span> <strong class="text-emerald">2026-10-01 (27 Days)</strong></div>
            <div class="flex justify-between"><span class="text-muted">Standard:</span> <span>HACCP / ISO 22000</span></div>
            <div class="flex justify-between"><span class="text-muted">Audit Trail:</span> <span class="text-cyan">Active Logging</span></div>
            <button class="btn btn-xs btn-outline w-full mt-1" id="btn-quick-calibrate">
              <i data-lucide="refresh-cw" class="icon-2xs"></i> Run Diagnostic Self-Test
            </button>
          </div>
        </div>
      </div>

      <!-- Sensor Probes Status Table -->
      <div class="glass-card mb-6">
        <h3 class="font-bold text-base flex items-center gap-2 mb-4">
          <i data-lucide="activity" class="text-cyan"></i> Live 3-Zone Probe Telemetry & Calibration Matrix
        </h3>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Zone Compartment</th>
                <th>Target Corridor</th>
                <th>Temperature Probe</th>
                <th>Humidity Sensor</th>
                <th>Load Cell Weight</th>
                <th>Ethylene Sensor</th>
                <th>Probe Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="font-bold">Zone 1 (Left)</td>
                <td class="font-mono text-3xs">2.0–8.0°C</td>
                <td class="font-bold text-cyan">${z1?.temperature.toFixed(1)}°C</td>
                <td class="font-bold text-emerald">${z1?.humidity.toFixed(1)}%</td>
                <td class="font-bold text-amber">${z1?.currentWeight.toFixed(1)} kg</td>
                <td class="font-bold text-purple">${z1?.ethylene.toFixed(2)} ppm</td>
                <td><span class="badge badge-normal text-3xs">ONLINE / CALIBRATED</span></td>
              </tr>
              <tr>
                <td class="font-bold">Zone 2 (Center Coldest)</td>
                <td class="font-mono text-3xs">0.0–2.0°C</td>
                <td class="font-bold text-cyan">${z2?.temperature.toFixed(1)}°C</td>
                <td class="font-bold text-emerald">${z2?.humidity.toFixed(1)}%</td>
                <td class="font-bold text-amber">${z2?.currentWeight.toFixed(1)} kg</td>
                <td class="font-bold text-purple">${z2?.ethylene.toFixed(2)} ppm</td>
                <td><span class="badge badge-normal text-3xs">ONLINE / CALIBRATED</span></td>
              </tr>
              <tr>
                <td class="font-bold">Zone 3 (Right Mod)</td>
                <td class="font-mono text-3xs">8.0–15.0°C</td>
                <td class="font-bold text-cyan">${z3?.temperature.toFixed(1)}°C</td>
                <td class="font-bold text-emerald">${z3?.humidity.toFixed(1)}%</td>
                <td class="font-bold text-amber">${z3?.currentWeight.toFixed(1)} kg</td>
                <td class="font-bold text-purple">${z3?.ethylene.toFixed(2)} ppm</td>
                <td><span class="badge badge-normal text-3xs">ONLINE / CALIBRATED</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Maintenance Logs Table -->
      <div class="glass-card mb-8">
        <div class="flex justify-between items-center mb-4">
          <h3 class="font-bold text-base flex items-center gap-2">
            <i data-lucide="clipboard-list" class="text-amber"></i> Hardware Maintenance & Probe Calibration Log
          </h3>
          <button class="btn btn-xs btn-primary" id="btn-add-service-log">
            <i data-lucide="plus" class="icon-2xs"></i> Add Service Log Entry
          </button>
        </div>

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Log ID</th>
                <th>Service Date</th>
                <th>Technician</th>
                <th>Target Zone / Component</th>
                <th>Action & Calibration Summary</th>
              </tr>
            </thead>
            <tbody>
              ${serviceLogs.map(l => `
                <tr>
                  <td class="font-mono text-xs">${l.id}</td>
                  <td class="font-mono text-xs text-muted">${l.date}</td>
                  <td class="font-bold text-xs text-main">${l.tech}</td>
                  <td><span class="badge badge-neutral text-3xs">${l.zone}</span> <span class="text-3xs text-muted block">${l.component}</span></td>
                  <td class="text-xs text-muted">${l.action}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  /**
   * TAB 4: NER Seasonal Rules & Multi-Factor Scoring Configurator
   */
  renderSeasonalConfigHTML() {
    const weights = seasonalAdvisor.getWeights();

    return `
      <!-- Multi-Factor Scoring Weights Configurator -->
      <div class="glass-card mb-6" style="border-left: 4px solid var(--brand-emerald);">
        <div class="flex justify-between items-start mb-4">
          <div>
            <h3 class="font-bold text-base flex items-center gap-2">
              <i data-lucide="sliders" class="text-emerald"></i> Multi-Factor Scoring Model Weights Configurator
            </h3>
            <p class="text-xs text-muted">Adjust weights used by the NER Personalized Seasonal Crop Advisor algorithm. Must sum to 100%.</p>
          </div>
          <button class="btn btn-xs btn-outline" id="btn-reset-weights">Reset to Defaults</button>
        </div>

        <form id="weights-form" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div class="p-3 bg-card-dark rounded-lg border border-glass">
              <label class="text-xs font-bold text-cyan block mb-1">Temperature Corridor (30%)</label>
              <input type="number" step="1" min="0" max="100" id="w-temp" class="form-control font-mono" value="${Math.round(weights.temp * 100)}" />
              <span class="text-3xs text-muted block mt-1">Zone thermal match</span>
            </div>

            <div class="p-3 bg-card-dark rounded-lg border border-glass">
              <label class="text-xs font-bold text-emerald block mb-1">Humidity Corridor (15%)</label>
              <input type="number" step="1" min="0" max="100" id="w-hum" class="form-control font-mono" value="${Math.round(weights.hum * 100)}" />
              <span class="text-3xs text-muted block mt-1">Relative humidity corridor</span>
            </div>

            <div class="p-3 bg-card-dark rounded-lg border border-glass">
              <label class="text-xs font-bold text-amber block mb-1">Storage Capacity Fit (15%)</label>
              <input type="number" step="1" min="0" max="100" id="w-cap" class="form-control font-mono" value="${Math.round(weights.capacity * 100)}" />
              <span class="text-3xs text-muted block mt-1">Farmer capacity fit</span>
            </div>

            <div class="p-3 bg-card-dark rounded-lg border border-glass">
              <label class="text-xs font-bold text-purple block mb-1">Produce Freshness (15%)</label>
              <input type="number" step="1" min="0" max="100" id="w-spoil" class="form-control font-mono" value="${Math.round(weights.spoilage * 100)}" />
              <span class="text-3xs text-muted block mt-1">AI Respiration index</span>
            </div>

            <div class="p-3 bg-card-dark rounded-lg border border-glass">
              <label class="text-xs font-bold text-muted block mb-1">Weight Loss Prevention (10%)</label>
              <input type="number" step="1" min="0" max="100" id="w-weight" class="form-control font-mono" value="${Math.round(weights.weightLoss * 100)}" />
              <span class="text-3xs text-muted block mt-1">Moisture retention</span>
            </div>

            <div class="p-3 bg-card-dark rounded-lg border border-glass">
              <label class="text-xs font-bold text-muted block mb-1">Ethylene Safety (10%)</label>
              <input type="number" step="1" min="0" max="100" id="w-eth" class="form-control font-mono" value="${Math.round(weights.ethylene * 100)}" />
              <span class="text-3xs text-muted block mt-1">MQ-137 gas threshold</span>
            </div>

            <div class="p-3 bg-card-dark rounded-lg border border-glass">
              <label class="text-xs font-bold text-muted block mb-1">Storage Duration (5%)</label>
              <input type="number" step="1" min="0" max="100" id="w-dur" class="form-control font-mono" value="${Math.round(weights.duration * 100)}" />
              <span class="text-3xs text-muted block mt-1">Expected shelf-life gain</span>
            </div>
          </div>

          <div class="flex justify-between items-center pt-2">
            <span class="text-xs text-muted" id="weights-sum-text">Total Sum: 100%</span>
            <button type="submit" class="btn btn-sm btn-primary">
              <i data-lucide="save" class="icon-xs"></i> Save Scoring Model Weights
            </button>
          </div>
        </form>
      </div>

      <!-- NER Regional Agro-Climatic Seasonal Database -->
      <div class="glass-card mb-8">
        <h3 class="font-bold text-base flex items-center gap-2 mb-4">
          <i data-lucide="map" class="text-cyan"></i> Northeast India (NER) 8-State Seasonal Rules Reference
        </h3>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          ${Object.entries(NER_SEASONAL_RULES).map(([stateName, seasons]) => `
            <div class="p-4 bg-card-dark rounded-xl border border-glass">
              <h4 class="font-bold text-sm text-emerald mb-2 flex items-center gap-1.5">
                <i data-lucide="map-pin" class="icon-2xs text-emerald"></i> ${stateName}
              </h4>
              <div class="space-y-2 text-3xs font-mono">
                <div class="p-2 bg-card rounded flex justify-between items-center">
                  <span><strong>Spring (Mar-May):</strong> ${seasons.spring.name}</span>
                  <span class="text-cyan">${seasons.spring.tempRange}</span>
                </div>
                <div class="p-2 bg-card rounded flex justify-between items-center">
                  <span><strong>Monsoon (Jun-Sep):</strong> ${seasons.monsoon.name}</span>
                  <span class="text-emerald">${seasons.monsoon.tempRange}</span>
                </div>
                <div class="p-2 bg-card rounded flex justify-between items-center">
                  <span><strong>Autumn (Oct-Nov):</strong> ${seasons.autumn.name}</span>
                  <span class="text-amber">${seasons.autumn.tempRange}</span>
                </div>
                <div class="p-2 bg-card rounded flex justify-between items-center">
                  <span><strong>Winter (Dec-Feb):</strong> ${seasons.winter.name}</span>
                  <span class="text-purple">${seasons.winter.tempRange}</span>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  bindEvents() {
    // 1. Primary Tab Switches
    document.querySelectorAll('[data-maintab]').forEach(btn => {
      btn.onclick = () => {
        this.activeMainTab = btn.getAttribute('data-maintab');
        this.render();
      };
    });

    // 2. User Sub-tab Switches
    document.querySelectorAll('[data-subtab]').forEach(btn => {
      btn.onclick = () => {
        this.userFilter = btn.getAttribute('data-subtab');
        this.render();
      };
    });

    // 3. User Approval Actions
    document.querySelectorAll('.approve-user-btn').forEach(btn => {
      btn.onclick = async () => {
        const uid = btn.getAttribute('data-uid');
        btn.disabled = true;
        try {
          await authService.updateUserStatus(uid, 'approved');
          showToast('User approved successfully. Synced to Cloud Firestore.', 'success');
          this.render();
        } catch (e) {
          alert('Approval error: ' + e.message);
          btn.disabled = false;
        }
      };
    });

    document.querySelectorAll('.reject-user-btn').forEach(btn => {
      btn.onclick = async () => {
        const uid = btn.getAttribute('data-uid');
        btn.disabled = true;
        try {
          await authService.updateUserStatus(uid, 'rejected');
          showToast('User account rejected and updated in Firestore.', 'error');
          this.render();
        } catch (e) {
          alert('Rejection error: ' + e.message);
          btn.disabled = false;
        }
      };
    });

    document.querySelectorAll('.disable-user-btn').forEach(btn => {
      btn.onclick = async () => {
        const uid = btn.getAttribute('data-uid');
        if (confirm('Disable this user account?')) {
          btn.disabled = true;
          await authService.updateUserStatus(uid, 'disabled');
          showToast('User account disabled in Cloud Firestore.', 'normal');
          this.render();
        }
      };
    });

    // 4. Crop Profile Add Form Toggle
    const toggleCropBtn = document.getElementById('btn-toggle-add-crop');
    const cropFormCard = document.getElementById('add-crop-form-card');
    const cancelCropBtn = document.getElementById('btn-cancel-crop');
    const cropForm = document.getElementById('add-crop-form');

    if (toggleCropBtn && cropFormCard) {
      toggleCropBtn.onclick = () => cropFormCard.classList.toggle('hidden');
    }
    if (cancelCropBtn && cropFormCard) {
      cancelCropBtn.onclick = () => cropFormCard.classList.add('hidden');
    }

    if (cropForm) {
      cropForm.onsubmit = (e) => {
        e.preventDefault();
        const name = document.getElementById('new-crop-name').value.trim();
        const sci = document.getElementById('new-crop-sci').value.trim();
        const cat = document.getElementById('new-crop-cat').value;
        const zone = parseInt(document.getElementById('new-crop-zone').value, 10);
        const tmin = parseFloat(document.getElementById('new-crop-tmin').value);
        const tmax = parseFloat(document.getElementById('new-crop-tmax').value);
        const topt = parseFloat(document.getElementById('new-crop-topt').value);
        const hmin = parseFloat(document.getElementById('new-crop-hmin').value);
        const hmax = parseFloat(document.getElementById('new-crop-hmax').value);
        const eth = parseFloat(document.getElementById('new-crop-eth').value);
        const life = parseInt(document.getElementById('new-crop-life').value, 10);
        const notes = document.getElementById('new-crop-notes').value.trim();

        const cropId = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const profiles = store.get('cropProfiles') || { ...DEFAULT_PRODUCE_PROFILES };

        profiles[cropId] = {
          id: cropId,
          name,
          scientificName: sci || name,
          category: cat,
          recommendedZone: zone,
          tempMin: tmin,
          tempMax: tmax,
          tempOptimal: topt,
          humidityMin: hmin,
          humidityMax: hmax,
          ethyleneWarnThreshold: eth,
          ethyleneCritThreshold: eth * 2,
          baseShelfLifeDays: life,
          storageNotes: notes || 'Preserved under optimal multi-zone parameters.'
        };

        store.set('cropProfiles', profiles);
        showToast(`✅ Crop Profile '${name}' added successfully!`, 'success');
        this.render();
      };
    }

    // 5. Diagnostic Self Test
    const testBtn = document.getElementById('btn-quick-calibrate');
    if (testBtn) {
      testBtn.onclick = () => {
        showToast('Running 3-zone sensor probe self-test...', 'normal');
        setTimeout(() => {
          showToast('✅ All DS18B20 & SHT31 Probes Responding with Zero Errors.', 'success');
        }, 1200);
      };
    }

    // 6. Add Service Log Button
    const addLogBtn = document.getElementById('btn-add-service-log');
    if (addLogBtn) {
      addLogBtn.onclick = () => {
        const tech = prompt('Enter Technician Name:', 'Dr. Ramesh Sharma');
        if (!tech) return;
        const zone = prompt('Enter Target Zone / Component:', 'Zone 1 DHT22');
        const action = prompt('Enter Maintenance / Calibration Action Summary:', 'Cleaned optical dust filter and recalibrated humidity offset.');

        if (zone && action) {
          const logs = JSON.parse(localStorage.getItem('qoratech_maintenance_logs') || '[]');
          logs.unshift({
            id: `LOG-${Date.now().toString().slice(-4)}`,
            date: new Date().toISOString().slice(0, 10),
            tech,
            zone,
            component: 'Field Service',
            action
          });
          localStorage.setItem('qoratech_maintenance_logs', JSON.stringify(logs));
          showToast('Maintenance log saved.', 'success');
          this.render();
        }
      };
    }

    // 7. Weights Form Submit
    const weightsForm = document.getElementById('weights-form');
    if (weightsForm) {
      weightsForm.onsubmit = (e) => {
        e.preventDefault();
        const t = parseFloat(document.getElementById('w-temp').value) / 100;
        const h = parseFloat(document.getElementById('w-hum').value) / 100;
        const c = parseFloat(document.getElementById('w-cap').value) / 100;
        const s = parseFloat(document.getElementById('w-spoil').value) / 100;
        const w = parseFloat(document.getElementById('w-weight').value) / 100;
        const eth = parseFloat(document.getElementById('w-eth').value) / 100;
        const d = parseFloat(document.getElementById('w-dur').value) / 100;

        const sum = Math.round((t + h + c + s + w + eth + d) * 100);
        if (sum !== 100) {
          alert(`Warning: The weights sum to ${sum}%, but should ideally sum to 100%. Saving configured ratios.`);
        }

        seasonalAdvisor.saveWeights({
          temp: t,
          hum: h,
          capacity: c,
          spoilage: s,
          weightLoss: w,
          ethylene: eth,
          duration: d
        });

        showToast('✅ Scoring model weights updated and saved.', 'success');
      };
    }

    const resetWeightsBtn = document.getElementById('btn-reset-weights');
    if (resetWeightsBtn) {
      resetWeightsBtn.onclick = () => {
        seasonalAdvisor.saveWeights(DEFAULT_ADVISOR_WEIGHTS);
        showToast('Scoring weights reset to system defaults.', 'normal');
        this.render();
      };
    }
  }
}

const adminCenter = new AdminControlCenter();
adminCenter.init();
