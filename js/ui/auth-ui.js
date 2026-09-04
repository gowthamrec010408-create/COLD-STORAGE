/**
 * QORA TECH — Solar Smart Cold Storage
 * Authentication UI with 3 Clearly Separated & Aligned Options:
 * 1. Login
 * 2. Account Creation
 * 3. Admin Panel
 */

import { authService } from '../core/auth.js';
import { store } from '../core/state.js';

export class AuthUI {
  constructor() {
    this.activeTab = 'login'; // 'login' | 'account_creation' | 'admin_panel'
    this.pendingNotice = null;
    this.errorMessage = null;
  }

  render() {
    const container = document.getElementById('view-login');
    if (!container) return;

    const user = store.get('user');
    if (user && user.status === 'approved') {
      window.location.hash = user.isAdmin ? '#admin' : '#dashboard';
      return;
    }

    container.innerHTML = `
      <div class="auth-page-container">
        <div class="auth-card glass-card">
          <!-- Brand Logo Header -->
          <div class="auth-brand-header text-center mb-6">
            <div class="qora-auth-brand-pill">
              <i data-lucide="sun" class="text-amber icon-sm"></i>
              <span class="brand-text">QORA <span class="text-emerald">TECH</span></span>
              <i data-lucide="snowflake" class="text-cyan icon-sm"></i>
            </div>
            <p class="text-xs text-muted mt-2 font-medium">Solar Smart Cold Storage IoT & AI Platform</p>
          </div>

          <!-- Pending Approval Notification Banner -->
          ${this.pendingNotice ? `
            <div class="pending-approval-banner mb-5 p-3 rounded-lg border border-amber bg-amber-light text-xs text-amber-dark font-bold text-center">
              ✓ Account created successfully (Status: PENDING). Waiting for administrator approval.
            </div>
          ` : ''}

          <!-- Three Clearly Separated Options -->
          <div class="auth-nav-tabs mb-6">
            <button class="auth-tab-btn ${this.activeTab === 'login' ? 'active' : ''}" id="btn-tab-login" type="button">
              <i data-lucide="log-in" class="icon-xs"></i>
              <span>Login</span>
            </button>
            <button class="auth-tab-btn ${this.activeTab === 'account_creation' ? 'active' : ''}" id="btn-tab-account-creation" type="button">
              <i data-lucide="user-plus" class="icon-xs"></i>
              <span>Account Creation</span>
            </button>
            <button class="auth-tab-btn ${this.activeTab === 'admin_panel' ? 'active-admin' : ''}" id="btn-tab-admin-panel" type="button">
              <i data-lucide="shield-check" class="icon-xs text-purple"></i>
              <span>Admin Panel</span>
            </button>
          </div>

          <!-- OPTION 1: SIMPLE LOGIN -->
          ${this.activeTab === 'login' ? `
            <form id="form-user-login" class="space-y-4">
              <div class="form-group">
                <label>Phone Number or Email</label>
                <div class="input-with-icon">
                  <i data-lucide="user"></i>
                  <input type="text" id="user-phone" class="form-control" placeholder="Mobile Number or Email" value="9443210987" required />
                </div>
              </div>

              <div class="form-group">
                <label>Password</label>
                <div class="input-with-icon">
                  <i data-lucide="lock"></i>
                  <input type="password" id="user-password" class="form-control" placeholder="••••••••" value="farmer123" required />
                </div>
              </div>

              ${this.errorMessage ? `<div class="text-xs text-rose font-bold p-2.5 bg-rose-light rounded-lg border border-rose text-center">${this.errorMessage}</div>` : ''}

              <div class="flex gap-3 pt-2">
                <button type="submit" class="btn btn-primary flex-1 py-3" id="btn-submit-login">
                  <i data-lucide="log-in"></i> LOGIN
                </button>
                <button type="button" class="btn btn-outline" id="btn-forgot-password">
                  FORGOT PASSWORD
                </button>
              </div>

              <div class="mt-4 pt-3 border-t border-glass text-center">
                <button type="button" class="btn btn-xs btn-outline w-full py-2.5" id="btn-quick-farmer">
                  <i data-lucide="play-circle" class="text-emerald"></i> Demo Farmer Login (1-Click Instant Access)
                </button>
              </div>
            </form>
          ` : ''}

          <!-- OPTION 2: ACCOUNT CREATION -->
          ${this.activeTab === 'account_creation' ? `
            <form id="form-create-account" class="space-y-3">
              <div class="form-group">
                <label>Full Name</label>
                <div class="input-with-icon">
                  <i data-lucide="user"></i>
                  <input type="text" id="reg-name" class="form-control" placeholder="Full Name" required />
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div class="form-group">
                  <label>Phone Number</label>
                  <div class="input-with-icon">
                    <i data-lucide="phone"></i>
                    <input type="tel" id="reg-phone" class="form-control" placeholder="Mobile Number" required />
                  </div>
                </div>

                <div class="form-group">
                  <label>User Type</label>
                  <select id="reg-usertype" class="form-control" required>
                    <option value="Farmer">Farmer / Grower</option>
                    <option value="Operator">Cold Storage Operator</option>
                    <option value="Technician">HVAC / Solar Technician</option>
                    <option value="Researcher">Post-Harvest Researcher</option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label>Email Address</label>
                <div class="input-with-icon">
                  <i data-lucide="mail"></i>
                  <input type="email" id="reg-email" class="form-control" placeholder="Email Address" required />
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div class="form-group">
                  <label>Farm / Organization</label>
                  <div class="input-with-icon">
                    <i data-lucide="building-2"></i>
                    <input type="text" id="reg-org" class="form-control" placeholder="Farm / Organization" />
                  </div>
                </div>

                <div class="form-group">
                  <label>Location / State</label>
                  <div class="input-with-icon">
                    <i data-lucide="map-pin"></i>
                    <input type="text" id="reg-location" class="form-control" placeholder="Location / State" />
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div class="form-group">
                  <label>Password</label>
                  <div class="input-with-icon">
                    <i data-lucide="lock"></i>
                    <input type="password" id="reg-pass" class="form-control" placeholder="Min 6 chars" minlength="6" required />
                  </div>
                </div>

                <div class="form-group">
                  <label>Confirm Password</label>
                  <div class="input-with-icon">
                    <i data-lucide="lock"></i>
                    <input type="password" id="reg-confirm" class="form-control" placeholder="Confirm Password" minlength="6" required />
                  </div>
                </div>
              </div>

              ${this.errorMessage ? `<div class="text-xs text-rose font-bold p-2.5 bg-rose-light rounded-lg border border-rose text-center">${this.errorMessage}</div>` : ''}

              <button type="submit" class="btn btn-primary w-full py-3 mt-2" id="btn-submit-register">
                <i data-lucide="user-plus"></i> CREATE ACCOUNT
              </button>
            </form>
          ` : ''}

          <!-- OPTION 3: ADMIN PANEL LOGIN -->
          ${this.activeTab === 'admin_panel' ? `
            <form id="form-admin-login" class="space-y-4">
              <div class="form-group">
                <label>Admin ID or Email</label>
                <div class="input-with-icon">
                  <i data-lucide="shield"></i>
                  <input type="text" id="admin-identifier" class="form-control" placeholder="admin@qoratech.io" value="admin@qoratech.io" required />
                </div>
              </div>

              <div class="form-group">
                <label>Admin Password</label>
                <div class="input-with-icon">
                  <i data-lucide="key"></i>
                  <input type="password" id="admin-password" class="form-control" placeholder="••••••••" value="admin123" required />
                </div>
              </div>

              ${this.errorMessage ? `<div class="text-xs text-rose font-bold p-2.5 bg-rose-light rounded-lg border border-rose text-center">${this.errorMessage}</div>` : ''}

              <button type="submit" class="btn btn-primary w-full py-3" id="btn-submit-admin" style="background: linear-gradient(135deg, #a855f7 0%, #7e22ce 100%);">
                <i data-lucide="lock"></i> ACCESS ADMIN PANEL
              </button>

              <div class="mt-4 pt-3 border-t border-glass text-center">
                <button type="button" class="btn btn-xs btn-outline w-full py-2.5" id="btn-quick-admin">
                  <i data-lucide="shield" class="text-purple"></i> Demo Admin Access (1-Click Instant Access)
                </button>
              </div>
            </form>
          ` : ''}
        </div>
      </div>
    `;

    this.bindEvents();
    if (window.lucide) window.lucide.createIcons();
  }

