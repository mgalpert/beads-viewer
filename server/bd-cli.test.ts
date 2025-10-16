import { describe, it, expect, beforeAll } from 'vitest';
import * as bd from './utils/bd-cli';

describe('BD CLI Integration', () => {
  it('should list issues', async () => {
    const issues = await bd.listIssues();
    expect(Array.isArray(issues)).toBe(true);
    expect(issues.length).toBeGreaterThan(0);
  });

  it('should get a single issue', async () => {
    const issues = await bd.listIssues();
    if (issues.length > 0) {
      const issue = await bd.getIssue(issues[0].id);
      expect(issue).toBeDefined();
      expect(issue.id).toBe(issues[0].id);
      expect(issue.title).toBeDefined();
    }
  });

  it('should create, update, and close an issue', async () => {
    // Create
    const newIssue = await bd.createIssue({
      title: 'Test issue from integration test',
      description: 'This is a test',
      priority: 3,
      type: 'task',
    });

    expect(newIssue).toBeDefined();
    expect(newIssue.title).toBe('Test issue from integration test');
    expect(newIssue.status).toBe('open');

    // Update
    const updatedIssue = await bd.updateIssue({
      id: newIssue.id,
      status: 'in_progress',
      priority: 1,
    });

    expect(updatedIssue.status).toBe('in_progress');
    expect(updatedIssue.priority).toBe(1);

    // Close
    const closedIssue = await bd.closeIssue(newIssue.id);
    expect(closedIssue.status).toBe('closed');
    expect(closedIssue.closed_at).toBeDefined();
  });

  it('should get ready issues', async () => {
    const readyIssues = await bd.getReadyIssues();
    expect(Array.isArray(readyIssues)).toBe(true);
  });

  it('should get blocked issues', async () => {
    const blockedIssues = await bd.getBlockedIssues();
    expect(Array.isArray(blockedIssues)).toBe(true);
  });
});
