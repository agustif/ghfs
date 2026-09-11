/**
 * Webhook Schema round-trips + Stream.paginate stub decode.
 *
 * Copy to: src-effect/domain/webhook.test.ts
 *
 * ALWAYS import from `@effect/vitest` — never bare `vitest`.
 */
import { DateTime, Effect, Option, Schema, Stream } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { Webhook } from "./webhook"

const d = (iso: string) => DateTime.fromDateUnsafe(new Date(iso))

describe("Webhook schema", () => {
  it("encodes and decodes a hook with redacted config url/secret and events", () => {
    const hook = new Webhook({
      id: 42,
      type: "Repository",
      name: "web",
      active: true,
      events: ["push", "pull_request"],
      config: {
        url: "https://********/hooks/gh",
        contentType: "json",
        insecureSsl: "0",
        secret: "[redacted]"
      },
      createdAt: d("2024-01-03T00:00:00.000Z"),
      updatedAt: d("2024-01-03T00:01:00.000Z")
    })

    expect(hook.id).toBe(42)
    expect(hook.type).toBe("Repository")
    expect(hook.name).toBe("web")
    expect(hook.active).toBe(true)
    expect(hook.events).toEqual(["push", "pull_request"])
    expect(hook.config.url).toContain("********")
    expect(hook.config.contentType).toBe("json")
    expect(hook.config.insecureSsl).toBe("0")
    expect(hook.config.secret).toBe("[redacted]")

    const encoded = Schema.encodeSync(Webhook)(hook)
    const decoded = Schema.decodeUnknownSync(Webhook)(encoded)
    expect(decoded.id).toBe(42)
    expect(decoded.events).toEqual(["push", "pull_request"])
    expect(decoded.config.url).toContain("********")
    expect(decoded.config.secret).toBe("[redacted]")
    expect(decoded.config.contentType).toBe("json")
  })

  it("allows lean config with only secret redaction and empty events", () => {
    const hook = new Webhook({
      id: 7,
      type: "Organization",
      name: "web",
      active: false,
      events: [],
      config: {
        secret: "[redacted]"
      },
      createdAt: d("2024-02-01T00:00:00.000Z"),
      updatedAt: d("2024-02-01T00:00:00.000Z")
    })

    const roundTrip = Schema.decodeUnknownSync(Webhook)(
      Schema.encodeSync(Webhook)(hook)
    )
    expect(roundTrip.active).toBe(false)
    expect(roundTrip.events).toEqual([])
    expect(roundTrip.config.url).toBeUndefined()
    expect(roundTrip.config.contentType).toBeUndefined()
    expect(roundTrip.config.insecureSsl).toBeUndefined()
    expect(roundTrip.config.secret).toBe("[redacted]")
  })

  it("accepts optional config fields independently", () => {
    const withUrlOnly = new Webhook({
      id: 1,
      type: "Repository",
      name: "web",
      active: true,
      events: ["issues"],
      config: {
        url: "https://********/a",
        secret: "[redacted]"
      },
      createdAt: d("2024-03-01T00:00:00.000Z"),
      updatedAt: d("2024-03-01T00:00:30.000Z")
    })
    const withContentType = new Webhook({
      id: 2,
      type: "Repository",
      name: "web",
      active: true,
      events: ["*"],
      config: {
        contentType: "form",
        insecureSsl: "1",
        secret: "[redacted]"
      },
      createdAt: d("2024-03-02T00:00:00.000Z"),
      updatedAt: d("2024-03-02T00:00:00.000Z")
    })

    expect(
      Schema.decodeUnknownSync(Webhook)(Schema.encodeSync(Webhook)(withUrlOnly))
        .config.url
    ).toContain("********")
    expect(
      Schema.decodeUnknownSync(Webhook)(Schema.encodeSync(Webhook)(withContentType))
        .config.contentType
    ).toBe("form")
    expect(
      Schema.decodeUnknownSync(Webhook)(Schema.encodeSync(Webhook)(withContentType))
        .config.insecureSsl
    ).toBe("1")
  })
})

describe("Stream.paginate actions-webhooks pages", () => {
  it("stub-decodes two pages into Webhook values", async () => {
    const pages: Array<Array<unknown>> = [
      [
        {
          id: 1,
          type: "Repository",
          name: "web",
          active: true,
          events: ["push"],
          config: {
            url: "https://********/one",
            contentType: "json",
            insecureSsl: "0",
            secret: "[redacted]"
          },
          createdAt: d("2024-01-01T00:00:00.000Z"),
          updatedAt: d("2024-01-01T00:01:00.000Z")
        },
        {
          id: 2,
          type: "Repository",
          name: "web",
          active: false,
          events: ["pull_request"],
          config: {
            contentType: "form",
            secret: "[redacted]"
          },
          createdAt: d("2024-01-02T00:00:00.000Z"),
          updatedAt: d("2024-01-02T00:00:00.000Z")
        }
      ],
      [
        {
          id: 3,
          type: "Organization",
          name: "web",
          active: true,
          events: [],
          config: {
            secret: "[redacted]"
          },
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
        const decoded = Schema.decodeUnknownSync(Schema.Array(Webhook))(
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
        Stream.runFold(() => [] as Array<Webhook>, (acc, hook) => {
          acc.push(hook)
          return acc
        })
      )
    )

    expect(collected).toHaveLength(3)
    expect(collected.map((h) => h.id)).toEqual([1, 2, 3])
    expect(collected[0]?.events).toEqual(["push"])
    expect(collected[0]?.config.url).toContain("********")
    expect(collected[0]?.config.secret).toBe("[redacted]")
    expect(collected[1]?.active).toBe(false)
    expect(collected[1]?.config.contentType).toBe("form")
    expect(collected[1]?.config.url).toBeUndefined()
    expect(collected[2]?.type).toBe("Organization")
    expect(collected[2]?.events).toEqual([])
  })
})
