import { useEffect, useState } from 'react'
import { Edit2, X, Plus, Trash2 } from 'lucide-react'
import { useIssueStore } from '@/store/useIssueStore'
import type { Issue, Status, IssueType, Dependency, DependencyType } from '@/types/issue'
import { cn } from '@/lib/utils'

interface IssueSidePanelProps {
  issueId: string | null
  onClose: () => void
  onNavigate?: (issueId: string) => void
  defaultEditMode?: boolean
  createMode?: boolean
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

export function IssueSidePanel({ issueId, onClose, onNavigate, defaultEditMode = false, createMode = false }: IssueSidePanelProps) {
  const { issues, updateIssue, createIssue } = useIssueStore()
  const [isEditing, setIsEditing] = useState(defaultEditMode || createMode)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const issue = issueId ? issues.find(i => i.id === issueId) : null

  const [editedIssue, setEditedIssue] = useState<Partial<Issue> | null>(null)
  const [newDependencyId, setNewDependencyId] = useState('')
  const [newDependencyType, setNewDependencyType] = useState<DependencyType>('blocks')

  // Reset edit state when issue changes or in create mode
  useEffect(() => {
    if (createMode) {
      // Initialize a new issue without ID (backend will generate it)
      setEditedIssue({
        title: '',
        description: '',
        status: 'open',
        priority: 3,
        issue_type: 'task',
      })
      setIsEditing(true)
      setError(null)
    } else if (issue) {
      setEditedIssue(issue)
      setIsEditing(defaultEditMode)
      setError(null)
    }
  }, [issue, defaultEditMode, createMode])

  const handleNavigate = (newIssueId: string) => {
    if (onNavigate) {
      onNavigate(newIssueId)
    }
  }

  const handleSave = async () => {
    if (!editedIssue) return

    // Validate title is present
    if (!editedIssue.title?.trim()) {
      setError('Title is required')
      throw new Error('Title is required')
    }

    setError(null)
    setIsSaving(true)

    try {
      if (createMode) {
        // Create new issue
        await createIssue(editedIssue)
        onClose()
      } else if (issue) {
        // Update existing issue
        await updateIssue(issue.id, editedIssue)
        setIsEditing(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : createMode ? 'Failed to create issue' : 'Failed to update issue')
      throw err // Re-throw so handleBackdropClick knows save failed
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    if (createMode) {
      onClose()
    } else {
      setEditedIssue(issue)
      setIsEditing(false)
      setError(null)
      setNewDependencyId('')
      setNewDependencyType('blocks')
    }
  }

  const handleBackdropClick = async () => {
    if (createMode) {
      // In create mode, just close without saving
      onClose()
    } else if (isEditing) {
      // Auto-save before closing (only for edit mode)
      try {
        await handleSave()
        // Only close if save succeeded
        if (!error) {
          onClose()
        }
      } catch (err) {
        // Error is already set by handleSave, don't close
        return
      }
    } else {
      onClose()
    }
  }

  const handleAddDependency = () => {
    if (!newDependencyId.trim() || !editedIssue || !issue) return

    // Check if dependency already exists
    const existingDeps = editedIssue.dependencies || []
    if (existingDeps.some(d => d.depends_on_id === newDependencyId.trim())) {
      setError('Dependency already exists')
      return
    }

    // Check if the target issue exists
    const targetIssue = issues.find(i => i.id === newDependencyId.trim())
    if (!targetIssue) {
      setError(`Issue ${newDependencyId.trim()} not found`)
      return
    }

    const newDep: Dependency = {
      issue_id: issue.id,
      depends_on_id: newDependencyId.trim(),
      type: newDependencyType,
      created_at: new Date().toISOString(),
      created_by: 'system', // User authentication not implemented yet
    }

    setEditedIssue({
      ...editedIssue,
      dependencies: [...existingDeps, newDep]
    })
    setNewDependencyId('')
    setError(null)
  }

  const handleRemoveDependency = (dependsOnId: string) => {
    if (!editedIssue) return

    setEditedIssue({
      ...editedIssue,
      dependencies: (editedIssue.dependencies || []).filter(d => d.depends_on_id !== dependsOnId)
    })
  }

  // Close panel on Escape key
  useEffect(() => {
    const handleEscape = async (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (createMode) {
          onClose()
        } else if (isEditing) {
          await handleSave()
          onClose()
        } else {
          onClose()
        }
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onClose, isEditing, handleSave, createMode])

  if (!editedIssue) return null

  // Use editedIssue for display in create mode, otherwise use issue
  // In create mode, we need to provide defaults for required fields
  const displayIssue = createMode
    ? {
        ...editedIssue,
        id: 'new',
        title: editedIssue.title || '',
        status: editedIssue.status || 'open',
        priority: editedIssue.priority ?? 3,
        issue_type: editedIssue.issue_type || 'task',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Issue
    : issue
  if (!createMode && !issue) return null

  // Find issues that depend on this one (not applicable in create mode)
  const dependents = createMode ? [] : issues.filter(i =>
    i.dependencies?.some(dep => dep.depends_on_id === issue!.id)
  )

  const isOpen = createMode || !!issueId

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-black/20 z-40 transition-opacity",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={handleBackdropClick}
      />

      {/* Side Panel */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full w-full md:w-[600px] lg:w-[700px] bg-background border-l shadow-2xl z-50 transform transition-transform duration-300 ease-out overflow-hidden flex flex-col",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="border-b p-6 flex items-start justify-between shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <span className="font-mono text-sm text-muted-foreground">
                {createMode ? 'New Issue' : displayIssue.id}
              </span>
              {isEditing ? (
                <select
                  value={editedIssue.status}
                  onChange={(e) => setEditedIssue({ ...editedIssue, status: e.target.value as Status })}
                  className="px-2 py-1 border rounded text-xs font-medium"
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="blocked">Blocked</option>
                  <option value="closed">Closed</option>
                </select>
              ) : (
                <span
                  className={cn(
                    'px-2 py-1 rounded text-xs font-medium',
                    statusColors[displayIssue.status] || 'bg-gray-100 text-gray-800'
                  )}
                >
                  {displayIssue.status.replace('_', ' ')}
                </span>
              )}
            </div>
            {isEditing ? (
              <input
                type="text"
                value={editedIssue.title}
                onChange={(e) => setEditedIssue({ ...editedIssue, title: e.target.value })}
                className="w-full text-xl font-bold px-2 py-1 border rounded"
                placeholder="Issue title"
                autoFocus
              />
            ) : (
              <h2 className="text-xl font-bold">{displayIssue.title}</h2>
            )}
          </div>
          <div className="flex items-center gap-2 ml-4 shrink-0">
            {!isEditing && !createMode && (
              <button
                onClick={() => setIsEditing(true)}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                title="Edit"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={handleBackdropClick}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm shrink-0">
            {error}
          </div>
        )}

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Metadata Grid */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Priority</div>
                {isEditing ? (
                  <select
                    value={editedIssue.priority}
                    onChange={(e) => setEditedIssue({ ...editedIssue, priority: parseInt(e.target.value) })}
                    className="w-full px-2 py-1 text-sm border rounded"
                  >
                    <option value={0}>P0 - Highest</option>
                    <option value={1}>P1 - High</option>
                    <option value={2}>P2 - Medium</option>
                    <option value={3}>P3 - Low</option>
                    <option value={4}>P4 - Lowest</option>
                  </select>
                ) : (
                  <div className="text-sm font-medium">
                    {priorityLabels[displayIssue.priority] || displayIssue.priority}
                  </div>
                )}
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Type</div>
                {isEditing ? (
                  <select
                    value={editedIssue.issue_type}
                    onChange={(e) => setEditedIssue({ ...editedIssue, issue_type: e.target.value as IssueType })}
                    className="w-full px-2 py-1 text-sm border rounded capitalize"
                  >
                    <option value="bug">Bug</option>
                    <option value="feature">Feature</option>
                    <option value="task">Task</option>
                    <option value="epic">Epic</option>
                    <option value="chore">Chore</option>
                  </select>
                ) : (
                  <div className="text-sm font-medium capitalize">
                    {displayIssue.issue_type.replace('_', ' ')}
                  </div>
                )}
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Assignee</div>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedIssue.assignee || ''}
                    onChange={(e) => setEditedIssue({ ...editedIssue, assignee: e.target.value || undefined })}
                    className="w-full px-2 py-1 text-sm border rounded"
                    placeholder="Unassigned"
                  />
                ) : (
                  <div className="text-sm font-medium">{displayIssue.assignee || 'Unassigned'}</div>
                )}
              </div>
            </div>

            {/* Description */}
            {(isEditing || displayIssue.description) && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Description</h3>
                {isEditing ? (
                  <textarea
                    rows={4}
                    value={editedIssue.description || ''}
                    onChange={(e) => setEditedIssue({ ...editedIssue, description: e.target.value || undefined })}
                    className="w-full px-3 py-2 text-sm border rounded"
                    placeholder="Detailed description"
                  />
                ) : (
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {displayIssue.description}
                  </div>
                )}
              </div>
            )}

            {/* Design */}
            {(isEditing || displayIssue.design) && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Design</h3>
                {isEditing ? (
                  <textarea
                    rows={3}
                    value={editedIssue.design || ''}
                    onChange={(e) => setEditedIssue({ ...editedIssue, design: e.target.value || undefined })}
                    className="w-full px-3 py-2 text-sm border rounded"
                    placeholder="Design notes"
                  />
                ) : (
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {displayIssue.design}
                  </div>
                )}
              </div>
            )}

            {/* Acceptance Criteria */}
            {(isEditing || displayIssue.acceptance_criteria) && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Acceptance Criteria</h3>
                {isEditing ? (
                  <textarea
                    rows={3}
                    value={editedIssue.acceptance_criteria || ''}
                    onChange={(e) => setEditedIssue({ ...editedIssue, acceptance_criteria: e.target.value || undefined })}
                    className="w-full px-3 py-2 text-sm border rounded"
                    placeholder="Definition of done"
                  />
                ) : (
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {displayIssue.acceptance_criteria}
                  </div>
                )}
              </div>
            )}

