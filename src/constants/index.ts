import type { Status, IssueType } from '@/types/issue'

// Issue Status Constants
export const ISSUE_STATUSES: readonly Status[] = ['open', 'in_progress', 'blocked', 'closed'] as const

export const STATUS_LABELS: Record<Status, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  blocked: 'Blocked',
  closed: 'Closed',
}

export const STATUS_COLORS: Record<Status, string> = {
  open: 'bg-blue-100 dark:bg-blue-900',
  in_progress: 'bg-yellow-100 dark:bg-yellow-900',
  blocked: 'bg-red-100 dark:bg-red-900',
  closed: 'bg-green-100 dark:bg-green-900',
}

export const STATUS_BADGE_COLORS: Record<Status, string> = {
  open: '#3b82f6',
  in_progress: '#eab308',
  blocked: '#ef4444',
  closed: '#22c55e',
}

// Issue Type Constants
export const ISSUE_TYPES: readonly IssueType[] = ['bug', 'feature', 'task', 'epic', 'chore'] as const

export const ISSUE_TYPE_LABELS: Record<IssueType, string> = {
  bug: 'Bug',
  feature: 'Feature',
  task: 'Task',
  epic: 'Epic',
  chore: 'Chore',
}

// Priority Constants
export const PRIORITIES = [0, 1, 2, 3, 4] as const
export type Priority = typeof PRIORITIES[number]

export const PRIORITY_LABELS: Record<Priority, string> = {
  0: 'P0 - Highest',
  1: 'P1 - High',
  2: 'P2 - Medium-High',
  3: 'P3 - Medium',
  4: 'P4 - Low',
}

// Dependency Type Constants
export const DEPENDENCY_TYPES = ['blocks', 'related', 'parent-child', 'discovered-from'] as const

// API Constants
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
export const WS_RECONNECT_DELAY = 5000 // milliseconds
