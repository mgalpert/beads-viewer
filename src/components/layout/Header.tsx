import { Plus } from 'lucide-react'

interface HeaderProps {
  onCreateIssue: () => void
}

export function Header({ onCreateIssue }: HeaderProps) {
  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold">
              B
            </div>
            <h1 className="text-2xl font-bold">Beads Viewer</h1>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={onCreateIssue}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Issue
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
