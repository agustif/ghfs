/**
 * Label / Milestone Schema round-trips + Stream.paginate stub decode.
 *
 * Copy to: src-effect/domain/label.test.ts
 * (or src-effect/services/sync-labels.test.ts if co-located with service)
 *
 * ALWAYS import from `@effect/vitest` — never bare `vitest`.
 */
import { Effect, Option, Schema, Stream } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { Label } from "./label"
import { Milestone } from "./milestone"

describe("Label schema", () => {
  it("encodes and decodes", () => {
    const label = new Label({
      name: "bug",
      color: "d73a4a",
      description: "Something isn't working",
      default: true
    })

    expect(label.name).toBe("bug")
    expect(label.default).toBe(true)

    const encoded = Schema.encodeSync(Label)(label)
    const decoded = Schema.decodeUnknownSync(Label)(encoded)
    expect(decoded.name).toBe("bug")
    expect(decoded.color).toBe("d73a4a")
    expect(decoded.description).toBe("Something isn't working")
    expect(decoded.default).toBe(true)
  })

  it("allows null description", () => {
    const label = new Label({
      name: "wontfix",
      color: "ffffff",
      description: null,
      default: false
    })
    const roundTrip = Schema.decodeUnknownSync(Label)(Schema.encodeSync(Label)(label))
    expect(roundTrip.description).toBeNull()
  })
})

describe("Milestone schema", () => {
  it("encodes and decodes", () => {
    const milestone = new Milestone({
      number: 1,
      title: "v1.0",
      state: "open",
      description: "First release",
      dueOn: "2026-12-01",
      openIssues: 3,
      closedIssues: 1
    })

    const encoded = Schema.encodeSync(Milestone)(milestone)
    const decoded = Schema.decodeUnknownSync(Milestone)(encoded)
    expect(decoded.number).toBe(1)
    expect(decoded.state).toBe("open")
    expect(decoded.dueOn).toBe("2026-12-01")
    expect(decoded.openIssues).toBe(3)
  })
})

describe("Stream.paginate label pages", () => {
  it("stub-decodes two pages into Label values", async () => {
    const pages: Array<Array<unknown>> = [
      [
        { name: "bug", color: "d73a4a", description: null, default: true },
        { name: "docs", color: "0075ca", description: "Docs", default: false }
      ],
      [{ name: "enhancement", color: "a2eeef", description: null, default: false }]
    ]

    type PageState = { readonly page: number }

    const stream = Stream.paginate({ page: 0 } as PageState, (state) =>
      Effect.sync(() => {
        if (state.page >= pages.length) {
          return [[], Option.none()] as const
        }
        const decoded = Schema.decodeUnknownSync(Schema.Array(Label))(pages[state.page])
        const next =
          state.page + 1 < pages.length
            ? Option.some({ page: state.page + 1 })
            : Option.none<PageState>()
        return [decoded, next] as const
      })
    )

    const collected = await Effect.runPromise(
      stream.pipe(
        Stream.runFold([] as Array<Label>, (acc, label) => {
          acc.push(label)
          return acc
        })
      )
    )

    expect(collected).toHaveLength(3)
    expect(collected.map((l) => l.name)).toEqual(["bug", "docs", "enhancement"])
    expect(collected[0]?.default).toBe(true)
  })
})
