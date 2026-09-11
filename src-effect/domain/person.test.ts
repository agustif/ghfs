/**
 * Person Schema round-trips + Stream.paginate stub decode.
 *
 * Copy to: src-effect/domain/person.test.ts
 *
 * ALWAYS import from `@effect/vitest` — never bare `vitest`.
 */
import { Effect, Option, Schema, Stream } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { Person } from "./person"

describe("Person schema", () => {
  it("encodes and decodes a contributor with optional htmlUrl/contributions/type", () => {
    const person = new Person({
      login: "alice",
      name: "Alice Example",
      avatarUrl: "https://avatars.githubusercontent.com/u/1",
      htmlUrl: "https://github.com/alice",
      contributions: 42,
      type: "user"
    })

    expect(person.login).toBe("alice")
    expect(person.name).toBe("Alice Example")
    expect(person.avatarUrl).toContain("avatars")
    expect(person.contributions).toBe(42)
    expect(person.type).toBe("user")

    const encoded = Schema.encodeSync(Person)(person)
    const decoded = Schema.decodeUnknownSync(Person)(encoded)
    expect(decoded.login).toBe("alice")
    expect(decoded.name).toBe("Alice Example")
    expect(decoded.avatarUrl).toContain("avatars")
    expect(decoded.htmlUrl).toContain("alice")
    expect(decoded.contributions).toBe(42)
    expect(decoded.type).toBe("user")
  })

  it("allows null name/avatarUrl and omitting optional fields", () => {
    const person = new Person({
      login: "bob",
      name: null,
      avatarUrl: null
    })

    const roundTrip = Schema.decodeUnknownSync(Person)(
      Schema.encodeSync(Person)(person)
    )
    expect(roundTrip.login).toBe("bob")
    expect(roundTrip.name).toBeNull()
    expect(roundTrip.avatarUrl).toBeNull()
    expect(roundTrip.htmlUrl).toBeUndefined()
    expect(roundTrip.contributions).toBeUndefined()
    expect(roundTrip.type).toBeUndefined()
  })

  it("accepts bot type and forward-compat unknown type strings", () => {
    const bot = new Person({
      login: "dependabot[bot]",
      name: null,
      avatarUrl: "https://avatars.githubusercontent.com/in/29110",
      contributions: 7,
      type: "bot"
    })
    const future = new Person({
      login: "org-bot",
      name: null,
      avatarUrl: null,
      type: "Organization"
    })

    expect(Schema.decodeUnknownSync(Person)(Schema.encodeSync(Person)(bot)).type).toBe(
      "bot"
    )
    expect(
      Schema.decodeUnknownSync(Person)(Schema.encodeSync(Person)(future)).type
    ).toBe("Organization")
  })
})

describe("Stream.paginate people pages", () => {
  it("stub-decodes two pages into Person values", async () => {
    const pages: Array<Array<unknown>> = [
      [
        {
          login: "alice",
          name: "Alice",
          avatarUrl: "https://avatars.githubusercontent.com/u/1",
          htmlUrl: "https://github.com/alice",
          contributions: 10,
          type: "user"
        },
        {
          login: "bob",
          name: null,
          avatarUrl: null,
          contributions: 3,
          type: "user"
        }
      ],
      [
        {
          login: "ci-bot",
          name: null,
          avatarUrl: "https://avatars.githubusercontent.com/in/1",
          htmlUrl: "https://github.com/apps/ci-bot",
          contributions: 1,
          type: "bot"
        }
      ]
    ]

    type PageState = { readonly page: number }

    const stream = Stream.paginate({ page: 0 } as PageState, (state) =>
      Effect.sync(() => {
        if (state.page >= pages.length) {
          return [[], Option.none()] as const
        }
        const decoded = Schema.decodeUnknownSync(Schema.Array(Person))(
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
        Stream.runFold(() => [] as Array<Person>, (acc, person) => {
          acc.push(person)
          return acc
        })
      )
    )

    expect(collected).toHaveLength(3)
    expect(collected.map((p) => p.login)).toEqual(["alice", "bob", "ci-bot"])
    expect(collected[0]?.type).toBe("user")
    expect(collected[0]?.contributions).toBe(10)
    expect(collected[1]?.name).toBeNull()
    expect(collected[1]?.avatarUrl).toBeNull()
    expect(collected[2]?.type).toBe("bot")
  })
})
