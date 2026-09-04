/**
 * QORA TECH — Solar Smart Cold Storage
 * Unified Authentication & Access Control Service
 * Handles user login, registration, admin auth, role gating, and status approval.
 */

import { store } from './core/state.js';
import { fb } from './config/firebase-config.js';

const USERS_STORAGE_KEY = 'qoratech_registered_users';
const SESSION_STORAGE_KEY = 'qoratech_session';

// Pre-configured accounts for instant presentation and testing
const DEFAULT_USERS = [
  {
    uid: 'USR-ADMIN-001',
    email: 'admin@qoratech.io',
    phone: '9876543210',
    passwordHash: 'admin123',
    displayName: 'Dr. Ramesh Sharma',
    organization: 'Qora Tech Agricultural Systems',
    location: 'Guwahati, Kamrup Metropolitan, Assam',
    nerState: 'Assam',
    district: 'Kamrup Metropolitan',
    village: 'Guwahati Outskirts',
    primaryCrops: 'Naga King Chilli, Ginger, Cabbage',
    secondaryCrops: 'Lakadong Turmeric, Green Beans',
    storageCapacityKg: 2000,
    preferredCrop: 'Ginger (Fresh Rhizome)',
    storageUnitId: 'COLD-ROOM-01',
    userType: 'Technician',
    role: 'admin',
    status: 'approved',
    createdAt: '2026-07-01T08:00:00.000Z'
  },
  {
    uid: 'USR-FARMER-101',
    email: 'tsering.farmer@northeastagro.in',
    phone: '9443210987',
    passwordHash: 'farmer123',
    displayName: 'Tsering Dorjee',
    organization: 'Highland Organic Growers Society',
    location: 'Tawang, Tawang District, Arunachal Pradesh',
    nerState: 'Arunachal Pradesh',
    district: 'Tawang',
    village: 'Lumla Valley',
    primaryCrops: 'Cabbage, Cauliflower, Green Peas',
    secondaryCrops: 'Broccoli, Seed Potato',
    storageCapacityKg: 850,
    preferredCrop: 'Cabbage',
    storageUnitId: 'COLD-ROOM-01',
    userType: 'Farmer',
    role: 'user',
    status: 'approved',
    createdAt: '2026-08-10T10:30:00.000Z'
  },
  {
    uid: 'USR-PENDING-201',
    email: 'suresh.menon@coldlogistics.in',
    phone: '9820123456',
    passwordHash: 'pass123',
    displayName: 'Suresh Menon',
    organization: 'Kaveri Logistics',
    location: 'Medziphema, Chumoukedima, Nagaland',
    nerState: 'Nagaland',
    district: 'Chumoukedima',
    village: 'Medziphema',
    primaryCrops: 'Naga King Chilli, Naga Tree Tomato',
    secondaryCrops: 'Ginger, French Beans',
    storageCapacityKg: 1200,
    preferredCrop: 'Naga King Chilli (Bhut Jolokia)',
    storageUnitId: 'COLD-ROOM-01',
    userType: 'Operator',
    role: 'user',
    status: 'pending',
    createdAt: '2026-09-02T14:15:00.000Z'
  }
];

export class AuthService {
  constructor() {
    this.initUsersStore();
  }

