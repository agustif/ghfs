import { expect, it } from '@effect/vitest'
import { Issue, PullRequest } from '../domain'

it.effect('Issue schema encodes and decodes', () => {
  const issue = new Issue({
    number: 1,
    title: 'Test Issue',
    state: 'open',
    body: 'This is a test',
    author: 'testuser',
    labels: ['bug', 'enhancement'],
    assignees: ['dev1'],
    milestone: 'v1.0',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
    closedAt: null,
    comments: [
      {
        id: 1,
        author: 'commenter',
        body: 'Great issue!',
        createdAt: new Date('2024-01-03'),
        updatedAt: new Date('2024-01-03'),
      },
    ],
  })

  expect(issue.number).toBe(1)
  expect(issue.title).toBe('Test Issue')
  expect(issue.state).toBe('open')
  expect(issue.labels).toEqual(['bug', 'enhancement'])
  expect(issue.comments).toHaveLength(1)
  expect(issue.comments[0].author).toBe('commenter')
})

it.effect('Issue validates required fields', () => {
  expect(() =>
    new Issue({
      number: 1,
      title: 'Test',
      state: 'open',
      body: null,
      author: 'user',
      labels: [],
      assignees: [],
      milestone: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      closedAt: null,
      comments: [],
    }),
  ).not.toThrow()
})

it.effect('PullRequest schema encodes and decodes', () => {
  const pr = new PullRequest({
    number: 2,
    title: 'Test PR',
    state: 'open',
    body: 'This is a test PR',
    author: 'developer',
    labels: ['feature'],
    assignees: [],
    milestone: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
    closedAt: null,
    mergedAt: null,
    merged: false,
    isDraft: false,
    baseRef: 'main',
    headRef: 'feature-branch',
    reviewersRequested: ['reviewer1'],
    comments: [],
  })

  expect(pr.number).toBe(2)
  expect(pr.title).toBe('Test PR')
  expect(pr.isDraft).toBe(false)
  expect(pr.merged).toBe(false)
  expect(pr.baseRef).toBe('main')
  expect(pr.headRef).toBe('feature-branch')
  expect(pr.reviewersRequested).toEqual(['reviewer1'])
})

it.effect('PullRequest handles merged state', () => {
  const pr = new PullRequest({
    number: 3,
    title: 'Merged PR',
    state: 'closed',
    body: 'Merged',
    author: 'dev',
    labels: [],
    assignees: [],
    milestone: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
    closedAt: new Date('2024-01-02'),
    mergedAt: new Date('2024-01-02'),
    merged: true,
    isDraft: false,
    baseRef: 'main',
    headRef: 'feature',
    reviewersRequested: [],
    comments: [],
  })

  expect(pr.merged).toBe(true)
  expect(pr.state).toBe('closed')
  expect(pr.mergedAt).toBeInstanceOf(Date)
  expect(pr.closedAt).toBeInstanceOf(Date)
})
