import type { Issue } from '@/types/issue'

/**
 * Parse JSONL (JSON Lines) format - one JSON object per line
 */
export function parseJSONL(content: string): Issue[] {
  const lines = content.trim().split('\n').filter(line => line.trim())
  return lines.map(line => JSON.parse(line) as Issue)
}

/**
 * Load issues from .beads/issues.jsonl file
 */
export async function loadIssues(): Promise<Issue[]> {
  try {
    const response = await fetch('/.beads/issues.jsonl')
    if (!response.ok) {
      throw new Error(`Failed to load issues: ${response.statusText}`)
    }
    const content = await response.text()
    return parseJSONL(content)
  } catch (error) {
    console.error('Error loading issues:', error)
    return []
  }
}

/**
 * Calculate which issues are "ready work" (unblocked)
 * An issue is ready if:
 * - Status is 'open'
 * - No open 'blocks' dependencies exist
 */
export function getReadyIssues(issues: Issue[]): Issue[] {
  const openIssues = issues.filter(i => i.status === 'open')

  return openIssues.filter(issue => {
    // Check if this issue is blocked by any open issues
    const blockingDeps = issue.dependencies?.filter(dep => dep.type === 'blocks') || []

    if (blockingDeps.length === 0) {
      return true
    }

    // Check if any blocking dependencies are still open
    return !blockingDeps.some(dep => {
      const blocker = issues.find(i => i.id === dep.depends_on_id)
      return blocker && ['open', 'in_progress', 'blocked'].includes(blocker.status)
    })
  })
}

/**
 * Get issues that are blocked
 */
export function getBlockedIssues(issues: Issue[]): Issue[] {
  return issues.filter(issue => {
    if (issue.status === 'closed') return false

    const blockingDeps = issue.dependencies?.filter(dep => dep.type === 'blocks') || []

    return blockingDeps.some(dep => {
      const blocker = issues.find(i => i.id === dep.depends_on_id)
      return blocker && ['open', 'in_progress', 'blocked'].includes(blocker.status)
    })
  })
}
