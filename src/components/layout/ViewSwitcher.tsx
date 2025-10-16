import { cn } from '@/lib/utils'

interface ViewSwitcherProps {
  currentView: 'list' | 'board' | 'graph' | 'ready'
  onViewChange: (view: 'list' | 'board' | 'graph' | 'ready') => void
}

export function ViewSwitcher({ currentView, onViewChange }: ViewSwitcherProps) {
  const views = [
    { id: 'list', label: 'List' },
    { id: 'board', label: 'Board' },
    { id: 'graph', label: 'Graph' },
    { id: 'ready', label: 'Ready Work' },
  ] as const

  return (
    <div className="flex gap-2 border-b">
      {views.map(view => (
        <button
          key={view.id}
          onClick={() => onViewChange(view.id)}
          className={cn(
            'px-4 py-2 hover:bg-accent transition-colors',
            currentView === view.id && 'border-b-2 border-primary font-medium'
          )}
        >
          {view.label}
        </button>
      ))}
    </div>
  )
}
