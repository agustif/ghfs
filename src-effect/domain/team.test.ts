/**
 * Team Schema round-trips + Stream.paginate cursor stub decode.
 *
 * Copy to: src-effect/domain/team.test.ts
 *
 * ALWAYS import from `@effect/vitest` — never bare `vitest`.
 */
import { DateTime, Effect, Option, Schema, Stream } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { Team } from "./team"

const d = (iso: string) => DateTime.fromDateUnsafe(new Date(iso))

describe("Team schema", () => {
  it("encodes and decodes a team with counts and description", () => {
    const team = new Team({
      id: "T_kwDOAcmeCore",
      slug: "core",
      name: "Core",
      privacy: "closed",
      membersCount: 12,
      repositoriesCount: 4,
      createdAt: d("2024-01-01T00:00:00.000Z"),
      updatedAt: d("2024-06-01T00:00:00.000Z"),
      url: "https://github.com/orgs/acme/teams/core",
      description: "Core maintainers"
    })

    expect(team.slug).toBe("core")
    expect(team.privacy).toBe("closed")
    expect(team.membersCount).toBe(12)
    expect(team.repositoriesCount).toBe(4)
    expect(team.description).toBe("Core maintainers")

    const encoded = Schema.encodeSync(Team)(team)
    const decoded = Schema.decodeUnknownSync(Team)(encoded)
    expect(decoded.id).toBe("T_kwDOAcmeCore")
    expect(decoded.slug).toBe("core")
    expect(decoded.name).toBe("Core")
    expect(decoded.privacy).toBe("closed")
    expect(decoded.membersCount).toBe(12)
    expect(decoded.repositoriesCount).toBe(4)
    expect(decoded.url).toContain("teams/core")
    expect(decoded.description).toBe("Core maintainers")
  })

  it("allows null description and secret/visible privacy", () => {
    const secret = new Team({
      id: "T_kwDOSecret",
      slug: "secret-ops",
      name: "Secret Ops",
      privacy: "secret",
      membersCount: 3,
      repositoriesCount: 1,
      createdAt: d("2024-02-01T00:00:00.000Z"),
      updatedAt: d("2024-02-02T00:00:00.000Z"),
      url: "https://github.com/orgs/acme/teams/secret-ops",
      description: null
    })
    const visible = new Team({
      id: "T_kwDOVisible",
      slug: "community",
      name: "Community",
      privacy: "visible",
      membersCount: 40,
      repositoriesCount: 2,
      createdAt: d("2024-03-01T00:00:00.000Z"),
      updatedAt: d("2024-03-02T00:00:00.000Z"),
      url: "https://github.com/orgs/acme/teams/community",
      description: null
    })

    const secretRt = Schema.decodeUnknownSync(Team)(Schema.encodeSync(Team)(secret))
    const visibleRt = Schema.decodeUnknownSync(Team)(Schema.encodeSync(Team)(visible))
    expect(secretRt.description).toBeNull()
    expect(secretRt.privacy).toBe("secret")
    expect(visibleRt.privacy).toBe("visible")
    expect(visibleRt.membersCount).toBe(40)
  })

  it("accepts forward-compat unknown privacy strings", () => {
    const team = new Team({
      id: "T_kwDOFuture",
      slug: "future",
      name: "Future",
      privacy: "INTERNAL",
      membersCount: 0,
      repositoriesCount: 0,
      createdAt: d("2024-04-01T00:00:00.000Z"),
      updatedAt: d("2024-04-01T00:00:00.000Z"),
      url: "https://github.com/orgs/acme/teams/future",
      description: null
    })

    expect(
      Schema.decodeUnknownSync(Team)(Schema.encodeSync(Team)(team)).privacy
    ).toBe("INTERNAL")
  })
})

describe("Stream.paginate teams pages", () => {
  it("stub-decodes two GraphQL-style pages into Team values", async () => {
    const pages: Array<{
      teams: Array<unknown>
      pageInfo: { hasNextPage: boolean; endCursor: string | null }
    }> = [
      {
        teams: [
          {
            id: "T_kwDOAlpha",
            slug: "alpha",
            name: "Alpha",
            privacy: "closed",
            membersCount: 5,
            repositoriesCount: 2,
            createdAt: d("2024-01-01T00:00:00.000Z"),
            updatedAt: d("2024-01-02T00:00:00.000Z"),
            url: "https://github.com/orgs/acme/teams/alpha",
            description: "Alpha team"
          },
          {
            id: "T_kwDOBeta",
            slug: "beta",
            name: "Beta",
            privacy: "secret",
            membersCount: 2,
            repositoriesCount: 1,
            createdAt: d("2024-01-03T00:00:00.000Z"),
            updatedAt: d("2024-01-04T00:00:00.000Z"),
            url: "https://github.com/orgs/acme/teams/beta",
            description: null
          }
        ],
        pageInfo: { hasNextPage: true, endCursor: "cursor-1" }
      },
      {
        teams: [
          {
            id: "T_kwDOGamma",
            slug: "gamma",
            name: "Gamma",
            privacy: "visible",
            membersCount: 8,
            repositoriesCount: 3,
            createdAt: d("2024-01-05T00:00:00.000Z"),
            updatedAt: d("2024-01-06T00:00:00.000Z"),
            url: "https://github.com/orgs/acme/teams/gamma",
            description: null
          }
        ],
        pageInfo: { hasNextPage: false, endCursor: null }
      }
    ]

    type PageState = { readonly cursor: string | null; readonly index: number }

    const stream = Stream.paginate(
      { cursor: null, index: 0 } as PageState,
      (state) =>
        Effect.sync(() => {
          if (state.index >= pages.length) {
            return [[], Option.none()] as const
          }
          const page = pages[state.index]!
          const decoded = Schema.decodeUnknownSync(Schema.Array(Team))(page.teams)
          const next =
            page.pageInfo.hasNextPage && page.pageInfo.endCursor
              ? Option.some({
                  cursor: page.pageInfo.endCursor,
                  index: state.index + 1
                })
              : Option.none<PageState>()
          return [decoded, next] as const
        })
    )

    const collected = await Effect.runPromise(
      stream.pipe(
        Stream.runFold(() => [] as Array<Team>, (acc, team) => {
          acc.push(team)
          return acc
        })
      )
    )

    expect(collected).toHaveLength(3)
    expect(collected.map((t) => t.slug)).toEqual(["alpha", "beta", "gamma"])
    expect(collected[0]?.membersCount).toBe(5)
    expect(collected[0]?.repositoriesCount).toBe(2)
    expect(collected[1]?.description).toBeNull()
    expect(collected[1]?.privacy).toBe("secret")
    expect(collected[2]?.privacy).toBe("visible")
  })
})
