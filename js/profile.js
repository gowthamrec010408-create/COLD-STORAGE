/**
 * QORA TECH — User Profile Page Controller
 */

import { setupNavigation } from './navigation.js';
import { authService } from './auth.js';

class ProfilePage {
  init() {
    setupNavigation('profile');
    this.render();
  }

  render() {
    const container = document.getElementById('profile-content');
    if (!container) return;

    const user = authService.getCurrentUser();
    if (!user) return;

    container.innerHTML = `
      <!-- Header -->
      <div class="glass-card mb-6">
        <div class="flex items-center gap-4">
          <div class="user-avatar-pill" style="width: 64px; height: 64px;">
            <i data-lucide="user" class="icon-md text-emerald"></i>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-2xl font-bold">${user.displayName}</h1>
              <span class="badge ${user.isAdmin ? 'badge-purple' : 'badge-emerald'} text-3xs">${user.role.toUpperCase()}</span>
            </div>
            <p class="text-xs text-muted mt-0.5">${user.userType} • ${user.organization || 'Independent Farmer'}</p>
          </div>
        </div>
      </div>

      <!-- Details Cards Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <!-- Account Information -->
        <div class="glass-card">
          <h3 class="font-bold text-base flex items-center gap-2 mb-4">
            <i data-lucide="id-card" class="text-cyan"></i> Account & Contact Metadata
          </h3>

          <div class="space-y-3 text-xs">
            <div class="flex justify-between py-2 border-b border-glass">
              <span class="text-muted">User ID:</span>
              <span class="font-mono font-bold">${user.uid}</span>
            </div>
            <div class="flex justify-between py-2 border-b border-glass">
              <span class="text-muted">Registered Phone:</span>
              <span class="font-bold">${user.phone}</span>
            </div>
            <div class="flex justify-between py-2 border-b border-glass">
              <span class="text-muted">Email Address:</span>
              <span class="font-bold">${user.email || 'N/A'}</span>
            </div>
            <div class="flex justify-between py-2 border-b border-glass">
              <span class="text-muted">Location / State:</span>
              <span class="font-bold">${user.location}</span>
            </div>
            <div class="flex justify-between py-2">
              <span class="text-muted">Account Status:</span>
              <span class="badge badge-normal text-3xs">${user.status.toUpperCase()}</span>
            </div>
          </div>
        </div>

        <!-- Assigned Facility & Security -->
        <div class="glass-card">
          <h3 class="font-bold text-base flex items-center gap-2 mb-4">
            <i data-lucide="shield-check" class="text-emerald"></i> Storage Facility & Security
          </h3>

          <div class="space-y-3 text-xs">
            <div class="flex justify-between py-2 border-b border-glass">
              <span class="text-muted">Assigned Unit:</span>
              <span class="font-bold text-emerald">${user.storageUnitId || 'COLD-ROOM-ALPHA'}</span>
            </div>
            <div class="flex justify-between py-2 border-b border-glass">
              <span class="text-muted">Monitoring Access:</span>
              <span class="font-bold">Three-Zone Sensor Telemetry + AI</span>
            </div>
            <div class="flex justify-between py-2 border-b border-glass">
              <span class="text-muted">Session Gating:</span>
              <span class="font-bold text-cyan">Active Authenticated Session</span>
            </div>
          </div>

          <div class="mt-6 pt-4 border-t border-glass flex justify-end">
            <button class="btn btn-outline" id="btn-profile-logout" style="border-color: rgba(244,63,94,0.4); color: var(--brand-rose);">
              <i data-lucide="log-out"></i> Sign Out of Account
            </button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btn-profile-logout')?.addEventListener('click', () => {
      authService.logout();
    });

    if (window.lucide) window.lucide.createIcons();
  }
}

const page = new ProfilePage();
page.init();
