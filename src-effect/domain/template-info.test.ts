/**
 * TemplateInfo Schema round-trips + stream stub.
 *
 * Copy to: src-effect/domain/template-info.test.ts
 *
 * ALWAYS import from `@effect/vitest` — never bare `vitest`.
 */
import { Effect, Schema, Stream } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { TemplateInfo } from "./template-info"

describe("TemplateInfo schema (template.json)", () => {
  it("encodes isTemplate + templateRepository", () => {
    const info = new TemplateInfo({
      isTemplate: false,
      templateRepository: "acme/widgets-template"
    })
    const encoded = Schema.encodeSync(TemplateInfo)(info)
    const decoded = Schema.decodeUnknownSync(TemplateInfo)(encoded)
    expect(decoded.isTemplate).toBe(false)
    expect(decoded.templateRepository).toBe("acme/widgets-template")
    expect(encoded).not.toHaveProperty("repo")
    expect(encoded).not.toHaveProperty("synced_at")
  })

  it("encodes template repo with null source", () => {
    const info = new TemplateInfo({
      isTemplate: true,
      templateRepository: null
    })
    const roundTrip = Schema.decodeUnknownSync(TemplateInfo)(
      Schema.encodeSync(TemplateInfo)(info)
    )
    expect(roundTrip.isTemplate).toBe(true)
    expect(roundTrip.templateRepository).toBeNull()
  })

  it("encodes empty defaults", () => {
    const info = new TemplateInfo({
      isTemplate: false,
      templateRepository: null
    })
    expect(
      Schema.decodeUnknownSync(TemplateInfo)(Schema.encodeSync(TemplateInfo)(info))
    ).toEqual(info)
  })
})

describe("Stream.succeed template info", () => {
  it("stub-streams a single TemplateInfo", async () => {
    const info = new TemplateInfo({
      isTemplate: true,
      templateRepository: null
    })
    const collected = await Effect.runPromise(
      Stream.succeed(info).pipe(
        Stream.runFold(() => [] as Array<TemplateInfo>, (acc, row) => {
          acc.push(row)
          return acc
        })
      )
    )
    expect(collected).toHaveLength(1)
    expect(collected[0]?.isTemplate).toBe(true)
  })
})
