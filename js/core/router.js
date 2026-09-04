/**
 * Solar Smart Cold Storage — Client-Side Hash Router
 * Supports seamless single-page navigation, page transitions, and route access guards.
 */

import { store } from './state.js';

export class Router {
  constructor(routes = {}) {
    this.routes = routes;
    this.currentRoute = null;
    this.init();
  }

  init() {
    window.addEventListener('hashchange', () => this.handleHashChange());
    window.addEventListener('load', () => this.handleHashChange());
  }

  handleHashChange() {
    let hash = window.location.hash.replace(/^#\/?/, '').trim();
    const user = store.get('user');
    const isAuthenticated = user && user.status === 'approved';

    // If not authenticated, the only allowed starting route is 'login'
    if (!isAuthenticated) {
      if (hash !== 'login') {
        window.location.hash = '#login';
        return;
      }
      this.navigate('login');
      return;
    }

    // If authenticated and no hash or on 'login', default to dashboard (or admin if admin)
    if (!hash || hash === 'login' || hash === 'landing') {
      window.location.hash = user.isAdmin ? '#admin' : '#dashboard';
      return;
    }

    // Protected route verification
    const protectedRoutes = ['dashboard', 'prediction', 'smart-selling', 'produce', 'analytics', 'energy', 'calibration', 'reports', 'devices', 'admin'];
    
    // Admin access guard
    if (hash === 'admin' && !user.isAdmin) {
      window.location.hash = '#dashboard';
      return;
    }

    this.navigate(hash);
  }

  navigate(routeName) {
    const user = store.get('user');
    const isAuthenticated = user && user.status === 'approved';
    const sidebar = document.getElementById('app-sidebar');
    const mainLayout = document.querySelector('.app-main-layout');
    const mobileBottomNav = document.querySelector('.mobile-bottom-nav');

    // Sidebar & Layout toggle: Only show sidebar and mobile bottom nav after login
    if (!isAuthenticated || routeName === 'login') {
      if (sidebar) sidebar.classList.add('hidden');
      if (mainLayout) mainLayout.classList.add('auth-layout-active');
      if (mobileBottomNav) mobileBottomNav.classList.add('hidden');
    } else {
      if (sidebar) sidebar.classList.remove('hidden');
      if (mainLayout) mainLayout.classList.remove('auth-layout-active');
      if (mobileBottomNav) mobileBottomNav.classList.remove('hidden');
    }

    const route = this.routes[routeName] || this.routes['login'];
    this.currentRoute = routeName;

    // Update active nav links in sidebar
    document.querySelectorAll('.sidebar-nav-link, .bottom-nav-item').forEach(link => {
      const target = link.getAttribute('data-route') || link.getAttribute('href')?.replace(/^#\/?/, '');
      if (target === routeName) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Update Topbar Title Tag
    const titleTag = document.getElementById('topbar-title-tag');
    if (titleTag) {
      const titles = {
        login: 'QORA TECH • Authentication & Access Control',
        dashboard: 'Unit #01 • 3-Zone Operational Dashboard',
        prediction: 'AI Spoilage & Freshness Prediction Studio',
        'smart-selling': 'Smart Selling & Market Dispatch Prioritization',
        produce: 'Produce Batches & Northeast India Crop Registry',
        analytics: 'Historical Sensor Telemetry & Analytics',
        energy: 'Hybrid Solar PV, Battery & AC Power Balance',
        calibration: 'Sensor Calibration & HX711 Tare Suite',
        reports: 'Automated Regulatory Reports & Data Export',
        devices: 'ESP32 Hardware Diagnostics & IoT Simulator',
        admin: 'System Administrator Control Center'
      };
      titleTag.textContent = titles[routeName] || 'QORA TECH Solar Smart Cold Storage';
    }

    // Hide all view containers and show target view
    document.querySelectorAll('.app-view').forEach(view => {
      view.classList.add('hidden');
      view.classList.remove('active-view');
    });

    const targetView = document.getElementById(`view-${routeName}`);
    if (targetView) {
      targetView.classList.remove('hidden');
      targetView.classList.add('active-view');
      window.scrollTo({ top: 0, behavior: 'instant' });
    }

    // Execute route handler if defined
    if (typeof route === 'function') {
      try {
        route();
      } catch (err) {
        console.error(`Error executing route handler for ${routeName}:`, err);
      }
    }

    // Refresh Lucide icons
    if (window.lucide) {
      setTimeout(() => window.lucide.createIcons(), 30);
    }
  }

  getCurrentRoute() {
    return this.currentRoute;
  }
}
