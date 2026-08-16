import express from 'express';
import pg from 'pg';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// ==========================================
// ENVIRONMENT CONFIGURATION
// ==========================================

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not configured`);
  }

  return value;
}

const JWT_SECRET =
  process.env.JWT_SECRET || 'brovai-taskflow-jwt-secret-2026';

const JWT_EXPIRES = '8h';

const DEFAULT_ADMIN_PASSWORD = requireEnv(
  'DEFAULT_ADMIN_PASSWORD'
);

const DEFAULT_USER_PASSWORD = requireEnv(
  'DEFAULT_USER_PASSWORD'
);

const DATABASE_URL =
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error(
    'POSTGRES_URL or POSTGRES_URL_NON_POOLING is not configured'
  );
}

// ==========================================
// DATABASE SETUP - SUPABASE POSTGRES
// ==========================================

const pool = new Pool({
  connectionString: DATABASE_URL?.replace('sslmode=require', 'sslmode=no-verify'),

  ssl: {
    rejectUnauthorized: false,
  },

  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err);
});

async function testDatabaseConnection() {
  const client = await pool.connect();

  try {
    await client.query('SELECT 1');

    console.log('📊 Supabase PostgreSQL database connected');
  } finally {
    client.release();
  }
}

// ==========================================
// DATABASE TABLES
// ==========================================

async function initializeDatabase() {
  console.log('Initializing Supabase database...');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL CHECK(role IN ('Admin', 'Team Member')),
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      password_hash TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL CHECK(
        status IN ('TO_DO', 'IN_PROGRESS', 'BLOCKED', 'DONE')
      ),
      project_id TEXT NOT NULL,
      priority TEXT NOT NULL CHECK(
        priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')
      ),
      end_date TEXT NOT NULL,
      assigned_to TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      comment_text TEXT NOT NULL,
      commented_by TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  console.log('✅ Database tables initialized');
}

// ==========================================
// SEED INITIAL DATA
// ==========================================

async function seedIfEmpty() {
  const result = await pool.query(
    'SELECT COUNT(*)::int AS count FROM users'
  );

  const userCount = result.rows[0].count;

  if (userCount > 0) {
    return;
  }

  console.log('🌱 Seeding initial data into Supabase...');

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const users = [
      {
        id: 'u1',
        first_name: 'Alex',
        last_name: 'Robinson',
        email: 'alex@brovai.com',
        role: 'Admin',
        is_active: true,
        created_at: '2026-01-10T09:00:00Z',
        updated_at: '2026-01-10T09:00:00Z',
      },
      {
        id: 'u2',
        first_name: 'Jordan',
        last_name: 'Smith',
        email: 'jordan@brovai.com',
        role: 'Team Member',
        is_active: true,
        created_at: '2026-02-15T10:30:00Z',
        updated_at: '2026-02-15T10:30:00Z',
      },
      {
        id: 'u3',
        first_name: 'Maria',
        last_name: 'Gomez',
        email: 'maria@brovai.com',
        role: 'Team Member',
        is_active: true,
        created_at: '2026-03-01T11:00:00Z',
        updated_at: '2026-03-01T11:00:00Z',
      },
      {
        id: 'u4',
        first_name: 'Sam',
        last_name: 'Taylor',
        email: 'sam@brovai.com',
        role: 'Team Member',
        is_active: true,
        created_at: '2026-03-20T14:00:00Z',
        updated_at: '2026-03-20T14:00:00Z',
      },
      {
        id: 'u5',
        first_name: 'Jessica',
        last_name: 'Chen',
        email: 'jessica@brovai.com',
        role: 'Team Member',
        is_active: false,
        created_at: '2026-04-05T16:20:00Z',
        updated_at: '2026-04-05T16:20:00Z',
      },
    ];

    for (const user of users) {
      await client.query(
        `
        INSERT INTO users (
          id,
          first_name,
          last_name,
          email,
          role,
          is_active,
          created_at,
          updated_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT (id) DO NOTHING
        `,
        [
          user.id,
          user.first_name,
          user.last_name,
          user.email,
          user.role,
          user.is_active,
          user.created_at,
          user.updated_at,
        ]
      );
    }

    const projects = [
      {
        id: 'p1',
        name: 'Project Nebula',
        description:
          'Next-gen distributed cloud platform scaling infrastructure seamlessly.',
        owner_id: 'u1',
        created_at: '2026-01-15T08:00:00Z',
      },
      {
        id: 'p2',
        name: 'API V3 Core',
        description:
          'Rebuilding our core microservices endpoints for faster payloads.',
        owner_id: 'u4',
        created_at: '2026-03-10T08:00:00Z',
      },
    ];

    for (const project of projects) {
      await client.query(
        `
        INSERT INTO projects (
          id,
          name,
          description,
          owner_id,
          created_at
        )
        VALUES ($1,$2,$3,$4,$5)
        ON CONFLICT (id) DO NOTHING
        `,
        [
          project.id,
          project.name,
          project.description,
          project.owner_id,
          project.created_at,
        ]
      );
    }

    const tasks = [
      {
        id: 't1',
        title: 'OAuth2 Implementation',
        description:
          'Integrate fully secure OAuth2 and JWT flow for third-party client integrations and secure SSO access.',
        status: 'IN_PROGRESS',
        project_id: 'p1',
        priority: 'CRITICAL',
        end_date: '2026-07-05',
        assigned_to: 'u2',
        created_by: 'u1',
        created_at: '2026-06-15T10:00:00Z',
        updated_at: '2026-06-20T11:30:00Z',
      },
      {
        id: 't2',
        title: 'PostgreSQL Index Optimization',
        description:
          'Identify slow querying workloads, add composite indexes, and optimize query analyzer performance under peak loads.',
        status: 'BLOCKED',
        project_id: 'p1',
        priority: 'HIGH',
        end_date: '2026-06-20',
        assigned_to: 'u3',
        created_by: 'u1',
        created_at: '2026-06-10T09:00:00Z',
        updated_at: '2026-06-22T14:00:00Z',
      },
      {
        id: 't3',
        title: 'UI Layout Refactoring',
        description:
          'Convert old navigation views into highly sleek, modern CSS layouts with beautiful glassmorphism.',
        status: 'DONE',
        project_id: 'p1',
        priority: 'MEDIUM',
        end_date: '2026-06-23',
        assigned_to: 'u4',
        created_by: 'u1',
        created_at: '2026-06-18T10:00:00Z',
        updated_at: '2026-06-23T17:00:00Z',
      },
      {
        id: 't4',
        title: 'User Documentation Wiki',
        description:
          'Draft official developer wiki and end-user onboarding documentation for Project Nebula launch.',
        status: 'TO_DO',
        project_id: 'p1',
        priority: 'LOW',
        end_date: '2026-07-15',
        assigned_to: 'u1',
        created_by: 'u1',
        created_at: '2026-06-20T08:00:00Z',
        updated_at: '2026-06-20T08:00:00Z',
      },
      {
        id: 't5',
        title: 'Setup API Gateway Routing',
        description:
          'Establish automated reverse-proxy configurations, load-balancers, and path-based API gateway routing tables.',
        status: 'TO_DO',
        project_id: 'p2',
        priority: 'HIGH',
        end_date: '2026-07-12',
        assigned_to: 'u2',
        created_by: 'u4',
        created_at: '2026-06-21T09:00:00Z',
        updated_at: '2026-06-21T09:00:00Z',
      },
      {
        id: 't6',
        title: 'Implement JWT Authentication',
        description:
          'Build robust stateless JSON Web Token session validation middleware with asymmetric signature keys.',
        status: 'DONE',
        project_id: 'p2',
        priority: 'CRITICAL',
        end_date: '2026-06-24',
        assigned_to: 'u4',
        created_by: 'u4',
        created_at: '2026-06-19T11:00:00Z',
        updated_at: '2026-06-24T12:00:00Z',
      },
    ];

    for (const task of tasks) {
      await client.query(
        `
        INSERT INTO tasks (
          id,
          title,
          description,
          status,
          project_id,
          priority,
          end_date,
          assigned_to,
          created_by,
          created_at,
          updated_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        ON CONFLICT (id) DO NOTHING
        `,
        [
          task.id,
          task.title,
          task.description,
          task.status,
          task.project_id,
          task.priority,
          task.end_date,
          task.assigned_to,
          task.created_by,
          task.created_at,
          task.updated_at,
        ]
      );
    }

    const comments = [
      {
        id: 'c1',
        task_id: 't1',
        comment_text:
          'Standardizing on OAuth2 authorization code flow with PKCE for security.',
        commented_by: 'u2',
        created_at: '2026-06-21T14:30:00Z',
      },
      {
        id: 'c2',
        task_id: 't2',
        comment_text:
          'Blocked on disk quota expansion and admin database level execution grants.',
        commented_by: 'u3',
        created_at: '2026-06-22T15:20:00Z',
      },
      {
        id: 'c3',
        task_id: 't2',
        comment_text:
          'I am reviewing the storage requests today. Hang tight, Maria.',
        commented_by: 'u1',
        created_at: '2026-06-23T09:10:00Z',
      },
    ];

    for (const comment of comments) {
      await client.query(
        `
        INSERT INTO comments (
          id,
          task_id,
          comment_text,
          commented_by,
          created_at
        )
        VALUES ($1,$2,$3,$4,$5)
        ON CONFLICT (id) DO NOTHING
        `,
        [
          comment.id,
          comment.task_id,
          comment.comment_text,
          comment.commented_by,
          comment.created_at,
        ]
      );
    }

    await client.query('COMMIT');

    console.log('✅ Seed complete.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Database seed failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// ==========================================
// PASSWORD INITIALIZATION
// ==========================================

async function seedPasswords() {
  const result = await pool.query(
    `
    SELECT id, role
    FROM users
    WHERE password_hash IS NULL
    `
  );

  const usersWithoutPassword = result.rows;

  if (usersWithoutPassword.length === 0) {
    return;
  }

  console.log(
    `Setting default passwords for ${usersWithoutPassword.length} user(s)...`
  );

  const adminHash = await bcrypt.hash(
    DEFAULT_ADMIN_PASSWORD,
    10
  );

  const userHash = await bcrypt.hash(
    DEFAULT_USER_PASSWORD,
    10
  );

  for (const user of usersWithoutPassword) {
    const hash =
      user.role === 'Admin'
        ? adminHash
        : userHash;

    await pool.query(
      `
      UPDATE users
      SET password_hash = $1
      WHERE id = $2
      `,
      [hash, user.id]
    );
  }

  console.log('Default passwords assigned securely');
}

// ==========================================
// AUTH MIDDLEWARE
// ==========================================

function authMiddleware(
  req: any,
  res: any,
  next: any
) {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    return res
      .status(401)
      .json({ error: 'Unauthorized' });
  }

  try {
    req.user = jwt.verify(
      header.slice(7),
      JWT_SECRET
    );

    next();
  } catch {
    res
      .status(401)
      .json({ error: 'Token expired or invalid' });
  }
}

// Protect all /api/* routes except /api/auth/*
app.use('/api', (req: any, res: any, next: any) => {
  if (req.path.startsWith('/auth/')) {
    return next();
  }

  return authMiddleware(req, res, next);
});

// ==========================================
// AUTH ROUTES
// ==========================================

app.post(
  '/api/auth/login',
  async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          error: 'Email and password required',
        });
      }

      const result = await pool.query(
        `
        SELECT *
        FROM users
        WHERE LOWER(email) = LOWER($1)
        `,
        [email.trim()]
      );

      const user = result.rows[0];

      if (!user) {
        return res.status(401).json({
          error: 'Invalid email or password',
        });
      }

      if (!user.is_active) {
        return res.status(403).json({
          error:
            'Account is deactivated. Contact admin.',
        });
      }

      if (!user.password_hash) {
        return res.status(401).json({
          error:
            'No password set. Contact your admin.',
        });
      }

      const valid = await bcrypt.compare(
        password,
        user.password_hash
      );

      if (!valid) {
        return res.status(401).json({
          error: 'Invalid email or password',
        });
      }

      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role,
        },
        JWT_SECRET,
        {
          expiresIn: JWT_EXPIRES,
        }
      );

      const {
        password_hash,
        ...safeUser
      } = user;

      res.json({
        token,
        user: {
          ...safeUser,
          is_active: Boolean(user.is_active),
        },
      });
    } catch (error) {
      console.error('Login error:', error);

      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }
);

app.get(
  '/api/auth/me',
  authMiddleware,
  async (req: any, res) => {
    try {
      const result = await pool.query(
        `
        SELECT *
        FROM users
        WHERE id = $1
        `,
        [req.user.id]
      );

      const user = result.rows[0];

      if (!user) {
        return res.status(404).json({
          error: 'User not found',
        });
      }

      const {
        password_hash,
        ...safeUser
      } = user;

      res.json({
        ...safeUser,
        is_active: Boolean(user.is_active),
      });
    } catch (error) {
      console.error('Get current user error:', error);

      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }
);

app.post(
  '/api/auth/change-password',
  authMiddleware,
  async (req: any, res) => {
    try {
      const {
        currentPassword,
        newPassword,
      } = req.body;

      if (
        !newPassword ||
        newPassword.length < 6
      ) {
        return res.status(400).json({
          error:
            'Password must be at least 6 characters',
        });
      }

      const result = await pool.query(
        `
        SELECT *
        FROM users
        WHERE id = $1
        `,
        [req.user.id]
      );

      const user = result.rows[0];

      if (!user) {
        return res.status(404).json({
          error: 'User not found',
        });
      }

      if (user.password_hash) {
        const valid = await bcrypt.compare(
          currentPassword,
          user.password_hash
        );

        if (!valid) {
          return res.status(401).json({
            error:
              'Current password is incorrect',
          });
        }
      }

      const hash = await bcrypt.hash(
        newPassword,
        10
      );

      await pool.query(
        `
        UPDATE users
        SET password_hash = $1,
            updated_at = $2
        WHERE id = $3
        `,
        [
          hash,
          new Date().toISOString(),
          req.user.id,
        ]
      );

      res.json({ ok: true });
    } catch (error) {
      console.error(
        'Change password error:',
        error
      );

      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }
);

// Admin: reset any user's password
app.post(
  '/api/auth/set-password',
  authMiddleware,
  async (req: any, res) => {
    try {
      if (req.user.role !== 'Admin') {
        return res.status(403).json({
          error: 'Admins only',
        });
      }

      const { userId, password } = req.body;

      if (
        !password ||
        password.length < 6
      ) {
        return res.status(400).json({
          error:
            'Password must be at least 6 characters',
        });
      }

      const hash = await bcrypt.hash(
        password,
        10
      );

      await pool.query(
        `
        UPDATE users
        SET password_hash = $1,
            updated_at = $2
        WHERE id = $3
        `,
        [
          hash,
          new Date().toISOString(),
          userId,
        ]
      );

      res.json({ ok: true });
    } catch (error) {
      console.error(
        'Set password error:',
        error
      );

      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }
);

// ==========================================
// HELPERS
// ==========================================

function mapUser(row: any) {
  if (!row) return null;

  return {
    ...row,
    is_active: Boolean(row.is_active),
  };
}

async function assignDefaultPassword(
  userID: string,
  role: string
) {
  const password =
    role === 'Admin'
      ? DEFAULT_ADMIN_PASSWORD
      : DEFAULT_USER_PASSWORD;

  const hash = await bcrypt.hash(
    password,
    10
  );

  await pool.query(
    `
    UPDATE users
    SET password_hash = $1,
        updated_at = $2
    WHERE id = $3
    `,
    [
      hash,
      new Date().toISOString(),
      userID,
    ]
  );
}

// ==========================================
// USERS ROUTES
// ==========================================

app.get('/api/users', async (_req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        id,
        first_name,
        last_name,
        email,
        role,
        is_active,
        created_at,
        updated_at
      FROM users
      ORDER BY id
      `
    );

    res.json(
      result.rows.map(mapUser)
    );
  } catch (error) {
    console.error('Get users error:', error);

    res.status(500).json({
      error: 'Internal server error',
    });
  }
});

