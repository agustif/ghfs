/**
 * SecuritySummary / lean alert rows Schema round-trips + buildSecuritySummary + stream stub.
 *
 * Copy to: src-effect/domain/security-summary.test.ts
 *
 * ALWAYS import from `@effect/vitest` — never bare `vitest`.
 */
import { Effect, Schema, Stream } from "effect"
import { describe, expect, it } from "@effect/vitest"
import {
  buildSecuritySummary,
  CodeScanningAlertLean,
  DependabotAlertLean,
  SecretScanningAlertLean,
  SecurityAlertState,
  SecuritySeverity,
  SecuritySummary
} from "./security-summary"

const sampleDependabot = new DependabotAlertLean({
  number: 7,
  state: "open",
  severity: "critical",
  package: "lodash",
  url: "https://github.com/agustif/ghfs/security/dependabot/7"
})

const sampleCodeScanning = new CodeScanningAlertLean({
  number: 3,
  state: "open",
  severity: "high",
  rule: "js/sql-injection",
  url: "https://github.com/agustif/ghfs/security/code-scanning/3"
})

const sampleSecret = new SecretScanningAlertLean({
  number: 1,
  state: "open",
  secretType: "github_personal_access_token",
  url: "https://github.com/agustif/ghfs/security/secret-scanning/1"
})

describe("SecuritySeverity / SecurityAlertState", () => {
  it("decodes known severity + state literals", () => {
    expect(Schema.decodeUnknownSync(SecuritySeverity)("critical")).toBe("critical")
    expect(Schema.decodeUnknownSync(SecuritySeverity)("low")).toBe("low")
    expect(Schema.decodeUnknownSync(SecurityAlertState)("open")).toBe("open")
    expect(Schema.decodeUnknownSync(SecurityAlertState)("fixed")).toBe("fixed")
  })

  it("rejects unknown severity", () => {
    expect(() =>
      Schema.decodeUnknownSync(SecuritySeverity)("ultra")
    ).toThrow()
  })
})

describe("lean alert row schemas", () => {
  it("encodes DependabotAlertLean without kitchen-sink fields", () => {
    const encoded = Schema.encodeSync(DependabotAlertLean)(sampleDependabot)
    expect(encoded).toEqual({
      number: 7,
      state: "open",
      severity: "critical",
      package: "lodash",
      url: sampleDependabot.url
    })
    expect(encoded).not.toHaveProperty("securityAdvisory")
    expect(encoded).not.toHaveProperty("securityVulnerability")

    const decoded = Schema.decodeUnknownSync(DependabotAlertLean)(encoded)
    expect(decoded.package).toBe("lodash")
    expect(decoded.severity).toBe("critical")
  })

  it("encodes CodeScanningAlertLean as slim rule row", () => {
    const encoded = Schema.encodeSync(CodeScanningAlertLean)(sampleCodeScanning)
    expect(encoded.rule).toBe("js/sql-injection")
    expect(encoded).not.toHaveProperty("tool")
    expect(encoded).not.toHaveProperty("mostRecentInstance")
    expect(encoded).not.toHaveProperty("location")
  })

  it("encodes SecretScanningAlertLean without secret cleartext", () => {
    const encoded = Schema.encodeSync(SecretScanningAlertLean)(sampleSecret)
    expect(encoded.secretType).toBe("github_personal_access_token")
    expect(encoded).not.toHaveProperty("secret")
    expect(JSON.stringify(encoded)).not.toMatch(/ghp_|sk_live_|AKIA/)

    const roundTrip = Schema.decodeUnknownSync(SecretScanningAlertLean)(encoded)
    expect(roundTrip.number).toBe(1)
    expect(roundTrip.url).toBe(sampleSecret.url)
  })
})