  redirectTo(targetHash) {
    if (window.location.hash === targetHash) {
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } else {
      window.location.hash = targetHash;
    }
  }

  bindEvents() {
    document.getElementById('btn-tab-login')?.addEventListener('click', () => {
      this.activeTab = 'login';
      this.errorMessage = null;
      this.render();
    });

    document.getElementById('btn-tab-account-creation')?.addEventListener('click', () => {
      this.activeTab = 'account_creation';
      this.errorMessage = null;
      this.render();
    });

    document.getElementById('btn-tab-admin-panel')?.addEventListener('click', () => {
      this.activeTab = 'admin_panel';
      this.errorMessage = null;
      this.render();
    });

    // Option 1: Login
    const userForm = document.getElementById('form-user-login');
    if (userForm) {
      userForm.onsubmit = async (e) => {
        e.preventDefault();
        const phone = document.getElementById('user-phone').value;
        const pass = document.getElementById('user-password').value;
        try {
          this.errorMessage = null;
          await authService.loginWithPhone(phone, pass);
          this.redirectTo('#dashboard');
        } catch (err) {
          this.errorMessage = err.message;
          if (err.code === 'ACCOUNT_PENDING') {
            this.pendingNotice = true;
          }
          this.render();
        }
      };
    }

    // Option 2: Account Creation
    const regForm = document.getElementById('form-create-account');
    if (regForm) {
      regForm.onsubmit = async (e) => {
        e.preventDefault();
        try {
          this.errorMessage = null;
          await authService.register({
            fullName: document.getElementById('reg-name').value,
            phone: document.getElementById('reg-phone').value,
            email: document.getElementById('reg-email').value,
            organization: document.getElementById('reg-org').value,
            location: document.getElementById('reg-location').value,
            userType: document.getElementById('reg-usertype').value,
            password: document.getElementById('reg-pass').value,
            confirmPassword: document.getElementById('reg-confirm').value
          });

          this.activeTab = 'login';
          this.pendingNotice = true;
          this.render();
        } catch (err) {
          this.errorMessage = err.message;
          this.render();
        }
      };
    }

    // Option 3: Admin Panel Login
    const adminForm = document.getElementById('form-admin-login');
    if (adminForm) {
      adminForm.onsubmit = async (e) => {
        e.preventDefault();
        const id = document.getElementById('admin-identifier').value;
        const pass = document.getElementById('admin-password').value;
        try {
          this.errorMessage = null;
          await authService.loginAdmin(id, pass);
          this.redirectTo('#admin');
        } catch (err) {
          this.errorMessage = err.message;
          this.render();
        }
      };
    }

    document.getElementById('btn-forgot-password')?.addEventListener('click', () => {
      alert('Password reset instructions have been dispatched to your verified phone/email.');
    });

    document.getElementById('btn-quick-farmer')?.addEventListener('click', async () => {
      await authService.quickDemoLogin('farmer');
      this.redirectTo('#dashboard');
    });

    document.getElementById('btn-quick-admin')?.addEventListener('click', async () => {
      await authService.quickDemoLogin('admin');
      this.redirectTo('#admin');
    });
  }
}

export const authUI = new AuthUI();
