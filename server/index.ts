import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { watch } from 'fs';
import { join } from 'path';
import * as bd from './utils/bd-cli';
import type { Issue } from '../src/types/issue';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Middleware
app.use(cors());
app.use(express.json());

// JSONL path
const JSONL_PATH = join(process.cwd(), '.beads', 'issues.jsonl');

// Helper: Broadcast to all WebSocket clients
function broadcast(message: any) {
  const data = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === 1) { // OPEN
      client.send(data);
    }
  });
}

// File watcher for external CLI changes (start after server is running)
let watcher: ReturnType<typeof watch> | null = null;

function startFileWatcher() {
  try {
    watcher = watch(JSONL_PATH, { persistent: false }, (eventType) => {
      if (eventType === 'change') {
        console.log('🔄 Detected external change to issues.jsonl');
        // Broadcast a refresh signal to all clients
        broadcast({ type: 'issues:refresh' });
      }
    });
    console.log('👀 Watching for external changes to issues.jsonl');
  } catch (error) {
    console.warn('Could not start file watcher:', error instanceof Error ? error.message : String(error));
  }
}

// Cleanup on process exit
process.on('SIGTERM', () => {
  watcher?.close();
  server.close();
});

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', (message) => {
    console.log('Received:', message.toString());
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

// Routes

// GET /api/issues - List all issues
app.get('/api/issues', async (req, res) => {
  try {
    // Check if dependencies are requested
    const includeDeps = req.query.includeDeps === 'true';

    const issues = includeDeps
      ? await bd.listIssuesWithDependencies()
      : await bd.listIssues();

    res.json(issues);
  } catch (error: unknown) {
    console.error('Error fetching issues:', error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: 'Failed to fetch issues' });
  }
});

// GET /api/issues/:id - Get single issue
app.get('/api/issues/:id', async (req, res) => {
  try {
    const issue = await bd.getIssue(req.params.id);
    res.json(issue);
  } catch (error: unknown) {
    console.error('Error fetching issue:', error instanceof Error ? error.message : String(error));
    res.status(404).json({ error: 'Issue not found' });
  }
});

// POST /api/issues - Create new issue
app.post('/api/issues', async (req, res) => {
  try {
    const issue = await bd.createIssue({
      title: req.body.title,
      description: req.body.description,
      design: req.body.design,
      acceptance: req.body.acceptance_criteria,
      priority: req.body.priority ?? 3,
      type: req.body.issue_type || 'task',
      assignee: req.body.assignee,
      labels: req.body.labels,
      externalRef: req.body.external_ref,
      deps: req.body.dependencies,
    });

    // Broadcast to all clients
    broadcast({ type: 'issue:created', data: issue });

    res.status(201).json(issue);
  } catch (error: unknown) {
    console.error('Error creating issue:', error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: 'Failed to create issue' });
  }
});

// PATCH /api/issues/:id - Update issue
app.patch('/api/issues/:id', async (req, res) => {
  try {
    const issue = await bd.updateIssue({
      id: req.params.id,
      title: req.body.title,
      status: req.body.status,
      priority: req.body.priority,
      assignee: req.body.assignee,
      design: req.body.design,
      acceptanceCriteria: req.body.acceptance_criteria,
      externalRef: req.body.external_ref,
      notes: req.body.notes,
    });

    // Broadcast to all clients
    broadcast({ type: 'issue:updated', data: issue });

    res.json(issue);
  } catch (error: unknown) {
    console.error('Error updating issue:', error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: 'Failed to update issue' });
  }
});

// DELETE /api/issues/:id - Close issue (changed from delete to match CLI behavior)
app.delete('/api/issues/:id', async (req, res) => {
  try {
    const issue = await bd.closeIssue(req.params.id);

    // Broadcast to all clients
    broadcast({ type: 'issue:updated', data: issue });

    res.json(issue);
  } catch (error: unknown) {
    console.error('Error closing issue:', error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: 'Failed to close issue' });
  }
});

// GET /api/ready - Get ready work (issues with no open blockers)
app.get('/api/ready', async (req, res) => {
  try {
    const issues = await bd.getReadyIssues();
    res.json(issues);
  } catch (error: unknown) {
    console.error('Error fetching ready issues:', error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: 'Failed to fetch ready issues' });
  }
});

// GET /api/blocked - Get blocked issues
app.get('/api/blocked', async (req, res) => {
  try {
    const issues = await bd.getBlockedIssues();
    res.json(issues);
  } catch (error: unknown) {
    console.error('Error fetching blocked issues:', error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: 'Failed to fetch blocked issues' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`🔌 WebSocket server running on ws://localhost:${PORT}`);

  // Start file watcher after server is up
  startFileWatcher();
});
