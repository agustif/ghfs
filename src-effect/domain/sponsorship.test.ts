/**
 * Sponsorship Schema round-trips + Stream.paginate cursor stub decode.
 *
 * Copy to: src-effect/domain/sponsorship.test.ts
 *
 * ALWAYS import from `@effect/vitest` — never bare `vitest`.
 */
import { DateTime, Effect, Option, Schema, Stream } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { Sponsorship, SponsorshipSponsor, SponsorshipTier } from "./sponsorship"

const d = (iso: string) => DateTime.fromDateUnsafe(new Date(iso))

describe("SponsorshipTier / SponsorshipSponsor schemas", () => {
  it("encodes and decodes a tier and sponsor struct", () => {
    const tier = Schema.decodeUnknownSync(SponsorshipTier)({
      id: "ST_kwDOTier1",
      name: "Gold",
      monthlyPriceInDollars: 25,
      description: "Gold sponsors"
    })
    const sponsor = Schema.decodeUnknownSync(SponsorshipSponsor)({
      login: "acme",
      avatarUrl: "https://avatars.githubusercontent.com/u/1",
      url: "https://github.com/acme"
    })

    expect(tier.monthlyPriceInDollars).toBe(25)
    expect(sponsor.login).toBe("acme")

    const tierRound = Schema.decodeUnknownSync(SponsorshipTier)(
      Schema.encodeSync(SponsorshipTier)(tier)
    )
    const sponsorRound = Schema.decodeUnknownSync(SponsorshipSponsor)(
      Schema.encodeSync(SponsorshipSponsor)(sponsor)
    )
    expect(tierRound.name).toBe("Gold")
    expect(sponsorRound.url).toBe("https://github.com/acme")
  })
})

describe("Sponsorship schema", () => {
  it("encodes and decodes an active recurring sponsorship with tier", () => {
    const sponsorship = new Sponsorship({
      tier: {
        id: "ST_kwDOTier1",
        name: "Gold",
        monthlyPriceInDollars: 25,
        description: "Gold sponsors"
      },
      sponsor: {
        login: "acme",
        avatarUrl: "https://avatars.githubusercontent.com/u/1",
        url: "https://github.com/acme"
      },
      createdAt: d("2024-03-01T00:00:00.000Z"),
      isActive: true,
      isOneTime: false
    })

    expect(sponsorship.isActive).toBe(true)
    expect(sponsorship.tier?.name).toBe("Gold")
    expect(sponsorship.sponsor.login).toBe("acme")

    const encoded = Schema.encodeSync(Sponsorship)(sponsorship)
    const decoded = Schema.decodeUnknownSync(Sponsorship)(encoded)
    expect(decoded.tier?.monthlyPriceInDollars).toBe(25)
    expect(decoded.isOneTime).toBe(false)
    expect(decoded.sponsor.url).toBe("https://github.com/acme")
  })

  it("allows null tier and one-time / inactive rows", () => {
    const sponsorship = new Sponsorship({
      tier: null,
      sponsor: {
        login: "bob",
        avatarUrl: "https://avatars.githubusercontent.com/u/2",
        url: "https://github.com/bob"
      },
      createdAt: d("2024-01-01T00:00:00.000Z"),
      isActive: false,
      isOneTime: true
    })

    const roundTrip = Schema.decodeUnknownSync(Sponsorship)(
      Schema.encodeSync(Sponsorship)(sponsorship)
    )
    expect(roundTrip.tier).toBeNull()
    expect(roundTrip.isActive).toBe(false)
    expect(roundTrip.isOneTime).toBe(true)
    expect(roundTrip.sponsor.login).toBe("bob")
  })
})

describe("Stream.paginate sponsorships cursor pages", () => {
  it("stub-decodes two GraphQL-style cursor pages into Sponsorship values", async () => {
    const pages: Array<{
      sponsorships: Array<unknown>
      pageInfo: { hasNextPage: boolean; endCursor: string | null }
    }> = [
      {
        sponsorships: [
          {
            tier: {
              id: "ST_1",
              name: "Bronze",
              monthlyPriceInDollars: 5,
              description: ""
            },
            sponsor: {
              login: "alice",
              avatarUrl: "https://avatars.githubusercontent.com/u/1",
              url: "https://github.com/alice"
            },
            createdAt: d("2024-01-01T00:00:00.000Z"),
            isActive: true,
            isOneTime: false
          },
          {
            tier: null,
            sponsor: {
              login: "bob",
              avatarUrl: "https://avatars.githubusercontent.com/u/2",
              url: "https://github.com/bob"
            },
            createdAt: d("2024-01-02T00:00:00.000Z"),
            isActive: true,
            isOneTime: true
          }
        ],
        pageInfo: { hasNextPage: true, endCursor: "cursor-page-1" }
      },
      {
        sponsorships: [
          {
            tier: {
              id: "ST_3",
              name: "Gold",
              monthlyPriceInDollars: 50,
              description: "Gold"
            },
            sponsor: {
              login: "carol",
              avatarUrl: "https://avatars.githubusercontent.com/u/3",
              url: "https://github.com/carol"
            },
            createdAt: d("2024-01-03T00:00:00.000Z"),
            isActive: false,
            isOneTime: false
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
        const decoded = Schema.decodeUnknownSync(Schema.Array(Sponsorship))(
          page.sponsorships
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
        Stream.runFold(() => [] as Array<Sponsorship>, (acc, sponsorship) => {
          acc.push(sponsorship)
          return acc
        })
      )
    )

    expect(collected).toHaveLength(3)
    expect(collected.map((s) => s.sponsor.login)).toEqual(["alice", "bob", "carol"])
    expect(collected[0]?.tier?.name).toBe("Bronze")
    expect(collected[1]?.tier).toBeNull()
    expect(collected[1]?.isOneTime).toBe(true)
    expect(collected[2]?.isActive).toBe(false)
  })
})
