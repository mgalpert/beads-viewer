import { create } from 'zustand'
import type { Issue, IssueFilter, Status } from '@/types/issue'
import { loadIssues } from '@/lib/jsonl'
import { API_BASE_URL, WS_RECONNECT_DELAY } from '@/constants'

interface IssueStore {
  issues: Issue[]
  filters: IssueFilter
  isLoading: boolean
  error: string | null
  ws: WebSocket | null

  // Actions
  fetchIssues: () => Promise<void>
  setFilters: (filters: Partial<IssueFilter>) => void
  clearFilters: () => void

  // Mutations
  createIssue: (issue: Partial<Issue>) => Promise<Issue>
  updateIssue: (id: string, updates: Partial<Issue>) => Promise<Issue>
  deleteIssue: (id: string) => Promise<void>
  updateStatus: (id: string, status: Status) => Promise<Issue>

  // WebSocket
  connectWebSocket: () => void
  disconnectWebSocket: () => void
}

export const useIssueStore = create<IssueStore>((set, get) => ({
  issues: [],
  filters: {},
  isLoading: false,
  error: null,
  ws: null,

  fetchIssues: async () => {
    set({ isLoading: true, error: null })
    try {
      const response = await fetch(`${API_BASE_URL}/issues`)
      if (!response.ok) throw new Error('Failed to fetch issues')
      const issues = await response.json()
      set({ issues, isLoading: false })
    } catch (error) {
      // Fallback to JSONL if API not available
      try {
        const issues = await loadIssues()
        set({ issues, isLoading: false })
      } catch {
        set({
          error: error instanceof Error ? error.message : 'Failed to load issues',
          isLoading: false
        })
      }
    }
  },

  setFilters: (newFilters) => {
    set(state => ({
      filters: { ...state.filters, ...newFilters }
    }))
  },

  clearFilters: () => {
    set({ filters: {} })
  },

  createIssue: async (issueData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/issues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(issueData),
      })

      if (!response.ok) throw new Error('Failed to create issue')
      const newIssue = await response.json()

      // Add the issue immediately (WebSocket will skip duplicate)
      set(state => {
        const exists = state.issues.some(issue => issue.id === newIssue.id)
        if (exists) return state
        return {
          issues: [newIssue, ...state.issues]
        }
      })

      return newIssue
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to create issue' })
      throw error
    }
  },

  updateIssue: async (id, updates) => {
    // Optimistic update
    const prevIssues = get().issues
    set(state => ({
      issues: state.issues.map(issue =>
        issue.id === id ? { ...issue, ...updates, updated_at: new Date().toISOString() } : issue
      )
    }))

    try {
      const response = await fetch(`${API_BASE_URL}/issues/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        // Revert on failure
        set({ issues: prevIssues })
        throw new Error('Failed to update issue')
      }

      const updatedIssue = await response.json()

      // Update with server response
      set(state => ({
        issues: state.issues.map(issue =>
          issue.id === id ? updatedIssue : issue
        )
      }))

      return updatedIssue
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update issue' })
      throw error
    }
  },

  deleteIssue: async (id) => {
    // Changed to close issue instead of delete (per CLI behavior)
    // Optimistic update
    const prevIssues = get().issues
    set(state => ({
      issues: state.issues.map(issue =>
        issue.id === id ? { ...issue, status: 'closed' as Status } : issue
      )
    }))

    try {
      const response = await fetch(`${API_BASE_URL}/issues/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        // Revert on failure
        set({ issues: prevIssues })
        throw new Error('Failed to close issue')
      }

      const closedIssue = await response.json()

      // Update with server response
      set(state => ({
        issues: state.issues.map(issue =>
          issue.id === id ? closedIssue : issue
        )
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to close issue' })
      throw error
    }
  },

  updateStatus: async (id, status) => {
    return get().updateIssue(id, { status })
  },

  connectWebSocket: () => {
    const wsUrl = API_BASE_URL.replace('http', 'ws').replace('/api', '')
    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      console.log('WebSocket connected')
    }

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data)

      switch (message.type) {
        case 'issue:created':
          set(state => {
            // Check if issue already exists (avoid duplicates from optimistic updates)
            const exists = state.issues.some(issue => issue.id === message.data.id)
            if (exists) return state
            return {
              issues: [message.data, ...state.issues]
            }
          })
          break
        case 'issue:updated':
          set(state => ({
            issues: state.issues.map(issue =>
              issue.id === message.data.id ? message.data : issue
            )
          }))
          break
        case 'issue:deleted':
          set(state => ({
            issues: state.issues.filter(issue => issue.id !== message.data.id)
          }))
          break
        case 'issues:refresh':
          // External CLI change detected, refresh all issues
          console.log('External change detected, refreshing issues...')
          get().fetchIssues()
          break
      }
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }

    ws.onclose = () => {
      console.log('WebSocket disconnected')
      // Attempt reconnect after configured delay
      setTimeout(() => {
        if (get().ws === ws) {
          get().connectWebSocket()
        }
      }, WS_RECONNECT_DELAY)
    }

    set({ ws })
  },

  disconnectWebSocket: () => {
    const { ws } = get()
    if (ws) {
      ws.close()
      set({ ws: null })
    }
  },
}))
