import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { IssueSidePanel } from './IssueSidePanel'
import { useIssueStore } from '@/store/useIssueStore'
import type { Issue } from '@/types/issue'

// Mock the store
vi.mock('@/store/useIssueStore', () => ({
  useIssueStore: vi.fn(),
}))

describe('IssueSidePanel - Dependency Management', () => {
  const mockIssues: Issue[] = [
    {
      id: 'test-1',
      title: 'Test Issue 1',
      status: 'open',
      priority: 2,
      issue_type: 'task',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    },
    {
      id: 'test-2',
      title: 'Test Issue 2',
      status: 'open',
      priority: 2,
      issue_type: 'task',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      dependencies: [
        {
          issue_id: 'test-2',
          depends_on_id: 'test-1',
          type: 'blocks',
          created_at: '2025-01-01T00:00:00Z',
          created_by: 'user',
        },
      ],
    },
    {
      id: 'test-3',
      title: 'Test Issue 3',
      status: 'open',
      priority: 2,
      issue_type: 'task',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    },
  ]

  const mockUpdateIssue = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useIssueStore as any).mockReturnValue({
      issues: mockIssues,
      updateIssue: mockUpdateIssue,
    })
  })

  it('should show existing dependencies in view mode', () => {
    render(
      <IssueSidePanel
        issueId="test-2"
        onClose={vi.fn()}
        defaultEditMode={false}
      />
    )

    expect(screen.getByText('Dependencies')).toBeInTheDocument()
    expect(screen.getByText('test-1')).toBeInTheDocument()
    expect(screen.getByText('Test Issue 1')).toBeInTheDocument()
  })

  it('should allow adding new dependencies in edit mode', async () => {
    mockUpdateIssue.mockResolvedValueOnce(mockIssues[2])

    render(
      <IssueSidePanel
        issueId="test-3"
        onClose={vi.fn()}
        defaultEditMode={true}
      />
    )

    // Find the dependency input field
    const input = screen.getByPlaceholderText(/Issue ID/)
    const addButton = screen.getByTitle('Add dependency')

    // Add a new dependency
    fireEvent.change(input, { target: { value: 'test-1' } })
    fireEvent.click(addButton)

    // Verify the dependency was added to the UI
    await waitFor(() => {
      expect(screen.getByText('test-1')).toBeInTheDocument()
    })

    // Close the panel (auto-save)
    const closeButton = screen.getByTitle('Close')
    fireEvent.click(closeButton)

    // Verify updateIssue was called with the new dependency
    await waitFor(() => {
      expect(mockUpdateIssue).toHaveBeenCalledWith(
        'test-3',
        expect.objectContaining({
          dependencies: expect.arrayContaining([
            expect.objectContaining({
              depends_on_id: 'test-1',
              type: 'blocks',
            }),
          ]),
        })
      )
    })
  })

  it('should allow removing dependencies in edit mode', async () => {
    mockUpdateIssue.mockResolvedValueOnce(mockIssues[1])

    render(
      <IssueSidePanel
        issueId="test-2"
        onClose={vi.fn()}
        defaultEditMode={true}
      />
    )

    // Find the remove button
    const removeButton = screen.getByTitle('Remove dependency')

    // Remove the dependency
    fireEvent.click(removeButton)

    // Verify the dependency was removed from the UI
    await waitFor(() => {
      expect(screen.queryByText('test-1')).not.toBeInTheDocument()
    })

    // Close the panel (auto-save)
    const closeButton = screen.getByTitle('Close')
    fireEvent.click(closeButton)

    // Verify updateIssue was called without the dependency
    await waitFor(() => {
      expect(mockUpdateIssue).toHaveBeenCalledWith(
        'test-2',
        expect.objectContaining({
          dependencies: [],
        })
      )
    })
  })

  it('should show error when adding non-existent issue', async () => {
    render(
      <IssueSidePanel
        issueId="test-3"
        onClose={vi.fn()}
        defaultEditMode={true}
      />
    )

    const input = screen.getByPlaceholderText(/Issue ID/)
    const addButton = screen.getByTitle('Add dependency')

    // Try to add a non-existent issue
    fireEvent.change(input, { target: { value: 'non-existent' } })
    fireEvent.click(addButton)

    // Verify error message is shown
    await waitFor(() => {
      expect(screen.getByText(/Issue non-existent not found/)).toBeInTheDocument()
    })
  })

  it('should show error when adding duplicate dependency', async () => {
    render(
      <IssueSidePanel
        issueId="test-2"
        onClose={vi.fn()}
        defaultEditMode={true}
      />
    )

    const input = screen.getByPlaceholderText(/Issue ID/)
    const addButton = screen.getByTitle('Add dependency')

    // Try to add an existing dependency
    fireEvent.change(input, { target: { value: 'test-1' } })
    fireEvent.click(addButton)

    // Verify error message is shown
    await waitFor(() => {
      expect(screen.getByText(/Dependency already exists/)).toBeInTheDocument()
    })
  })

  it('should allow changing dependency type', async () => {
    mockUpdateIssue.mockResolvedValueOnce(mockIssues[2])

    render(
      <IssueSidePanel
        issueId="test-3"
        onClose={vi.fn()}
        defaultEditMode={true}
      />
    )

    // Find the dependency type select by looking for the select with dependency type options
    const typeSelects = screen.getAllByRole('combobox')
    const typeSelect = typeSelects.find(select =>
      select.querySelector('option[value="blocks"]') &&
      select.querySelector('option[value="related"]')
    )!
    fireEvent.change(typeSelect, { target: { value: 'related' } })

    const input = screen.getByPlaceholderText(/Issue ID/)
    const addButton = screen.getByTitle('Add dependency')

    // Add a new dependency with "related" type
    fireEvent.change(input, { target: { value: 'test-1' } })
    fireEvent.click(addButton)

    // Close the panel (auto-save)
    const closeButton = screen.getByTitle('Close')
    fireEvent.click(closeButton)

    // Verify updateIssue was called with the correct type
    await waitFor(() => {
      expect(mockUpdateIssue).toHaveBeenCalledWith(
        'test-3',
        expect.objectContaining({
          dependencies: expect.arrayContaining([
            expect.objectContaining({
              depends_on_id: 'test-1',
              type: 'related',
            }),
          ]),
        })
      )
    })
  })

  it('should support Enter key to add dependency', async () => {
    render(
      <IssueSidePanel
        issueId="test-3"
        onClose={vi.fn()}
        defaultEditMode={true}
      />
    )

    const input = screen.getByPlaceholderText(/Issue ID/)

    // Add a new dependency using Enter key
    fireEvent.change(input, { target: { value: 'test-1' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    // Verify the dependency was added to the UI
    await waitFor(() => {
      expect(screen.getByText('test-1')).toBeInTheDocument()
    })
  })
})
