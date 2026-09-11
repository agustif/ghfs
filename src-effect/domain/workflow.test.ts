/**
 * Workflow Schema round-trips + Stream.paginate stub decode.
 *
 * Copy to: src-effect/domain/workflow.test.ts
 *
 * ALWAYS import from `@effect/vitest` — never bare `vitest`.
 */
import { DateTime, Effect, Option, Schema, Stream } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { Workflow } from "./workflow"

const d = (iso: string) => DateTime.fromDateUnsafe(new Date(iso))

describe("Workflow schema", () => {
  it("encodes and decodes an active workflow with optional urls/nodeId", () => {
    const workflow = new Workflow({
      id: 1,
      nodeId: "W_kwDOABCDEF",
      name: "CI",
      path: ".github/workflows/ci.yml",
      state: "active",
      createdAt: d("2024-01-03T00:00:00.000Z"),
      updatedAt: d("2024-01-03T01:00:00.000Z"),
      htmlUrl: "https://github.com/acme/widgets/actions/workflows/ci.yml",
      badgeUrl: "https://github.com/acme/widgets/workflows/CI/badge.svg"
    })

    expect(workflow.name).toBe("CI")
    expect(workflow.state).toBe("active")
    expect(workflow.path).toBe(".github/workflows/ci.yml")

    const encoded = Schema.encodeSync(Workflow)(workflow)
    const decoded = Schema.decodeUnknownSync(Workflow)(encoded)
    expect(decoded.id).toBe(1)
    expect(decoded.nodeId).toBe("W_kwDOABCDEF")
    expect(decoded.name).toBe("CI")
    expect(decoded.path).toBe(".github/workflows/ci.yml")
    expect(decoded.state).toBe("active")
    expect(decoded.htmlUrl).toContain("ci.yml")
    expect(decoded.badgeUrl).toContain("badge.svg")
  })

  it("allows known disabled states and omits optional nodeId/htmlUrl/badgeUrl", () => {
    const workflow = new Workflow({
      id: 2,
      name: "Nightly",
      path: ".github/workflows/nightly.yml",
      state: "disabled_manually",
      createdAt: d("2024-02-01T00:00:00.000Z"),
      updatedAt: d("2024-02-02T00:00:00.000Z")
    })

    const roundTrip = Schema.decodeUnknownSync(Workflow)(
      Schema.encodeSync(Workflow)(workflow)
    )
    expect(roundTrip.state).toBe("disabled_manually")
    expect(roundTrip.nodeId).toBeUndefined()
    expect(roundTrip.htmlUrl).toBeUndefined()
    expect(roundTrip.badgeUrl).toBeUndefined()
  })

  it("accepts forward-compat unknown state strings", () => {
    const workflow = new Workflow({
      id: 3,
      name: "Fork-only",
      path: ".github/workflows/fork.yml",
      state: "disabled_fork",
      createdAt: d("2024-03-01T00:00:00.000Z"),
      updatedAt: d("2024-03-01T00:00:00.000Z")
    })

    const roundTrip = Schema.decodeUnknownSync(Workflow)(
      Schema.encodeSync(Workflow)(workflow)
    )
    expect(roundTrip.state).toBe("disabled_fork")
  })
})

describe("Stream.paginate workflow pages", () => {
  it("stub-decodes two pages into Workflow values", async () => {
    const pages: Array<Array<unknown>> = [
      [
        {
          id: 1,
          nodeId: "W_1",
          name: "CI",
          path: ".github/workflows/ci.yml",
          state: "active",
          createdAt: d("2024-01-01T00:00:00.000Z"),
          updatedAt: d("2024-01-01T00:00:00.000Z"),
          htmlUrl: "https://github.com/acme/widgets/actions/workflows/ci.yml",
          badgeUrl: "https://github.com/acme/widgets/workflows/CI/badge.svg"
        },
        {
          id: 2,
          name: "Release",
          path: ".github/workflows/release.yml",
          state: "disabled_inactivity",
          createdAt: d("2024-01-02T00:00:00.000Z"),
          updatedAt: d("2024-01-02T00:00:00.000Z")
        }
      ],
      [
        {
          id: 3,
          name: "Deleted-old",
          path: ".github/workflows/old.yml",
          state: "deleted",
          createdAt: d("2024-01-03T00:00:00.000Z"),
          updatedAt: d("2024-01-03T00:00:00.000Z")
        }
      ]
    ]

    type PageState = { readonly page: number }

    const stream = Stream.paginate({ page: 0 } as PageState, (state) =>
      Effect.sync(() => {
        if (state.page >= pages.length) {
          return [[], Option.none()] as const
        }
        const decoded = Schema.decodeUnknownSync(Schema.Array(Workflow))(
          pages[state.page]
        )
        const next =
          state.page + 1 < pages.length
            ? Option.some({ page: state.page + 1 })
            : Option.none<PageState>()
        return [decoded, next] as const
      })
    )

    const collected = await Effect.runPromise(
      stream.pipe(
        Stream.runFold(() => [] as Array<Workflow>, (acc, workflow) => {
          acc.push(workflow)
          return acc
        })
      )
    )

    expect(collected).toHaveLength(3)
    expect(collected.map((w) => w.name)).toEqual(["CI", "Release", "Deleted-old"])
    expect(collected[0]?.state).toBe("active")
    expect(collected[0]?.badgeUrl).toContain("badge.svg")
    expect(collected[1]?.state).toBe("disabled_inactivity")
    expect(collected[1]?.nodeId).toBeUndefined()
    expect(collected[2]?.state).toBe("deleted")
  })
})
