import { useMemo, useCallback, useState, useEffect } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import '@xyflow/react/dist/base.css'
import { RotateCcw } from 'lucide-react'
import { useIssueStore } from '@/store/useIssueStore'
import type { Issue } from '@/types/issue'
import { STATUS_BADGE_COLORS } from '@/constants'

export function DependencyGraph() {
  const [issuesWithDeps, setIssuesWithDeps] = useState<Issue[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Fetch issues with dependencies on mount
  useEffect(() => {
    const fetchIssuesWithDeps = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/issues?includeDeps=true')
        const data = await response.json()
        setIssuesWithDeps(data)
      } catch (error) {
        console.error('Failed to fetch issues with dependencies:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchIssuesWithDeps()
  }, [])

  const issues = issuesWithDeps

  // Create initial nodes and edges from issues
  const initialNodesAndEdges = useMemo(() => {
    const nodes: Node[] = []
    const edges: Edge[] = []

    console.log('DependencyGraph: Processing', issues.length, 'issues')

    // Debug: Log first issue to see structure
    if (issues.length > 0) {
      console.log('Sample issue structure:', issues[0])
    }

    // Create nodes for all issues
    issues.forEach((issue, index) => {
      nodes.push({
        id: issue.id,
        type: 'default',
        position: {
          x: (index % 5) * 250,
          y: Math.floor(index / 5) * 150,
        },
        data: {
          label: (
            <div className="text-xs">
              <div className="font-mono text-[10px] text-gray-500">{issue.id}</div>
              <div className="font-medium">{issue.title}</div>
              <div className="text-gray-600 capitalize">{issue.status.replace('_', ' ')}</div>
            </div>
          ),
        },
        style: {
          background: STATUS_BADGE_COLORS[issue.status] || '#gray',
          color: 'white',
          border: '2px solid #222',
          borderRadius: '8px',
          padding: '10px',
          width: 200,
          cursor: 'grab',
        },
        draggable: true,
      })

      // Create edges for dependencies (things this issue depends on)
      // Dotted lines for dependencies
      if (issue.dependencies && issue.dependencies.length > 0) {
        console.log(`Issue ${issue.id} depends on ${issue.dependencies.length} issues`)

        issue.dependencies.forEach(dependency => {
          // dependency is a full Issue object
          const depId = typeof dependency === 'object' ? dependency.id : dependency

          console.log(`Creating dependency edge: ${depId} -> ${issue.id}`)

          edges.push({
            id: `dep-${depId}-${issue.id}`,
            source: depId,
            target: issue.id,
            type: 'smoothstep',
            animated: false,
            style: {
              stroke: '#94a3b8',
              strokeWidth: 2,
              strokeDasharray: '5,5', // Dotted line
            },
            label: 'depends on',
            labelStyle: {
              fontSize: 10,
              fill: '#666',
            },
          })
        })
      }

      // Create edges for dependents (issues that depend on this one - blockers)
      // Solid red lines for blockers
      if (issue.dependents && issue.dependents.length > 0) {
        console.log(`Issue ${issue.id} blocks ${issue.dependents.length} issues`)

        issue.dependents.forEach(dependent => {
          // dependent is a full Issue object
          const depId = typeof dependent === 'object' ? dependent.id : dependent

          console.log(`Creating blocker edge: ${issue.id} blocks ${depId}`)

          edges.push({
            id: `blocks-${issue.id}-${depId}`,
            source: issue.id,
            target: depId,
            type: 'default',
            animated: true,
            style: {
              stroke: '#ef4444',
              strokeWidth: 3,
            },
            label: 'blocks',
            labelStyle: {
              fontSize: 10,
              fill: '#666',
            },
          })
        })
      }
    })

    console.log('DependencyGraph: Created', nodes.length, 'nodes and', edges.length, 'edges')

    return { nodes, edges }
  }, [issues])

  // Load saved positions from localStorage
  const savedPositions = useMemo(() => {
    const saved = localStorage.getItem('beads-graph-positions')
    return saved ? JSON.parse(saved) : {}
  }, [])

  // Apply saved positions to nodes
  const nodesWithSavedPositions = useMemo(() => {
    return initialNodesAndEdges.nodes.map(node => {
      if (savedPositions[node.id]) {
        return { ...node, position: savedPositions[node.id] }
      }
      return node
    })
  }, [initialNodesAndEdges.nodes, savedPositions])

  // Use ReactFlow state management for nodes and edges
  const [nodes, setNodes, onNodesChange] = useNodesState(nodesWithSavedPositions)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialNodesAndEdges.edges)

  // Update nodes and edges when issues change
  useMemo(() => {
    setNodes(nodesWithSavedPositions)
    setEdges(initialNodesAndEdges.edges)
  }, [nodesWithSavedPositions, initialNodesAndEdges.edges, setNodes, setEdges])

  // Save positions to localStorage when nodes change
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    onNodesChange(changes)

    // Save positions after drag ends
    const dragChanges = changes.filter(change => change.type === 'position' && !change.dragging)
    if (dragChanges.length > 0) {
      // Get current positions
      const positions: Record<string, { x: number; y: number }> = {}
      nodes.forEach(node => {
        const change = dragChanges.find(c => c.id === node.id)
        if (change && change.type === 'position' && change.position) {
          positions[node.id] = change.position
        } else {
          positions[node.id] = node.position
        }
      })

      // Merge with existing saved positions
      const existingSaved = localStorage.getItem('beads-graph-positions')
      const existing = existingSaved ? JSON.parse(existingSaved) : {}
      localStorage.setItem('beads-graph-positions', JSON.stringify({ ...existing, ...positions }))
    }
  }, [nodes, onNodesChange])

  const handleResetLayout = useCallback(() => {
    localStorage.removeItem('beads-graph-positions')
    setNodes(initialNodesAndEdges.nodes)
  }, [initialNodesAndEdges.nodes, setNodes])

  // Early returns AFTER all hooks
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96 text-muted-foreground">
        Loading dependency graph...
      </div>
    )
  }

  if (issues.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 text-muted-foreground">
        No issues to display
      </div>
    )
  }

  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 text-muted-foreground">
        Failed to process issues for graph visualization
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">Dependency Graph</h2>
          <p className="text-muted-foreground">
            Visualize issue dependencies and relationships ({nodes.length} nodes, {edges.length} edges)
          </p>
        </div>
        <button
          onClick={handleResetLayout}
          className="flex items-center gap-2 px-3 py-2 text-sm border rounded-lg hover:bg-muted transition-colors"
          title="Reset layout to default positions"
        >
          <RotateCcw className="w-4 h-4" />
          Reset Layout
        </button>
      </div>

      <div className="border rounded-lg bg-white" style={{ width: '100%', height: '600px', position: 'relative' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          attributionPosition="bottom-left"
          minZoom={0.1}
          maxZoom={4}
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
          nodesDraggable={true}
          nodesConnectable={false}
          elementsSelectable={true}
        >
          <Background color="#aaa" gap={16} />
          <Controls />
          <MiniMap
            nodeColor={(node) => {
              return node.style?.background as string || '#gray'
            }}
          />
        </ReactFlow>
      </div>

      <div className="mt-4 flex gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 rounded"></div>
          <span>Open</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-500 rounded"></div>
          <span>In Progress</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded"></div>
          <span>Blocked</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span>Closed</span>
        </div>
      </div>
    </div>
  )
}
