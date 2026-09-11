/**
 * CodeTodo Schema round-trips + multi-term stream stub.
 *
 * Copy to: src-effect/domain/search-code-todo.test.ts
 *
 * ALWAYS import from `@effect/vitest` — never bare `vitest`.
 */
import { Effect, Schema, Stream } from "effect"
import { describe, expect, it } from "@effect/vitest"
import {
  CodeTodo,
  decodeCodeTodo,
  decodeCodeTodos
} from "./search-code-todo"

describe("CodeTodo schema", () => {
  it("encodes and decodes a lean code-todo with fragments", () => {
    const row = CodeTodo.make({
      type: "code",
      source: "code-search",
      timestamp: "2024-01-15T10:30:00.000Z",
      path: "src/app.ts",
      sha: "abc123def456",
      url: "https://github.com/owner/repo/blob/main/src/app.ts",
      fragments: ["TODO: fix this", "FIXME later"]
    })

    expect(row.type).toBe("code")
    expect(row.source).toBe("code-search")
    expect(row.timestamp).toBe("2024-01-15T10:30:00.000Z")
    expect(row.path).toBe("src/app.ts")
    expect(row.sha).toBe("abc123def456")
    expect(row.url).toContain("src/app.ts")
    expect(row.fragments).toEqual(["TODO: fix this", "FIXME later"])

    const encoded = Schema.encodeSync(CodeTodo)(row)
    const decoded = decodeCodeTodo(encoded)
    expect(decoded.type).toBe("code")
    expect(decoded.source).toBe("code-search")
    expect(decoded.path).toBe("src/app.ts")
    expect(decoded.fragments).toHaveLength(2)
    expect(decoded.fragments[0]).toBe("TODO: fix this")
  })

  it("allows empty fragments array", () => {
    const lean = CodeTodo.make({
      type: "code",
      source: "code-search",
      timestamp: "2024-02-01T00:00:00.000Z",
      path: "lib/util.js",
      sha: "deadbeef",
      url: "https://github.com/owner/repo/blob/main/lib/util.js",
      fragments: []
    })

    const rt = decodeCodeTodo(Schema.encodeSync(CodeTodo)(lean))
    expect(rt.fragments).toEqual([])
    expect(rt.path).toBe("lib/util.js")
  })

  it("rejects non-code type via decode failure surface", () => {
    expect(() =>
      decodeCodeTodo({
        type: "commit",
        source: "code-search",
        timestamp: "2024-01-01T00:00:00.000Z",
        path: "x.ts",
        sha: "1",
        url: "https://example.com",
        fragments: []
      })
    ).toThrow()
  })

  it("decodes an array via decodeCodeTodos", () => {
    const decoded = decodeCodeTodos([
      {
        type: "code",
        source: "code-search",
        timestamp: "2024-01-01T00:00:00.000Z",
        path: "a.ts",
        sha: "aaa",
        url: "https://github.com/o/r/blob/main/a.ts",
        fragments: ["TODO"]
      },
      {
        type: "code",
        source: "code-search",
        timestamp: "2024-01-01T00:00:00.000Z",
        path: "b.ts",
        sha: "bbb",
        url: "https://github.com/o/r/blob/main/b.ts",
        fragments: ["FIXME", "@todo"]
      }
    ])
    expect(decoded).toHaveLength(2)
    expect(decoded[0]?.path).toBe("a.ts")
    expect(decoded[1]?.fragments).toEqual(["FIXME", "@todo"])
  })
})

describe("Stream.fromIterable code-todos", () => {
  it("stub-streams CodeTodo rows from a multi-term fetch array", async () => {
    const rows = decodeCodeTodos([
      {
        type: "code",
        source: "code-search",
        timestamp: "2024-01-15T10:30:00.000Z",
        path: "src/todo.ts",
        sha: "111",
        url: "https://github.com/owner/repo/blob/main/src/todo.ts",
        fragments: ["TODO: ship it"]
      },
      {
        type: "code",
        source: "code-search",
        timestamp: "2024-01-15T10:30:00.000Z",
        path: "src/fixme.ts",
        sha: "222",
        url: "https://github.com/owner/repo/blob/main/src/fixme.ts",
        fragments: ["FIXME: later"]
      }
    ])

    const collected = await Effect.runPromise(
      Stream.fromIterable(rows).pipe(
        Stream.runFold(() => [] as Array<CodeTodo>, (acc, row) => {
          acc.push(row)
          return acc
        })
      )
    )

    expect(collected).toHaveLength(2)
    expect(collected.map((r) => r.path)).toEqual(["src/todo.ts", "src/fixme.ts"])
    expect(collected[0]?.type).toBe("code")
    expect(collected[1]?.source).toBe("code-search")
    expect(collected[1]?.fragments[0]).toBe("FIXME: later")
  })
})
