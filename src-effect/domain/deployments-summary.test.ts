/**
 * DeploymentLatest / DeploymentsSummary Schema round-trips +
 * buildDeploymentsSummary aggregation + stream stub.
 *
 * Copy to: src-effect/domain/deployments-summary.test.ts
 *
 * ALWAYS import from `@effect/vitest` — never bare `vitest`.
 */
import { Effect, Schema, Stream } from "effect"
import { describe, expect, it } from "@effect/vitest"
import {
  buildDeploymentsSummary,
  decodeDeploymentsSummary,
  decodeDeploymentLatest,
  DeploymentLatest,
  DeploymentsSummary,
  EnvironmentDeployments
} from "./deployments-summary"

const productionOlder = {
  id: 1,
  environment: "production",
  state: "success",
  description: "old",
  createdAt: "2026-09-01T12:00:00.000Z",
  updatedAt: "2026-09-01T12:05:00.000Z",
  creator: "agustif",
  ref: "main",
  sha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  url: "https://api.github.com/repos/agustif/ghfs/deployments/1"
} as const

const productionNewer = {
  id: 3,
  environment: "production",
  state: "unknown",
  description: null,
  createdAt: "2026-09-11T15:00:00.000Z",
  updatedAt: "2026-09-11T15:01:00.000Z",
  creator: "octocat",
  ref: "main",
  sha: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
} as const

const stagingOnly = {
  id: 2,
  environment: "staging",
  state: "pending",
  description: "staging deploy",
  createdAt: "2026-09-10T10:00:00.000Z",
  updatedAt: "2026-09-10T10:00:00.000Z",
  creator: null,
  ref: "develop",
  sha: "cccccccccccccccccccccccccccccccccccccccc",
  url: "https://api.github.com/repos/agustif/ghfs/deployments/2"
} as const

describe("DeploymentLatest / EnvironmentDeployments schemas", () => {
  it("makes and round-trips a lean latest row (optional url)", () => {
    const latest = DeploymentLatest.make({
      id: 1,
      state: "success",
      description: "rollout",
      createdAt: "2026-09-11T15:00:00.000Z",
      updatedAt: "2026-09-11T15:01:00.000Z",
      creator: "agustif",
      ref: "main",
      sha: "deadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
      url: "https://api.github.com/repos/agustif/ghfs/deployments/1"
    })

    const encoded = Schema.encodeSync(DeploymentLatest)(latest)
    expect(encoded).toEqual({
      id: 1,
      state: "success",
      description: "rollout",
      createdAt: "2026-09-11T15:00:00.000Z",
      updatedAt: "2026-09-11T15:01:00.000Z",
      creator: "agustif",
      ref: "main",
      sha: "deadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
      url: "https://api.github.com/repos/agustif/ghfs/deployments/1"
    })
    expect(encoded).not.toHaveProperty("payload")
    expect(encoded).not.toHaveProperty("statusesUrl")
    expect(encoded).not.toHaveProperty("task")

    const decoded = decodeDeploymentLatest(encoded)
    expect(decoded.creator).toBe("agustif")
    expect(decoded.url).toContain("/deployments/1")
  })

  it("allows null creator / description and omits url", () => {
    const latest = DeploymentLatest.make({
      id: 9,
      state: "unknown",
      description: null,
      createdAt: "2026-09-11T15:00:00.000Z",
      updatedAt: "2026-09-11T15:00:00.000Z",
      creator: null,
      ref: "main",
      sha: "abc"
    })
    const encoded = Schema.encodeSync(DeploymentLatest)(latest)
    expect(encoded.creator).toBeNull()
    expect(encoded.description).toBeNull()
    expect(encoded).not.toHaveProperty("url")
  })
})

describe("buildDeploymentsSummary", () => {
  it("aggregates by environment: latest by createdAt + count (lean, no history dump)", () => {
    const summary = buildDeploymentsSummary({
      deployments: [productionOlder, stagingOnly, productionNewer],
      syncedAt: "2026-09-11T15:30:00.000Z"
    })

    expect(Object.keys(summary.environments).sort()).toEqual([
      "production",
      "staging"
    ])
    expect(summary.environments.production?.count).toBe(2)
    expect(summary.environments.production?.latest.id).toBe(3)
    expect(summary.environments.production?.latest.creator).toBe("octocat")
    expect(summary.environments.production?.latest.state).toBe("unknown")
    expect(summary.environments.staging?.count).toBe(1)
    expect(summary.environments.staging?.latest.id).toBe(2)
    expect(summary.environments.staging?.latest.creator).toBeNull()
    expect(summary.syncedAt).toBe("2026-09-11T15:30:00.000Z")

    const encoded = Schema.encodeSync(DeploymentsSummary)(summary)
    expect(JSON.stringify(encoded)).not.toMatch(/"statusesUrl"/)
    expect(JSON.stringify(encoded)).not.toMatch(/"payload"/)
    expect(encoded.environments.production?.latest.sha).toBe(
      productionNewer.sha
    )

    const roundTrip = decodeDeploymentsSummary(encoded)
    expect(roundTrip.environments.production?.count).toBe(2)
    expect(roundTrip.environments.staging?.latest.ref).toBe("develop")
  })

  it("maps blank environment to unknown and builds empty map when fetch is empty", () => {
    const blankEnv = buildDeploymentsSummary({
      deployments: [
        {
          id: 5,
          environment: "   ",
          state: "unknown",
          description: null,
          createdAt: "2026-09-11T12:00:00.000Z",
          updatedAt: "2026-09-11T12:00:00.000Z",
          creator: null,
          ref: "main",
          sha: "ddd"
        }
      ],
      syncedAt: "2026-09-11T15:30:00.000Z"
    })
    expect(Object.keys(blankEnv.environments)).toEqual(["unknown"])
    expect(blankEnv.environments.unknown?.count).toBe(1)

    const empty = buildDeploymentsSummary({
      deployments: [],
      syncedAt: "2026-09-11T15:30:00.000Z"
    })
    expect(empty.environments).toEqual({})
    expect(empty.syncedAt).toBe("2026-09-11T15:30:00.000Z")

    const made = DeploymentsSummary.make({
      environments: {
        production: EnvironmentDeployments.make({
          latest: DeploymentLatest.make({
            id: 1,
            state: "success",
            description: null,
            createdAt: "2026-09-11T15:00:00.000Z",
            updatedAt: "2026-09-11T15:00:00.000Z",
            creator: "agustif",
            ref: "main",
            sha: "abc"
          }),
          count: 1
        })
      },
      syncedAt: "2026-09-11T15:30:00.000Z"
    })
    expect(made.environments.production?.count).toBe(1)
  })
})

describe("Stream.succeed deployments summary", () => {
  it("stub-streams a single DeploymentsSummary resource", async () => {
    const summary = buildDeploymentsSummary({
      deployments: [productionNewer, stagingOnly],
      syncedAt: "2026-09-11T15:30:00.000Z"
    })

    const collected = await Effect.runPromise(
      Stream.succeed(summary).pipe(
        Stream.runFold(() => [] as Array<DeploymentsSummary>, (acc, row) => {
          acc.push(row)
          return acc
        })
      )
    )

    expect(collected).toHaveLength(1)
    expect(Object.keys(collected[0]?.environments ?? {})).toHaveLength(2)
    expect(collected[0]?.environments.production?.latest.id).toBe(3)
  })
})
