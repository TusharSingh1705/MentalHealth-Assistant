'use strict';

const API_BASE = window.location.hostname.includes('vercel.app')
  ? 'https://mentalhealth-assistant.onrender.com/api'
  : (window.API_BASE_URL || '/api');

const ThemeManager = {
  init() {
    const saved = localStorage.getItem('mindcare_theme') || 'light';
    this.set(saved);

    const toggle = document.getElementById('themeToggle');
    if (toggle) {
      toggle.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        this.set(current === 'dark' ? 'light' : 'dark');
      });
    }
  },

  set(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('mindcare_theme', theme);

    const toggle = document.getElementById('themeToggle');
    if (toggle) {
      toggle.textContent = theme === 'dark' ? '☼' : '◐';
    }

    const prefToggle = document.getElementById('prefDarkMode');
    if (prefToggle) {
      prefToggle.checked = theme === 'dark';
    }
  },

  get() {
    return document.documentElement.getAttribute('data-theme') || 'light';
  }
};

const Toast = {
  container: null,

  init() {
    this.container = document.getElementById('toastContainer');
  },

  show(type, title, message, duration = 3500) {
    if (!this.container) return;

    const icons = { success: '✓', error: '✕', info: 'i', warning: '!' };
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `
      <span class="toast__icon">${icons[type] || 'i'}</span>
      <div class="toast__content">
        <div class="toast__title">${title}</div>
        ${message ? `<div class="toast__message">${message}</div>` : ''}
      </div>
      <button class="toast__close" aria-label="Close notification" onclick="this.parentElement.remove()">✕</button>
    `;

    this.container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('removing');
      setTimeout(() => toast.remove(), 250);
    }, duration);
  },

  success(title, message) { this.show('success', title, message); },
  error(title, message)   { this.show('error', title, message); },
  info(title, message)    { this.show('info', title, message); },
  warning(title, message) { this.show('warning', title, message); }
};

const AuthManager = {
  getUser() {
    try {
      return JSON.parse(localStorage.getItem('mindcare_user'));
    } catch {
      return null;
    }
  },

  getToken() {
    return localStorage.getItem('mindcare_token');
  },

  isGuest() {
    return localStorage.getItem('mindcare_guest') === 'true';
  },

  isLoggedIn() {
    return Boolean(this.getToken() || this.isGuest());
  },

  login(user, token) {
    localStorage.setItem('mindcare_user', JSON.stringify(user));
    localStorage.setItem('mindcare_token', token);
    localStorage.removeItem('mindcare_guest');
    this.updateUI();
  },

  startGuestSession() {
    localStorage.setItem('mindcare_guest', 'true');
    localStorage.setItem('mindcare_user', JSON.stringify({ name: 'Guest', email: '' }));
    localStorage.removeItem('mindcare_token');
    this.updateUI();
  },

  logout() {
    localStorage.removeItem('mindcare_user');
    localStorage.removeItem('mindcare_token');
    localStorage.removeItem('mindcare_guest');
    this.updateUI();
    window.location.href = 'index.html';
  },

  updateUI() {
    const user = this.getUser();
    const hasToken = Boolean(this.getToken());
    const isGuest = this.isGuest();

    const loginBtn = document.getElementById('loginBtn');
    const signupBtn = document.getElementById('signupBtn');
    const profileAvatar = document.getElementById('profileAvatar');
    const logoutBtn = document.getElementById('logoutBtn');
    const mobileLogin = document.getElementById('mobileLogin');
    const mobileSignup = document.getElementById('mobileSignup');

    if (hasToken && user) {
      if (loginBtn) loginBtn.classList.add('hidden');
      if (signupBtn) signupBtn.classList.add('hidden');
      if (profileAvatar) {
        profileAvatar.classList.remove('hidden');
        profileAvatar.textContent = user.name ? user.name.charAt(0).toUpperCase() : 'U';
      }
      if (logoutBtn) {
        logoutBtn.classList.remove('hidden');
        logoutBtn.textContent = 'Logout';
      }
      if (mobileLogin) mobileLogin.style.display = 'none';
      if (mobileSignup) mobileSignup.style.display = 'none';
    } else if (isGuest) {
      if (loginBtn) loginBtn.classList.add('hidden');
      if (signupBtn) signupBtn.classList.remove('hidden');
      if (profileAvatar) profileAvatar.classList.add('hidden');
      if (logoutBtn) {
        logoutBtn.classList.remove('hidden');
        logoutBtn.textContent = 'Logout';
      }
    } else {
      if (loginBtn) {
        loginBtn.classList.remove('hidden');
        loginBtn.textContent = 'Sign In';
        loginBtn.setAttribute('href', 'login.html');
      }
      if (signupBtn) signupBtn.classList.remove('hidden');
      if (profileAvatar) profileAvatar.classList.add('hidden');
      if (logoutBtn) logoutBtn.classList.add('hidden');
      if (mobileLogin) mobileLogin.style.display = '';
      if (mobileSignup) mobileSignup.style.display = '';
    }
  }
};

