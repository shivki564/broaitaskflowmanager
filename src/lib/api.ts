// API client — replaces Firebase Firestore calls with REST fetch calls to Express/SQLite backend

const BASE = '/api';

function getToken() { return localStorage.getItem('btf_token') || ''; }

async function request(method: string, path: string, body?: unknown): Promise<void> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      'Authorization': `Bearer ${getToken()}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('btf_token');
      window.location.reload();
      return;
    }
    const text = await res.text();
    throw new Error(`API ${method} ${path} failed (${res.status}): ${text}`);
  }
}

// ── Auth ─────────────────────────────────────────────────────
export const auth = {
  setToken(token: string) { localStorage.setItem('btf_token', token); },
  clearToken() { localStorage.removeItem('btf_token'); },
  hasToken() { return !!localStorage.getItem('btf_token'); },

  async login(email: string, password: string) {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Login failed' }));
      throw new Error(err.error || 'Login failed');
    }
    return res.json() as Promise<{ token: string; user: any }>;
  },

  async me() {
    const res = await fetch(`${BASE}/auth/me`, {
      headers: { 'Authorization': `Bearer ${getToken()}` },
    });
    if (!res.ok) throw new Error('Invalid session');
    return res.json();
  },

  async changePassword(currentPassword: string, newPassword: string) {
    const res = await fetch(`${BASE}/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed' }));
      throw new Error(err.error || 'Failed to change password');
    }
    return res.json();
  },

  async setPassword(userId: string, password: string) {
    const res = await fetch(`${BASE}/auth/set-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
      body: JSON.stringify({ userId, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed' }));
      throw new Error(err.error || 'Failed to set password');
    }
    return res.json();
  },
};

export const api = {
  // ── Fetch all ────────────────────────────────────────────────
  async getAll() {
    const headers = { 'Authorization': `Bearer ${getToken()}` };
    const [users, projects, tasks, comments] = await Promise.all([
      fetch(`${BASE}/users`, { headers }).then(r => r.json()),
      fetch(`${BASE}/projects`, { headers }).then(r => r.json()),
      fetch(`${BASE}/tasks`, { headers }).then(r => r.json()),
      fetch(`${BASE}/comments`, { headers }).then(r => r.json()),
    ]);
    return { users, projects, tasks, comments };
  },

  // ── Users ────────────────────────────────────────────────────
  upsertUser(id: string, data: unknown) {
    return request('PUT', `/users/${id}`, data);
  },
  deleteUser(id: string) {
    return request('DELETE', `/users/${id}`);
  },

  // ── Projects ─────────────────────────────────────────────────
  upsertProject(id: string, data: unknown) {
    return request('PUT', `/projects/${id}`, data);
  },
  deleteProject(id: string) {
    return request('DELETE', `/projects/${id}`);
  },

  // ── Tasks ────────────────────────────────────────────────────
  upsertTask(id: string, data: unknown) {
    return request('PUT', `/tasks/${id}`, data);
  },
  deleteTask(id: string) {
    return request('DELETE', `/tasks/${id}`);
  },

  // ── Comments ─────────────────────────────────────────────────
  upsertComment(id: string, data: unknown) {
    return request('PUT', `/comments/${id}`, data);
  },
  deleteComment(id: string) {
    return request('DELETE', `/comments/${id}`);
  },
};
