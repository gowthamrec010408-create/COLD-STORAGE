/**
 * QORA TECH — Modular Navigation & Topbar Injector
 * Injects and manages the Left Sidebar and Topbar with Live IP & USB Hardware Connection Status across all pages.
 */

import { authService } from './auth.js';
import { store } from './core/state.js';

export function setupNavigation(activePage = 'dashboard', isAdminPage = false) {
  // 1. Enforce Auth
  let user;
  if (isAdminPage) {
    user = authService.requireAdmin();
  } else {
    user = authService.requireAuth();
  }
  if (!user) return;

  // 2. Inject Left Sidebar if container present
  const sidebarContainer = document.getElementById('sidebar-container');
  if (sidebarContainer) {
    if (isAdminPage) {
      sidebarContainer.innerHTML = `
        <aside class="app-sidebar" id="app-sidebar">
          <div class="sidebar-brand-box">
            <a href="admin.html" class="qora-brand">
              <img src="assets/logo.png" alt="QORA TECH Logo" class="qora-brand-img" />
              <div class="qora-brand-text-col">
                <span class="qora-title">QORA <span class="text-purple">ADMIN</span></span>
                <span class="qora-subtitle">CONTROL CENTER</span>
              </div>
            </a>
          </div>

          <div class="sidebar-nav-scroll">
            <div class="sidebar-group-title">ADMINISTRATION</div>
            <nav class="sidebar-nav-list">
              <a href="admin.html" class="sidebar-nav-link ${activePage === 'admin' ? 'admin-active' : ''}">
                <i data-lucide="layout-dashboard" class="icon-sm text-purple"></i>
                <span>Admin Dashboard</span>
              </a>
            </nav>
          </div>

          <div class="sidebar-user-footer">
            <div class="sidebar-user-profile-box">
              <div class="flex items-center gap-2">
                <div class="user-avatar-pill" style="background: var(--brand-purple-light);">
                  <i data-lucide="shield-check" class="icon-xs text-purple"></i>
                </div>
                <div class="user-info-text truncate">
                  <div class="text-xs font-bold truncate">${user.displayName}</div>
                  <div class="text-3xs text-muted truncate">ROOT ADMINISTRATOR</div>
                </div>
              </div>
              <button class="btn btn-2xs btn-outline btn-logout" title="Sign Out">
                <i data-lucide="log-out" class="icon-xs text-rose"></i>
              </button>
            </div>
          </div>
        </aside>
      `;
    } else {
      sidebarContainer.innerHTML = `
        <aside class="app-sidebar" id="app-sidebar">
          <div class="sidebar-brand-box">
            <a href="dashboard.html" class="qora-brand">
              <img src="assets/logo.png" alt="QORA TECH Logo" class="qora-brand-img" />
              <div class="qora-brand-text-col">
                <span class="qora-title">QORA <span class="text-emerald">TECH</span></span>
                <span class="qora-subtitle">SOLAR SMART COLD STORAGE</span>
              </div>
            </a>
          </div>

          <div class="sidebar-nav-scroll">
            <div class="sidebar-group-title">MONITORING & IOT</div>
            <nav class="sidebar-nav-list">
              <a href="dashboard.html" class="sidebar-nav-link ${activePage === 'dashboard' ? 'active' : ''}">
                <i data-lucide="layout-dashboard" class="icon-sm text-emerald"></i>
                <span>Dashboard</span>
              </a>
              <a href="zones.html" class="sidebar-nav-link ${activePage === 'zones' ? 'active' : ''}">
                <i data-lucide="layers" class="icon-sm text-cyan"></i>
                <span>3-Zone Monitor</span>
              </a>
              <a href="spoilage.html" class="sidebar-nav-link ${activePage === 'spoilage' ? 'active' : ''}">
                <i data-lucide="sparkles" class="icon-sm text-cyan"></i>
                <span>AI Spoilage</span>
              </a>
              <a href="selling.html" class="sidebar-nav-link ${activePage === 'selling' ? 'active' : ''}">
                <i data-lucide="trending-up" class="icon-sm text-amber"></i>
                <span>Smart Selling</span>
              </a>
              <a href="batches.html" class="sidebar-nav-link ${activePage === 'batches' ? 'active' : ''}">
                <i data-lucide="package" class="icon-sm text-purple"></i>
                <span>Batches</span>
              </a>
              <a href="analytics.html" class="sidebar-nav-link ${activePage === 'analytics' ? 'active' : ''}">
                <i data-lucide="line-chart" class="icon-sm text-indigo"></i>
                <span>Analytics</span>
              </a>
              <a href="energy.html" class="sidebar-nav-link ${activePage === 'energy' ? 'active' : ''}">
                <i data-lucide="zap" class="icon-sm text-amber"></i>
                <span>Solar & Energy</span>
              </a>
              <a href="devices.html" class="sidebar-nav-link ${activePage === 'devices' ? 'active' : ''}">
                <i data-lucide="cpu" class="icon-sm text-rose"></i>
                <span>ESP32 & IP Connect</span>
              </a>
              <a href="calibration.html" class="sidebar-nav-link ${activePage === 'calibration' ? 'active' : ''}">
                <i data-lucide="sliders" class="icon-sm text-cyan"></i>
                <span>Calibration</span>
              </a>
              <a href="reports.html" class="sidebar-nav-link ${activePage === 'reports' ? 'active' : ''}">
                <i data-lucide="file-text" class="icon-sm text-emerald"></i>
                <span>HACCP Reports</span>
              </a>
              <a href="profile.html" class="sidebar-nav-link ${activePage === 'profile' ? 'active' : ''}">
                <i data-lucide="user" class="icon-sm text-dim"></i>
                <span>User Profile</span>
              </a>
              ${user.isAdmin ? `
                <a href="admin.html" class="sidebar-nav-link" style="margin-top: 0.5rem; border: 1px dashed rgba(168,85,247,0.4);">
                  <i data-lucide="shield-check" class="icon-sm text-purple"></i>
                  <span>Admin Center</span>
                </a>
              ` : ''}
            </nav>
          </div>

          <div class="sidebar-user-footer">
            <div class="sidebar-user-profile-box">
              <div class="flex items-center gap-2">
                <div class="user-avatar-pill">
                  <i data-lucide="user" class="icon-xs text-emerald"></i>
                </div>
                <div class="user-info-text truncate">
                  <div class="text-xs font-bold truncate">${user.displayName}</div>
                  <div class="text-3xs text-muted truncate">${user.userType} • ${user.role.toUpperCase()}</div>
                </div>
              </div>
              <button class="btn btn-2xs btn-outline btn-logout" title="Sign Out">
                <i data-lucide="log-out" class="icon-xs text-rose"></i>
              </button>
            </div>
          </div>
        </aside>
      `;
    }
  }

  // 3. Inject Topbar Navbar if container present
  const navbarContainer = document.getElementById('navbar-container');
  if (navbarContainer) {
    navbarContainer.innerHTML = `
      <nav class="app-navbar">
        <div class="nav-container">
          <div class="flex items-center gap-3">
            <button class="btn btn-xs btn-outline mobile-menu-trigger" id="mobile-menu-btn" aria-label="Open navigation menu">
              <i data-lucide="menu" class="icon-sm"></i>
            </button>
            <span class="topbar-unit-tag text-xs font-bold text-muted hidden sm:inline" id="topbar-title-tag">
              QORA TECH • Unit: ${user.storageUnitId || 'COLD-ROOM-01'}
            </span>
          </div>

          <div class="nav-right-actions flex items-center gap-2">
            <!-- Hardware Connection Status Pill -->
            <a href="devices.html" class="badge" id="topbar-conn-badge" style="background: rgba(255,255,255,0.06); color: var(--text-muted); border: 1px solid var(--border-glass);" title="Hardware Connectivity Status">
              <span class="pulse-dot" id="topbar-conn-dot" style="background: var(--brand-rose);"></span>
              <span id="topbar-conn-text">DEVICE OFFLINE</span>
            </a>

            <!-- Quick IP Connect Link -->
            <a href="devices.html" class="btn btn-xs btn-outline hidden md:inline-flex" title="Connect using ESP32 IP Address">
              <i data-lucide="globe" class="icon-xs text-emerald"></i>
              <span>IP Connect</span>
            </a>

            <!-- Theme Toggle -->
            <button class="btn btn-xs btn-outline" id="theme-toggle-btn" title="Toggle Theme">
              <i data-lucide="moon" class="icon-xs"></i>
            </button>

            <!-- User Pill -->
            <div class="flex items-center gap-2">
              <div class="text-right hidden lg:block">
                <div class="text-xs font-bold">${user.displayName}</div>
                <div class="text-3xs text-muted">${user.location}</div>
              </div>
              <button class="btn btn-xs btn-outline btn-logout" title="Sign Out">
                <i data-lucide="log-out" class="icon-xs text-rose"></i>
              </button>
            </div>
          </div>
        </div>
      </nav>
    `;
  }

  // 4. Inject Mobile Bottom Bar
  const mobileNavContainer = document.getElementById('mobile-bottom-nav-container');
  if (mobileNavContainer) {
    mobileNavContainer.innerHTML = `
      <nav class="mobile-bottom-nav">
        <a href="dashboard.html" class="bottom-nav-item ${activePage === 'dashboard' ? 'active' : ''}"><i data-lucide="layout-dashboard"></i><span>Home</span></a>
        <a href="zones.html" class="bottom-nav-item ${activePage === 'zones' ? 'active' : ''}"><i data-lucide="layers"></i><span>Zones</span></a>
        <a href="spoilage.html" class="bottom-nav-item ${activePage === 'spoilage' ? 'active' : ''}"><i data-lucide="sparkles"></i><span>AI</span></a>
        <a href="energy.html" class="bottom-nav-item ${activePage === 'energy' ? 'active' : ''}"><i data-lucide="zap"></i><span>Energy</span></a>
        <a href="devices.html" class="bottom-nav-item ${activePage === 'devices' ? 'active' : ''}"><i data-lucide="cpu"></i><span>Hardware</span></a>
      </nav>
    `;
  }

  // 5. Update Connection Status Badge Dynamically
  const updateConnBadge = (conn) => {
    const badgeText = document.getElementById('topbar-conn-text');
    const badgeDot = document.getElementById('topbar-conn-dot');
    const badge = document.getElementById('topbar-conn-badge');
    if (!badgeText || !badgeDot || !conn) return;

    badgeText.textContent = conn.statusLabel;
    badgeDot.style.background = conn.statusColor;

    if (conn.mode === 'USB' || conn.mode === 'WIFI' || conn.mode === 'DUAL') {
      badge.style.background = 'var(--brand-emerald-light)';
      badge.style.color = 'var(--brand-emerald)';
      badge.style.borderColor = 'rgba(16, 185, 129, 0.4)';
    } else if (conn.mode === 'DEMO') {
      badge.style.background = 'var(--brand-amber-light)';
      badge.style.color = 'var(--brand-amber)';
      badge.style.borderColor = 'rgba(245, 158, 11, 0.4)';
    } else {
      badge.style.background = 'rgba(244, 63, 94, 0.12)';
      badge.style.color = 'var(--brand-rose)';
      badge.style.borderColor = 'rgba(244, 63, 94, 0.3)';
    }
  };

  store.subscribe('connection', updateConnBadge);

  // 6. Bind Navigation Events
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const sidebar = document.getElementById('app-sidebar');
  if (mobileMenuBtn && sidebar) {
    mobileMenuBtn.onclick = () => sidebar.classList.toggle('open');
  }

  document.querySelectorAll('.btn-logout').forEach(btn => {
    btn.onclick = () => authService.logout();
  });

  const themeBtn = document.getElementById('theme-toggle-btn');
  if (themeBtn) {
    const savedTheme = localStorage.getItem('solarsmart_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    themeBtn.onclick = () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('solarsmart_theme', next);
    };
  }

  if (window.lucide) {
    setTimeout(() => window.lucide.createIcons(), 30);
  }
}
