import { useMemo, useState } from 'react'
import { useIssueStore } from '@/store/useIssueStore'
import { getReadyIssues } from '@/lib/jsonl'
import { cn } from '@/lib/utils'
import type { Issue } from '@/types/issue'
import { IssueSidePanel } from './IssueSidePanel'

const statusColors: Record<string, string> = {
  open: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  in_progress: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  blocked: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  closed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
}

const priorityLabels = ['Highest', 'High', 'Medium', 'Low', 'Lowest']

function IssueCard({ issue, onClick }: { issue: Issue; onClick: () => void }) {
  return (
    <div className="border rounded-lg p-4 hover:bg-accent/50 transition-colors cursor-pointer" onClick={onClick}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-sm text-muted-foreground">
              {issue.id}
            </span>
            <span
              className={cn(
                'px-2 py-0.5 rounded text-xs font-medium',
                statusColors[issue.status] || 'bg-gray-100 text-gray-800'
              )}
            >
              {issue.status.replace('_', ' ')}
            </span>
          </div>
          <h3 className="font-semibold text-lg mb-1">{issue.title}</h3>
          {issue.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
              {issue.description}
            </p>
          )}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>
              Priority: {priorityLabels[issue.priority] || issue.priority}
            </span>
            <span className="capitalize">
              {issue.issue_type.replace('_', ' ')}
            </span>
            {issue.estimated_minutes && (
              <span>{Math.floor(issue.estimated_minutes / 60)}h {issue.estimated_minutes % 60}m</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export function ReadyWorkView() {
  const { issues } = useIssueStore()
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null)

  const readyIssues = useMemo(() => {
    return getReadyIssues(issues).sort((a, b) => {
      // Sort by priority (ascending, 0 is highest)
      if (a.priority !== b.priority) {
        return a.priority - b.priority
      }
      // Then by creation date (descending)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }, [issues])

  if (readyIssues.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No ready work available. All open issues are blocked or no issues exist.
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Ready Work</h2>
        <p className="text-muted-foreground">
          {readyIssues.length} unblocked {readyIssues.length === 1 ? 'issue' : 'issues'} available to work on
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {readyIssues.map(issue => (
          <IssueCard key={issue.id} issue={issue} onClick={() => setSelectedIssueId(issue.id)} />
        ))}
      </div>

      <IssueSidePanel
        issueId={selectedIssueId}
        onClose={() => setSelectedIssueId(null)}
        onNavigate={(issueId) => setSelectedIssueId(issueId)}
      />
    </div>
  )
}
