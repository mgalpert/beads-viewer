import { useState } from 'react'
import { useIssueStore } from '@/store/useIssueStore'
import type { IssueType, Status } from '@/types/issue'
import { ISSUE_STATUSES, ISSUE_TYPES, PRIORITY_LABELS, PRIORITIES } from '@/constants'

interface CreateIssueModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CreateIssueModal({ isOpen, onClose }: CreateIssueModalProps) {
  const { createIssue } = useIssueStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    design: '',
    acceptance_criteria: '',
    notes: '',
    status: 'open' as Status,
    priority: 3,
    issue_type: 'task' as IssueType,
    assignee: '',
    estimated_minutes: undefined as number | undefined,
  })

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      await createIssue({
        ...formData,
        estimated_minutes: formData.estimated_minutes || undefined,
        assignee: formData.assignee || undefined,
      })

      // Reset form
      setFormData({
        title: '',
        description: '',
        design: '',
        acceptance_criteria: '',
        notes: '',
        status: 'open',
        priority: 3,
        issue_type: 'task',
        assignee: '',
        estimated_minutes: undefined,
      })

      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create issue')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={handleClose}
    >
      <div
        className="bg-background rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-background border-b p-6 z-10">
          <h2 className="text-2xl font-bold">Create New Issue</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="title" className="block text-sm font-medium mb-2">
              Title <span className="text-destructive">*</span>
            </label>
            <input
              id="title"
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Brief description of the issue"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="status" className="block text-sm font-medium mb-2">
                Status
              </label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as Status })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {ISSUE_STATUSES.map(status => (
                  <option key={status} value={status}>
                    {status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="issue_type" className="block text-sm font-medium mb-2">
                Type
              </label>
              <select
                id="issue_type"
                value={formData.issue_type}
                onChange={(e) => setFormData({ ...formData, issue_type: e.target.value as IssueType })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {ISSUE_TYPES.map(type => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="priority" className="block text-sm font-medium mb-2">
                Priority
              </label>
              <select
                id="priority"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {PRIORITIES.map(priority => (
                  <option key={priority} value={priority}>
                    {PRIORITY_LABELS[priority]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="assignee" className="block text-sm font-medium mb-2">
                Assignee
              </label>
              <input
                id="assignee"
                type="text"
                value={formData.assignee}
                onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Optional"
              />
            </div>
          </div>

          <div>
            <label htmlFor="estimated_minutes" className="block text-sm font-medium mb-2">
              Estimated Time (minutes)
            </label>
            <input
              id="estimated_minutes"
              type="number"
              min="0"
              value={formData.estimated_minutes || ''}
              onChange={(e) => setFormData({ ...formData, estimated_minutes: e.target.value ? parseInt(e.target.value) : undefined })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Optional"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-2">
              Description
            </label>
            <textarea
              id="description"
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Detailed description of the issue"
            />
          </div>

          <div>
            <label htmlFor="design" className="block text-sm font-medium mb-2">
              Design Notes
            </label>
            <textarea
              id="design"
              rows={3}
              value={formData.design}
              onChange={(e) => setFormData({ ...formData, design: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Design considerations and mockups"
            />
          </div>

          <div>
            <label htmlFor="acceptance_criteria" className="block text-sm font-medium mb-2">
              Acceptance Criteria
            </label>
            <textarea
              id="acceptance_criteria"
              rows={3}
              value={formData.acceptance_criteria}
              onChange={(e) => setFormData({ ...formData, acceptance_criteria: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Conditions for considering this issue complete"
            />
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium mb-2">
              Notes
            </label>
            <textarea
              id="notes"
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Additional notes"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 border rounded-lg hover:bg-muted disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.title}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Issue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
