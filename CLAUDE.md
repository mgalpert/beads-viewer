# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Beads Viewer** is a standalone web application that provides a modern React-based interface for the [Beads](https://github.com/steveyegge/beads) dependency-aware issue tracker CLI. It's designed to work alongside the Beads CLI by shelling out to `bd` commands for all data operations.

**Version Compatibility**: Built and tested with Beads CLI v0.9.6. If working with a newer version of Beads, verify compatibility and update integration code as needed.

**Key Principle**: This is a companion tool to the Beads CLI, not a replacement. Both can be used simultaneously and they stay in sync through the shared `.beads/` directory.

## Development Commands

### Running the Application

```bash
# Frontend + Backend together (recommended)
bun dev:full

# Frontend only (port 5173)
bun run dev

# Backend server only (port 3001)
bun run server
```

### Testing

```bash
# Run tests in watch mode
bun test

# Run tests once (CI mode)
bun test:run

# Run tests with UI
bun test:ui
```

### Build and Lint

```bash
# Type check and build
bun run build

# Lint code
bun run lint
```

## Architecture

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **State Management**: Zustand (with optimistic updates)
- **Backend**: Express + WebSocket (port 3001)
- **Data Operations**: Shells out to `bd` CLI commands
- **Testing**: Vitest + Testing Library

### System Architecture

```
React Frontend (:5173) <--HTTP/WS--> Express Server (:3001) <--shell exec--> `bd` CLI <--> SQLite + JSONL
       |                                    |                                        |
       └─── Zustand Store ─────────────────┘                                  .beads/ files
            (Optimistic Updates)
```

**Critical Design Decision**: The server does NOT directly manipulate `.beads/` files. Instead, it shells out to the `bd` CLI for all operations. This ensures:
- Full compatibility with the Go Beads CLI
- Access to SQLite cache for fast queries (<100ms)
- Proper dependency resolution and "ready work" detection
- Safe concurrent usage of both web UI and CLI

### Key Components

**State Management** (`src/store/useIssueStore.ts`):
- Central Zustand store with optimistic updates
- Implements rollback on server failures
- WebSocket integration for real-time sync

**Backend Server** (`server/index.ts`):
- RESTful API endpoints for CRUD operations
- WebSocket server for real-time broadcasts
- CLI wrapper (`server/utils/bd-cli.ts`) that shells out to `bd` commands
- File watcher for external CLI changes to broadcast refreshes
- Broadcasts changes to all connected clients

**Frontend Views**:
- `IssueList.tsx` - Sortable table view (TanStack Table)
- `KanbanBoard.tsx` - Drag-and-drop board (@dnd-kit)
- `DependencyGraph.tsx` - Interactive graph (React Flow)
- `ReadyWorkView.tsx` - Filtered unblocked issues

**IssueSidePanel** (`src/components/issues/IssueSidePanel.tsx`):
- Unified create/view/edit interface (right-side sliding panel)
- Three modes:
  - **Create**: Blank form, required title field, defaults for other fields
  - **View**: Read-only display with all issue details, edit button to switch to edit mode
  - **Edit**: Inline editing with auto-save on close (Escape key)
- Sections:
  - **Metadata Grid**: Priority, Type, Assignee, Estimated Time
  - **Content**: Description, Design Notes, Acceptance Criteria, Notes
  - **Dependencies**: Add/remove blocking dependencies, choose type (blocks/related/parent-child/discovered-from)
  - **Dependents**: Read-only list of issues that depend on this one
  - **Timestamps**: Created, Updated, Closed dates at bottom
- Features:
  - Auto-save on close when in edit mode
  - Escape key handler for quick close
  - Click dependency chips to navigate to that issue
  - Responsive layout (600-700px wide)

### Data Flow

1. **Optimistic Updates**: UI updates immediately before server confirmation
2. **Server Sync**: HTTP request to Express server
3. **CLI Execution**: Server shells out to `bd` CLI commands (create, update, close, etc.)
4. **SQLite + JSONL Persistence**: `bd` CLI handles both SQLite cache and JSONL sync
5. **WebSocket Broadcast**: All clients receive real-time updates
6. **Rollback**: If server fails, UI reverts to previous state
7. **External Changes**: File watcher detects external `bd` CLI usage and triggers refresh

### API Endpoints

All endpoints shell out to the `bd` CLI. The server never directly manipulates JSONL or database files.

- `GET /api/health` - Health check (simple OK response)
- `GET /api/issues` - List all issues (via `bd list --json`)
- `GET /api/issues?includeDeps=true` - List with full dependency details (calls `bd show` for each)
- `GET /api/issues/:id` - Get single issue (via `bd show :id --json`)
- `POST /api/issues` - Create issue (via `bd create "title" --priority N --type X --json`)
  - Accepts: title, description, design, acceptance_criteria, notes, priority, issue_type, assignee, estimated_minutes, labels, dependencies
  - Returns: Created issue with generated ID
