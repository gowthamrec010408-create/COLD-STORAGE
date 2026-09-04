/**
 * Solar Smart Cold Storage — Admin Approval & User Management UI
 * Allows administrators to verify, approve, reject, or disable user accounts.
 * Enforces role security and account status gating.
 */

import { authService } from '../core/auth.js';
import { store } from '../core/state.js';

export class AdminUI {
  constructor() {
    this.activeTab = 'pending'; // 'pending' | 'approved' | 'rejected' | 'all'
  }

  render() {
    const container = document.getElementById('view-admin');
    if (!container) return;

    const currentUser = store.get('user');
    if (!currentUser || !currentUser.isAdmin) {
      container.innerHTML = `
        <div class="glass-card text-center p-12">
          <i data-lucide="shield-alert" class="text-rose icon-lg mb-4"></i>
          <h2 class="text-xl font-bold">Access Restricted</h2>
          <p class="text-muted mt-2">Administrator credentials are required to view the user approval dashboard.</p>
          <a href="#dashboard" class="btn btn-primary mt-4">Return to Monitoring Dashboard</a>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    const allUsers = authService.getUsers();
    const pendingUsers = allUsers.filter(u => u.status === 'pending');
    const approvedUsers = allUsers.filter(u => u.status === 'approved');
    const rejectedUsers = allUsers.filter(u => u.status === 'rejected' || u.status === 'disabled');

    const displayedUsers = this.activeTab === 'pending' ? pendingUsers :
                           this.activeTab === 'approved' ? approvedUsers :
                           this.activeTab === 'rejected' ? rejectedUsers : allUsers;

    container.innerHTML = `
      <!-- Header -->
      <div class="admin-header glass-card mb-6">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div class="flex items-center gap-2">
              <span class="badge badge-purple"><i data-lucide="shield-check" class="icon-sm"></i> ACCESS CONTROL</span>
              <span class="text-xs text-muted">Multi-Tier Role Management</span>
            </div>
            <h2 class="text-2xl font-bold mt-1">User Account Approval & Security Governance</h2>
            <p class="text-sm text-muted">Verify agricultural credentials and grant authorized cold-storage monitoring access.</p>
          </div>

          <div class="user-stats-strip flex gap-4">
            <div class="user-stat-pill">
              <span class="pill-count text-amber font-bold">${pendingUsers.length}</span>
              <span class="pill-title text-xs text-muted">Pending</span>
            </div>
            <div class="user-stat-pill">
              <span class="pill-count text-emerald font-bold">${approvedUsers.length}</span>
              <span class="pill-title text-xs text-muted">Approved</span>
            </div>
            <div class="user-stat-pill">
              <span class="pill-count text-rose font-bold">${rejectedUsers.length}</span>
              <span class="pill-title text-xs text-muted">Restricted</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Navigation Filter Tabs -->
      <div class="admin-tabs flex gap-2 mb-6">
        <button class="admin-tab-btn ${this.activeTab === 'pending' ? 'active' : ''}" data-tab="pending">
          Pending Verification (${pendingUsers.length})
        </button>
        <button class="admin-tab-btn ${this.activeTab === 'approved' ? 'active' : ''}" data-tab="approved">
          Approved Accounts (${approvedUsers.length})
        </button>
        <button class="admin-tab-btn ${this.activeTab === 'rejected' ? 'active' : ''}" data-tab="rejected">
          Rejected / Disabled (${rejectedUsers.length})
        </button>
        <button class="admin-tab-btn ${this.activeTab === 'all' ? 'active' : ''}" data-tab="all">
          All Users (${allUsers.length})
        </button>
      </div>

      <!-- Users Management Table -->
      <div class="glass-card mb-8">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>User Details</th>
                <th>Contact Info</th>
                <th>Organization & Location</th>
                <th>User Type</th>
                <th>Status</th>
                <th>Registered</th>
                <th>Admin Actions</th>
              </tr>
            </thead>
            <tbody>
              ${displayedUsers.length === 0 ? `
                <tr>
                  <td colspan="7" class="text-center py-8 text-muted">No users found under ${this.activeTab} status.</td>
                </tr>
              ` : displayedUsers.map(u => {
                const statusBadge = u.status === 'approved' ? 'badge-normal' :
                                    u.status === 'pending' ? 'badge-warning' : 'badge-critical';

                return `
                  <tr>
                    <td>
                      <div class="font-bold">${u.displayName || 'Unknown User'}</div>
                      <div class="text-xs text-muted font-mono">${u.uid}</div>
                      ${u.role === 'admin' ? '<span class="badge badge-purple text-2xs mt-1">ROOT ADMIN</span>' : ''}
                    </td>
                    <td>
                      <div>${u.email}</div>
                      <div class="text-xs text-muted font-mono">${u.phone || '—'}</div>
                    </td>
                    <td>
                      <div class="font-medium">${u.organization || 'Independent'}</div>
                      <div class="text-xs text-muted">${u.location || '—'}</div>
                    </td>
                    <td>
                      <span class="badge badge-neutral">${u.userType || 'Farmer'}</span>
                    </td>
                    <td>
                      <span class="badge ${statusBadge}">${u.status.toUpperCase()}</span>
                    </td>
                    <td class="text-xs text-muted">
                      ${u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                    </td>
                    <td>
                      <div class="flex items-center gap-1">
                        ${u.status !== 'approved' ? `
                          <button class="btn btn-xs btn-primary approve-user-btn" data-uid="${u.uid}" title="Approve access">
                            <i data-lucide="check" class="icon-xs"></i> Approve
                          </button>
                        ` : ''}
                        ${u.status === 'pending' ? `
                          <button class="btn btn-xs btn-outline reject-user-btn" data-uid="${u.uid}" title="Reject application">
                            <i data-lucide="x" class="icon-xs text-rose"></i> Reject
                          </button>
                        ` : ''}
                        ${u.status === 'approved' && u.email !== 'admin@solarsmart.io' ? `
                          <button class="btn btn-xs btn-outline disable-user-btn" data-uid="${u.uid}" title="Temporarily disable account">
                            <i data-lucide="ban" class="icon-xs text-amber"></i> Disable
                          </button>
                        ` : ''}
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    this.bindEvents();
    if (window.lucide) window.lucide.createIcons();
  }

  bindEvents() {
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
      btn.onclick = () => {
        this.activeTab = btn.getAttribute('data-tab');
        this.render();
      };
    });

    document.querySelectorAll('.approve-user-btn').forEach(btn => {
      btn.onclick = () => {
        const uid = btn.getAttribute('data-uid');
        try {
          authService.updateUserStatus(uid, 'approved');
          alert('✅ User approved successfully. Access to monitoring granted.');
          this.render();
        } catch (e) {
          alert('Approval error: ' + e.message);
        }
      };
    });

    document.querySelectorAll('.reject-user-btn').forEach(btn => {
      btn.onclick = () => {
        const uid = btn.getAttribute('data-uid');
        try {
          authService.updateUserStatus(uid, 'rejected');
          alert('User application rejected.');
          this.render();
        } catch (e) {
          alert('Rejection error: ' + e.message);
        }
      };
    });

    document.querySelectorAll('.disable-user-btn').forEach(btn => {
      btn.onclick = () => {
        const uid = btn.getAttribute('data-uid');
        if (confirm('Disable this user account? The user will be barred from logging in.')) {
          authService.updateUserStatus(uid, 'disabled');
          this.render();
        }
      };
    });
  }
}

export const adminUI = new AdminUI();