describe("buildSecuritySummary", () => {
  it("aggregates counts and slim topAlerts (severity-sorted)", () => {
    const lowOpen = new DependabotAlertLean({
      number: 2,
      state: "open",
      severity: "low",
      package: "leftpad",
      url: "https://example.com/2"
    })
    const dismissed = new DependabotAlertLean({
      number: 9,
      state: "dismissed",
      severity: "critical",
      package: "ignored",
      url: "https://example.com/9"
    })

    const summary = buildSecuritySummary({
      dependabotAlerts: [lowOpen, sampleDependabot, dismissed],
      codeScanningAlerts: [sampleCodeScanning],
      secretScanningAlerts: [sampleSecret],
      syncedAt: "2026-09-11T15:00:00.000Z"
    })

    expect(summary.dependabot.total).toBe(3)
    expect(summary.dependabot.open).toBe(2)
    expect(summary.dependabot.critical).toBe(1)
    expect(summary.dependabot.low).toBe(1)
    // critical before low
    expect(summary.dependabot.topAlerts.map((a) => a.number)).toEqual([7, 2])
    expect(summary.dependabot.topAlerts[0]).toEqual({
      number: 7,
      severity: "critical",
      package: "lodash",
      url: sampleDependabot.url
    })
    expect(summary.dependabot.topAlerts[0]).not.toHaveProperty("securityAdvisory")

    expect(summary.codeScanning.open).toBe(1)
    expect(summary.codeScanning.high).toBe(1)
    expect(summary.codeScanning.topAlerts[0]?.rule).toBe("js/sql-injection")

    expect(summary.secretScanning.total).toBe(1)
    expect(summary.secretScanning.open).toBe(1)
    expect(summary.secretScanning.topAlerts[0]).toEqual({
      number: 1,
      secretType: "github_personal_access_token",
      url: sampleSecret.url
    })
    expect(summary.secretScanning.topAlerts[0]).not.toHaveProperty("secret")
    expect(summary.syncedAt).toBe("2026-09-11T15:00:00.000Z")
  })

  it("round-trips SecuritySummary encode/decode without secret fields", () => {
    const summary = buildSecuritySummary({
      dependabotAlerts: [sampleDependabot],
      codeScanningAlerts: [sampleCodeScanning],
      secretScanningAlerts: [sampleSecret],
      syncedAt: "2026-09-11T15:00:00.000Z"
    })

    const encoded = Schema.encodeSync(SecuritySummary)(summary)
    expect(JSON.stringify(encoded)).not.toMatch(/"secret"/)
    expect(encoded).not.toHaveProperty("dependabotAlerts")
    expect(encoded).not.toHaveProperty("codeScanningAlerts")

    const decoded = Schema.decodeUnknownSync(SecuritySummary)(encoded)
    expect(decoded.dependabot.critical).toBe(1)
    expect(decoded.codeScanning.topAlerts[0]?.rule).toBe("js/sql-injection")
    expect(decoded.secretScanning.topAlerts[0]?.secretType).toBe(
      "github_personal_access_token"
    )
  })

  it("builds empty buckets when all fetches are empty", () => {
    const empty = buildSecuritySummary({
      dependabotAlerts: [],
      codeScanningAlerts: [],
      secretScanningAlerts: [],
      syncedAt: "2026-09-11T15:00:00.000Z"
    })
    expect(empty.dependabot.total).toBe(0)
    expect(empty.dependabot.topAlerts).toEqual([])
    expect(empty.codeScanning.open).toBe(0)
    expect(empty.secretScanning.open).toBe(0)
  })
})

describe("Stream.succeed security summary", () => {
  it("stub-streams a single SecuritySummary resource", async () => {
    const summary = buildSecuritySummary({
      dependabotAlerts: [sampleDependabot],
      codeScanningAlerts: [],
      secretScanningAlerts: [],
      syncedAt: "2026-09-11T15:00:00.000Z"
    })

    const collected = await Effect.runPromise(
      Stream.succeed(summary).pipe(
        Stream.runFold(() => [] as Array<SecuritySummary>, (acc, row) => {
          acc.push(row)
          return acc
        })
      )
    )

    expect(collected).toHaveLength(1)
    expect(collected[0]?.dependabot.open).toBe(1)
    expect(collected[0]?.dependabot.topAlerts[0]?.package).toBe("lodash")
  })
})
