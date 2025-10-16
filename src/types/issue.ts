export type Status = 'open' | 'in_progress' | 'blocked' | 'closed'

export type IssueType = 'bug' | 'feature' | 'task' | 'epic' | 'chore'

export type DependencyType = 'blocks' | 'related' | 'parent-child' | 'discovered-from'

export interface Dependency {
  issue_id: string
  depends_on_id: string
  type: DependencyType
  created_at: string
  created_by: string
}

export interface Issue {
  id: string
  title: string
  description?: string
  design?: string
  acceptance_criteria?: string
  notes?: string
  status: Status
  priority: number // 0-4, 0 is highest
  issue_type: IssueType
  assignee?: string
  estimated_minutes?: number
  created_at: string
  updated_at: string
  closed_at?: string
  external_ref?: string
  dependencies?: Dependency[]
  dependents?: Issue[] // Issues that depend on this one (from bd CLI)
  labels?: string[]
}

export interface IssueFilter {
  status?: Status[]
  priority?: number[]
  issue_type?: IssueType[]
  assignee?: string[]
  search?: string
}
