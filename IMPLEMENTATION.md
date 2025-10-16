# Beads Viewer - Technical Implementation Guide

## Overview

This document describes the technical implementation of Beads Viewer, a full-featured web application for the Beads issue tracker with real-time collaboration capabilities.

**Version:** Compatible with Beads CLI v0.9.6

## Architecture

### System Components

```
┌─────────────────┐      HTTP/WS       ┌─────────────────┐      JSONL      ┌──────────────┐
│                 │ ◄──────────────────►│                 │ ◄───────────────►│              │
│  React Frontend │                     │  Express Server │                  │  SQLite DB   │
│                 │                     │   + WebSocket   │                  │  + JSONL     │
└─────────────────┘                     └─────────────────┘                  └──────────────┘
        │                                        │
        │                                        │
        └────────► Zustand Store ◄──────────────┘
                  (Optimistic Updates)
```

## 1. HTTP API Server

**Location**: `server/index.ts`

### Features

- **Express HTTP Server** on port 3001
- **WebSocket Server** for real-time updates
- **SQLite Database** integration (`better-sqlite3`)
- **JSONL Sync** for data persistence
- **CORS enabled** for local development

### API Endpoints

#### Health Check
```http
GET /api/health
```

#### List All Issues
```http
GET /api/issues
Response: Issue[]
```

#### Get Single Issue
```http
GET /api/issues/:id
Response: Issue
```

#### Create Issue
```http
POST /api/issues
Body: Partial<Issue>
Response: Issue
```

#### Update Issue
```http
PATCH /api/issues/:id
Body: Partial<Issue>
Response: Issue
```

#### Delete Issue
```http
DELETE /api/issues/:id
Response: 204 No Content
```

### Data Flow

1. **Client Request** → Express Route Handler
2. **Database Update** → SQLite transaction
3. **JSONL Sync** → Write to `.beads/issues.jsonl`
4. **WebSocket Broadcast** → Notify all connected clients
5. **Client Update** → Zustand store updates React components

## 2. State Management

**Location**: `src/store/useIssueStore.ts`

### Zustand Store Structure

```typescript
interface IssueStore {
  issues: Issue[]
  filters: IssueFilter
  isLoading: boolean
  error: string | null
  ws: WebSocket | null

  // Read operations
  fetchIssues: () => Promise<void>

  // Write operations
  createIssue: (issue: Partial<Issue>) => Promise<Issue>
  updateIssue: (id: string, updates: Partial<Issue>) => Promise<Issue>
  deleteIssue: (id: string) => Promise<void>
  updateStatus: (id: string, status: Status) => Promise<Issue>

  // WebSocket
  connectWebSocket: () => void
  disconnectWebSocket: () => void
}
```

### Optimistic Updates

The store implements optimistic UI updates with rollback on failure:

```typescript
// 1. Optimistically update local state
const prevIssues = get().issues
set(state => ({
  issues: state.issues.map(issue =>
    issue.id === id ? { ...issue, ...updates } : issue
  )
}))

// 2. Send update to server
try {
  const response = await fetch(`${API_BASE_URL}/issues/${id}`, ...)
  const updatedIssue = await response.json()

  // 3. Confirm with server response
  set(state => ({
    issues: state.issues.map(issue =>
      issue.id === id ? updatedIssue : issue
    )
  }))
} catch (error) {
  // 4. Rollback on failure
  set({ issues: prevIssues })
  throw error
}
```

## 3. Real-time Updates (WebSocket)

### Connection Management

**Setup**: `src/App.tsx`

```typescript
useEffect(() => {
  connectWebSocket()
  return () => disconnectWebSocket()
}, [])
```

### Event Types

1. **issue:created** - New issue added
2. **issue:updated** - Issue modified
3. **issue:deleted** - Issue removed

### Auto-reconnect

The WebSocket client automatically reconnects after 5 seconds if disconnected:

```typescript
ws.onclose = () => {
  setTimeout(() => {
    if (get().ws === ws) {
      get().connectWebSocket()
    }
  }, 5000)
}
```

## 4. UI Components

### Create Issue Modal

**Location**: `src/components/issues/CreateIssueModal.tsx`

**Features**:
- Full issue creation form
- Validation (title required)
- All metadata fields (priority, type, assignee, etc.)
- Error handling
- Form reset on success

**Trigger**: "New Issue" button in header

### Edit Issue Modal

**Location**: `src/components/issues/IssueDetailModal.tsx`

**Features**:
- Toggle edit mode with Edit button
- Inline editing of all fields
- Save/Cancel actions
- Optimistic updates
- Error display

**Edit Mode Fields**:
- Title (text input)
- Status (dropdown)
- Priority (dropdown: P0-P4)
- Type (dropdown: bug, feature, task, epic, chore)
- Assignee (text input)
- Estimated minutes (number input)
- Description (textarea)
- Design notes (textarea)
- Acceptance criteria (textarea)
- Notes (textarea)

### Kanban Board Drag-and-Drop

**Location**: `src/components/boards/KanbanBoard.tsx`

**Implementation**:
- Uses `@dnd-kit` for drag-and-drop
- Draggable issue cards
- Droppable status columns
- Visual feedback on hover
- Calls `updateStatus()` on drop

```typescript
const handleDragEnd = async (event: DragEndEvent) => {
  const { active, over } = event
  if (!over) return

  const issueId = active.id as string
  const newStatus = over.id as Status

  await updateStatus(issueId, newStatus)
}
```

## 5. Testing

### Test Suite

**Location**: `server/index.test.ts`

**Coverage**:
- ✅ 28 tests passing
- Issue CRUD operations
- Data validation
- WebSocket events
- Error handling
- JSONL persistence
- Database operations

### Running Tests

