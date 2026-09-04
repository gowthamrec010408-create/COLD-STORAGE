/**
 * QORA TECH — Solar Smart Cold Storage
 * Authentication Service with Phone-based User Login, Pending Approval Gating,
 * and Distinct Admin Authentication Flow.
 */

import { store } from './state.js';
import { fb } from '../config/firebase-config.js';

const USERS_STORAGE_KEY = 'qoratech_registered_users';

// Pre-configured accounts for instant access and testing
const DEFAULT_USERS = [
  {
    uid: 'USR-ADMIN-001',
    email: 'admin@qoratech.io',
    phone: '9876543210',
    passwordHash: 'admin123',
    displayName: 'Dr. Ramesh Sharma',
    organization: 'Qora Tech Agricultural Systems',
    location: 'Guwahati, Assam',
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
    location: 'Tawang, Arunachal Pradesh',
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
    location: 'Kohima, Nagaland',
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
   * 1. Standard Account Login by Phone Number or Email
   */
  async loginWithPhone(identifier, password) {
    const rawId = (identifier || '').trim();
    const users = this.getUsers();
    let user = null;

    if (rawId.includes('@')) {
      user = users.find(u => u.email.toLowerCase() === rawId.toLowerCase());
    } else {
      const cleanPhone = rawId.replace(/\D/g, '').slice(-10);
      user = users.find(u => (u.phone || '').replace(/\D/g, '').slice(-10) === cleanPhone || (u.email && u.email.toLowerCase() === rawId.toLowerCase()));
    }

    if (!user || user.passwordHash !== password) {
      throw new Error('Invalid phone number/email or password.');
    }

    return this.evaluateUserStatus(user);
  }

  /**
   * 2. Dedicated Admin Login Flow
   */
  async loginAdmin(identifier, password) {
    const cleanId = (identifier || '').trim().toLowerCase();
    const users = this.getUsers();
    
    // Find admin by email or phone
    const user = users.find(u => 
      (u.email.toLowerCase() === cleanId || u.phone.replace(/\D/g, '').slice(-10) === cleanId.replace(/\D/g, '').slice(-10)) &&
      u.role === 'admin'
    );

    if (!user || user.passwordHash !== password) {
      throw new Error('Invalid administrator credentials or unauthorized role.');
    }

    return this.evaluateUserStatus(user);
  }

  /**
   * Status Gating Evaluation
   */
  evaluateUserStatus(user) {
    if (user.status === 'pending') {
      const err = new Error('Your account is waiting for administrator approval.');
      err.code = 'ACCOUNT_PENDING';
      err.user = user;
      throw err;
    }
    if (user.status === 'rejected') {
      const err = new Error('Your account application was rejected by the administrator.');
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
      userType: user.userType,
      role: user.role,
      status: user.status,
      isAdmin: user.role === 'admin'
    };

    store.set('user', sessionUser);
    localStorage.setItem('qoratech_session', JSON.stringify(sessionUser));
    return sessionUser;
  }

  /**
   * 3. Create Account Registration with status = "pending"
   */
  async register(formData) {
    const { fullName, phone, email, password, confirmPassword, organization, location, userType } = formData;

    if (!fullName || !phone || !email || !password) {
      throw new Error('All required fields must be completed.');
    }
    if (password !== confirmPassword) {
      throw new Error('Passwords do not match.');
    }
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    const cleanEmail = email.trim().toLowerCase();
    const users = this.getUsers();

    if (users.some(u => u.phone.replace(/\D/g, '').slice(-10) === cleanPhone || u.email.toLowerCase() === cleanEmail)) {
      throw new Error('An account with this phone number or email already exists.');
    }

    const newUser = {
      uid: `USR-${Date.now()}`,
      displayName: fullName.trim(),
      phone: cleanPhone,
      email: cleanEmail,
      passwordHash: password,
      organization: (organization || 'Independent Farm').trim(),
      location: (location || 'Northeast Field Station').trim(),
      userType: userType || 'Farmer', // 'Farmer' | 'Operator' | 'Technician' | 'Researcher'
      role: 'user', // NEVER permit user to self-assign 'admin'
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
    return this.loginWithPhone('9443210987', 'farmer123');
  }

  logout() {
    store.set('user', null);
    localStorage.removeItem('qoratech_session');
  }

  checkSession() {
    try {
      const saved = localStorage.getItem('qoratech_session');
      if (saved) {
        const user = JSON.parse(saved);
        const users = this.getUsers();
        const current = users.find(u => u.uid === user.uid);
        if (current && current.status === 'approved') {
          store.set('user', {
            ...user,
            role: current.role,
            status: current.status,
            isAdmin: current.role === 'admin'
          });
          return true;
        } else {
          this.logout();
        }
      }
    } catch (e) {
      console.warn('Session check failed:', e);
    }
    return false;
  }

  updateUserStatus(uid, newStatus) {
    const currentUser = store.get('user');
    if (!currentUser || !currentUser.isAdmin) {
      throw new Error('Unauthorized: Administrator privileges required.');
    }

    const users = this.getUsers();
    const index = users.findIndex(u => u.uid === uid);
    if (index === -1) throw new Error('User not found.');

    if (users[index].email === 'admin@qoratech.io' && newStatus !== 'approved') {
      throw new Error('Primary root administrator cannot be disabled.');
    }

    users[index].status = newStatus;
    users[index].statusUpdatedAt = new Date().toISOString();
    this.saveUsers(users);
    return users[index];
  }
}

export const authService = new AuthService();