- `PATCH /api/issues/:id` - Update issue (via `bd update :id --field value --json`)
  - Accepts: All issue fields (partial update)
  - Returns: Updated issue
- `DELETE /api/issues/:id` - Close issue (via `bd close :id --json`)
  - Note: This closes the issue, doesn't delete it
  - Returns: Closed issue with closed_at timestamp
- `GET /api/ready` - Get ready work (via `bd ready --json`)
  - Returns: Issues that are open and have no open blockers
- `GET /api/blocked` - Get blocked issues (via `bd blocked --json`)
  - Returns: Issues that are blocked by open dependencies

### WebSocket Events

The server broadcasts these events to all connected clients:

- `issue:created` - New issue added
  - Payload: The full Issue object
  - Triggered: After successful POST /api/issues
- `issue:updated` - Issue modified
  - Payload: The full updated Issue object
  - Triggered: After successful PATCH /api/issues/:id
- `issue:deleted` - Issue removed (legacy event, not currently used with CLI integration)
- `issues:refresh` - External CLI change detected, clients should refetch
  - Payload: None
  - Triggered: When .beads/issues.jsonl file changes (detected by fs.watch)
  - Client behavior: Calls fetchIssues() to reload all issues

**WebSocket Connection**:
- Auto-connect on app mount (App.tsx)
- Auto-reconnect after 5 seconds if connection drops
- Graceful handling of connection failures (app continues to work via HTTP polling)

## Important Patterns

### Optimistic Updates

All mutations (create, update, delete) follow this pattern:
1. Update local Zustand store immediately
2. Send HTTP request to server
3. On success: confirm with server response
4. On failure: rollback to previous state

### Path Aliasing

Use `@/` prefix for imports:
```typescript
import { Issue } from '@/types/issue'
import { useIssueStore } from '@/store/useIssueStore'
```

### Issue Type Structure

```typescript
interface Issue {
  id: string                           // e.g., "test-3" or "BD-1234567890"
  title: string                        // Required
  status: 'open' | 'in_progress' | 'blocked' | 'closed'
  priority: 0 | 1 | 2 | 3 | 4          // 0 = P0 (highest), 4 = P4 (lowest)
  issue_type: 'bug' | 'feature' | 'task' | 'epic' | 'chore'
  description?: string                 // Long-form details (markdown)
  design?: string                      // Design notes (markdown)
  acceptance_criteria?: string         // Definition of done (markdown)
  notes?: string                       // Additional notes (markdown)
  assignee?: string                    // Person assigned to this issue
  estimated_minutes?: number           // Estimated effort in minutes
  labels?: string[]                    // Tags/categories
  external_ref?: string                // e.g., "gh-123" (GitHub issue reference)
  created_at: string                   // ISO 8601 timestamp
  updated_at: string                   // ISO 8601 timestamp
  closed_at?: string                   // ISO 8601 timestamp (only if closed)
  dependencies?: Dependency[]          // Issues this one depends on (blocking relationships)
  dependents?: Issue[]                 // Issues that depend on this one (computed, not stored)
}

interface Dependency {
  issue_id: string                     // The issue with the dependency
  depends_on_id: string                // The issue it depends on
  type: 'blocks' | 'related' | 'parent-child' | 'discovered-from'
  created_at: string                   // ISO 8601 timestamp
  created_by: string                   // Who created the dependency
}

type Status = 'open' | 'in_progress' | 'blocked' | 'closed'
type IssueType = 'bug' | 'feature' | 'task' | 'epic' | 'chore'

interface IssueFilter {
  status?: Status[]
  priority?: number[]
  issue_type?: IssueType[]
  assignee?: string[]
  search?: string                      // Search in title/description
}
```

### Constants

Location: `src/constants/index.ts`

```typescript
// Status labels and colors
STATUS_LABELS = { open: 'Open', in_progress: 'In Progress', blocked: 'Blocked', closed: 'Closed' }
STATUS_COLORS = { open: 'bg-blue-100', in_progress: 'bg-yellow-100', blocked: 'bg-red-100', closed: 'bg-green-100' }
STATUS_BADGE_COLORS = { open: '#3b82f6', in_progress: '#eab308', blocked: '#ef4444', closed: '#22c55e' }

// Priority labels
PRIORITIES = [0, 1, 2, 3, 4]
PRIORITY_LABELS = {
  0: 'P0 - Highest',
  1: 'P1 - High',
  2: 'P2 - Medium-High',
  3: 'P3 - Medium',
  4: 'P4 - Low'
}

// Issue types
ISSUE_TYPES = ['bug', 'feature', 'task', 'epic', 'chore']
ISSUE_TYPE_LABELS = { bug: 'Bug', feature: 'Feature', task: 'Task', epic: 'Epic', chore: 'Chore' }

// API configuration
API_BASE_URL = 'http://localhost:3001/api' // or process.env.VITE_API_URL
WS_RECONNECT_DELAY = 5000 // 5 seconds
```

