# Contributing to Beads Viewer

Thank you for your interest in contributing to Beads Viewer! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Reporting Issues](#reporting-issues)

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for all contributors.

## Getting Started

### Prerequisites

Before you begin, ensure you have:

1. **Bun** installed - `curl -fsSL https://bun.sh/install | bash`
2. **Beads CLI** installed - Follow [installation guide](https://github.com/steveyegge/beads#installation)
3. **Git** for version control
4. A code editor (VS Code recommended)

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork:
   ```bash
   git clone https://github.com/yourusername/beads-viewer.git
   cd beads-viewer
   ```
3. Add upstream remote:
   ```bash
   git remote add upstream https://github.com/mgalpert/beads-viewer.git
   ```
4. Install dependencies:
   ```bash
   bun install
   ```

### Initial Setup

```bash
# Create a test Beads project
mkdir test-project
cd test-project
bd init

# Go back to beads-viewer directory
cd ../beads-viewer

# Start the development servers
bun dev:full
```

Open http://localhost:5173 to verify everything works.

## Development Workflow

### Creating a Branch

Always create a new branch for your work:

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

Branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Test additions or modifications
- `chore/` - Maintenance tasks

### Development Commands

```bash
# Start both frontend and backend
bun dev:full

# Or run separately (in different terminals)
bun run server      # Backend on :3001
bun run dev         # Frontend on :5173

# Run tests in watch mode
bun test

# Run tests once
bun test:run

# Type check
bun run build

# Lint code
bun run lint
```

### Making Changes

1. Make your changes in your feature branch
2. Write or update tests as needed
3. Ensure all tests pass: `bun test:run`
4. Ensure the build succeeds: `bun run build`
5. Test manually in the browser
6. Commit your changes (see commit message guidelines below)

## Coding Standards

### TypeScript

- **Use strict mode** - TypeScript strict mode is enabled
- **Type everything** - Avoid `any` types when possible
- **Use interfaces** for object shapes
- **Export types** from `src/types/` directory

Example:
```typescript
// Good
interface IssueCardProps {
  issue: Issue
  onClick: (id: string) => void
}

// Avoid
function IssueCard(props: any) { ... }
```

### React Components

- **Functional components** - Use function components with hooks
- **Named exports** - Prefer named exports over default exports
- **Props destructuring** - Destructure props in function parameters
- **Custom hooks** - Extract reusable logic into custom hooks

Example:
```typescript
export function IssueCard({ issue, onClick }: IssueCardProps) {
  // Component logic
}
```

### Styling

- **Tailwind CSS** - Use utility classes exclusively
- **No custom CSS** - Avoid creating CSS files or styled-components
- **Consistent spacing** - Use Tailwind's spacing scale (p-4, m-2, gap-4)
- **Responsive design** - Use responsive prefixes (sm:, md:, lg:)

Example:
```tsx
<div className="flex flex-col gap-4 p-6 bg-white rounded-lg shadow-md">
  <h2 className="text-xl font-semibold text-gray-900">
    {issue.title}
  </h2>
</div>
```

### State Management

- **Zustand store** - Use the central store (`useIssueStore`) for global state
- **Optimistic updates** - Follow the established optimistic update pattern
- **Local state** - Use `useState` for component-local state only

Example:
```typescript
const { issues, updateIssue } = useIssueStore()

const handleUpdate = async (id: string, updates: Partial<Issue>) => {
  try {
    await updateIssue(id, updates)  // Optimistic update + rollback built-in
  } catch (error) {
    console.error('Failed to update issue:', error)
  }
}
```

### Imports

- **Use path aliases** - Use `@/` prefix for imports
- **Organize imports** - Group by external, internal, types
- **No unused imports** - Remove unused imports

Example:
```typescript
// External dependencies
import { useState, useEffect } from 'react'
import { PlusIcon } from 'lucide-react'

// Internal modules
import { useIssueStore } from '@/store/useIssueStore'
import { Issue } from '@/types/issue'
import { cn } from '@/lib/utils'
```

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `test:` - Test additions or changes
- `chore:` - Maintenance tasks
- `style:` - Code style changes (formatting)

**Examples:**
```
feat(kanban): add drag-and-drop support

Implemented drag-and-drop functionality using @dnd-kit library.
Cards can now be dragged between status columns.

Closes #42
```

```
fix(api): handle connection timeout in CLI wrapper

Added timeout handling to prevent hanging requests when bd CLI is unresponsive.

Fixes #87
```

## Testing

### Writing Tests

- **Test new features** - Add tests for all new functionality
- **Test edge cases** - Cover error conditions and edge cases
- **Use Testing Library** - Follow Testing Library best practices
- **Mock external dependencies** - Mock API calls and CLI commands

Example test:
```typescript
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { IssueCard } from './IssueCard'

describe('IssueCard', () => {
  it('should render issue title', () => {
    const issue: Issue = { id: '1', title: 'Test Issue', ... }
    render(<IssueCard issue={issue} />)
    expect(screen.getByText('Test Issue')).toBeInTheDocument()
  })

  it('should call onClick when clicked', () => {
    const onClick = vi.fn()
    const issue: Issue = { id: '1', title: 'Test', ... }
    render(<IssueCard issue={issue} onClick={onClick} />)
    fireEvent.click(screen.getByText('Test'))
    expect(onClick).toHaveBeenCalledWith('1')
  })
})
```

### Running Tests

```bash
# Watch mode (for development)
bun test

# Single run (for CI)
bun test:run

# With UI
bun test:ui

# Coverage (if configured)
bun test:coverage
```

### Test Locations

- **Unit tests** - Co-located with components (`ComponentName.test.tsx`)
- **Integration tests** - In `server/` directory for API tests
- **Setup** - Test configuration in `src/test/setup.ts`

## Pull Request Process

### Before Submitting

1. **Update documentation** - Update README, CLAUDE.md if needed
2. **Run all tests** - `bun test:run` must pass
3. **Run build** - `bun run build` must succeed
4. **Test manually** - Verify in browser
5. **Update changelog** - Add entry to CHANGELOG.md (if exists)

### Submitting a PR

1. **Push to your fork:**
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create Pull Request** on GitHub

3. **Fill out PR template** with:
   - **Description** - What does this PR do?
   - **Motivation** - Why is this change needed?
   - **Testing** - How was this tested?
   - **Screenshots** - If UI changes, include screenshots
   - **Related Issues** - Link to issues this PR addresses

4. **PR Title** - Use conventional commit format:
   ```
   feat: add bulk issue operations
   fix: resolve websocket reconnection bug
   docs: update API documentation
   ```

### PR Review Process

- Maintainers will review your PR
- Address feedback and requested changes
- Keep your branch up to date with main:
  ```bash
  git fetch upstream
  git rebase upstream/main
  git push --force-with-lease origin feature/your-feature-name
  ```
- Once approved, a maintainer will merge your PR

### After Merge

- Delete your branch:
  ```bash
  git branch -d feature/your-feature-name
  git push origin --delete feature/your-feature-name
  ```
- Update your fork:
  ```bash
  git checkout main
  git pull upstream main
  git push origin main
  ```

## Reporting Issues

### Bug Reports

Include:
- **Description** - Clear description of the bug
- **Steps to reproduce** - Numbered steps to reproduce
- **Expected behavior** - What should happen
- **Actual behavior** - What actually happens
- **Environment** - OS, Bun version, Beads CLI version
- **Screenshots** - If applicable
- **Error messages** - Full error messages and stack traces

### Feature Requests

Include:
- **Problem** - What problem does this solve?
- **Proposed solution** - How should it work?
- **Alternatives** - What alternatives have you considered?
- **Examples** - Examples from other tools (if applicable)

### Questions

For questions:
- Check existing documentation first
- Search existing issues
- Use GitHub Discussions for general questions
- Use Issues for specific bugs or features

## Additional Guidelines

### File Organization

```
src/
├── components/        # React components
│   ├── boards/       # Kanban board components
│   ├── graphs/       # Dependency graph components
│   ├── issues/       # Issue-related components
│   └── layout/       # Layout components
├── store/            # Zustand store
├── types/            # TypeScript types
├── lib/              # Utility functions
├── constants/        # Constants
└── test/             # Test setup

server/
├── index.ts          # Express server
└── utils/            # Server utilities
```

### Component Structure

```typescript
// 1. Imports
import { useState } from 'react'
import { Issue } from '@/types/issue'

// 2. Types/Interfaces
interface IssueCardProps {
  issue: Issue
  onClick: (id: string) => void
}

// 3. Component
export function IssueCard({ issue, onClick }: IssueCardProps) {
  // 3a. Hooks
  const [isHovered, setIsHovered] = useState(false)

  // 3b. Event handlers
  const handleClick = () => onClick(issue.id)

  // 3c. Render
  return (
    <div onClick={handleClick}>
      {issue.title}
    </div>
  )
}
```

### Performance Considerations

- **Optimize re-renders** - Use `memo`, `useMemo`, `useCallback` appropriately
- **Lazy loading** - Consider lazy loading for large components
- **Virtual scrolling** - Use for long lists (TanStack Virtual)
- **Debounce** - Debounce search inputs and frequent updates

### Accessibility

- **Semantic HTML** - Use appropriate HTML elements
- **ARIA labels** - Add ARIA labels for screen readers
- **Keyboard navigation** - Ensure keyboard accessibility
- **Color contrast** - Follow WCAG guidelines

## Resources

- [Beads CLI Documentation](https://github.com/steveyegge/beads)
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)

## Questions?

If you have questions about contributing:

1. Check the [README](./README.md) and [CLAUDE.md](./CLAUDE.md)
2. Search [existing issues](https://github.com/mgalpert/beads-viewer/issues)
3. Open a new [discussion](https://github.com/mgalpert/beads-viewer/discussions)
4. Ask in the [main Beads project](https://github.com/steveyegge/beads)

Thank you for contributing to Beads Viewer!
