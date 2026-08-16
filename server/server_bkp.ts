import express, { Request, Response } from 'express';
import {
  getDb,
  getAll,
  getById,
  upsert,
  remove,
  getUserByEmail,
  seedIfEmpty,
  clearDatabase,
  getDatabaseStats,
  DB_FILE_PATH
} from './db';

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(express.json());

// CORS Middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

// Real-time SSE (Server-Sent Events) Clients Registry
type SSEClient = {
  id: number;
  res: Response;
};
let clients: SSEClient[] = [];
let nextClientId = 1;

function broadcast(event: { type: string; collection?: string; action?: string; id?: string; data?: any }) {
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  clients.forEach(client => {
    try {
      client.res.write(payload);
    } catch (e) {
      // Client disconnected
    }
  });
}

// -------------------------------------------------------------
// Realtime SSE endpoint
// -------------------------------------------------------------
app.get('/api/events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const clientId = nextClientId++;
  const client: SSEClient = { id: clientId, res };
  clients.push(client);

  // Send initial ping
  res.write(`data: ${JSON.stringify({ type: 'connected', clientId })}\n\n`);

  req.on('close', () => {
    clients = clients.filter(c => c.id !== clientId);
  });
});

// -------------------------------------------------------------
// System & Health Endpoints
// -------------------------------------------------------------
app.get('/api/health', (req: Request, res: Response) => {
  try {
    const stats = getDatabaseStats();
    res.json({
      status: 'ok',
      engine: 'SQLite (Server-side)',
      databaseFile: DB_FILE_PATH,
      stats
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

app.get('/api/stats', (req: Request, res: Response) => {
  try {
    const stats = getDatabaseStats();
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// Auth Endpoints
// -------------------------------------------------------------
const DEFAULT_PASSWORDS: Record<string, string> = {
  'Admin': 'admin123',
  'Team Member': 'user123'
};

app.post('/api/auth/login', (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const user = getUserByEmail(email);
    if (!user) {
      res.status(401).json({ error: 'User not found. Please check your email.' });
      return;
    }

    if (!user.is_active) {
      res.status(403).json({ error: 'This account is deactivated. Please contact an administrator.' });
      return;
    }

    const expectedPassword = user.password || DEFAULT_PASSWORDS[user.role] || 'user123';
    if (password !== expectedPassword) {
      res.status(401).json({ error: 'Invalid password. Please try again.' });
      return;
    }

    // Generate token
    const token = Buffer.from(`${user.id}:${Date.now()}:${Math.random()}`).toString('base64');
    const { password: _, ...safeUser } = user;

    res.json({
      user: safeUser,
      token
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// Bulk Data & Seed
// -------------------------------------------------------------
app.get('/api/all', (req: Request, res: Response) => {
  try {
    const users = getAll('users').map(({ password, ...u }) => u);
    const projects = getAll('projects');
    const tasks = getAll('tasks');
    const comments = getAll('comments');

    res.json({ users, projects, tasks, comments });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/seed', (req: Request, res: Response) => {
  try {
    seedIfEmpty();
    broadcast({ type: 'reload' });
    res.json({ success: true, message: 'Database seeded if needed.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/clear', (req: Request, res: Response) => {
  try {
    clearDatabase();
    broadcast({ type: 'reload' });
    res.json({ success: true, message: 'Database cleared.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// Collection CRUD Endpoints
// -------------------------------------------------------------
app.get('/api/:collection', (req: Request, res: Response) => {
  try {
    const { collection } = req.params;
    let data = getAll(collection);
    if (collection === 'users') {
      data = data.map(({ password, ...u }) => u);
    }
    res.json(data);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/:collection/:id', (req: Request, res: Response) => {
  try {
    const { collection, id } = req.params;
    const item = getById(collection, id);
    if (!item) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    if (collection === 'users') {
      const { password, ...safeUser } = item;
      res.json(safeUser);
      return;
    }
    res.json(item);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/:collection/:id', (req: Request, res: Response) => {
  try {
    const { collection, id } = req.params;
    const body = req.body;
    upsert(collection, id, body);
    
    // Broadcast realtime event
    broadcast({
      type: 'change',
      collection,
      action: 'upsert',
      id,
      data: body
    });

    res.json({ success: true, id });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/:collection', (req: Request, res: Response) => {
  try {
    const { collection } = req.params;
    const body = req.body;
    const id = body.id || `${collection.charAt(0)}_${Date.now()}`;
    upsert(collection, id, body);

    broadcast({
      type: 'change',
      collection,
      action: 'upsert',
      id,
      data: { ...body, id }
    });

    res.json({ success: true, id });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/:collection/:id', (req: Request, res: Response) => {
  try {
    const { collection, id } = req.params;
    remove(collection, id);

    broadcast({
      type: 'change',
      collection,
      action: 'delete',
      id
    });

    res.json({ success: true, id });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Initialize database schema and initial seed data on startup
try {
  getDb();
  seedIfEmpty();
  console.log(`Server-side SQLite initialized at: ${DB_FILE_PATH}`);
} catch (err) {
  console.error('Error during initial DB setup:', err);
}

// Start HTTP server
app.listen(PORT, () => {
  console.log(`🚀 Bro AI Task Flow Server running on http://localhost:${PORT}`);
  console.log(`📊 SQLite database connected: ${DB_FILE_PATH}`);
});
