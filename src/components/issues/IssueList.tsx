import { useMemo, useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table'
import { useIssueStore } from '@/store/useIssueStore'
import type { Issue } from '@/types/issue'
import { cn } from '@/lib/utils'
import { IssueSidePanel } from './IssueSidePanel'

const statusColors: Record<string, string> = {
  open: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  in_progress: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  blocked: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  closed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
}

const priorityLabels = ['Highest', 'High', 'Medium', 'Low', 'Lowest']

export function IssueList() {
  const { issues } = useIssueStore()
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null)

  const columns = useMemo<ColumnDef<Issue>[]>(
    () => [
      {
        accessorKey: 'id',
        header: 'ID',
        cell: ({ getValue }) => (
          <span className="font-mono text-sm">{getValue() as string}</span>
        ),
      },
      {
        accessorKey: 'title',
        header: 'Title',
        cell: ({ getValue }) => (
          <span className="font-medium">{getValue() as string}</span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => {
          const status = getValue() as string
          return (
            <span
              className={cn(
                'px-2 py-1 rounded text-xs font-medium',
                statusColors[status] || 'bg-gray-100 text-gray-800'
              )}
            >
              {status.replace('_', ' ')}
            </span>
          )
        },
      },
      {
        accessorKey: 'priority',
        header: 'Priority',
        cell: ({ getValue }) => {
          const priority = getValue() as number
          return (
            <span className="text-sm text-muted-foreground">
              {priorityLabels[priority] || priority}
            </span>
          )
        },
      },
      {
        accessorKey: 'issue_type',
        header: 'Type',
        cell: ({ getValue }) => (
          <span className="text-sm capitalize">
            {(getValue() as string).replace('_', ' ')}
          </span>
        ),
      },
      {
        accessorKey: 'dependencies',
        header: 'Blocked By',
        cell: ({ getValue }) => {
          const deps = getValue() as Issue['dependencies'] | undefined
          const blockingDeps = deps?.filter(d => d.type === 'blocks') || []
          return blockingDeps.length > 0 ? (
            <span className="text-sm text-muted-foreground font-mono">
              {blockingDeps.map(d => d.depends_on_id).join(', ')}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">-</span>
          )
        },
      },
      {
        accessorKey: 'created_at',
        header: 'Created',
        cell: ({ getValue }) => {
          const date = new Date(getValue() as string)
          return (
            <span className="text-sm text-muted-foreground">
              {date.toLocaleDateString()}
            </span>
          )
        },
      },
    ],
    []
  )

  const table = useReactTable({
    data: issues,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  return (
    <div className="rounded-md border">
      <table className="w-full">
        <thead>
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id} className="border-b bg-muted/50">
              {headerGroup.headers.map(header => (
                <th
                  key={header.id}
                  className="h-12 px-4 text-left align-middle font-medium text-muted-foreground"
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map(row => (
              <tr
                key={row.id}
                className="border-b transition-colors hover:bg-muted/50 cursor-pointer"
                onClick={() => setSelectedIssueId(row.original.id)}
              >
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="p-4 align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={columns.length}
                className="h-24 text-center text-muted-foreground"
              >
                No issues found.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <IssueSidePanel
        issueId={selectedIssueId}
        onClose={() => setSelectedIssueId(null)}
        onNavigate={(issueId) => setSelectedIssueId(issueId)}
        defaultEditMode={true}
      />
    </div>
  )
}