app.put(
  '/api/users/:id',
  async (req, res) => {
    try {
      const { id } = req.params;
      const u = req.body;

      const existingResult =
        await pool.query(
          `
          SELECT password_hash
          FROM users
          WHERE id = $1
          `,
          [id]
        );

      const existingUser =
        existingResult.rows[0];

      const isNewUser =
        !existingUser ||
        !existingUser.password_hash;

      const now =
        new Date().toISOString();

      await pool.query(
        `
        INSERT INTO users (
          id,
          first_name,
          last_name,
          email,
          role,
          is_active,
          created_at,
          updated_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT (id)
        DO UPDATE SET
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          email = EXCLUDED.email,
          role = EXCLUDED.role,
          is_active = EXCLUDED.is_active,
          updated_at = EXCLUDED.updated_at
        `,
        [
          id,
          u.first_name,
          u.last_name,
          u.email,
          u.role,
          Boolean(u.is_active),
          u.created_at || now,
          now,
        ]
      );

      if (isNewUser) {
        await assignDefaultPassword(
          id,
          u.role
        );
      }

      res.json({ ok: true });
    } catch (error) {
      console.error(
        'Update user error:',
        error
      );

      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }
);

app.delete(
  '/api/users/:id',
  async (req, res) => {
    try {
      await pool.query(
        'DELETE FROM users WHERE id = $1',
        [req.params.id]
      );

      res.json({ ok: true });
    } catch (error) {
      console.error(
        'Delete user error:',
        error
      );

      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }
);

// ==========================================
// PROJECTS ROUTES
// ==========================================

app.get(
  '/api/projects',
  async (_req, res) => {
    try {
      const result = await pool.query(
        `
        SELECT *
        FROM projects
        ORDER BY created_at
        `
      );

      res.json(result.rows);
    } catch (error) {
      console.error(
        'Get projects error:',
        error
      );

      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }
);

app.put(
  '/api/projects/:id',
  async (req, res) => {
    try {
      const { id } = req.params;
      const p = req.body;

      await pool.query(
        `
        INSERT INTO projects (
          id,
          name,
          description,
          owner_id,
          created_at
        )
        VALUES ($1,$2,$3,$4,$5)
        ON CONFLICT (id)
        DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          owner_id = EXCLUDED.owner_id
        `,
        [
          id,
          p.name,
          p.description,
          p.owner_id,
          p.created_at ||
            new Date().toISOString(),
        ]
      );

      res.json({ ok: true });
    } catch (error) {
      console.error(
        'Update project error:',
        error
      );

      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }
);

app.delete(
  '/api/projects/:id',
  async (req, res) => {
    const client =
      await pool.connect();

    try {
      const { id } = req.params;

      await client.query('BEGIN');

      await client.query(
        `
        DELETE FROM comments
        WHERE task_id IN (
          SELECT id
          FROM tasks
          WHERE project_id = $1
        )
        `,
        [id]
      );

      await client.query(
        `
        DELETE FROM tasks
        WHERE project_id = $1
        `,
        [id]
      );

      await client.query(
        `
        DELETE FROM projects
        WHERE id = $1
        `,
        [id]
      );

      await client.query('COMMIT');

      res.json({ ok: true });
    } catch (error) {
      await client.query('ROLLBACK');

      console.error(
        'Delete project error:',
        error
      );

      res.status(500).json({
        error: 'Internal server error',
      });
    } finally {
      client.release();
    }
  }
);

// ==========================================
// TASKS ROUTES
// ==========================================

app.get(
  '/api/tasks',
  async (_req, res) => {
    try {
      const result = await pool.query(
        `
        SELECT *
        FROM tasks
        ORDER BY created_at DESC
        `
      );

      res.json(result.rows);
    } catch (error) {
      console.error(
        'Get tasks error:',
        error
      );

      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }
);

app.put(
  '/api/tasks/:id',
  async (req, res) => {
    try {
      const { id } = req.params;
      const t = req.body;

      const now =
        new Date().toISOString();

      await pool.query(
        `
        INSERT INTO tasks (
          id,
          title,
          description,
          status,
          project_id,
          priority,
          end_date,
          assigned_to,
          created_by,
          created_at,
          updated_at
        )
        VALUES (
          $1,$2,$3,$4,$5,
          $6,$7,$8,$9,$10,$11
        )
        ON CONFLICT (id)
        DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          status = EXCLUDED.status,
          project_id = EXCLUDED.project_id,
          priority = EXCLUDED.priority,
          end_date = EXCLUDED.end_date,
          assigned_to = EXCLUDED.assigned_to,
          updated_at = EXCLUDED.updated_at
        `,
        [
          id,
          t.title,
          t.description,
          t.status,
          t.project_id,
          t.priority,
          t.end_date,
          t.assigned_to,
          t.created_by,
          t.created_at || now,
          now,
        ]
      );

      res.json({ ok: true });
    } catch (error) {
      console.error(
        'Update task error:',
        error
      );

      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }
);

app.delete(
  '/api/tasks/:id',
  async (req, res) => {
    const client =
      await pool.connect();

    try {
      const { id } = req.params;

      await client.query('BEGIN');

      await client.query(
        `
        DELETE FROM comments
        WHERE task_id = $1
        `,
        [id]
      );

      await client.query(
        `
        DELETE FROM tasks
        WHERE id = $1
        `,
        [id]
      );

      await client.query('COMMIT');

      res.json({ ok: true });
    } catch (error) {
      await client.query('ROLLBACK');

      console.error(
        'Delete task error:',
        error
      );

      res.status(500).json({
        error: 'Internal server error',
      });
    } finally {
      client.release();
    }
  }
);

// ==========================================
// COMMENTS ROUTES
// ==========================================

app.get(
  '/api/comments',
  async (_req, res) => {
    try {
      const result = await pool.query(
        `
        SELECT *
        FROM comments
        ORDER BY created_at
        `
      );

      res.json(result.rows);
    } catch (error) {
      console.error(
        'Get comments error:',
        error
      );

      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }
);

app.put(
  '/api/comments/:id',
  async (req, res) => {
    try {
      const { id } = req.params;
      const c = req.body;

      await pool.query(
        `
        INSERT INTO comments (
          id,
          task_id,
          comment_text,
          commented_by,
          created_at
        )
        VALUES ($1,$2,$3,$4,$5)
        ON CONFLICT (id)
        DO UPDATE SET
          comment_text =
            EXCLUDED.comment_text
        `,
        [
          id,
          c.task_id,
          c.comment_text,
          c.commented_by,
          c.created_at ||
            new Date().toISOString(),
        ]
      );

      res.json({ ok: true });
    } catch (error) {
      console.error(
        'Update comment error:',
        error
      );

      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }
);

app.delete(
  '/api/comments/:id',
  async (req, res) => {
    try {
      await pool.query(
        `
        DELETE FROM comments
        WHERE id = $1
        `,
        [req.params.id]
      );

      res.json({ ok: true });
    } catch (error) {
      console.error(
        'Delete comment error:',
        error
      );

      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }
);

// ==========================================
// STARTUP
// ==========================================

async function startServer() {
  try {
    await testDatabaseConnection();
    await initializeDatabase();
    await seedIfEmpty();
    await seedPasswords();

    const PORT = process.env.PORT
      ? parseInt(process.env.PORT)
      : 3001;

    const isProd =
      process.env.NODE_ENV === 'production';

    if (isProd) {
      const distPath = path.join(
        __dirname,
        '../dist'
      );

      app.use(
        express.static(distPath)
      );

      app.get(
        '*',
        (_req, res) => {
          res.sendFile(
            path.join(
              distPath,
              'index.html'
            )
          );
        }
      );
    }

    app.listen(PORT, () => {
      console.log(
        `🚀 Bro AI Task Flow Server running on http://localhost:${PORT}`
      );

      console.log(
        `📊 Supabase PostgreSQL connected`
      );
    });
  } catch (error) {
    console.error(
      '❌ Failed to start server:',
      error
    );

    process.exit(1);
  }
}

startServer();