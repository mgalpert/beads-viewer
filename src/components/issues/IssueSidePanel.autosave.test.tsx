import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { IssueSidePanel } from './IssueSidePanel'
import { useIssueStore } from '@/store/useIssueStore'
import type { Issue } from '@/types/issue'

// Mock the store
vi.mock('@/store/useIssueStore', () => ({
  useIssueStore: vi.fn(),
}))

describe('IssueSidePanel - Auto-save', () => {
  const mockIssue: Issue = {
    id: 'test-1',
    title: 'Test Issue',
    status: 'open',
    priority: 2,
    issue_type: 'task',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  }

  const mockUpdateIssue = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useIssueStore as any).mockReturnValue({
      issues: [mockIssue],
      updateIssue: mockUpdateIssue,
    })
  })

  it('should auto-save when clicking backdrop in edit mode', async () => {
    mockUpdateIssue.mockResolvedValueOnce(mockIssue)
    const mockClose = vi.fn()

    render(
      <IssueSidePanel
        issueId="test-1"
        onClose={mockClose}
        defaultEditMode={true}
      />
    )

    // Make a change
    const titleInput = screen.getByDisplayValue('Test Issue')
    fireEvent.change(titleInput, { target: { value: 'Updated Title' } })

    // Click the backdrop
    const backdrop = document.querySelector('.fixed.inset-0')
    fireEvent.click(backdrop!)

    // Verify save was called
    await waitFor(() => {
      expect(mockUpdateIssue).toHaveBeenCalledWith(
        'test-1',
        expect.objectContaining({
          title: 'Updated Title',
        })
      )
    })

    // Verify close was called after save
    await waitFor(() => {
      expect(mockClose).toHaveBeenCalled()
    })
  })

  it('should auto-save when clicking X button in edit mode', async () => {
    mockUpdateIssue.mockResolvedValueOnce(mockIssue)
    const mockClose = vi.fn()

    render(
      <IssueSidePanel
        issueId="test-1"
        onClose={mockClose}
        defaultEditMode={true}
      />
    )

    // Make a change
    const titleInput = screen.getByDisplayValue('Test Issue')
    fireEvent.change(titleInput, { target: { value: 'Updated Title' } })

    // Click the close button
    const closeButton = screen.getByTitle('Close')
    fireEvent.click(closeButton)

    // Verify save was called
    await waitFor(() => {
      expect(mockUpdateIssue).toHaveBeenCalledWith(
        'test-1',
        expect.objectContaining({
          title: 'Updated Title',
        })
      )
    })

    // Verify close was called after save
    await waitFor(() => {
      expect(mockClose).toHaveBeenCalled()
    })
  })

  it('should auto-save when pressing Escape in edit mode', async () => {
    mockUpdateIssue.mockResolvedValueOnce(mockIssue)
    const mockClose = vi.fn()

    render(
      <IssueSidePanel
        issueId="test-1"
        onClose={mockClose}
        defaultEditMode={true}
      />
    )

    // Make a change
    const titleInput = screen.getByDisplayValue('Test Issue')
    fireEvent.change(titleInput, { target: { value: 'Updated Title' } })

    // Press Escape
    fireEvent.keyDown(window, { key: 'Escape' })

    // Verify save was called
    await waitFor(() => {
      expect(mockUpdateIssue).toHaveBeenCalledWith(
        'test-1',
        expect.objectContaining({
          title: 'Updated Title',
        })
      )
    })

    // Verify close was called after save
    await waitFor(() => {
      expect(mockClose).toHaveBeenCalled()
    })
  })

  it('should not auto-save if not in edit mode', async () => {
    const mockClose = vi.fn()

    render(
      <IssueSidePanel
        issueId="test-1"
        onClose={mockClose}
        defaultEditMode={false}
      />
    )

    // Click the backdrop (not in edit mode)
    const backdrop = document.querySelector('.fixed.inset-0')
    fireEvent.click(backdrop!)

    // Verify save was NOT called
    expect(mockUpdateIssue).not.toHaveBeenCalled()

    // Verify close was called
    await waitFor(() => {
      expect(mockClose).toHaveBeenCalled()
    })
  })

  it('should show auto-save hint in edit mode', () => {
    render(
      <IssueSidePanel
        issueId="test-1"
        onClose={vi.fn()}
        defaultEditMode={true}
      />
    )

    // Verify the auto-save hint is shown
    expect(screen.getByText(/Changes auto-save when closing/)).toBeInTheDocument()
  })

  it('should not show auto-save hint when not editing', () => {
    render(
      <IssueSidePanel
        issueId="test-1"
        onClose={vi.fn()}
        defaultEditMode={false}
      />
    )

    // Verify the auto-save hint is NOT shown
    expect(screen.queryByText(/Changes auto-save when closing/)).not.toBeInTheDocument()
  })

  it('should handle save errors gracefully', async () => {
    mockUpdateIssue.mockRejectedValueOnce(new Error('Network error'))
    const mockClose = vi.fn()

    render(
      <IssueSidePanel
        issueId="test-1"
        onClose={mockClose}
        defaultEditMode={true}
      />
    )

    // Make a change
    const titleInput = screen.getByDisplayValue('Test Issue')
    fireEvent.change(titleInput, { target: { value: 'Updated Title' } })

    // Click the backdrop
    const backdrop = document.querySelector('.fixed.inset-0')
    fireEvent.click(backdrop!)

    // Wait for save to be attempted
    await waitFor(() => {
      expect(mockUpdateIssue).toHaveBeenCalled()
    })

    // Panel should still be open (onClose should NOT have been called)
    expect(mockClose).not.toHaveBeenCalled()

    // Panel should still be in edit mode (Edit button should not be visible)
    expect(screen.queryByTitle('Edit')).not.toBeInTheDocument()
  })
})
