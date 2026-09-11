import { Context, DateTime, Effect, Layer, Schema } from "effect"
import { FileSystem, Path } from "@effect/platform"
import type { BadArgument, SystemError } from "@effect/platform/Error"
import type { Issue, PullRequest } from "../domain"
import { FileSystemError, Repo, SyncState } from "../domain"
import { GhfsConfig } from "./config"

type PlatformFsError = BadArgument | SystemError

function toFsError(filePath: string) {
  return (error: PlatformFsError): FileSystemError => {
    const path =
      "pathOrDescriptor" in error && typeof error.pathOrDescriptor === "string"
        ? error.pathOrDescriptor
        : filePath
    return new FileSystemError({
      message: error.message,
      path,
      cause: error
    })
  }
}


function toSchemaFsError(filePath: string) {
  return (error: unknown): FileSystemError =>
    new FileSystemError({
      message:
        error !== null &&
        typeof error === "object" &&
        "message" in error &&
        typeof (error as { message: unknown }).message === "string"
          ? (error as { message: string }).message
          : String(error),
      path: filePath,
      cause: error
    })
}

function formatSlug(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "item"
  )
}

function formatNumber(num: number): string {
  return String(num).padStart(5, "0")
}

export class MirrorFs extends Context.Service<
  MirrorFs,
  {
    ensureDirectory(): Effect.Effect<void, FileSystemError>
    writeIssue(issue: Issue, state: "open" | "closed"): Effect.Effect<string, FileSystemError>
    writePullRequest(
      pr: PullRequest,
      state: "open" | "closed"
    ): Effect.Effect<string, FileSystemError>
    writePatch(number: number, patch: string): Effect.Effect<string, FileSystemError>
    writeRepo(repo: Repo): Effect.Effect<void, FileSystemError>
    writeSyncState(state: SyncState): Effect.Effect<void, FileSystemError>
    readSyncState(): Effect.Effect<SyncState | null, FileSystemError>
    writeIssuesIndex(issues: Array<Issue>): Effect.Effect<void, FileSystemError>
    writePullsIndex(pulls: Array<PullRequest>): Effect.Effect<void, FileSystemError>
    deletePath(path: string): Effect.Effect<void, FileSystemError>
    movePath(oldPath: string, newPath: string): Effect.Effect<void, FileSystemError>
  }
