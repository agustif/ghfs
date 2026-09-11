/**
 * ProjectV2 Schema round-trips + Stream.paginate cursor stub decode.
 *
 * Copy to: src-effect/domain/project-v2.test.ts
 *
 * ALWAYS import from `@effect/vitest` — never bare `vitest`.
 */
import { DateTime, Effect, Option, Schema, Stream } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { ProjectV2 } from "./project-v2"

const d = (iso: string) => DateTime.fromDateUnsafe(new Date(iso))

describe("ProjectV2 schema", () => {
  it("encodes and decodes an open public project", () => {
    const project = new ProjectV2({
      id: "PVT_kwDOWidgets1",
      number: 3,
      title: "Roadmap",
      url: "https://github.com/orgs/acme/projects/3",
      closed: false,
      public: true,
      shortDescription: "Q3 roadmap",
      createdAt: d("2024-03-01T00:00:00.000Z"),
      updatedAt: d("2024-03-02T00:00:00.000Z"),
      closedAt: null,
      ownerLogin: "acme"
    })

    expect(project.number).toBe(3)
    expect(project.public).toBe(true)
    expect(project.ownerLogin).toBe("acme")

    const encoded = Schema.encodeSync(ProjectV2)(project)
    const decoded = Schema.decodeUnknownSync(ProjectV2)(encoded)
    expect(decoded.id).toBe("PVT_kwDOWidgets1")
    expect(decoded.title).toBe("Roadmap")
    expect(decoded.shortDescription).toBe("Q3 roadmap")
    expect(decoded.closed).toBe(false)
    expect(decoded.closedAt).toBeNull()
  })

  it("allows null shortDescription/closedAt and closed private projects", () => {
    const project = new ProjectV2({
      id: "PVT_kwDOWidgets2",
      number: 1,
      title: "Archived",
      url: "https://github.com/users/alice/projects/1",
      closed: true,
      public: false,
      shortDescription: null,
      createdAt: d("2024-01-01T00:00:00.000Z"),
      updatedAt: d("2024-01-05T00:00:00.000Z"),
      closedAt: d("2024-01-05T00:00:00.000Z"),
      ownerLogin: "alice"
    })

    const roundTrip = Schema.decodeUnknownSync(ProjectV2)(
      Schema.encodeSync(ProjectV2)(project)
    )
    expect(roundTrip.shortDescription).toBeNull()
    expect(roundTrip.closed).toBe(true)
    expect(roundTrip.public).toBe(false)
    expect(roundTrip.closedAt).not.toBeNull()
    expect(roundTrip.ownerLogin).toBe("alice")
  })
})

describe("Stream.paginate projects v2 cursor pages", () => {
  it("stub-decodes two GraphQL-style cursor pages into ProjectV2 values", async () => {
    const pages: Array<{
      projects: Array<unknown>
      pageInfo: { hasNextPage: boolean; endCursor: string | null }
    }> = [
      {
        projects: [
          {
            id: "PVT_1",
            number: 1,
            title: "Alpha",
            url: "https://github.com/orgs/acme/projects/1",
            closed: false,
            public: true,
            shortDescription: "first",
            createdAt: d("2024-01-01T00:00:00.000Z"),
            updatedAt: d("2024-01-01T00:00:00.000Z"),
            closedAt: null,
            ownerLogin: "acme"
          },
          {
            id: "PVT_2",
            number: 2,
            title: "Beta",
            url: "https://github.com/orgs/acme/projects/2",
            closed: false,
            public: false,
            shortDescription: null,
            createdAt: d("2024-01-02T00:00:00.000Z"),
            updatedAt: d("2024-01-02T00:00:00.000Z"),
            closedAt: null,
            ownerLogin: "acme"
          }
        ],
        pageInfo: { hasNextPage: true, endCursor: "cursor-page-1" }
      },
      {
        projects: [
          {
            id: "PVT_3",
            number: 3,
            title: "Gamma",
            url: "https://github.com/orgs/acme/projects/3",
            closed: true,
            public: true,
            shortDescription: "done",
            createdAt: d("2024-01-03T00:00:00.000Z"),
            updatedAt: d("2024-01-04T00:00:00.000Z"),
            closedAt: d("2024-01-04T00:00:00.000Z"),
            ownerLogin: "acme"
          }
        ],
        pageInfo: { hasNextPage: false, endCursor: "cursor-page-2" }
      }
    ]

    type PageState = { readonly cursor: string | null }
    const byCursor = new Map<string | null, (typeof pages)[number]>([
      [null, pages[0]!],
      ["cursor-page-1", pages[1]!]
    ])

    const stream = Stream.paginate({ cursor: null } as PageState, (state) =>
      Effect.sync(() => {
        const page = byCursor.get(state.cursor)
        if (!page) {
          return [[], Option.none()] as const
        }
        const decoded = Schema.decodeUnknownSync(Schema.Array(ProjectV2))(
          page.projects
        )
        const next =
          page.pageInfo.hasNextPage && page.pageInfo.endCursor
            ? Option.some({ cursor: page.pageInfo.endCursor })
            : Option.none<PageState>()
        return [decoded, next] as const
      })
    )

    const collected = await Effect.runPromise(
      stream.pipe(
        Stream.runFold(() => [] as Array<ProjectV2>, (acc, project) => {
          acc.push(project)
          return acc
        })
      )
    )

    expect(collected).toHaveLength(3)
    expect(collected.map((p) => p.number)).toEqual([1, 2, 3])
    expect(collected[0]?.shortDescription).toBe("first")
    expect(collected[1]?.public).toBe(false)
    expect(collected[2]?.closed).toBe(true)
    expect(collected[2]?.ownerLogin).toBe("acme")
  })
})
