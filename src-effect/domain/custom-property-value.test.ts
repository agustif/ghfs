/**
 * CustomPropertyValue Schema round-trips + stream stub.
 *
 * Copy to: src-effect/domain/custom-property-value.test.ts
 *
 * ALWAYS import from `@effect/vitest` — never bare `vitest`.
 */
import { Effect, Schema, Stream } from "effect"
import { describe, expect, it } from "@effect/vitest"
import {
  CustomPropertyValue,
  decodeCustomPropertyValue,
  decodeCustomPropertyValues
} from "./custom-property-value"

function encodeCustomPropertiesSnapshot(
  rows: Array<CustomPropertyValue>
): unknown {
  return Schema.encodeSync(Schema.Array(CustomPropertyValue))(rows)
}

describe("CustomPropertyValue schema (custom-properties/custom-properties.json)", () => {
  it("encodes lean array with string value", () => {
    const row = new CustomPropertyValue({
      propertyName: "environment",
      value: "production"
    })
    const encoded = encodeCustomPropertiesSnapshot([row])
    const decoded = Schema.decodeUnknownSync(Schema.Array(CustomPropertyValue))(
      encoded
    )
    expect(Array.isArray(encoded)).toBe(true)
    expect(decoded[0]?.propertyName).toBe("environment")
    expect(decoded[0]?.value).toBe("production")
    expect(encoded).not.toHaveProperty("synced_at")
    expect(encoded).not.toHaveProperty("repo")
  })

  it("allows string[] value", () => {
    const row = new CustomPropertyValue({
      propertyName: "service",
      value: ["web", "api"]
    })
    const rt = decodeCustomPropertyValue(Schema.encodeSync(CustomPropertyValue)(row))
    expect(rt.value).toEqual(["web", "api"])
  })

  it("allows number and null values", () => {
    const num = new CustomPropertyValue({
      propertyName: "tier",
      value: 3
    })
    const nil = new CustomPropertyValue({
      propertyName: "unset",
      value: null
    })
    expect(
      decodeCustomPropertyValue(Schema.encodeSync(CustomPropertyValue)(num)).value
    ).toBe(3)
    expect(
      decodeCustomPropertyValue(Schema.encodeSync(CustomPropertyValue)(nil)).value
    ).toBeNull()
  })

  it("decodes an array via decodeCustomPropertyValues", () => {
    const decoded = decodeCustomPropertyValues([
      { propertyName: "a", value: "x" },
      { propertyName: "b", value: ["y", "z"] },
      { propertyName: "c", value: null }
    ])
    expect(decoded).toHaveLength(3)
    expect(decoded[0]?.propertyName).toBe("a")
    expect(decoded[1]?.value).toEqual(["y", "z"])
    expect(decoded[2]?.value).toBeNull()
  })
})

describe("Stream.fromIterable custom properties", () => {
  it("stub-streams then sorts by propertyName", async () => {
    const rows = [
      new CustomPropertyValue({ propertyName: "zulu", value: "1" }),
      new CustomPropertyValue({ propertyName: "alpha", value: "2" })
    ]
    const collected = await Effect.runPromise(
      Stream.fromIterable(rows).pipe(
        Stream.runFold(
          () => [] as Array<CustomPropertyValue>,
          (acc, row) => {
            acc.push(row)
            return acc
          }
        )
      )
    )
    collected.sort((a, b) => a.propertyName.localeCompare(b.propertyName))
    expect(collected.map((r) => r.propertyName)).toEqual(["alpha", "zulu"])
  })
})
