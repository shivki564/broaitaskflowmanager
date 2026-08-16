// Server-Side SQLite Database Client Adapter for Bro AI Task Flow Manager
// Connects to Express backend with Server-Side SQLite (data/taskflow.db)
// Provides real-time synchronization via Server-Sent Events (SSE)

const API_BASE = '/api';

// In-memory cache synced with server SQLite DB
const cache: Record<string, any[]> = {
  users: [],
  projects: [],
  tasks: [],
  comments: []
};

const listeners: Map<string, Set<(data: any[]) => void>> = new Map();
let isInitialized = false;
let sseEventSource: EventSource | null = null;

function notifyListeners(collection: string) {
  const collectionListeners = listeners.get(collection);
  if (collectionListeners) {
    const data = [...(cache[collection] || [])];
    collectionListeners.forEach(cb => {
      try {
        cb(data);
      } catch (err) {
        console.error(`Error in ${collection} snapshot listener:`, err);
      }
    });
  }
}

/**
 * Connect to SSE for realtime updates from SQLite Server
 */
function setupSSE() {
  if (typeof window === 'undefined' || !window.EventSource) return;
  if (sseEventSource) {
    sseEventSource.close();
  }

  try {
    sseEventSource = new EventSource(`${API_BASE}/events`);

    sseEventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'change' && payload.collection) {
          const col = payload.collection;
          if (payload.action === 'upsert' && payload.data) {
            const list = cache[col] || [];
            const index = list.findIndex(item => item.id === payload.id);
            if (index >= 0) {
              list[index] = { ...list[index], ...payload.data, id: payload.id };
            } else {
              list.push({ ...payload.data, id: payload.id });
            }
            cache[col] = list;
            saveCacheToLocal(col);
            notifyListeners(col);
          } else if (payload.action === 'delete' && payload.id) {
            cache[col] = (cache[col] || []).filter(item => item.id !== payload.id);
            saveCacheToLocal(col);
            notifyListeners(col);
          }
        } else if (payload.type === 'reload') {
          fetchAllData();
        }
      } catch (e) {
        console.warn('SSE message parse error:', e);
      }
    };

    sseEventSource.onerror = () => {
      // EventSource auto-retries in standard browser implementation
    };
  } catch (e) {
    console.warn('Could not establish SSE stream:', e);
  }
}

function saveCacheToLocal(collection: string) {
  try {
    localStorage.setItem(`btf_${collection}`, JSON.stringify(cache[collection] || []));
  } catch (e) {
    // Ignore localStorage quota errors
  }
}

function loadCacheFromLocal(collection: string) {
  try {
    const raw = localStorage.getItem(`btf_${collection}`);
    if (raw) {
      cache[collection] = JSON.parse(raw);
    }
  } catch (e) {
    // Ignore parse error
  }
}

/**
 * Fetch all records from SQLite backend
 */
async function fetchAllData(): Promise<void> {
  try {
    const res = await fetch(`${API_BASE}/all`);
    if (res.ok) {
      const data = await res.json();
      if (data.users) cache.users = data.users;
      if (data.projects) cache.projects = data.projects;
      if (data.tasks) cache.tasks = data.tasks;
      if (data.comments) cache.comments = data.comments;

      ['users', 'projects', 'tasks', 'comments'].forEach(col => {
        saveCacheToLocal(col);
        notifyListeners(col);
      });
      return;
    }
  } catch (err) {
    console.warn('Could not fetch initial data from server, using local cache:', err);
  }

  // Fallback to local storage if offline
  ['users', 'projects', 'tasks', 'comments'].forEach(col => loadCacheFromLocal(col));
}

/**
 * Initialize Server-Side SQLite connection and cache
 */
export async function initializeDatabase() {
  if (isInitialized) return true;

  // Load any existing local data first
  ['users', 'projects', 'tasks', 'comments'].forEach(col => loadCacheFromLocal(col));

  try {
    await fetchAllData();
    setupSSE();
    isInitialized = true;
    console.log('✅ Connected to Server-Side SQLite Database');
    return true;
  } catch (error) {
    console.error('Error connecting to server database:', error);
    isInitialized = true;
    return true;
  }
}

/**
 * Seed initial data if database is empty
 */