```bash
# Run tests once
bun test:run

# Watch mode
bun test

# With UI
bun test:ui
```

## 6. Development Workflow

### Starting the Full Stack

```bash
# Start both frontend and backend
bun dev:full

# Or start separately:
bun server    # Backend on :3001
bun dev       # Frontend on :5173
```

### Environment Variables

Create `.env` file:

```env
VITE_API_URL=http://localhost:3001/api
PORT=3001
```

### Project Structure

```
beadstart/
├── server/
│   ├── index.ts           # Express + WebSocket server
│   └── index.test.ts      # API tests
├── src/
│   ├── components/
│   │   ├── issues/
│   │   │   ├── CreateIssueModal.tsx
│   │   │   ├── IssueDetailModal.tsx (with edit mode)
│   │   │   ├── IssueList.tsx
│   │   │   └── ReadyWorkView.tsx
│   │   ├── boards/
│   │   │   └── KanbanBoard.tsx (drag-and-drop enabled)
│   │   ├── graphs/
│   │   │   └── DependencyGraph.tsx
│   │   └── layout/
│   │       ├── Header.tsx (with New Issue button)
│   │       └── ViewSwitcher.tsx
│   ├── store/
│   │   └── useIssueStore.ts  # Zustand store with mutations
│   ├── types/
│   │   └── issue.ts
│   ├── lib/
│   │   ├── jsonl.ts
│   │   └── utils.ts
│   ├── test/
│   │   └── setup.ts
│   └── App.tsx               # WebSocket connection
├── .beads/
│   ├── issues.jsonl          # Data file
│   └── test.db               # SQLite database
├── vitest.config.ts
├── package.json
└── IMPLEMENTATION.md (this file)
```

## 7. Data Model

### Issue Type

```typescript
interface Issue {
  id: string
  title: string
  description?: string
  design?: string
  acceptance_criteria?: string
  notes?: string
  status: 'open' | 'in_progress' | 'blocked' | 'closed'
  priority: 0 | 1 | 2 | 3 | 4  // 0 = highest, 4 = lowest
  issue_type: 'bug' | 'feature' | 'task' | 'epic' | 'chore'
  assignee?: string
  estimated_minutes?: number
  created_at: string  // ISO 8601
  updated_at: string  // ISO 8601
  closed_at?: string  // ISO 8601
  external_ref?: string
  dependencies?: Dependency[]
  labels?: string[]
}

interface Dependency {
  issue_id: string
  depends_on_id: string
  type: 'blocks' | 'related' | 'parent-child' | 'discovered-from'
  created_at: string
  created_by: string
}
```

## 8. Key Features Implemented

### ✅ HTTP API
- RESTful endpoints for all CRUD operations
- Express server with CORS support
- Error handling and validation

### ✅ Mutations
- Create new issues
- Update existing issues
- Delete issues
- Update status (including drag-and-drop)

### ✅ Real-time Updates
- WebSocket server integration
- Event broadcasting to all clients
- Automatic reconnection
- Live UI updates

### ✅ User Interface
- Create Issue modal with full form
- Edit mode in Issue Detail modal
- Drag-and-drop status updates on Kanban board
- Optimistic UI updates
- Error handling and display

### ✅ Data Persistence
- SQLite database storage
- JSONL file sync
- Bi-directional sync (DB ↔ JSONL)

### ✅ Testing
- Comprehensive test suite
- 28 tests covering all major features
- Vitest + Testing Library setup

## 9. Future Enhancements

Potential improvements for future iterations:

1. **Authentication & Authorization**
   - User login system
   - Role-based access control
   - Issue ownership

2. **Enhanced Collaboration**
   - Real-time cursors
   - Presence indicators
   - Collaborative editing

3. **Dependencies Management**
   - Add/remove dependencies in UI
   - Dependency graph editing
   - Blocking issue warnings

4. **Advanced Features**
   - File attachments
   - Comments/discussions
   - Activity timeline
   - Notifications

5. **Performance**
   - Pagination for large datasets
   - Virtual scrolling in lists
   - Caching strategies

6. **Integration**
   - GitHub integration
   - Linear sync
   - Email notifications
   - Webhook support

## 10. Deployment Considerations

### Production Checklist

- [ ] Set up environment variables
- [ ] Configure CORS for production domain
- [ ] Set up database backups
- [ ] Configure WebSocket timeouts
- [ ] Add rate limiting
- [ ] Implement authentication
- [ ] Set up logging
- [ ] Configure error tracking
- [ ] Add health check monitoring
- [ ] Set up CI/CD pipeline

### Recommended Stack

- **Frontend**: Vercel or Netlify
- **Backend**: Railway, Render, or Fly.io
- **Database**: PostgreSQL (production) / SQLite (development)
- **File Storage**: S3 or Cloudflare R2 (for attachments)

## 11. Troubleshooting

### WebSocket Connection Fails

Check that:
- Backend server is running on port 3001
- CORS is configured correctly
- No proxy/firewall blocking WebSocket connections

### Database Lock Errors

SQLite can lock during concurrent writes:
- Use write-ahead logging (WAL mode)
- Implement queue for write operations
- Consider PostgreSQL for production

### JSONL Sync Issues

If JSONL and database get out of sync:
- Run manual sync: `bd export > .beads/issues.jsonl`
- Or delete JSONL and regenerate from DB

## Summary

This implementation transforms the Beads Viewer from a read-only viewer into a fully functional project management tool with:

- Complete CRUD operations via HTTP API
- Real-time collaboration via WebSockets
- Optimistic UI updates for instant feedback
- Drag-and-drop interface for status updates
- Comprehensive test coverage
- Production-ready architecture

The system is designed to be extensible, testable, and maintainable, with clear separation of concerns and modern web development best practices.
