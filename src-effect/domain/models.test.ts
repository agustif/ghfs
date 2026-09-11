import { Array as Arr, DateTime, Option, Schema } from "effect"
import { expect, it } from "vitest"
import { Issue, PullRequest } from "../domain"

const d = (iso: string) => DateTime.fromDateUnsafe(new Date(iso))

it("Issue schema encodes and decodes", () => {
  const issue = new Issue({
    number: 1,
    title: "Test Issue",
    state: "open",
    body: "This is a test",
    author: "testuser",
    labels: ["bug", "enhancement"],
    assignees: ["dev1"],
    milestone: "v1.0",
    createdAt: d("2024-01-01T00:00:00.000Z"),
    updatedAt: d("2024-01-02T00:00:00.000Z"),
    closedAt: null,
    comments: [
      {
        id: 1,
        author: "commenter",
        body: "Great issue!",
        createdAt: d("2024-01-03T00:00:00.000Z"),
        updatedAt: d("2024-01-03T00:00:00.000Z")
      }
    ]
  })

  expect(issue.number).toBe(1)
  expect(issue.title).toBe("Test Issue")
  expect(issue.state).toBe("open")
  expect(issue.labels).toEqual(["bug", "enhancement"])
  expect(issue.comments).toHaveLength(1)
  expect(Option.getOrThrow(Arr.head(issue.comments)).author).toBe("commenter")

  const encoded = Schema.encodeSync(Issue)(issue)
  const decoded = Schema.decodeSync(Issue)(encoded)
  expect(decoded.number).toBe(1)
  expect(decoded.state).toBe("open")
  expect(Option.getOrThrow(Arr.head(decoded.comments)).author).toBe("commenter")
})

it("Issue validates required fields", () => {
  expect(() =>
    new Issue({
      number: 1,
      title: "Test",
      state: "open",
      body: null,
      author: "user",
      labels: [],
      assignees: [],
      milestone: null,
      createdAt: d("2024-01-01T00:00:00.000Z"),
      updatedAt: d("2024-01-02T00:00:00.000Z"),
      closedAt: null,
      comments: []
    })
  ).not.toThrow()
})

it("PullRequest schema encodes and decodes", () => {
  const pr = new PullRequest({
    number: 2,
    title: "Test PR",
    state: "open",
    body: "This is a test PR",
    author: "developer",
    labels: ["feature"],
    assignees: [],
    milestone: null,
    createdAt: d("2024-01-01T00:00:00.000Z"),
    updatedAt: d("2024-01-02T00:00:00.000Z"),
    closedAt: null,
    mergedAt: null,
    merged: false,
    isDraft: false,
    baseRef: "main",
    headRef: "feature-branch",
    reviewersRequested: ["reviewer1"],
    comments: []
  })

  expect(pr.number).toBe(2)
  expect(pr.title).toBe("Test PR")
  expect(pr.isDraft).toBe(false)
  expect(pr.merged).toBe(false)
  expect(pr.baseRef).toBe("main")
  expect(pr.headRef).toBe("feature-branch")
  expect(pr.reviewersRequested).toEqual(["reviewer1"])

  const encoded = Schema.encodeSync(PullRequest)(pr)
  const decoded = Schema.decodeSync(PullRequest)(encoded)
  expect(decoded.number).toBe(2)
  expect(decoded.baseRef).toBe("main")
})

it("PullRequest handles merged state", () => {
  const pr = new PullRequest({
    number: 3,
    title: "Merged PR",
    state: "closed",
    body: "Merged",
    author: "dev",
    labels: [],
    assignees: [],
    milestone: null,
    createdAt: d("2024-01-01T00:00:00.000Z"),
    updatedAt: d("2024-01-02T00:00:00.000Z"),
    closedAt: d("2024-01-02T00:00:00.000Z"),
    mergedAt: d("2024-01-02T00:00:00.000Z"),
    merged: true,
    isDraft: false,
    baseRef: "main",
    headRef: "feature",
    reviewersRequested: [],
    comments: []
  })

  expect(pr.merged).toBe(true)
  expect(pr.state).toBe("closed")
  expect(pr.mergedAt).not.toBeNull()
  expect(pr.closedAt).not.toBeNull()
})