export async function seedInitialData(
  INITIAL_USERS: any[],
  INITIAL_PROJECTS: any[],
  INITIAL_TASKS: any[],
  INITIAL_COMMENTS: any[]
) {
  try {
    const res = await fetch(`${API_BASE}/seed`, { method: 'POST' });
    if (res.ok) {
      await fetchAllData();
      return;
    }
  } catch (err) {
    console.warn('Server seed request failed, checking local cache:', err);
  }

  // Local fallback seeding if server was unreachable
  if (cache.users.length === 0) cache.users = INITIAL_USERS;
  if (cache.projects.length === 0) cache.projects = INITIAL_PROJECTS;
  if (cache.tasks.length === 0) cache.tasks = INITIAL_TASKS;
  if (cache.comments.length === 0) cache.comments = INITIAL_COMMENTS;
  
  ['users', 'projects', 'tasks', 'comments'].forEach(col => {
    saveCacheToLocal(col);
    notifyListeners(col);
  });
}

/**
 * Subscribe to collection changes (Realtime from SQLite)
 */
export function onSnapshot(collection: string, callback: (data: any[]) => void): () => void {
  if (!listeners.has(collection)) {
    listeners.set(collection, new Set());
  }

  // Deliver current data immediately
  const current = cache[collection] || [];
  callback([...current]);

  const listenerSet = listeners.get(collection)!;
  listenerSet.add(callback);

  // Return unsubscribe
  return () => {
    listenerSet.delete(callback);
  };
}

/**
 * Get all documents from a collection synchronously
 */
export function getAllFromCollection(collectionName: string): any[] {
  return [...(cache[collectionName] || [])];
}

/**
 * Add or update a document in the server SQLite database
 */
export async function setDoc(collectionName: string, id: string, data: any): Promise<void> {
  const payload = { ...data, id };

  // Optimistic update in cache
  const list = cache[collectionName] || [];
  const index = list.findIndex(item => item.id === id);
  if (index >= 0) {
    list[index] = payload;
  } else {
    list.push(payload);
  }
  cache[collectionName] = list;
  saveCacheToLocal(collectionName);
  notifyListeners(collectionName);

  // Persist to server SQLite
  try {
    const res = await fetch(`${API_BASE}/${collectionName}/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      throw new Error(`Failed to persist document to SQLite: ${res.statusText}`);
    }
  } catch (err) {
    console.error(`Error saving doc to ${collectionName}:`, err);
    throw err;
  }
}

/**
 * Delete a document from the server SQLite database
 */
export async function deleteDoc(collectionName: string, id: string): Promise<void> {
  // Optimistic delete in cache
  cache[collectionName] = (cache[collectionName] || []).filter(item => item.id !== id);
  
  if (collectionName === 'projects') {
    // Cascade delete tasks in cache
    const tasksOfProject = (cache.tasks || []).filter(t => t.project_id === id);
    const taskIds = new Set(tasksOfProject.map(t => t.id));
    cache.tasks = (cache.tasks || []).filter(t => t.project_id !== id);
    cache.comments = (cache.comments || []).filter(c => !taskIds.has(c.task_id));
    notifyListeners('tasks');
    notifyListeners('comments');
  } else if (collectionName === 'tasks') {
    cache.comments = (cache.comments || []).filter(c => c.task_id !== id);
    notifyListeners('comments');
  }

  saveCacheToLocal(collectionName);
  notifyListeners(collectionName);

  // Persist deletion to server SQLite
  try {
    const res = await fetch(`${API_BASE}/${collectionName}/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });

    if (!res.ok) {
      throw new Error(`Failed to delete document from SQLite: ${res.statusText}`);
    }
  } catch (err) {
    console.error(`Error deleting doc from ${collectionName}:`, err);
    throw err;
  }
}

/**
 * Clear all data from SQLite database
 */
export async function clearDatabase(): Promise<void> {
  try {
    await fetch(`${API_BASE}/clear`, { method: 'POST' });
  } catch (err) {
    console.error('Error clearing server database:', err);
  }

  cache.users = [];
  cache.projects = [];
  cache.tasks = [];
  cache.comments = [];
  ['users', 'projects', 'tasks', 'comments'].forEach(col => {
    saveCacheToLocal(col);
    notifyListeners(col);
  });
}

/**
 * Get database info
 */
export function getDatabase() {
  return {
    engine: 'SQLite (Server-Side)',
    file: 'data/taskflow.db',
    cache
  };
}