## Testing

**Framework**: Vitest with Testing Library

**Test Files**:
- `server/bd-cli.test.ts` - CLI integration tests (5 comprehensive tests)
  - Tests the bd-cli.ts wrapper functions
  - Covers: listIssues, getIssue, createIssue, updateIssue, closeIssue, getReadyIssues, getBlockedIssues
  - Full issue lifecycle: create → update status & priority → close → verify closed
- `server/index.test.ts` - Server API tests (legacy, may need updates for current CLI integration)
- `src/components/issues/IssueSidePanel.test.tsx` - Component tests
  - Tests create/view/edit modes
  - Tests form interactions
  - Tests dependency management
- `src/components/issues/IssueSidePanel.autosave.test.tsx` - Auto-save behavior tests
  - Tests auto-save on close
  - Tests Escape key handler

**Running Tests**:
```bash
bun test              # Watch mode
bun test:run          # Single run (CI mode)
bun test:ui           # Interactive UI dashboard
```

**Test Configuration** (`vitest.config.ts`):
- Environment: jsdom (for DOM simulation)
- Globals: true (no need to import describe/it/expect)
- Setup file: `src/test/setup.ts`
- Coverage: Available via `bun test:coverage` (if configured)

## Important Files

### Data & Backend
- `.beads/issues.jsonl` - Primary data file (JSONL format, one issue per line, human-readable)
- `.beads/*.db` - SQLite cache (gitignored, managed by `bd` CLI for fast queries)
- `server/index.ts` - Express + WebSocket server (port 3001)
- `server/utils/bd-cli.ts` - CLI wrapper that shells out to `bd` commands (all data operations)
- `server/bd-cli.test.ts` - CLI integration tests

### Frontend Core
- `src/App.tsx` - Main app component, WebSocket connection setup, view routing
- `src/main.tsx` - Entry point, React root render
- `src/store/useIssueStore.ts` - Central Zustand store (optimistic updates, WebSocket integration)
- `src/types/issue.ts` - TypeScript type definitions (Issue, Dependency, Status, IssueType)
- `src/constants/index.ts` - Constants (STATUS_COLORS, PRIORITY_LABELS, ISSUE_TYPE_LABELS, etc.)

### Components
- `src/components/layout/Header.tsx` - Top navigation with "New Issue" button
- `src/components/layout/ViewSwitcher.tsx` - View tabs (List/Board/Graph/Ready)
- `src/components/issues/IssueSidePanel.tsx` - Main create/view/edit interface (most complex component)
- `src/components/issues/IssueList.tsx` - TanStack Table view
- `src/components/boards/KanbanBoard.tsx` - Drag-and-drop Kanban
- `src/components/graphs/DependencyGraph.tsx` - React Flow visualization
- `src/components/issues/ReadyWorkView.tsx` - Ready work queue

### Utilities
- `src/lib/jsonl.ts` - JSONL parsing, ready/blocked logic
- `src/lib/utils.ts` - Helper functions (cn, date formatting, etc.)

### Configuration
- `package.json` - Dependencies and scripts
- `vite.config.ts` - Vite configuration (path alias, dev server)
- `vitest.config.ts` - Test configuration
- `tsconfig.json` - TypeScript configuration (strict mode, path alias)
- `tailwind.config.js` - Tailwind CSS configuration
- `postcss.config.js` - PostCSS configuration

## Development Notes

### Key Architectural Decisions

- **CLI Integration**: Server shells out to `bd` CLI for all data operations (never directly manipulates files)
  - Why: Full compatibility with Go Beads CLI, access to SQLite cache, proper dependency resolution
  - All mutations go through `bd create`, `bd update`, `bd close` commands
- **SQLite Cache**: `bd` CLI maintains a SQLite cache for fast queries (<100ms)
  - The cache is automatically updated by the CLI
  - Web UI benefits from fast reads without implementing complex caching logic
- **Concurrent Safe**: Both web UI and CLI can be used simultaneously
  - File watcher detects external changes and broadcasts refresh events
  - Optimistic updates ensure smooth UX even during high latency
- **Real-time Sync**: WebSocket auto-reconnects after 5 seconds if disconnected
  - Graceful degradation: app continues to work via HTTP even if WebSocket fails
