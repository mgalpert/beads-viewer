import { useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { useIssueStore } from '@/store/useIssueStore'
import type { Issue, Status } from '@/types/issue'
import { cn } from '@/lib/utils'
import { IssueSidePanel } from '../issues/IssueSidePanel'
import { STATUS_COLORS, STATUS_LABELS } from '@/constants'

function DraggableIssueCard({ issue, onClick }: { issue: Issue; onClick?: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: issue.id,
  })

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.5 : 1,
      }
    : undefined

  const handleClick = (e: React.MouseEvent) => {
    console.log('🖱️ Click on card:', issue.id, 'isDragging:', isDragging)
    // Only trigger onClick if not currently dragging
    if (!isDragging && onClick) {
      onClick()
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="bg-card rounded-lg p-3 border shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing"
      onClick={handleClick}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="font-mono text-xs text-muted-foreground">
          {issue.id}
        </span>
        {issue.dependencies && issue.dependencies.length > 0 && (
          <span className="text-xs text-muted-foreground">
            🔗 {issue.dependencies.length}
          </span>
        )}
      </div>
      <h4 className="font-medium text-sm mb-1">{issue.title}</h4>
      {issue.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
          {issue.description}
        </p>
      )}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="capitalize">{issue.issue_type}</span>
        <span>•</span>
        <span>P{issue.priority}</span>
      </div>
    </div>
  )
}

function IssueCard({ issue }: { issue: Issue }) {
  return (
    <div className="bg-card rounded-lg p-3 border shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <span className="font-mono text-xs text-muted-foreground">
          {issue.id}
        </span>
        {issue.dependencies && issue.dependencies.length > 0 && (
          <span className="text-xs text-muted-foreground">
            🔗 {issue.dependencies.length}
          </span>
        )}
      </div>
      <h4 className="font-medium text-sm mb-1">{issue.title}</h4>
      {issue.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
          {issue.description}
        </p>
      )}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="capitalize">{issue.issue_type}</span>
        <span>•</span>
        <span>P{issue.priority}</span>
      </div>
    </div>
  )
}

function Column({ status, issues, onIssueClick }: { status: Status; issues: Issue[]; onIssueClick: (issueId: string) => void }) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  })

  return (
    <div className="flex-1 min-w-[280px]">
      <div className={cn('rounded-t-lg p-3 mb-2', STATUS_COLORS[status])}>
        <h3 className="font-semibold text-sm">
          {STATUS_LABELS[status]} ({issues.length})
        </h3>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          'space-y-2 min-h-[500px] p-2 rounded-lg transition-colors',
          isOver && 'bg-muted/50 ring-2 ring-primary'
        )}
      >
        {issues.map(issue => (
          <DraggableIssueCard key={issue.id} issue={issue} onClick={() => onIssueClick(issue.id)} />
        ))}
        {issues.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-8">
            No issues
          </div>
        )}
      </div>
    </div>
  )
}

export function KanbanBoard() {
  const { issues, updateStatus } = useIssueStore()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    }),
    useSensor(KeyboardSensor)
  )

  const groupedIssues = useMemo(() => {
    const groups: Record<Status, Issue[]> = {
      open: [],
      in_progress: [],
      blocked: [],
      closed: [],
    }

    issues.forEach(issue => {
      groups[issue.status].push(issue)
    })

    return groups
  }, [issues])

  const handleDragStart = (event: DragStartEvent) => {
    console.log('🎯 Drag started:', event.active.id)
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    console.log('🏁 Drag ended:', {
      activeId: active.id,
      overId: over?.id,
      overData: over?.data
    })
    setActiveId(null)

    if (!over) {
      console.log('❌ No drop target')
      return
    }

    const issueId = active.id as string
    const newStatus = over.id as Status

    const issue = issues.find(i => i.id === issueId)
    if (!issue) {
      console.log('❌ Issue not found:', issueId)
      return
    }

    if (issue.status === newStatus) {
      console.log('⏭️ Status unchanged:', newStatus)
      return
    }

    console.log('✅ Updating status:', { issueId, oldStatus: issue.status, newStatus })
    try {
      await updateStatus(issueId, newStatus)
      console.log('✅ Status updated successfully')
    } catch (error) {
      console.error('❌ Failed to update issue status:', error)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Kanban Board</h2>
        <p className="text-muted-foreground">
          Drag and drop to update issue status
        </p>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          <Column status="open" issues={groupedIssues.open} onIssueClick={setSelectedIssueId} />
          <Column status="in_progress" issues={groupedIssues.in_progress} onIssueClick={setSelectedIssueId} />
          <Column status="blocked" issues={groupedIssues.blocked} onIssueClick={setSelectedIssueId} />
          <Column status="closed" issues={groupedIssues.closed} onIssueClick={setSelectedIssueId} />
        </div>

        <DragOverlay>
          {activeId ? (
            <IssueCard issue={issues.find(i => i.id === activeId)!} />
          ) : null}
        </DragOverlay>
      </DndContext>

      <IssueSidePanel
        issueId={selectedIssueId}
        onClose={() => setSelectedIssueId(null)}
        onNavigate={(issueId) => setSelectedIssueId(issueId)}
        defaultEditMode={true}
      />
    </div>
  )
}