>()(
  "ghfs/services/MirrorFs"
) {
  static readonly layer = Layer.effect(
    MirrorFs,
    Effect.gen(function* () {
      const config = yield* GhfsConfig
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path

      const baseDir = config.directory

      const ensureDir = Effect.fnUntraced(function* (
        dir: string
      ): Effect.fn.Return<void, FileSystemError> {
        const exists = yield* fs.exists(dir).pipe(Effect.mapError(toFsError(dir)))
        if (!exists) {
          yield* fs
            .makeDirectory(dir, { recursive: true })
            .pipe(Effect.mapError(toFsError(dir)))
        }
      })

      const renderMarkdown = Effect.fnUntraced(function* (
        item: Issue | PullRequest,
        kind: "issue" | "pull"
      ): Effect.fn.Return<string> {
        const now = yield* DateTime.now
        const frontmatter: Record<string, unknown> = {
          schema: "ghfs/item/v1",
          repo: config.repo,
          number: item.number,
          kind,
          state: item.state,
          title: item.title,
          author: item.author,
          labels: item.labels,
          assignees: item.assignees,
          milestone: item.milestone,
          created_at: DateTime.formatIso(item.createdAt),
          updated_at: DateTime.formatIso(item.updatedAt),
          closed_at: item.closedAt ? DateTime.formatIso(item.closedAt) : null,
          last_synced_at: DateTime.formatIso(now)
        }

        if (kind === "pull") {
          const pr = item as PullRequest
          Object.assign(frontmatter, {
            is_draft: pr.isDraft,
            merged: pr.merged,
            merged_at: pr.mergedAt ? DateTime.formatIso(pr.mergedAt) : null,
            base_ref: pr.baseRef,
            head_ref: pr.headRef,
            reviewers_requested: pr.reviewersRequested
          })
        }

        let content = "---\n"
        content += Object.entries(frontmatter)
          .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
          .join("\n")
        content += "\n---\n\n"

        content += `# ${item.title}\n\n`

        if (item.body) {
          content += `## Description\n\n${item.body}\n\n`
        }

        if (item.comments.length > 0) {
          content += `## Comments\n\n`
          for (const comment of item.comments) {
            content += `### Comment by @${comment.author} (${DateTime.formatIso(comment.createdAt)})\n\n`
            content += `${comment.body}\n\n`
          }
        }

        return content
      })

      const ensureDirectory = Effect.fn("MirrorFs.ensureDirectory")(function* (): Effect.fn.Return<
        void,
        FileSystemError
      > {
        yield* ensureDir(baseDir)
        yield* ensureDir(path.join(baseDir, "issues"))
        yield* ensureDir(path.join(baseDir, "issues", "closed"))
        yield* ensureDir(path.join(baseDir, "pulls"))
        yield* ensureDir(path.join(baseDir, "pulls", "closed"))
        yield* ensureDir(path.join(baseDir, "schema"))
      })

      const writeIssue = Effect.fn("MirrorFs.writeIssue")(function* (
        issue: Issue,
        state: "open" | "closed"
      ): Effect.fn.Return<string, FileSystemError> {
        const slug = formatSlug(issue.title)
        const num = formatNumber(issue.number)
        const filename = `${num}-${slug}.md`

        const subdir = state === "closed" ? "closed" : ""
        const filePath = path.join(baseDir, "issues", subdir, filename)

        const content = yield* renderMarkdown(issue, "issue")
        yield* fs.writeFileString(filePath, content).pipe(Effect.mapError(toFsError(filePath)))

        return filePath
      })

      const writePullRequest = Effect.fn("MirrorFs.writePullRequest")(function* (
        pr: PullRequest,
        state: "open" | "closed"
      ): Effect.fn.Return<string, FileSystemError> {
        const slug = formatSlug(pr.title)
        const num = formatNumber(pr.number)
        const filename = `${num}-${slug}.md`

        const subdir = state === "closed" ? "closed" : ""
        const filePath = path.join(baseDir, "pulls", subdir, filename)

        const content = yield* renderMarkdown(pr, "pull")
        yield* fs.writeFileString(filePath, content).pipe(Effect.mapError(toFsError(filePath)))

        return filePath
      })

      const writePatch = Effect.fn("MirrorFs.writePatch")(function* (
        number: number,
        patch: string
      ): Effect.fn.Return<string, FileSystemError> {
        const num = formatNumber(number)
        const filename = `${num}.patch`
        const filePath = path.join(baseDir, "pulls", filename)

        yield* fs.writeFileString(filePath, patch).pipe(Effect.mapError(toFsError(filePath)))

        return filePath
      })

      const writeRepo = Effect.fn("MirrorFs.writeRepo")(function* (
        repo: Repo
      ): Effect.fn.Return<void, FileSystemError> {
        const filePath = path.join(baseDir, "repo.json")
        const encoded = yield* Effect.try({
          try: () => Schema.encodeSync(Repo)(repo),
          catch: toSchemaFsError(filePath)
        })
        const content = JSON.stringify(encoded, null, 2)
        yield* fs.writeFileString(filePath, content).pipe(Effect.mapError(toFsError(filePath)))
      })

      const writeSyncState = Effect.fn("MirrorFs.writeSyncState")(function* (
        state: SyncState
      ): Effect.fn.Return<void, FileSystemError> {
        const filePath = path.join(baseDir, ".sync.json")
        const encoded = yield* Effect.try({
          try: () => Schema.encodeSync(SyncState)(state),
          catch: toSchemaFsError(filePath)
        })
        const content = JSON.stringify(encoded, null, 2)
        yield* fs.writeFileString(filePath, content).pipe(Effect.mapError(toFsError(filePath)))
      })

      const readSyncState = Effect.fn("MirrorFs.readSyncState")(function* (): Effect.fn.Return<
        SyncState | null,
        FileSystemError
      > {
        const filePath = path.join(baseDir, ".sync.json")
        const exists = yield* fs.exists(filePath).pipe(Effect.mapError(toFsError(filePath)))

        if (!exists) {
          return null
        }

        const content = yield* fs
          .readFileString(filePath)
          .pipe(Effect.mapError(toFsError(filePath)))

        const json = yield* Effect.try({
          try: () => JSON.parse(content) as unknown,
          catch: (error) =>
            new FileSystemError({
              message: "Failed to parse .sync.json",
              path: filePath,
              cause: error
            })
        })
        return yield* Effect.try({
          try: () => Schema.decodeUnknownSync(SyncState)(json),
          catch: toSchemaFsError(filePath)
        })
      })

      const writeIssuesIndex = Effect.fn("MirrorFs.writeIssuesIndex")(function* (
        issues: Array<Issue>
      ): Effect.fn.Return<void, FileSystemError> {
        const filePath = path.join(baseDir, "issues.md")
        let content = "# Issues\n\n"
        content += `| Number | Title | State | Labels | Updated |\n`
        content += `|--------|-------|-------|--------|----------|\n`

        for (const issue of issues) {
          const labels = issue.labels.join(", ")
          const updated = DateTime.formatIsoDateUtc(issue.updatedAt)
          content += `| #${issue.number} | ${issue.title} | ${issue.state} | ${labels} | ${updated} |\n`
        }

        yield* fs.writeFileString(filePath, content).pipe(Effect.mapError(toFsError(filePath)))
      })

      const writePullsIndex = Effect.fn("MirrorFs.writePullsIndex")(function* (
        pulls: Array<PullRequest>
      ): Effect.fn.Return<void, FileSystemError> {
        const filePath = path.join(baseDir, "pulls.md")
        let content = "# Pull Requests\n\n"
        content += `| Number | Title | State | Labels | Updated |\n`
        content += `|--------|-------|-------|--------|----------|\n`

        for (const pr of pulls) {
          const labels = pr.labels.join(", ")
          const updated = DateTime.formatIsoDateUtc(pr.updatedAt)
          content += `| #${pr.number} | ${pr.title} | ${pr.state} | ${labels} | ${updated} |\n`
        }

        yield* fs.writeFileString(filePath, content).pipe(Effect.mapError(toFsError(filePath)))
      })

      const deletePath = Effect.fn("MirrorFs.deletePath")(function* (
        filePath: string
      ): Effect.fn.Return<void, FileSystemError> {
        const exists = yield* fs.exists(filePath).pipe(Effect.mapError(toFsError(filePath)))
        if (exists) {
          yield* fs.remove(filePath).pipe(Effect.mapError(toFsError(filePath)))
        }
      })

      const movePath = Effect.fn("MirrorFs.movePath")(function* (
        oldPath: string,
        newPath: string
      ): Effect.fn.Return<void, FileSystemError> {
        const exists = yield* fs.exists(oldPath).pipe(Effect.mapError(toFsError(oldPath)))
        if (exists) {
          const newDir = path.dirname(newPath)
          yield* ensureDir(newDir)
          yield* fs.rename(oldPath, newPath).pipe(Effect.mapError(toFsError(newPath)))
        }
      })

      return MirrorFs.of({
        ensureDirectory,
        writeIssue,
        writePullRequest,
        writePatch,
        writeRepo,
        writeSyncState,
        readSyncState,
        writeIssuesIndex,
        writePullsIndex,
        deletePath,
        movePath
      })
    })
  )
}
