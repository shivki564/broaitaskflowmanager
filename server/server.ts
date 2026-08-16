import express from 'express';
import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'brovai-taskflow-jwt-secret-2026';
const JWT_EXPIRES = '8h';

// Ensure data directory exists
const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}


// ==========================================
// DATABASE SETUP
// ==========================================
const db = new Database(path.join(DATA_DIR, 'taskflow.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK(role IN ('Admin', 'Team Member')),
    is_active INTEGER NOT NULL DEFAULT 1,
    password_hash TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    owner_id TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('TO_DO', 'IN_PROGRESS', 'BLOCKED', 'DONE')),
    project_id TEXT NOT NULL,
    priority TEXT NOT NULL CHECK(priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    end_date TEXT NOT NULL,
    assigned_to TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    comment_text TEXT NOT NULL,
    commented_by TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);

// ==========================================
// SEED INITIAL DATA (runs once if DB is empty)
// ==========================================
function seedIfEmpty() {
  const userCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as any).count;
  if (userCount > 0) return;

  console.log('Seeding initial data into SQLite...');

  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (id, first_name, last_name, email, role, is_active, created_at, updated_at)
    VALUES (@id, @first_name, @last_name, @email, @role, @is_active, @created_at, @updated_at)
  `);
  const insertProject = db.prepare(`
    INSERT OR IGNORE INTO projects (id, name, description, owner_id, created_at)
    VALUES (@id, @name, @description, @owner_id, @created_at)
  `);
  const insertTask = db.prepare(`
    INSERT OR IGNORE INTO tasks (id, title, description, status, project_id, priority, end_date, assigned_to, created_by, created_at, updated_at)
    VALUES (@id, @title, @description, @status, @project_id, @priority, @end_date, @assigned_to, @created_by, @created_at, @updated_at)
  `);
  const insertComment = db.prepare(`
    INSERT OR IGNORE INTO comments (id, task_id, comment_text, commented_by, created_at)
    VALUES (@id, @task_id, @comment_text, @commented_by, @created_at)
  `);

  const seedTx = db.transaction(() => {
    [
      { id: "u1", first_name: "Alex", last_name: "Robinson", email: "alex@brovai.com", role: "Admin", is_active: 1, created_at: "2026-01-10T09:00:00Z", updated_at: "2026-01-10T09:00:00Z" },
      { id: "u2", first_name: "Jordan", last_name: "Smith", email: "jordan@brovai.com", role: "Team Member", is_active: 1, created_at: "2026-02-15T10:30:00Z", updated_at: "2026-02-15T10:30:00Z" },
      { id: "u3", first_name: "Maria", last_name: "Gomez", email: "maria@brovai.com", role: "Team Member", is_active: 1, created_at: "2026-03-01T11:00:00Z", updated_at: "2026-03-01T11:00:00Z" },
      { id: "u4", first_name: "Sam", last_name: "Taylor", email: "sam@brovai.com", role: "Team Member", is_active: 1, created_at: "2026-03-20T14:00:00Z", updated_at: "2026-03-20T14:00:00Z" },
      { id: "u5", first_name: "Jessica", last_name: "Chen", email: "jessica@brovai.com", role: "Team Member", is_active: 0, created_at: "2026-04-05T16:20:00Z", updated_at: "2026-04-05T16:20:00Z" }
    ].forEach(u => insertUser.run(u));

    [
      { id: "p1", name: "Project Nebula", description: "Next-gen distributed cloud platform scaling infrastructure seamlessly.", owner_id: "u1", created_at: "2026-01-15T08:00:00Z" },
      { id: "p2", name: "API V3 Core", description: "Rebuilding our core microservices endpoints for faster payloads.", owner_id: "u4", created_at: "2026-03-10T08:00:00Z" }
    ].forEach(p => insertProject.run(p));

    [
      { id: "t1", title: "OAuth2 Implementation", description: "Integrate fully secure OAuth2 and JWT flow for third-party client integrations and secure SSO access.", status: "IN_PROGRESS", project_id: "p1", priority: "CRITICAL", end_date: "2026-07-05", assigned_to: "u2", created_by: "u1", created_at: "2026-06-15T10:00:00Z", updated_at: "2026-06-20T11:30:00Z" },
      { id: "t2", title: "PostgreSQL Index Optimization", description: "Identify slow querying workloads, add composite indexes, and optimize query analyzer performance under peak loads.", status: "BLOCKED", project_id: "p1", priority: "HIGH", end_date: "2026-06-20", assigned_to: "u3", created_by: "u1", created_at: "2026-06-10T09:00:00Z", updated_at: "2026-06-22T14:00:00Z" },
      { id: "t3", title: "UI Layout Refactoring", description: "Convert old navigation views into highly sleek, modern CSS layouts with beautiful glassmorphism.", status: "DONE", project_id: "p1", priority: "MEDIUM", end_date: "2026-06-23", assigned_to: "u4", created_by: "u1", created_at: "2026-06-18T10:00:00Z", updated_at: "2026-06-23T17:00:00Z" },
      { id: "t4", title: "User Documentation Wiki", description: "Draft official developer wiki and end-user onboarding documentation for Project Nebula launch.", status: "TO_DO", project_id: "p1", priority: "LOW", end_date: "2026-07-15", assigned_to: "u1", created_by: "u1", created_at: "2026-06-20T08:00:00Z", updated_at: "2026-06-20T08:00:00Z" },
      { id: "t5", title: "Setup API Gateway Routing", description: "Establish automated reverse-proxy configurations, load-balancers, and path-based API gateway routing tables.", status: "TO_DO", project_id: "p2", priority: "HIGH", end_date: "2026-07-12", assigned_to: "u2", created_by: "u4", created_at: "2026-06-21T09:00:00Z", updated_at: "2026-06-21T09:00:00Z" },
      { id: "t6", title: "Implement JWT Authentication", description: "Build robust stateless JSON Web Token session validation middleware with asymmetric signature keys.", status: "DONE", project_id: "p2", priority: "CRITICAL", end_date: "2026-06-24", assigned_to: "u4", created_by: "u4", created_at: "2026-06-19T11:00:00Z", updated_at: "2026-06-24T12:00:00Z" }
    ].forEach(t => insertTask.run(t));

    [
      { id: "c1", task_id: "t1", comment_text: "Standardizing on OAuth2 authorization code flow with PKCE for security.", commented_by: "u2", created_at: "2026-06-21T14:30:00Z" },
      { id: "c2", task_id: "t2", comment_text: "Blocked on disk quota expansion and admin database level execution grants.", commented_by: "u3", created_at: "2026-06-22T15:20:00Z" },
      { id: "c3", task_id: "t2", comment_text: "I am reviewing the storage requests today. Hang tight, Maria.", commented_by: "u1", created_at: "2026-06-23T09:10:00Z" }
    ].forEach(c => insertComment.run(c));
  });

  seedTx();
  console.log('Seed complete.');
}

seedIfEmpty();

// Add password_hash column to existing databases (idempotent migration)
try {
  db.exec(`ALTER TABLE users ADD COLUMN password_hash TEXT`);
} catch (_) { /* column already exists */ }

// Seed default passwords for any user that doesn't have one yet (runs on every start)
async function seedPasswords() {
  const usersWithoutPassword = db.prepare(`SELECT id, role FROM users WHERE password_hash IS NULL`).all() as any[];
  if (usersWithoutPassword.length === 0) return;

  console.log(`Setting default passwords for ${usersWithoutPassword.length} user(s)...`);
  const adminHash = await bcrypt.hash('admin123', 10);
  const userHash  = await bcrypt.hash('user123', 10);

  for (const u of usersWithoutPassword) {
    const hash = u.role === 'Admin' ? adminHash : userHash;
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, u.id);
  }
  console.log('─────────────────────────────────────');
  console.log('  Default passwords assigned:');
  console.log('  Admin accounts   → admin123');
  console.log('  Team members     → user123');
  console.log('─────────────────────────────────────');
}
seedPasswords();

// ==========================================
// AUTH MIDDLEWARE
// ==========================================
function authMiddleware(req: any, res: any, next: any) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token expired or invalid' });
  }
}

// Protect all /api/* routes except /api/auth/*
app.use('/api', (req: any, res: any, next: any) => {
  if (req.path.startsWith('/auth/')) return next();
  return authMiddleware(req, res, next);
});

// ==========================================
// AUTH ROUTES (public)
// ==========================================
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email.trim()) as any;
  if (!user) return res.status(401).json({ error: 'Invalid email or password' });
  if (!user.is_active) return res.status(403).json({ error: 'Account is deactivated. Contact admin.' });
  if (!user.password_hash) return res.status(401).json({ error: 'No password set. Contact your admin.' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );

  const { password_hash, ...safeUser } = user;
  res.json({ token, user: { ...safeUser, is_active: user.is_active === 1 } });
});

app.get('/api/auth/me', authMiddleware, (req: any, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id) as any;
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { password_hash, ...safeUser } = user;
  res.json({ ...safeUser, is_active: user.is_active === 1 });
});

app.post('/api/auth/change-password', authMiddleware, async (req: any, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id) as any;
  if (user.password_hash) {
    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });
  }
  const hash = await bcrypt.hash(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.user.id);
  res.json({ ok: true });
});

// Admin: reset any user's password
app.post('/api/auth/set-password', authMiddleware, async (req: any, res) => {
  if (req.user.role !== 'Admin') return res.status(403).json({ error: 'Admins only' });
  const { userId, password } = req.body;
  if (!password || password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  const hash = await bcrypt.hash(password, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, userId);
  res.json({ ok: true });
});

// ==========================================
// HELPERS
// ==========================================
function mapUser(row: any) {
  if (!row) return null;
  return { ...row, is_active: row.is_active === 1 };
}

// ==========================================
// USERS ROUTES
// ==========================================
app.get('/api/users', (_req, res) => {
  const rows = db.prepare('SELECT * FROM users ORDER BY id').all() as any[];
  res.json(rows.map(r => { const { password_hash, ...safe } = r; return { ...safe, is_active: r.is_active === 1 }; }));
});

app.put('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const u = req.body;
  db.prepare(`
    INSERT INTO users (id, first_name, last_name, email, role, is_active, created_at, updated_at)
    VALUES (@id, @first_name, @last_name, @email, @role, @is_active, @created_at, @updated_at)
    ON CONFLICT(id) DO UPDATE SET
      first_name = excluded.first_name,
      last_name = excluded.last_name,
      email = excluded.email,
      role = excluded.role,
      is_active = excluded.is_active,
      updated_at = excluded.updated_at
  `).run({ ...u, id, is_active: u.is_active ? 1 : 0 });
  res.json({ ok: true });
});

app.delete('/api/users/:id', (req, res) => {
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ==========================================
// PROJECTS ROUTES
// ==========================================
app.get('/api/projects', (_req, res) => {
  const rows = db.prepare('SELECT * FROM projects ORDER BY created_at').all();
  res.json(rows);
});

app.put('/api/projects/:id', (req, res) => {
  const { id } = req.params;
  const p = req.body;
  db.prepare(`
    INSERT INTO projects (id, name, description, owner_id, created_at)
    VALUES (@id, @name, @description, @owner_id, @created_at)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      description = excluded.description,
      owner_id = excluded.owner_id
  `).run({ ...p, id });
  res.json({ ok: true });
});

app.delete('/api/projects/:id', (req, res) => {
  const { id } = req.params;
  const deleteTx = db.transaction(() => {
    // Get task ids for this project
    const taskIds = (db.prepare('SELECT id FROM tasks WHERE project_id = ?').all(id) as any[]).map(r => r.id);
    // Delete comments for those tasks
    for (const tid of taskIds) {
      db.prepare('DELETE FROM comments WHERE task_id = ?').run(tid);
    }
    // Delete tasks
    db.prepare('DELETE FROM tasks WHERE project_id = ?').run(id);
    // Delete project
    db.prepare('DELETE FROM projects WHERE id = ?').run(id);
  });
  deleteTx();
  res.json({ ok: true });
});

// ==========================================
// TASKS ROUTES
// ==========================================
app.get('/api/tasks', (_req, res) => {
  const rows = db.prepare('SELECT * FROM tasks ORDER BY created_at DESC').all();
  res.json(rows);
});

app.put('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  const t = req.body;
  db.prepare(`
    INSERT INTO tasks (id, title, description, status, project_id, priority, end_date, assigned_to, created_by, created_at, updated_at)
    VALUES (@id, @title, @description, @status, @project_id, @priority, @end_date, @assigned_to, @created_by, @created_at, @updated_at)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      description = excluded.description,
      status = excluded.status,
      project_id = excluded.project_id,
      priority = excluded.priority,
      end_date = excluded.end_date,
      assigned_to = excluded.assigned_to,
      updated_at = excluded.updated_at
  `).run({ ...t, id });
  res.json({ ok: true });
});

app.delete('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  const deleteTx = db.transaction(() => {
    db.prepare('DELETE FROM comments WHERE task_id = ?').run(id);
    db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  });
  deleteTx();
  res.json({ ok: true });
});

// ==========================================
// COMMENTS ROUTES
// ==========================================
app.get('/api/comments', (_req, res) => {
  const rows = db.prepare('SELECT * FROM comments ORDER BY created_at').all();
  res.json(rows);
});

app.put('/api/comments/:id', (req, res) => {
  const { id } = req.params;
  const c = req.body;
  db.prepare(`
    INSERT INTO comments (id, task_id, comment_text, commented_by, created_at)
    VALUES (@id, @task_id, @comment_text, @commented_by, @created_at)
    ON CONFLICT(id) DO UPDATE SET
      comment_text = excluded.comment_text
  `).run({ ...c, id });
  res.json({ ok: true });
});

app.delete('/api/comments/:id', (req, res) => {
  db.prepare('DELETE FROM comments WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ==========================================
// START SERVER
// ==========================================
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;
const isProd = process.env.NODE_ENV === 'production';

// In production, serve the Vite-built frontend from /dist
if (isProd) {
  const distPath = path.join(__dirname, 'dist');
  app.use(express.static(distPath));
  // Fallback: serve index.html for all non-API routes (SPA routing)
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT} [${isProd ? 'production' : 'development'}]`);
});
