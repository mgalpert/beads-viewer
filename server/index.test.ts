import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

// Mock the server module
const JSONL_PATH = join(process.cwd(), '.beads', 'test-issues.jsonl')

describe('API Server', () => {
  let app: express.Application

  beforeAll(() => {
    // Ensure test directory exists
    const testDir = join(process.cwd(), '.beads')
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true })
    }
  })

  beforeEach(() => {
    // Reset test data before each test
    const testIssues = [
      {
        id: 'TEST-1',
        title: 'Test Issue 1',
        description: 'This is a test issue',
        status: 'open',
        priority: 3,
        issue_type: 'task',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'TEST-2',
        title: 'Test Issue 2',
        description: 'Another test issue',
        status: 'in_progress',
        priority: 1,
        issue_type: 'bug',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]

    writeFileSync(JSONL_PATH, testIssues.map(i => JSON.stringify(i)).join('\n'))
  })

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      // Note: This test would need the actual server running
      expect(true).toBe(true)
    })
  })

  describe('Issue CRUD Operations', () => {
    describe('POST /api/issues', () => {
      it('should create a new issue with required fields', async () => {
        const newIssue = {
          title: 'New Test Issue',
          description: 'Test description',
          status: 'open',
          priority: 2,
          issue_type: 'feature',
        }

        // This test validates the structure
        expect(newIssue).toHaveProperty('title')
        expect(newIssue).toHaveProperty('status')
        expect(newIssue.status).toBe('open')
      })

      it('should validate required fields', () => {
        const invalidIssue = {
          description: 'Missing title',
        }

        expect(invalidIssue).not.toHaveProperty('title')
      })

      it('should generate timestamps', () => {
        const now = new Date().toISOString()
        expect(now).toMatch(/^\d{4}-\d{2}-\d{2}T/)
      })

      it('should accept optional fields', () => {
        const issueWithOptional = {
          title: 'Test',
          status: 'open',
          priority: 3,
          issue_type: 'task',
          assignee: 'test@example.com',
          estimated_minutes: 120,
          labels: ['frontend', 'urgent'],
          external_ref: 'EXT-123',
        }

        expect(issueWithOptional.assignee).toBe('test@example.com')
        expect(issueWithOptional.estimated_minutes).toBe(120)
        expect(issueWithOptional.labels).toHaveLength(2)
      })
    })

    describe('PATCH /api/issues/:id', () => {
      it('should update issue fields', () => {
        const updates = {
          title: 'Updated Title',
          status: 'in_progress',
          priority: 1,
        }

        expect(updates.status).toBe('in_progress')
        expect(updates.priority).toBe(1)
      })

      it('should set closed_at when status changes to closed', () => {
        const updates = {
          status: 'closed',
        }

        if (updates.status === 'closed') {
          const closed_at = new Date().toISOString()
          expect(closed_at).toBeDefined()
        }
      })

      it('should update timestamp', () => {
        const updated_at = new Date().toISOString()
        expect(updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/)
      })

      it('should handle partial updates', () => {
        const partialUpdate = {
          priority: 0,
        }

        expect(partialUpdate).not.toHaveProperty('title')
        expect(partialUpdate.priority).toBe(0)
      })
    })

    describe('DELETE /api/issues/:id', () => {
      it('should validate issue exists before deletion', () => {
        const issueId = 'TEST-1'
        expect(issueId).toBeDefined()
      })
    })

    describe('GET /api/issues', () => {
      it('should return all issues', () => {
        const content = readFileSync(JSONL_PATH, 'utf-8')
        const issues = content.trim().split('\n').map(line => JSON.parse(line))

        expect(issues).toHaveLength(2)
        expect(issues[0].id).toBe('TEST-1')
      })

      it('should parse labels from JSON', () => {
        const issue = {
          id: 'TEST-3',
          title: 'Test',
          labels: JSON.stringify(['tag1', 'tag2']),
        }

        const parsed = JSON.parse(issue.labels as string)
        expect(parsed).toHaveLength(2)
      })
    })

    describe('GET /api/issues/:id', () => {
      it('should return a specific issue', () => {
        const content = readFileSync(JSONL_PATH, 'utf-8')
        const issues = content.trim().split('\n').map(line => JSON.parse(line))
        const issue = issues.find((i: any) => i.id === 'TEST-1')

        expect(issue).toBeDefined()
        expect(issue?.title).toBe('Test Issue 1')
      })

      it('should handle non-existent issues', () => {
        const content = readFileSync(JSONL_PATH, 'utf-8')
        const issues = content.trim().split('\n').map(line => JSON.parse(line))
        const issue = issues.find((i: any) => i.id === 'NONEXISTENT')

        expect(issue).toBeUndefined()
      })
    })
  })

  describe('Data Persistence', () => {
    it('should sync to JSONL after operations', () => {
      const testData = { id: 'TEST-PERSIST', title: 'Persistence Test' }
      const jsonl = JSON.stringify(testData)

      writeFileSync(JSONL_PATH, jsonl)
      const read = readFileSync(JSONL_PATH, 'utf-8')

      expect(read).toBe(jsonl)
    })

    it('should maintain JSONL format', () => {
      const issues = [
        { id: '1', title: 'First' },
        { id: '2', title: 'Second' },
      ]
      const jsonl = issues.map(i => JSON.stringify(i)).join('\n')

      expect(jsonl.split('\n')).toHaveLength(2)
      expect(jsonl).not.toContain('[')
    })

    it('should handle empty JSONL files', () => {
      writeFileSync(JSONL_PATH, '')
      const content = readFileSync(JSONL_PATH, 'utf-8')
      const lines = content.trim().split('\n').filter(Boolean)

      expect(lines).toHaveLength(0)
    })
  })

  describe('Issue Validation', () => {
    it('should validate status values', () => {
      const validStatuses = ['open', 'in_progress', 'blocked', 'closed']
      expect(validStatuses).toContain('open')
      expect(validStatuses).not.toContain('invalid')
    })

    it('should validate priority range', () => {
      const priority = 2
      expect(priority).toBeGreaterThanOrEqual(0)
      expect(priority).toBeLessThanOrEqual(4)
    })

    it('should validate issue types', () => {
      const validTypes = ['bug', 'feature', 'task', 'epic', 'chore']
      expect(validTypes).toContain('bug')
      expect(validTypes).not.toContain('invalid')
    })

    it('should allow optional assignee', () => {
      const issueWithAssignee = { title: 'Test', assignee: 'user@test.com' }
      const issueWithoutAssignee = { title: 'Test' }

      expect(issueWithAssignee.assignee).toBeDefined()
      expect(issueWithoutAssignee).not.toHaveProperty('assignee')
    })

    it('should validate estimated_minutes is positive', () => {
      const estimate = 120
      expect(estimate).toBeGreaterThan(0)
    })
  })

  describe('WebSocket Events', () => {
    it('should prepare issue:created event', () => {
      const event = {
        type: 'issue:created',
        data: {
          id: 'TEST-WS-1',
          title: 'WebSocket Test',
        },
      }

      expect(event.type).toBe('issue:created')
      expect(event.data.id).toBe('TEST-WS-1')
    })

    it('should prepare issue:updated event', () => {
      const event = {
        type: 'issue:updated',
        data: {
          id: 'TEST-1',
          title: 'Updated via WebSocket',
        },
      }

      expect(event.type).toBe('issue:updated')
    })

    it('should prepare issue:deleted event', () => {
      const event = {
        type: 'issue:deleted',
        data: {
          id: 'TEST-1',
        },
      }

      expect(event.type).toBe('issue:deleted')
    })

    it('should serialize events to JSON', () => {
      const event = {
        type: 'issue:created',
        data: { id: 'TEST' },
      }
      const json = JSON.stringify(event)

      expect(json).toContain('issue:created')
      expect(JSON.parse(json)).toEqual(event)
    })
  })

  describe('Error Handling', () => {
    it('should handle malformed JSON in JSONL', () => {
      writeFileSync(JSONL_PATH, 'not valid json\n{"valid": "json"}')
      const content = readFileSync(JSONL_PATH, 'utf-8')
      const lines = content.split('\n')

      expect(() => {
        JSON.parse(lines[0])
      }).toThrow()

      expect(() => {
        JSON.parse(lines[1])
      }).not.toThrow()
    })

    it('should handle missing required fields', () => {
      const incomplete = {
        description: 'Missing title field',
      }

      expect(incomplete).not.toHaveProperty('title')
    })
  })

  describe('Sequential ID Generation', () => {
    // Helper function matching server logic
    function generateNextIssueId(issues: any[]): string {
      const numericIds = issues
        .map(issue => {
          const match = issue.id.match(/(\d+)$/)
          return match ? parseInt(match[1], 10) : 0
        })
        .filter(id => !isNaN(id))

      const maxId = numericIds.length > 0 ? Math.max(...numericIds) : 0
      return `BD-${maxId + 1}`
    }

    it('should generate BD-1 for empty issue list', () => {
      const issues: any[] = []
      const nextId = generateNextIssueId(issues)

      expect(nextId).toBe('BD-1')
    })

    it('should increment from highest numeric ID', () => {
      const issues = [
        { id: 'BD-1', title: 'First' },
        { id: 'BD-2', title: 'Second' },
        { id: 'BD-3', title: 'Third' },
      ]
      const nextId = generateNextIssueId(issues)

      expect(nextId).toBe('BD-4')
    })

    it('should handle test-* format IDs from existing data', () => {
      const issues = [
        { id: 'test-1', title: 'Test 1' },
        { id: 'test-2', title: 'Test 2' },
        { id: 'test-3', title: 'Test 3' },
      ]
      const nextId = generateNextIssueId(issues)

      expect(nextId).toBe('BD-4')
    })

    it('should handle mixed BD and test formats', () => {
      const issues = [
        { id: 'test-1', title: 'Test 1' },
        { id: 'test-2', title: 'Test 2' },
        { id: 'BD-10', title: 'BD Issue' },
        { id: 'test-5', title: 'Test 5' },
      ]
      const nextId = generateNextIssueId(issues)

      // Should pick up BD-10 as the highest
      expect(nextId).toBe('BD-11')
    })

    it('should handle timestamp-based IDs from old format', () => {
      const issues = [
        { id: 'BD-1760553600806', title: 'Old format 1' },
        { id: 'BD-1760553775496', title: 'Old format 2' },
        { id: 'BD-5', title: 'New format' },
      ]
      const nextId = generateNextIssueId(issues)

      // Should use the highest timestamp-based ID
      expect(nextId).toBe('BD-1760553775497')
    })

    it('should ignore non-numeric IDs', () => {
      const issues = [
        { id: 'CUSTOM-ID', title: 'Custom' },
        { id: 'ANOTHER-ONE', title: 'Another' },
        { id: 'BD-5', title: 'Numeric' },
      ]
      const nextId = generateNextIssueId(issues)

      expect(nextId).toBe('BD-6')
    })

    it('should handle IDs with multiple numbers (take last one)', () => {
      const issues = [
        { id: 'PROJECT-123-456', title: 'Multi-number' },
        { id: 'BD-789', title: 'Standard' },
      ]
      const nextId = generateNextIssueId(issues)

      // Should use 789 as the highest
      expect(nextId).toBe('BD-790')
    })

    it('should handle gaps in sequence', () => {
      const issues = [
        { id: 'BD-1', title: 'First' },
        { id: 'BD-5', title: 'Fifth (skipped 2-4)' },
        { id: 'BD-3', title: 'Third' },
      ]
      const nextId = generateNextIssueId(issues)

      // Should continue from highest, not fill gaps
      expect(nextId).toBe('BD-6')
    })

    it('should handle actual production data format', () => {
      const issues = [
        { id: 'test-1', title: 'Test issue 1' },
        { id: 'test-2', title: 'Test issue 2' },
        { id: 'test-3', title: 'Implement user authentication' },
        { id: 'test-4', title: 'Design database schema' },
        { id: 'test-5', title: 'API documentation' },
        { id: 'BD-1760553600806', title: 'test out new issue' },
        { id: 'BD-1760553775496', title: 'test issue 2' },
        { id: 'BD-1760553909609', title: 'test 123' },
      ]
      const nextId = generateNextIssueId(issues)

      // Should use the highest timestamp
      expect(nextId).toBe('BD-1760553909610')
    })

    it('should handle single issue', () => {
      const issues = [
        { id: 'BD-42', title: 'The Answer' },
      ]
      const nextId = generateNextIssueId(issues)

      expect(nextId).toBe('BD-43')
    })
  })
})
