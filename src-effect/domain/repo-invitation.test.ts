/**
 * RepoInvitation Schema round-trips + stream stub.
 *
 * Copy to: src-effect/domain/repo-invitation.test.ts
 *
 * ALWAYS import from `@effect/vitest` — never bare `vitest`.
 * Distinct from collaborator / person tests.
 */
import { DateTime, Effect, Schema, Stream } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { RepoInvitation } from "./repo-invitation"

const d = (iso: string) => DateTime.fromDateUnsafe(new Date(iso))

function encodeInvitationsSnapshot(rows: Array<RepoInvitation>): unknown {
  return Schema.encodeSync(Schema.Array(RepoInvitation))(rows)
}

describe("RepoInvitation schema (invitations.json)", () => {
  it("encodes lean array with inviter / invitee / permissions", () => {
    const row = new RepoInvitation({
      id: 55,
      permissions: "write",
      createdAt: d("2024-08-01T12:00:00.000Z"),
      inviter: "alice",
      invitee: "bob",
      htmlUrl: "https://github.com/acme/widgets/invitations"
    })

    const encoded = encodeInvitationsSnapshot([row])
    const decoded = Schema.decodeUnknownSync(Schema.Array(RepoInvitation))(encoded)

    expect(Array.isArray(encoded)).toBe(true)
    expect(decoded).toHaveLength(1)
    expect(decoded[0]?.id).toBe(55)
    expect(decoded[0]?.permissions).toBe("write")
    expect(decoded[0]?.inviter).toBe("alice")
    expect(decoded[0]?.invitee).toBe("bob")
    expect(encoded).not.toHaveProperty("repo")
    expect(encoded).not.toHaveProperty("synced_at")
  })

  it("allows null inviter / invitee", () => {
    const row = new RepoInvitation({
      id: 1,
      permissions: "read",
      createdAt: d("2024-09-01T00:00:00.000Z"),
      inviter: null,
      invitee: null
    })
    const roundTrip = Schema.decodeUnknownSync(RepoInvitation)(
      Schema.encodeSync(RepoInvitation)(row)
    )
    expect(roundTrip.inviter).toBeNull()
    expect(roundTrip.invitee).toBeNull()
    expect(roundTrip.permissions).toBe("read")
  })

  it("omits optional htmlUrl when absent", () => {
    const row = new RepoInvitation({
      id: 2,
      permissions: "admin",
      createdAt: d("2024-09-02T00:00:00.000Z"),
      inviter: "carol",
      invitee: "dave"
    })
    const encoded = Schema.encodeSync(RepoInvitation)(row) as Record<string, unknown>
    expect(encoded).not.toHaveProperty("htmlUrl")
  })
})

describe("Stream.paginate stub (invitations)", () => {
  it("stub-streams then sorts by id", async () => {
    const rows = [
      new RepoInvitation({
        id: 9,
        permissions: "triage",
        createdAt: d("2024-01-01T00:00:00.000Z"),
        inviter: "a",
        invitee: "b"
      }),
      new RepoInvitation({
        id: 3,
        permissions: "maintain",
        createdAt: d("2024-01-02T00:00:00.000Z"),
        inviter: "c",
        invitee: "d"
      })
    ]

    const collected = await Effect.runPromise(
      Stream.fromIterable(rows).pipe(
        Stream.runFold(() => [] as Array<RepoInvitation>, (acc, row) => {
          acc.push(row)
          return acc
        })
      )
    )
    collected.sort((a, b) => a.id - b.id)
    expect(collected.map((r) => r.id)).toEqual([3, 9])
  })
})
