/**
 * Collaborator Schema round-trips + Stream.paginate stub decode.
 *
 * Copy to: src-effect/domain/collaborator.test.ts
 *
 * ALWAYS import from `@effect/vitest` — never bare `vitest`.
 */
import { Effect, Option, Schema, Stream } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { Collaborator } from "./collaborator"

describe("Collaborator schema", () => {
  it("encodes and decodes a collaborator with permission, roleName, and permissions", () => {
    const collaborator = new Collaborator({
      login: "alice",
      name: "Alice Example",
      avatarUrl: "https://avatars.githubusercontent.com/u/1",
      permission: "admin",
      roleName: "admin",
      permissions: {
        admin: true,
        maintain: true,
        push: true,
        triage: true,
        pull: true
      }
    })

    expect(collaborator.login).toBe("alice")
    expect(collaborator.name).toBe("Alice Example")
    expect(collaborator.avatarUrl).toContain("avatars")
    expect(collaborator.permission).toBe("admin")
    expect(collaborator.roleName).toBe("admin")
    expect(collaborator.permissions?.admin).toBe(true)

    const encoded = Schema.encodeSync(Collaborator)(collaborator)
    const decoded = Schema.decodeUnknownSync(Collaborator)(encoded)
    expect(decoded.login).toBe("alice")
    expect(decoded.name).toBe("Alice Example")
    expect(decoded.avatarUrl).toContain("avatars")
    expect(decoded.permission).toBe("admin")
    expect(decoded.roleName).toBe("admin")
    expect(decoded.permissions).toEqual({
      admin: true,
      maintain: true,
      push: true,
      triage: true,
      pull: true
    })
  })

  it("allows null name/avatarUrl/permission and omitting optional fields", () => {
    const collaborator = new Collaborator({
      login: "bob",
      name: null,
      avatarUrl: null,
      permission: null
    })

    const roundTrip = Schema.decodeUnknownSync(Collaborator)(
      Schema.encodeSync(Collaborator)(collaborator)
    )
    expect(roundTrip.login).toBe("bob")
    expect(roundTrip.name).toBeNull()
    expect(roundTrip.avatarUrl).toBeNull()
    expect(roundTrip.permission).toBeNull()
    expect(roundTrip.roleName).toBeUndefined()
    expect(roundTrip.permissions).toBeUndefined()
  })

  it("accepts null roleName and lean permission without nested permissions", () => {
    const withNullRole = new Collaborator({
      login: "carol",
      name: null,
      avatarUrl: "https://avatars.githubusercontent.com/u/3",
      permission: "push",
      roleName: null
    })
    const lean = new Collaborator({
      login: "dave",
      name: "Dave",
      avatarUrl: null,
      permission: "pull"
    })

    expect(
      Schema.decodeUnknownSync(Collaborator)(Schema.encodeSync(Collaborator)(withNullRole))
        .roleName
    ).toBeNull()
    expect(
      Schema.decodeUnknownSync(Collaborator)(Schema.encodeSync(Collaborator)(lean)).permission
    ).toBe("pull")
    expect(
      Schema.decodeUnknownSync(Collaborator)(Schema.encodeSync(Collaborator)(lean)).permissions
    ).toBeUndefined()
  })
})

describe("Stream.paginate collaborators pages", () => {
  it("stub-decodes two pages into Collaborator values", async () => {
    const pages: Array<Array<unknown>> = [
      [
        {
          login: "alice",
          name: "Alice",
          avatarUrl: "https://avatars.githubusercontent.com/u/1",
          permission: "admin",
          roleName: "admin",
          permissions: {
            admin: true,
            maintain: true,
            push: true,
            triage: true,
            pull: true
          }
        },
        {
          login: "bob",
          name: null,
          avatarUrl: null,
          permission: "push",
          roleName: "write"
        }
      ],
      [
        {
          login: "carol",
          name: null,
          avatarUrl: "https://avatars.githubusercontent.com/u/3",
          permission: "pull",
          roleName: null
        }
      ]
    ]

    type PageState = { readonly page: number }

    const stream = Stream.paginate({ page: 0 } as PageState, (state) =>
      Effect.sync(() => {
        if (state.page >= pages.length) {
          return [[], Option.none()] as const
        }
        const decoded = Schema.decodeUnknownSync(Schema.Array(Collaborator))(
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
        Stream.runFold(() => [] as Array<Collaborator>, (acc, collaborator) => {
          acc.push(collaborator)
          return acc
        })
      )
    )

    expect(collected).toHaveLength(3)
    expect(collected.map((c) => c.login)).toEqual(["alice", "bob", "carol"])
    expect(collected[0]?.permission).toBe("admin")
    expect(collected[0]?.permissions?.admin).toBe(true)
    expect(collected[1]?.name).toBeNull()
    expect(collected[1]?.roleName).toBe("write")
    expect(collected[2]?.permission).toBe("pull")
    expect(collected[2]?.roleName).toBeNull()
  })
})