            {/* Dependencies */}
            {(isEditing || (displayIssue.dependencies && displayIssue.dependencies.length > 0)) && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Dependencies</h3>

                {/* Existing dependencies */}
                {(isEditing ? editedIssue.dependencies : displayIssue.dependencies)?.length ? (
                  <div className="space-y-2 mb-3">
                    {(isEditing ? editedIssue.dependencies : displayIssue.dependencies)!.map(dep => {
                      const depIssue = issues.find(i => i.id === dep.depends_on_id)
                      return (
                        <div
                          key={dep.depends_on_id}
                          className={cn(
                            "w-full flex items-center gap-2 p-2 border rounded-lg text-sm",
                            !isEditing && "hover:bg-accent/50 transition-colors cursor-pointer"
                          )}
                        >
                          <span className="text-xs">
                            {dependencyTypeLabels[dep.type] || dep.type}
                          </span>
                          <span className="font-mono text-xs text-muted-foreground">
                            {dep.depends_on_id}
                          </span>
                          {depIssue && (
                            <>
                              <span
                                className="text-xs flex-1 truncate cursor-pointer hover:text-primary"
                                onClick={() => handleNavigate(dep.depends_on_id)}
                              >
                                {depIssue.title}
                              </span>
                              <span
                                className={cn(
                                  'px-2 py-0.5 rounded text-xs font-medium shrink-0',
                                  statusColors[depIssue.status]
                                )}
                              >
                                {depIssue.status.replace('_', ' ')}
                              </span>
                            </>
                          )}
                          {isEditing && (
                            <button
                              onClick={() => handleRemoveDependency(dep.depends_on_id)}
                              className="p-1 text-destructive hover:text-destructive/80 transition-colors shrink-0"
                              title="Remove dependency"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : isEditing ? (
                  <div className="text-xs text-muted-foreground mb-3">No dependencies yet</div>
                ) : null}

                {/* Add new dependency form (edit mode only) */}
                {isEditing && (
                  <div className="flex gap-2">
                    <select
                      value={newDependencyType}
                      onChange={(e) => setNewDependencyType(e.target.value as DependencyType)}
                      className="px-2 py-1 text-xs border rounded shrink-0"
                    >
                      <option value="blocks">Blocks</option>
                      <option value="related">Related</option>
                      <option value="parent-child">Parent-Child</option>
                      <option value="discovered-from">Discovered From</option>
                    </select>
                    <input
                      type="text"
                      value={newDependencyId}
                      onChange={(e) => setNewDependencyId(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddDependency()}
                      className="flex-1 px-2 py-1 text-xs border rounded font-mono"
                      placeholder="Issue ID (e.g., test-1)"
                    />
                    <button
                      onClick={handleAddDependency}
                      className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors shrink-0"
                      title="Add dependency"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Dependents */}
            {dependents.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Blocking</h3>
                <div className="space-y-2">
                  {dependents.map(dependent => {
                    const depType = dependent.dependencies?.find(d => d.depends_on_id === issue.id)?.type
                    return (
                      <button
                        key={dependent.id}
                        onClick={() => handleNavigate(dependent.id)}
                        className="w-full flex items-center gap-2 p-2 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer text-left text-sm"
                      >
                        <span className="text-xs">
                          {dependencyTypeLabels[depType || 'blocks'] || depType}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">
                          {dependent.id}
                        </span>
                        <span className="text-xs flex-1 truncate">{dependent.title}</span>
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded text-xs font-medium shrink-0',
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
            {displayIssue.labels && displayIssue.labels.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Labels</h3>
                <div className="flex flex-wrap gap-2">
                  {displayIssue.labels.map(label => (
                    <span key={label} className="px-2 py-1 bg-muted rounded text-xs">
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* External Reference */}
            {displayIssue.external_ref && (
              <div>
                <h3 className="text-sm font-semibold mb-2">External Reference</h3>
                <span className="font-mono text-xs text-muted-foreground">
                  {displayIssue.external_ref}
                </span>
              </div>
            )}

            {/* Timestamps */}
            {!createMode && (
              <div className="pt-4 border-t space-y-1 text-xs text-muted-foreground">
                <div>Created: {new Date(displayIssue.created_at).toLocaleString()}</div>
                <div>Updated: {new Date(displayIssue.updated_at).toLocaleString()}</div>
                {displayIssue.closed_at && (
                  <div>Closed: {new Date(displayIssue.closed_at).toLocaleString()}</div>
                )}
                {isEditing && (
                  <div className="pt-2 text-[10px] italic opacity-60">
                    Changes auto-save when closing
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Create Issue Footer */}
        {createMode && (
          <div className="border-t p-4 flex items-center justify-end gap-3 shrink-0 bg-muted/20">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm border rounded-lg hover:bg-accent transition-colors"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !editedIssue.title?.trim()}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Creating...' : 'Create Issue'}
            </button>
          </div>
        )}
      </div>
    </>
  )
}