const Navigation = {
  init() {
    const hamburger = document.getElementById('hamburger');
    const mobileNav = document.getElementById('mobileNav');

    if (hamburger && mobileNav) {
      hamburger.addEventListener('click', () => {
        mobileNav.classList.toggle('open');
      });

      mobileNav.querySelectorAll('.mobile-nav__link').forEach(link => {
        link.addEventListener('click', () => mobileNav.classList.remove('open'));
      });

      document.addEventListener('click', (e) => {
        if (!mobileNav.contains(e.target) && !hamburger.contains(e.target)) {
          mobileNav.classList.remove('open');
        }
      });
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => AuthManager.logout());
    }

    this.setActivePage();

    const params = new URLSearchParams(window.location.search);
    if (params.get('guest') === 'true' && !AuthManager.isLoggedIn()) {
      AuthManager.startGuestSession();
    }
  },

  setActivePage() {
    const current = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.header__link').forEach(link => {
      const href = link.getAttribute('href');
      link.classList.toggle('active', href === current);
    });
  }
};

const Storage = {
  get(key, fallback = null) {
    try {
      const item = localStorage.getItem(`mindcare_${key}`);
      return item ? JSON.parse(item) : fallback;
    } catch {
      return fallback;
    }
  },

  set(key, val) {
    localStorage.setItem(`mindcare_${key}`, JSON.stringify(val));
  },

  remove(key) {
    localStorage.removeItem(`mindcare_${key}`);
  },

  getList(key) {
    return this.get(key, []);
  },

  addToList(key, item) {
    const list = this.getList(key);
    list.unshift(item);
    this.set(key, list);
    return list;
  }
};

const API = {
  async request(endpoint, options = {}) {
    const token = AuthManager.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    };

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Request failed');
      }
      return data;
    } catch (err) {
      console.warn(`API call failed [${endpoint}]:`, err.message);
      throw err;
    }
  },

  get(endpoint)         { return this.request(endpoint); },
  post(endpoint, body)  { return this.request(endpoint, { method: 'POST', body: JSON.stringify(body) }); },
  patch(endpoint, body) { return this.request(endpoint, { method: 'PATCH', body: JSON.stringify(body) }); },
  delete(endpoint)      { return this.request(endpoint, { method: 'DELETE' }); }
};

const Utils = {
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  },

  formatDate(date) {
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  },

  formatTime(date) {
    return new Date(date).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  escapeHtml(str) {
    const p = document.createElement('p');
    p.textContent = str;
    return p.innerHTML;
  },

  truncate(str, max = 32) {
    if (!str) return '';
    return str.length <= max ? str : str.slice(0, max) + '...';
  },

  debounce(fn, ms = 250) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  },

  downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  ThemeManager.init();
  Toast.init();
  Navigation.init();
  AuthManager.updateUI();

  const prefDarkMode = document.getElementById('prefDarkMode');
  if (prefDarkMode) {
    prefDarkMode.checked = ThemeManager.get() === 'dark';
    prefDarkMode.addEventListener('change', () => {
      ThemeManager.set(prefDarkMode.checked ? 'dark' : 'light');
    });
  }
});
