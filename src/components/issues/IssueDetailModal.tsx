import { useEffect, useState } from 'react'
import { Edit2, Save, X } from 'lucide-react'
import { useIssueStore } from '@/store/useIssueStore'
import type { Issue, Status, IssueType } from '@/types/issue'
import { cn } from '@/lib/utils'

interface IssueDetailModalProps {
  issueId: string | null
  onClose: () => void
  onNavigate?: (issueId: string) => void
}

const statusColors: Record<string, string> = {
  open: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  in_progress: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  blocked: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  closed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
}

const priorityLabels = ['Highest', 'High', 'Medium', 'Low', 'Lowest']

const dependencyTypeLabels: Record<string, string> = {
  blocks: '🚫 Blocks',
  'parent-child': '👨‍👧 Parent-Child',
  related: '🔗 Related',
  'discovered-from': '🔍 Discovered From',
}

export function IssueDetailModal({ issueId, onClose, onNavigate }: IssueDetailModalProps) {
  const { issues, updateIssue } = useIssueStore()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const issue = issueId ? issues.find(i => i.id === issueId) : null

  const [editedIssue, setEditedIssue] = useState<Partial<Issue> | null>(null)

  // Reset edit state when issue changes
  useEffect(() => {
    if (issue) {
      setEditedIssue(issue)
      setIsEditing(false)
      setError(null)
    }
  }, [issue])

  const handleNavigate = (newIssueId: string) => {
    if (onNavigate) {
      onNavigate(newIssueId)
    }
  }

  const handleSave = async () => {
    if (!issue || !editedIssue) return

    setError(null)
    setIsSaving(true)

    try {
      await updateIssue(issue.id, editedIssue)
      setIsEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update issue')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setEditedIssue(issue)
    setIsEditing(false)
    setError(null)
  }

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isEditing) {
          handleCancel()
        } else {
          onClose()
        }
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onClose, isEditing])

  if (!issue || !editedIssue) return null

  // Find issues that depend on this one
  const dependents = issues.filter(i =>
    i.dependencies?.some(dep => dep.depends_on_id === issue.id)
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-background rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto m-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-background border-b p-6 flex items-start justify-between z-10">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="font-mono text-lg text-muted-foreground">{issue.id}</span>
              {isEditing ? (
                <select
                  value={editedIssue.status}
                  onChange={(e) => setEditedIssue({ ...editedIssue, status: e.target.value as Status })}
                  className="px-3 py-1 border rounded text-sm font-medium"
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="blocked">Blocked</option>
                  <option value="closed">Closed</option>
                </select>
              ) : (
                <span
                  className={cn(
                    'px-3 py-1 rounded text-sm font-medium',
                    statusColors[issue.status] || 'bg-gray-100 text-gray-800'
                  )}
                >
                  {issue.status.replace('_', ' ')}
                </span>
              )}
            </div>
            {isEditing ? (
              <input
                type="text"
                value={editedIssue.title}
                onChange={(e) => setEditedIssue({ ...editedIssue, title: e.target.value })}
                className="w-full text-2xl font-bold px-3 py-2 border rounded"
              />
            ) : (
              <h2 className="text-2xl font-bold">{issue.title}</h2>
            )}
          </div>
          <div className="flex items-center gap-2 ml-4">
            {isEditing ? (
              <>
                <button
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="p-2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                  title="Cancel"
                >
                  <X className="w-5 h-5" />
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="p-2 text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
                  title="Save"
                >
                  <Save className="w-5 h-5" />
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                title="Edit"
              >
                <Edit2 className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              title="Close"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 bg-destructive/10 text-destructive px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Priority</div>
              {isEditing ? (
                <select
                  value={editedIssue.priority}
                  onChange={(e) => setEditedIssue({ ...editedIssue, priority: parseInt(e.target.value) })}
                  className="w-full px-2 py-1 border rounded"
                >
                  <option value={0}>P0 - Highest</option>
                  <option value={1}>P1 - High</option>
                  <option value={2}>P2 - Medium-High</option>
                  <option value={3}>P3 - Medium</option>
                  <option value={4}>P4 - Low</option>
                </select>
              ) : (
                <div className="font-medium">
                  {priorityLabels[issue.priority] || issue.priority}
                </div>
              )}
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Type</div>
              {isEditing ? (
                <select
                  value={editedIssue.issue_type}
                  onChange={(e) => setEditedIssue({ ...editedIssue, issue_type: e.target.value as IssueType })}
                  className="w-full px-2 py-1 border rounded capitalize"
                >
                  <option value="bug">Bug</option>
                  <option value="feature">Feature</option>
                  <option value="task">Task</option>
                  <option value="epic">Epic</option>
                  <option value="chore">Chore</option>
                </select>
              ) : (
                <div className="font-medium capitalize">
                  {issue.issue_type.replace('_', ' ')}
                </div>
              )}
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Assignee</div>
              {isEditing ? (
                <input
                  type="text"
                  value={editedIssue.assignee || ''}
                  onChange={(e) => setEditedIssue({ ...editedIssue, assignee: e.target.value || undefined })}
                  className="w-full px-2 py-1 border rounded"
                  placeholder="Optional"
                />
              ) : (
                <div className="font-medium">{issue.assignee || '-'}</div>
              )}
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Estimate (minutes)</div>
              {isEditing ? (
                <input
                  type="number"
                  min="0"
                  value={editedIssue.estimated_minutes || ''}
                  onChange={(e) => setEditedIssue({ ...editedIssue, estimated_minutes: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="w-full px-2 py-1 border rounded"
                  placeholder="Optional"
                />
              ) : (
                <div className="font-medium">
                  {issue.estimated_minutes ? `${Math.floor(issue.estimated_minutes / 60)}h ${issue.estimated_minutes % 60}m` : '-'}
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {(isEditing || issue.description) && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Description</h3>
              {isEditing ? (
                <textarea
                  rows={4}
                  value={editedIssue.description || ''}
                  onChange={(e) => setEditedIssue({ ...editedIssue, description: e.target.value || undefined })}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="Detailed description of the issue"
                />
              ) : (
                <div className="text-muted-foreground whitespace-pre-wrap">
                  {issue.description}
                </div>
              )}
            </div>
          )}

          {/* Design */}
          {(isEditing || issue.design) && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Design</h3>
              {isEditing ? (
                <textarea
                  rows={3}
                  value={editedIssue.design || ''}
                  onChange={(e) => setEditedIssue({ ...editedIssue, design: e.target.value || undefined })}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="Design considerations and mockups"
                />
              ) : (
                <div className="text-muted-foreground whitespace-pre-wrap">
                  {issue.design}
                </div>
              )}
            </div>
          )}

          {/* Acceptance Criteria */}
          {(isEditing || issue.acceptance_criteria) && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Acceptance Criteria</h3>
              {isEditing ? (
                <textarea
                  rows={3}
                  value={editedIssue.acceptance_criteria || ''}
                  onChange={(e) => setEditedIssue({ ...editedIssue, acceptance_criteria: e.target.value || undefined })}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="Conditions for considering this issue complete"
                />
              ) : (
                <div className="text-muted-foreground whitespace-pre-wrap">
                  {issue.acceptance_criteria}
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          {(isEditing || issue.notes) && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Notes</h3>
              {isEditing ? (
                <textarea
                  rows={2}
                  value={editedIssue.notes || ''}
                  onChange={(e) => setEditedIssue({ ...editedIssue, notes: e.target.value || undefined })}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="Additional notes"
                />
              ) : (
                <div className="text-muted-foreground whitespace-pre-wrap">
                  {issue.notes}
                </div>
              )}
            </div>
          )}

          {/* Dependencies */}
          {issue.dependencies && issue.dependencies.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Dependencies</h3>
              <div className="space-y-2">
                {issue.dependencies.map(dep => {
                  const depIssue = issues.find(i => i.id === dep.depends_on_id)
                  return (
                    <button
                      key={dep.depends_on_id}
                      onClick={() => handleNavigate(dep.depends_on_id)}
                      className="w-full flex items-center gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer text-left"
                    >
                      <span className="text-sm">
                        {dependencyTypeLabels[dep.type] || dep.type}
                      </span>
                      <span className="font-mono text-sm text-muted-foreground">
                        {dep.depends_on_id}
                      </span>
                      {depIssue && (
                        <>
                          <span className="text-sm flex-1">{depIssue.title}</span>
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded text-xs font-medium',
                              statusColors[depIssue.status]
                            )}
                          >
                            {depIssue.status.replace('_', ' ')}
                          </span>
                        </>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Dependents (issues that depend on this one) */}
          {dependents.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Blocked By This Issue</h3>
              <div className="space-y-2">
                {dependents.map(dependent => {
                  const depType = dependent.dependencies?.find(d => d.depends_on_id === issue.id)?.type
                  return (
                    <button
                      key={dependent.id}
                      onClick={() => handleNavigate(dependent.id)}
                      className="w-full flex items-center gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer text-left"
                    >
                      <span className="text-sm">
                        {dependencyTypeLabels[depType || 'blocks'] || depType}
                      </span>
                      <span className="font-mono text-sm text-muted-foreground">
                        {dependent.id}
                      </span>
                      <span className="text-sm flex-1">{dependent.title}</span>
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded text-xs font-medium',
                          statusColors[dependent.status]
                        )}
                      >
                        {dependent.status.replace('_', ' ')}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Labels */}
          {issue.labels && issue.labels.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Labels</h3>
              <div className="flex flex-wrap gap-2">
                {issue.labels.map(label => (
                  <span key={label} className="px-3 py-1 bg-muted rounded-full text-sm">
                    {label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* External Reference */}
          {issue.external_ref && (
            <div>
              <h3 className="text-lg font-semibold mb-2">External Reference</h3>
              <span className="font-mono text-sm text-muted-foreground">
                {issue.external_ref}
              </span>
            </div>
          )}

          {/* Timestamps */}
          <div className="pt-4 border-t space-y-2 text-sm text-muted-foreground">
            <div>
              Created: {new Date(issue.created_at).toLocaleString()}
            </div>
            <div>
              Updated: {new Date(issue.updated_at).toLocaleString()}
            </div>
            {issue.closed_at && (
              <div>
                Closed: {new Date(issue.closed_at).toLocaleString()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
