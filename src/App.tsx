import { useEffect, useState } from 'react'
import { useIssueStore } from './store/useIssueStore'
import { IssueList } from './components/issues/IssueList'
import { KanbanBoard } from './components/boards/KanbanBoard'
import { DependencyGraph } from './components/graphs/DependencyGraph'
import { ReadyWorkView } from './components/issues/ReadyWorkView'
import { ViewSwitcher } from './components/layout/ViewSwitcher'
import { Header } from './components/layout/Header'
import { IssueSidePanel } from './components/issues/IssueSidePanel'

type View = 'list' | 'board' | 'graph' | 'ready'

function App() {
  const [view, setView] = useState<View>('list')
  const [isCreateMode, setIsCreateMode] = useState(false)
  const { fetchIssues, connectWebSocket, disconnectWebSocket, isLoading, error } = useIssueStore()

  useEffect(() => {
    fetchIssues()
    connectWebSocket()

    return () => disconnectWebSocket()
  }, [fetchIssues, connectWebSocket, disconnectWebSocket])

  if (isLoading && useIssueStore.getState().issues.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Loading issues...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-destructive">Error: {error}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header onCreateIssue={() => setIsCreateMode(true)} />
      <main className="container mx-auto py-6">
        <ViewSwitcher currentView={view} onViewChange={setView} />

        <div className="mt-6">
          {view === 'list' && <IssueList />}
          {view === 'board' && <KanbanBoard />}
          {view === 'graph' && <DependencyGraph />}
          {view === 'ready' && <ReadyWorkView />}
        </div>
      </main>

      {/* Create issue side panel */}
      <IssueSidePanel
        issueId={null}
        createMode={isCreateMode}
        onClose={() => setIsCreateMode(false)}
      />
    </div>
  )
}

export default App
