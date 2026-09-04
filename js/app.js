/**
 * Solar Smart Cold Storage — Main Application Orchestrator
 * Bootstraps client-side routing, global state listeners, Lucide icon generation,
 * simulator automation, and navigation bars.
 */

import { store } from './core/state.js';
import { authService } from './core/auth.js';
import { Router } from './core/router.js';
import { initializeFirebase } from './config/firebase-config.js';
import { firebaseService } from './services/firebase-service.js';
import { simulator } from './services/simulator.js';

// UI View Modules
import { renderLandingView } from './ui/landing-ui.js';
import { authUI } from './ui/auth-ui.js';
import { dashboardUI } from './ui/dashboard-ui.js';
import { predictionUI } from './ui/prediction-ui.js';
import { smartSellingUI } from './ui/smart-selling-ui.js';
import { produceUI } from './ui/produce-ui.js';
import { analyticsUI } from './ui/analytics-ui.js';
import { energyUI } from './ui/energy-ui.js';
import { calibrationUI } from './ui/calibration-ui.js';
import { reportsUI } from './ui/reports-ui.js';
import { devicesUI } from './ui/devices-ui.js';
import { adminUI } from './ui/admin-ui.js';

class Application {
  constructor() {
    this.router = null;
  }

  async init() {
    console.log('🚀 Bootstrapping Solar Smart Cold Storage Web Platform...');

    // 1. Check existing session
    authService.checkSession();

    // 2. Initialize Firebase (or activate local fallback)
    await initializeFirebase();
    await firebaseService.startRealtimeListeners();

    // 3. Start high-fidelity IoT simulator automatically for rich live telemetry
    simulator.start(3000);

    // 4. Setup Routes
    this.setupRoutes();

    // 5. Setup UI Shell & Navigation Event Listeners
    this.setupNavbar();
    this.setupThemeToggle();
    this.setupFirebaseConfigModal();
    this.setupAlertNotificationsModal();

    // 6. Global State Subscriptions
    this.subscribeGlobalUI();

    // 7. Render initial Lucide Icons
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  setupRoutes() {
    this.router = new Router({
      landing: () => renderLandingView(),
      login: () => authUI.render(),
      dashboard: () => dashboardUI.render(),
      prediction: () => predictionUI.render(),
      'smart-selling': () => smartSellingUI.render(),
      produce: () => produceUI.render(),
      analytics: () => analyticsUI.render(),
      energy: () => energyUI.render(),
      calibration: () => calibrationUI.render(),
      reports: () => reportsUI.render(),
      devices: () => devicesUI.render(),
      admin: () => adminUI.render()
    });
  }

  setupNavbar() {
    // Sidebar Toggle (Mobile & Desktop)
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.getElementById('app-sidebar');

    if (mobileMenuBtn && sidebar) {
      mobileMenuBtn.onclick = () => sidebar.classList.toggle('open');
    }

    // Close sidebar on any sidebar link click on mobile
    document.querySelectorAll('.sidebar-nav-link').forEach(link => {
      link.addEventListener('click', () => {
        if (sidebar && window.innerWidth <= 1024) sidebar.classList.remove('open');
      });
    });

    // Logout Action
    document.querySelectorAll('.action-logout').forEach(btn => {
      btn.addEventListener('click', () => {
        authService.logout();
        window.location.hash = '#login';
        this.updateNavUserDisplay();
        if (this.router) this.router.handleHashChange();
      });
    });
  }

  setupThemeToggle() {
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (!themeBtn) return;

    const savedTheme = localStorage.getItem('solarsmart_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);

    themeBtn.onclick = () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('solarsmart_theme', next);
    };
  }

  setupFirebaseConfigModal() {
    const modal = document.getElementById('firebase-settings-modal');
    const openBtn = document.getElementById('open-firebase-settings-btn');
    const closeBtn = document.getElementById('close-firebase-modal-btn');
    const form = document.getElementById('firebase-config-form');

    const toggleModal = (show) => {
      if (modal) {
        if (show) modal.classList.remove('hidden');
        else modal.classList.add('hidden');
      }
    };

    if (openBtn) openBtn.onclick = () => toggleModal(true);
    if (closeBtn) closeBtn.onclick = () => toggleModal(false);

    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();
        const { saveFirebaseConfig } = await import('./config/firebase-config.js');
        const newConfig = {
          apiKey: document.getElementById('fb-apikey').value.trim(),
          authDomain: document.getElementById('fb-authdomain').value.trim(),
          databaseURL: document.getElementById('fb-databaseurl').value.trim(),
          projectId: document.getElementById('fb-projectid').value.trim(),
          storageBucket: document.getElementById('fb-storagebucket').value.trim(),
          appId: document.getElementById('fb-appid').value.trim()
        };
        saveFirebaseConfig(newConfig);
        alert('✅ Firebase credentials saved. Reloading session...');
        window.location.reload();
      };
    }
  }

  setupAlertNotificationsModal() {
    const alertModal = document.getElementById('alerts-drawer-modal');
    const openBtn = document.getElementById('navbar-alerts-btn');
    const closeBtn = document.getElementById('close-alerts-drawer');

    const toggleAlerts = (show) => {
      if (alertModal) {
        if (show) alertModal.classList.remove('hidden');
        else alertModal.classList.add('hidden');
      }
    };

    if (openBtn) openBtn.onclick = () => {
      this.renderAlertsDrawer();
      toggleAlerts(true);
    };
    if (closeBtn) closeBtn.onclick = () => toggleAlerts(false);
  }

  renderAlertsDrawer() {
    const container = document.getElementById('alerts-drawer-list');
    if (!container) return;

    const alerts = store.get('alerts') || [];

    if (alerts.length === 0) {
      container.innerHTML = '<p class="text-sm text-muted text-center py-6">No active alerts recorded.</p>';
      return;
    }

    container.innerHTML = alerts.map(a => `
      <div class="alert-log-item ${a.level.toLowerCase()} ${a.acknowledged ? 'acknowledged' : ''}">
        <div class="flex justify-between items-start">
          <div class="font-bold text-sm flex items-center gap-2">
            <i data-lucide="${a.level === 'CRITICAL' ? 'alert-triangle' : 'alert-circle'}" class="icon-xs ${a.level === 'CRITICAL' ? 'text-rose' : 'text-amber'}"></i>
            ${a.title}
          </div>
          <span class="text-2xs text-muted font-mono">${new Date(a.timestamp).toLocaleTimeString()}</span>
        </div>
        <p class="text-xs text-muted mt-1">${a.message}</p>
        ${!a.acknowledged ? `
          <button class="btn btn-2xs btn-outline mt-2 ack-alert-btn" data-id="${a.id}">
            Acknowledge & Resolve
          </button>
        ` : '<span class="text-2xs text-emerald mt-2 inline-block">✓ Acknowledged</span>'}
      </div>
    `).join('');

    container.querySelectorAll('.ack-alert-btn').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-id');
        store.acknowledgeAlert(id);
        this.renderAlertsDrawer();
      };
    });

    if (window.lucide) window.lucide.createIcons();
  }

  subscribeGlobalUI() {
    // User auth changes -> update navbar
    store.subscribe('user', () => this.updateNavUserDisplay());

    // Alerts count badge
    store.subscribe('alerts', (alerts = []) => {
      const unack = alerts.filter(a => !a.acknowledged).length;
      const badge = document.getElementById('alerts-badge-count');
      if (badge) {
        if (unack > 0) {
          badge.textContent = unack;
          badge.classList.remove('hidden');
        } else {
          badge.classList.add('hidden');
        }
      }
    });
  }

  updateNavUserDisplay() {
    const user = store.get('user');
    const authActions = document.getElementById('nav-auth-actions');
    const userProfile = document.getElementById('nav-user-profile');
    const sidebarProfile = document.getElementById('sidebar-user-footer');
    const alertsBtn = document.getElementById('navbar-alerts-btn');
    const adminLinks = document.querySelectorAll('.nav-admin-only');
    const bottomNav = document.querySelector('.mobile-bottom-nav');

    if (user && user.status === 'approved') {
      if (authActions) authActions.classList.add('hidden');
      if (userProfile) {
        userProfile.classList.remove('hidden');
        const nameEl = document.getElementById('nav-user-name');
        const roleEl = document.getElementById('nav-user-role');
        if (nameEl) nameEl.textContent = user.displayName || user.email;
        if (roleEl) roleEl.textContent = `${user.userType} • ${user.role.toUpperCase()}`;
      }
      if (sidebarProfile) {
        sidebarProfile.classList.remove('hidden');
        const sName = document.getElementById('sidebar-user-name');
        const sRole = document.getElementById('sidebar-user-role');
        if (sName) sName.textContent = user.displayName || user.email;
        if (sRole) sRole.textContent = `${user.userType} • ${user.role.toUpperCase()}`;
      }
      if (alertsBtn) alertsBtn.classList.remove('hidden');
      if (bottomNav) bottomNav.classList.remove('hidden');

      // Show admin nav links if user is admin
      adminLinks.forEach(el => {
        if (user.isAdmin) el.classList.remove('hidden');
        else el.classList.add('hidden');
      });
    } else {
      if (authActions) authActions.classList.remove('hidden');
      if (userProfile) userProfile.classList.add('hidden');
      if (sidebarProfile) sidebarProfile.classList.add('hidden');
      if (alertsBtn) alertsBtn.classList.add('hidden');
      if (bottomNav) bottomNav.classList.add('hidden');
      adminLinks.forEach(el => el.classList.add('hidden'));
    }

    if (window.lucide) window.lucide.createIcons();
  }
}

// Bootstrap application on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new Application();
  app.init();
});
