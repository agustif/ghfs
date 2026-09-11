/**
 * RepoPackage Schema round-trips + Stream.paginate stub decode.
 *
 * Copy to: src-effect/domain/repo-package.test.ts
 *
 * ALWAYS import from `@effect/vitest` — never bare `vitest`.
 */
import { DateTime, Effect, Option, Schema, Stream } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { RepoPackage } from "./repo-package"

const d = (iso: string) => DateTime.fromDateUnsafe(new Date(iso))

describe("RepoPackage schema", () => {
  it("encodes and decodes a package with optional htmlUrl/repository", () => {
    const pkg = new RepoPackage({
      name: "ghfs",
      packageType: "npm",
      visibility: "public",
      owner: "acme",
      createdAt: d("2024-01-03T00:00:00.000Z"),
      updatedAt: d("2024-01-03T01:00:00.000Z"),
      htmlUrl: "https://github.com/acme/packages/npm/ghfs",
      repository: { fullName: "acme/widgets" }
    })

    expect(pkg.name).toBe("ghfs")
    expect(pkg.packageType).toBe("npm")
    expect(pkg.visibility).toBe("public")
    expect(pkg.owner).toBe("acme")
    expect(pkg.repository?.fullName).toBe("acme/widgets")

    const encoded = Schema.encodeSync(RepoPackage)(pkg)
    const decoded = Schema.decodeUnknownSync(RepoPackage)(encoded)
    expect(decoded.name).toBe("ghfs")
    expect(decoded.packageType).toBe("npm")
    expect(decoded.visibility).toBe("public")
    expect(decoded.owner).toBe("acme")
    expect(decoded.htmlUrl).toContain("ghfs")
    expect(decoded.repository?.fullName).toBe("acme/widgets")
  })

  it("allows omitting optional htmlUrl/repository and known container visibility", () => {
    const pkg = new RepoPackage({
      name: "widgets",
      packageType: "container",
      visibility: "private",
      owner: "acme",
      createdAt: d("2024-02-01T00:00:00.000Z"),
      updatedAt: d("2024-02-02T00:00:00.000Z")
    })

    const roundTrip = Schema.decodeUnknownSync(RepoPackage)(
      Schema.encodeSync(RepoPackage)(pkg)
    )
    expect(roundTrip.packageType).toBe("container")
    expect(roundTrip.visibility).toBe("private")
    expect(roundTrip.htmlUrl).toBeUndefined()
    expect(roundTrip.repository).toBeUndefined()
  })

  it("accepts forward-compat unknown packageType/visibility strings", () => {
    const pkg = new RepoPackage({
      name: "future-pkg",
      packageType: "cargo",
      visibility: "internal",
      owner: "acme",
      createdAt: d("2024-03-01T00:00:00.000Z"),
      updatedAt: d("2024-03-01T00:00:00.000Z")
    })

    const roundTrip = Schema.decodeUnknownSync(RepoPackage)(
      Schema.encodeSync(RepoPackage)(pkg)
    )
    expect(roundTrip.packageType).toBe("cargo")
    expect(roundTrip.visibility).toBe("internal")
  })
})

describe("Stream.paginate package pages", () => {
  it("stub-decodes two pages into RepoPackage values", async () => {
    const pages: Array<Array<unknown>> = [
      [
        {
          name: "alpha",
          packageType: "npm",
          visibility: "public",
          owner: "acme",
          createdAt: d("2024-01-01T00:00:00.000Z"),
          updatedAt: d("2024-01-01T00:00:00.000Z"),
          htmlUrl: "https://github.com/acme/packages/npm/alpha",
          repository: { fullName: "acme/widgets" }
        },
        {
          name: "beta",
          packageType: "container",
          visibility: "private",
          owner: "acme",
          createdAt: d("2024-01-02T00:00:00.000Z"),
          updatedAt: d("2024-01-02T00:00:00.000Z")
        }
      ],
      [
        {
          name: "gamma",
          packageType: "maven",
          visibility: "internal",
          owner: "acme",
          createdAt: d("2024-01-03T00:00:00.000Z"),
          updatedAt: d("2024-01-03T00:00:00.000Z"),
          repository: { fullName: "acme/lib" }
        }
      ]
    ]

    type PageState = { readonly page: number }

    const stream = Stream.paginate({ page: 0 } as PageState, (state) =>
      Effect.sync(() => {
        if (state.page >= pages.length) {
          return [[], Option.none()] as const
        }
        const decoded = Schema.decodeUnknownSync(Schema.Array(RepoPackage))(
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
        Stream.runFold(() => [] as Array<RepoPackage>, (acc, pkg) => {
          acc.push(pkg)
          return acc
        })
      )
    )

    expect(collected).toHaveLength(3)
    expect(collected.map((p) => p.name)).toEqual(["alpha", "beta", "gamma"])
    expect(collected[0]?.packageType).toBe("npm")
    expect(collected[0]?.repository?.fullName).toBe("acme/widgets")
    expect(collected[1]?.packageType).toBe("container")
    expect(collected[1]?.htmlUrl).toBeUndefined()
    expect(collected[2]?.visibility).toBe("internal")
  })
})