- **Bun Runtime**: Project uses Bun, not npm/yarn
  - Install packages: `bun add package-name`
  - Run scripts: `bun run script-name` or `bun script-name`
- **Port Configuration**: Frontend on :5173, Backend on :3001
- **External Changes**: File watcher detects external CLI usage (best-effort, may miss rapid changes)

### Component Interaction Patterns

**Opening IssueSidePanel**:
- From IssueList: Click row → opens in **view mode** (read-only)
- From KanbanBoard: Click card → opens in **edit mode** (editable)
- From Header "New Issue": Opens in **create mode** (blank form)
- From DependencyGraph: Click node → opens in **view mode**
- From dependency chip: Click → navigates to that issue in **view mode**

**Mode Transitions**:
- View mode → Edit mode: Click edit icon (pencil)
- Edit mode → View mode: Auto-save on close (Escape key or X button)
- Create mode: Only exits on "Create Issue" or cancel (X button)

**Keyboard Shortcuts**:
- `Escape`: Close IssueSidePanel (auto-saves if in edit mode)
- More shortcuts can be added using the `tinykeys` library

### State Management Patterns

**Zustand Store Actions** (`useIssueStore.ts`):
```typescript
fetchIssues()              // Load from API (or JSONL fallback)
createIssue(data)          // Optimistic create
updateIssue(id, updates)   // Optimistic update
deleteIssue(id)            // Optimistic close (doesn't actually delete)
updateStatus(id, status)   // Quick status change (used by Kanban drag-drop)
setFilters(filters)        // Update active filters
clearFilters()             // Reset all filters
connectWebSocket()         // Establish WebSocket connection
disconnectWebSocket()      // Close WebSocket connection
```

**Optimistic Update Pattern** (used in all mutations):
```typescript
// 1. Save current state for potential rollback
const prevIssues = get().issues

// 2. Optimistically update UI
set({ issues: optimisticallyUpdatedIssues })

// 3. Send HTTP request
const response = await fetch(...)

// 4. On failure, rollback; on success, confirm with server data
if (!response.ok) {
  set({ issues: prevIssues })  // Rollback
} else {
  set({ issues: await response.json() })  // Confirm
}
```

### Dependency Management

**How Dependencies Work**:
- Dependencies are stored in the `dependencies` array on each Issue
- A dependency represents: "This issue depends on another issue"
- Example: Issue A has `{ depends_on_id: "B", type: "blocks" }` → "A is blocked by B"
- The `dependents` field is computed, not stored (shows issues that depend on this one)

**Dependency Types**:
- `blocks`: Hard blocker (issue cannot proceed until blocker is resolved)
- `related`: Soft relationship (related work, but not blocking)
- `parent-child`: Hierarchical relationship (epic → tasks)
- `discovered-from`: Discovered during investigation of another issue

**Ready Work Algorithm** (`src/lib/jsonl.ts`):
```typescript
// An issue is "ready" if:
// 1. Status is 'open'
// 2. Has no dependencies, OR all dependencies are 'closed'
const isReady = issue.status === 'open' &&
  (!issue.dependencies?.length ||
   issue.dependencies.every(dep => dep.status === 'closed'))
```

### Styling Conventions

- **Tailwind CSS**: Use utility classes, avoid custom CSS when possible
- **Color Scheme**: Status colors defined in `src/constants/index.ts`
- **Spacing**: Consistent spacing using Tailwind's spacing scale (p-4, m-2, gap-4, etc.)
- **Dark Mode**: Not yet implemented, but Tailwind is configured for it
- **Responsive**: Most views are responsive (mobile-friendly)
- **Icons**: Use Lucide React icons (`lucide-react` package)

### Error Handling

- **Optimistic Update Failures**: Automatically rollback to previous state
- **API Errors**: Display error messages in UI (not yet fully implemented)
- **WebSocket Disconnection**: Auto-reconnect after 5 seconds
- **CLI Command Failures**: Return error from server, handled by frontend store

### Performance Considerations

- **SQLite Cache**: Fast queries (<100ms) for listing issues
- **Optimistic Updates**: No loading spinners for mutations (instant feedback)
- **WebSocket**: Reduces polling, instant updates across clients
- **React Flow**: Efficient graph rendering, virtualization for large graphs
- **TanStack Table**: Efficient table rendering, virtual scrolling for large datasets (not yet enabled)
- **Lazy Loading**: Not yet implemented, but could be added for large issue lists

### Future Enhancements

Areas identified for potential improvement:
- Advanced filtering and search
- Issue comments and activity history
- Bulk operations (multi-select, batch update)
- More keyboard shortcuts
- Export capabilities (CSV, JSON)
- Time tracking integration
- Custom fields/metadata
- Dark mode
- Notifications
- Email alerts
- API rate limiting
- Authentication/authorization
