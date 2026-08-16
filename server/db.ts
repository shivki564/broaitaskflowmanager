import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { INITIAL_USERS, INITIAL_PROJECTS, INITIAL_TASKS, INITIAL_COMMENTS } from './seedData';

// Ensure data directory exists
const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export const DB_FILE_PATH = path.join(DATA_DIR, 'taskflow.db');

let dbInstance: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (!dbInstance) {
    dbInstance = new DatabaseSync(DB_FILE_PATH);
    
    // Configure SQLite performance and integrity pragmas
    dbInstance.exec('PRAGMA foreign_keys = ON;');
    dbInstance.exec('PRAGMA journal_mode = WAL;');
    dbInstance.exec('PRAGMA synchronous = NORMAL;');
    
    initTables(dbInstance);
  }
  return dbInstance;
}

function initTables(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      password TEXT NOT NULL DEFAULT 'user123',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL,
      project_id TEXT NOT NULL,
      priority TEXT NOT NULL,
      end_date TEXT NOT NULL,
      assigned_to TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      comment_text TEXT NOT NULL,
      commented_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (commented_by) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
}

// Convert SQLite row to JS object with proper types (e.g. is_active boolean)
function formatRow(collection: string, row: any): any {
  if (!row) return null;
  const copy = { ...row };
  if (collection === 'users' && 'is_active' in copy) {
    copy.is_active = Boolean(copy.is_active);
  }
  return copy;
}

export function getAll(collection: string): any[] {
  const db = getDb();
  const validTables = ['users', 'projects', 'tasks', 'comments'];
  if (!validTables.includes(collection)) {
    throw new Error(`Invalid table: ${collection}`);
  }

  const query = `SELECT * FROM ${collection}`;
  const rows = db.prepare(query).all();
  return rows.map(r => formatRow(collection, r));
}

export function getById(collection: string, id: string): any | null {
  const db = getDb();
  const validTables = ['users', 'projects', 'tasks', 'comments'];
  if (!validTables.includes(collection)) {
    throw new Error(`Invalid table: ${collection}`);
  }

  const query = `SELECT * FROM ${collection} WHERE id = ?`;
  const row = db.prepare(query).get(id);
  return formatRow(collection, row);
}

export function getUserByEmail(email: string): any | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email);
  return formatRow('users', row);
}

export function upsert(collection: string, id: string, data: Record<string, any>): void {
  const db = getDb();
  const validTables = ['users', 'projects', 'tasks', 'comments'];
  if (!validTables.includes(collection)) {
    throw new Error(`Invalid table: ${collection}`);
  }

  const payload: Record<string, any> = { ...data, id };
  
  if (collection === 'users' && 'is_active' in payload) {
    payload.is_active = payload.is_active ? 1 : 0;
  }
  if (collection === 'users' && !payload.password) {
    payload.password = payload.role === 'Admin' ? 'admin123' : 'user123';
  }

  const keys = Object.keys(payload);
  const placeholders = keys.map(() => '?').join(', ');
  const updateClause = keys.map(k => `${k} = excluded.${k}`).join(', ');

  const sql = `
    INSERT INTO ${collection} (${keys.join(', ')})
    VALUES (${placeholders})
    ON CONFLICT(id) DO UPDATE SET ${updateClause}
  `;

  const values = Object.values(payload);
  db.prepare(sql).run(...values);
}

export function remove(collection: string, id: string): void {
  const db = getDb();
  const validTables = ['users', 'projects', 'tasks', 'comments'];
  if (!validTables.includes(collection)) {
    throw new Error(`Invalid table: ${collection}`);
  }

  if (collection === 'projects') {
    // Also delete cascade tasks and comments if needed
    const tasks = db.prepare('SELECT id FROM tasks WHERE project_id = ?').all(id) as any[];
    for (const task of tasks) {
      db.prepare('DELETE FROM comments WHERE task_id = ?').run(task.id);
    }
    db.prepare('DELETE FROM tasks WHERE project_id = ?').run(id);
  } else if (collection === 'tasks') {
    db.prepare('DELETE FROM comments WHERE task_id = ?').run(id);
  }

  db.prepare(`DELETE FROM ${collection} WHERE id = ?`).run(id);
}

export function seedIfEmpty(): void {
  const db = getDb();
  const userCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as any).count;
  
  if (userCount === 0) {
    console.log('Seeding server SQLite database with initial dataset...');
    
    // Seed users
    for (const u of INITIAL_USERS) {
      upsert('users', u.id, u);
    }
    // Seed projects
    for (const p of INITIAL_PROJECTS) {
      upsert('projects', p.id, p);
    }
    // Seed tasks
    for (const t of INITIAL_TASKS) {
      upsert('tasks', t.id, t);
    }
    // Seed comments
    for (const c of INITIAL_COMMENTS) {
      upsert('comments', c.id, c);
    }
    console.log('SQLite database seeding complete.');
  }
}

export function clearDatabase(): void {
  const db = getDb();
  db.exec('PRAGMA foreign_keys = OFF;');
  db.exec('DELETE FROM comments;');
  db.exec('DELETE FROM tasks;');
  db.exec('DELETE FROM projects;');
  db.exec('DELETE FROM users;');
  db.exec('PRAGMA foreign_keys = ON;');
}

export function getDatabaseStats() {
  const db = getDb();
  const stats = {
    users: (db.prepare('SELECT COUNT(*) as count FROM users').get() as any).count,
    projects: (db.prepare('SELECT COUNT(*) as count FROM projects').get() as any).count,
    tasks: (db.prepare('SELECT COUNT(*) as count FROM tasks').get() as any).count,
    comments: (db.prepare('SELECT COUNT(*) as count FROM comments').get() as any).count,
    dbPath: DB_FILE_PATH,
    sizeBytes: fs.existsSync(DB_FILE_PATH) ? fs.statSync(DB_FILE_PATH).size : 0
  };
  return stats;
}
