import { spawn } from 'child_process';

export interface BdIssue {
  id: string;
  title: string;
  description?: string;
  design?: string;
  acceptance_criteria?: string;
  status: 'open' | 'in_progress' | 'blocked' | 'closed';
  priority: number; // 0-4, 0=highest
  issue_type: 'bug' | 'feature' | 'task' | 'epic' | 'chore';
  created_at: string;
  updated_at: string;
  assignee?: string;
  labels?: string[];
  external_ref?: string;
  dependents?: BdIssue[];
  dependencies?: BdIssue[];
}

export interface BdCreateOptions {
  title: string;
  description?: string;
  design?: string;
  acceptance?: string;
  priority?: number;
  type?: 'bug' | 'feature' | 'task' | 'epic' | 'chore';
  assignee?: string;
  labels?: string[];
  externalRef?: string;
  deps?: string[];
}

export interface BdUpdateOptions {
  id: string;
  title?: string;
  status?: 'open' | 'in_progress' | 'blocked' | 'closed';
  priority?: number;
  assignee?: string;
  design?: string;
  acceptanceCriteria?: string;
  externalRef?: string;
  notes?: string;
}

/**
 * Execute a bd CLI command and return parsed JSON output
 */
async function execBd(args: string[]): Promise<any> {
  return new Promise((resolve, reject) => {
    // Always add --json flag for programmatic output
    const allArgs = [...args, '--json'];

    const proc = spawn('bd', allArgs, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`bd command failed (exit ${code}): ${stderr}`));
        return;
      }

      try {
        // Parse JSON from stdout
        const result = JSON.parse(stdout);
        resolve(result);
      } catch (err) {
        reject(new Error(`Failed to parse bd output: ${err}\nOutput: ${stdout}`));
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to spawn bd command: ${err.message}`));
    });
  });
}

/**
 * List all issues
 */
export async function listIssues(): Promise<BdIssue[]> {
  return await execBd(['list']);
}

/**
 * Get a single issue by ID
 */
export async function getIssue(id: string): Promise<BdIssue> {
  return await execBd(['show', id]);
}

/**
 * Create a new issue
 */
export async function createIssue(options: BdCreateOptions): Promise<BdIssue> {
  const args = ['create', options.title];

  if (options.description) {
    args.push('--description', options.description);
  }
  if (options.design) {
    args.push('--design', options.design);
  }
  if (options.acceptance) {
    args.push('--acceptance', options.acceptance);
  }
  if (options.priority !== undefined) {
    args.push('--priority', String(options.priority));
  }
  if (options.type) {
    args.push('--type', options.type);
  }
  if (options.assignee) {
    args.push('--assignee', options.assignee);
  }
  if (options.labels && options.labels.length > 0) {
    args.push('--labels', options.labels.join(','));
  }
  if (options.externalRef) {
    args.push('--external-ref', options.externalRef);
  }
  if (options.deps && options.deps.length > 0) {
    args.push('--deps', options.deps.join(','));
  }

  return await execBd(args);
}

/**
 * Update an existing issue
 */
export async function updateIssue(options: BdUpdateOptions): Promise<BdIssue> {
  const args = ['update', options.id];

  if (options.title) {
    args.push('--title', options.title);
  }
  if (options.status) {
    args.push('--status', options.status);
  }
  if (options.priority !== undefined) {
    args.push('--priority', String(options.priority));
  }
  if (options.assignee) {
    args.push('--assignee', options.assignee);
  }
  if (options.design) {
    args.push('--design', options.design);
  }
  if (options.acceptanceCriteria) {
    args.push('--acceptance-criteria', options.acceptanceCriteria);
  }
  if (options.externalRef) {
    args.push('--external-ref', options.externalRef);
  }
  if (options.notes) {
    args.push('--notes', options.notes);
  }

  return await execBd(args);
}

/**
 * Close an issue
 */
export async function closeIssue(id: string): Promise<BdIssue> {
  const result = await execBd(['close', id]);
  // bd close returns an array, so extract the first item
  return Array.isArray(result) ? result[0] : result;
}

/**
 * Get ready work (issues with no open blockers)
 */
export async function getReadyIssues(): Promise<BdIssue[]> {
  return await execBd(['ready']);
}

/**
 * Get blocked issues
 */
export async function getBlockedIssues(): Promise<BdIssue[]> {
  return await execBd(['blocked']);
}

/**
 * Get all issues with their dependencies
 * This fetches each issue individually to get dependency information
 */
export async function listIssuesWithDependencies(): Promise<BdIssue[]> {
  // First get list of all issue IDs
  const issues = await listIssues();

  // Then fetch each issue with dependencies
  const issuesWithDeps = await Promise.all(
    issues.map(issue => getIssue(issue.id))
  );

  return issuesWithDeps;
}