  initUsersStore() {
    try {
      const stored = localStorage.getItem(USERS_STORAGE_KEY);
      if (!stored) {
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(DEFAULT_USERS));
      } else {
        const users = JSON.parse(stored);
        let changed = false;
        DEFAULT_USERS.forEach(defU => {
          const idx = users.findIndex(u => u.uid === defU.uid || (u.email && u.email.toLowerCase() === defU.email.toLowerCase()));
          if (idx === -1) {
            users.push(defU);
            changed = true;
          } else {
            if (!users[idx].email) {
              users[idx].email = defU.email;
              changed = true;
            }
          }
        });
        if (changed) {
          localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
        }
      }
    } catch (e) {
      console.warn('Could not initialize user store:', e);
    }
  }

  getUsers() {
    try {
      const stored = localStorage.getItem(USERS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : DEFAULT_USERS;
    } catch (e) {
      return DEFAULT_USERS;
    }
  }

  saveUsers(users) {
    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
      return true;
    } catch (e) {
      console.error('Failed to save users:', e);
      return false;
    }
  }

  /**
   * Login standard user by Email ID (also accepts Phone Number or User ID)
   */
  async loginUser(identifier, password) {
    const rawId = (identifier || '').trim();
    const cleanPass = (password || '').trim();
    const users = this.getUsers();
    let user = null;

    if (rawId.includes('@')) {
      const cleanEmail = rawId.toLowerCase();
      user = users.find(u => (u.email || '').toLowerCase() === cleanEmail);
    } else {
      const cleanPhone = rawId.replace(/\D/g, '').slice(-10);
      user = users.find(u => 
        (u.email || '').toLowerCase() === rawId.toLowerCase() ||
        (u.phone || '').replace(/\D/g, '').slice(-10) === cleanPhone ||
        (u.uid && u.uid.toLowerCase() === rawId.toLowerCase())
      );
    }

    if (!user || user.passwordHash !== cleanPass) {
      throw new Error('Invalid Email ID or password. Please verify your credentials.');
    }

    return this.evaluateUserStatus(user);
  }

  /**
   * Dedicated Admin Login by Email ID or Admin UID
   */
  async loginAdmin(identifier, password) {
    const cleanId = (identifier || '').trim().toLowerCase();
    const cleanPass = (password || '').trim();
    const users = this.getUsers();
    
    const user = users.find(u => 
      ((u.email || '').toLowerCase() === cleanId || 
       (u.phone || '').replace(/\D/g, '').slice(-10) === cleanId.replace(/\D/g, '').slice(-10) || 
       (u.uid && u.uid.toLowerCase() === cleanId)) &&
      u.role === 'admin'
    );

    if (!user || user.passwordHash !== cleanPass) {
      throw new Error('Invalid administrator credentials or unauthorized role.');
    }

    return this.evaluateUserStatus(user);
  }

  /**
   * Evaluate user account status (approved, pending, rejected, disabled)
   */
  evaluateUserStatus(user) {
    if (user.status === 'pending') {
      const err = new Error('Your account is waiting for administrator approval.');
      err.code = 'ACCOUNT_PENDING';
      err.user = user;
      throw err;
    }
    if (user.status === 'rejected') {
      const err = new Error('ACCOUNT REJECTED: Please contact the administrator.');
      err.code = 'ACCOUNT_REJECTED';
      throw err;
    }
    if (user.status === 'disabled') {
      const err = new Error('Access Denied: Your account has been disabled.');
      err.code = 'ACCOUNT_DISABLED';
      throw err;
    }

    const sessionUser = {
      uid: user.uid,
      email: user.email,
      phone: user.phone,
      displayName: user.displayName,
      organization: user.organization,
      location: user.location,
      nerState: user.nerState || 'Assam',
      district: user.district || 'Kamrup',
      village: user.village || 'Field Station',
      primaryCrops: user.primaryCrops || 'Ginger, Naga King Chilli, Cabbage',
      secondaryCrops: user.secondaryCrops || 'Green Beans, Broccoli',
      storageCapacityKg: user.storageCapacityKg || 500,
      preferredCrop: user.preferredCrop || 'Ginger (Fresh Rhizome)',
      storageUnitId: user.storageUnitId || 'COLD-ROOM-01',
      userType: user.userType || 'Farmer',
      role: user.role || 'user',
      status: user.status,
      isAdmin: user.role === 'admin'
    };

    store.set('user', sessionUser);
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionUser));
    return sessionUser;
  }

  /**
   * Create account registration with status = "pending"
   */
  async register(formData) {
    const {
      fullName,
      phone,
      password,
      confirmPassword,
      location,
      nerState,
      district,
      village,
      primaryCrops,
      secondaryCrops,
      storageCapacityKg,
      preferredCrop,
      storageUnitId,
      userType,
      email,
      organization
    } = formData;

    if (!fullName || !phone || !password) {
      throw new Error('All required fields must be completed.');
    }
    if (password !== confirmPassword) {
      throw new Error('Passwords do not match.');
    }
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    const cleanEmail = (email || `${cleanPhone}@qoratech.local`).trim().toLowerCase();
    const users = this.getUsers();

    if (users.some(u => (u.email || '').toLowerCase() === cleanEmail)) {
      throw new Error('An account with this Email ID already exists.');
    }
    if (users.some(u => (u.phone || '').replace(/\D/g, '').slice(-10) === cleanPhone)) {
      throw new Error('An account with this phone number already exists.');
    }

    const newUser = {
      uid: `USR-${Date.now().toString().slice(-6)}`,
      displayName: fullName.trim(),
      phone: cleanPhone,
      email: cleanEmail,
      passwordHash: password,
      organization: (organization || 'Independent Farm').trim(),
      location: (location || `${village || 'Location'}, ${district || 'District'}, ${nerState || 'Assam'}`).trim(),
      nerState: (nerState || 'Assam').trim(),
      district: (district || 'Kamrup').trim(),
      village: (village || '').trim(),
      primaryCrops: (primaryCrops || 'Ginger, Cabbage').trim(),
      secondaryCrops: (secondaryCrops || '').trim(),
      storageCapacityKg: parseFloat(storageCapacityKg) || 500,
      preferredCrop: (preferredCrop || 'Ginger (Fresh Rhizome)').trim(),
      storageUnitId: (storageUnitId || 'COLD-ROOM-01').trim(),
      userType: userType || 'Farmer',
      role: 'user', // strictly normal user
      status: 'pending', // Gated approval required
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    this.saveUsers(users);

    return {
      success: true,
      message: 'ACCOUNT CREATED SUCCESSFULLY. Your account is waiting for administrator approval.',
      user: newUser
    };
  }

  quickDemoLogin(role = 'farmer') {
    if (role === 'admin') {
      return this.loginAdmin('admin@qoratech.io', 'admin123');
    }
    return this.loginUser('9443210987', 'farmer123');
  }

  logout() {
    store.set('user', null);
    localStorage.removeItem(SESSION_STORAGE_KEY);
    window.location.href = 'login.html';
  }

  getCurrentUser() {
    try {
      const saved = localStorage.getItem(SESSION_STORAGE_KEY);
      if (saved) {
        const user = JSON.parse(saved);
        const users = this.getUsers();
        const current = users.find(u => u.uid === user.uid || (u.email && user.email && u.email.toLowerCase() === user.email.toLowerCase()));
        if (current && current.status === 'approved') {
          return {
            ...user,
            ...current,
            role: current.role,
            status: current.status,
            isAdmin: current.role === 'admin'
          };
        } else if (!current && user.status === 'approved') {
          return user;
        }
      }
    } catch (e) {
      console.warn('Session retrieval error:', e);
    }
    return null;
  }

  /**
   * Route Guard for normal authenticated user pages
   */
  requireAuth() {
    const user = this.getCurrentUser();
    if (!user) {
      window.location.href = 'login.html';
      return null;
    }
    if (user.status !== 'approved') {
      window.location.href = 'pending.html';
      return null;
    }
    store.set('user', user);
    return user;
  }

  /**
   * Route Guard for dedicated admin dashboard
   */
  requireAdmin() {
    const user = this.getCurrentUser();
    if (!user) {
      window.location.href = 'admin-login.html';
      return null;
    }
    if (!user.isAdmin) {
      window.location.href = 'dashboard.html';
      return null;
    }
    store.set('user', user);
    return user;
  }

  /**
   * Admin Approval Actions
   */
  updateUserStatus(uid, newStatus) {
    const currentUser = this.requireAdmin();
    if (!currentUser) return null;

    const users = this.getUsers();
    const index = users.findIndex(u => u.uid === uid);
    if (index === -1) throw new Error('User not found.');

    if (users[index].email === 'admin@qoratech.io' && newStatus !== 'approved') {
      throw new Error('Primary root administrator cannot be modified.');
    }

    users[index].status = newStatus;
    users[index].statusUpdatedAt = new Date().toISOString();
    this.saveUsers(users);

    // Record audit log
    const auditLogs = JSON.parse(localStorage.getItem('qoratech_audit_logs') || '[]');
    auditLogs.unshift({
      id: `AUDIT-${Date.now()}`,
      action: `USER_STATUS_${newStatus.toUpperCase()}`,
      targetUser: users[index].displayName,
      targetUid: uid,
      admin: currentUser.displayName,
      timestamp: new Date().toISOString()
    });
    localStorage.setItem('qoratech_audit_logs', JSON.stringify(auditLogs.slice(0, 100)));

    return users[index];
  }
}

export const authService = new AuthService();
