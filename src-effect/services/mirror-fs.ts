import { Context, Effect, Layer } from "effect"
import { FileSystem, Path } from "@effect/platform"
import type { Issue, PullRequest, Repo, SyncState, FileSystemError } from "../domain"
import { GhfsConfig } from "./config"

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

      const ensureDir = Effect.fnUntraced(function* (dir: string) {
        const exists = yield* fs.exists(dir)
        if (!exists) {
          yield* fs.makeDirectory(dir, { recursive: true })
        }
      })

      const formatSlug = Effect.fnUntraced(function* (title: string): string {
        return title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .slice(0, 48) || "item"
      })

      const formatNumber = Effect.fnUntraced(function* (num: number): string {
        return String(num).padStart(5, "0")
      })

      const renderMarkdown = Effect.fnUntraced(function* (
        item: Issue | PullRequest,
        kind: "issue" | "pull"
      ): string {
        const frontmatter = {
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
          created_at: item.createdAt.toJSON(),
          updated_at: item.updatedAt.toJSON(),
          closed_at: item.closedAt?.toJSON() ?? null,
          last_synced_at: new Date().toISOString()
        }

        if (kind === "pull") {
          const pr = item as PullRequest
          Object.assign(frontmatter, {
            is_draft: pr.isDraft,
            merged: pr.merged,
            merged_at: pr.mergedAt?.toJSON() ?? null,
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
            content += `### Comment by @${comment.author} (${comment.createdAt.toJSON()})\n\n`
            content += `${comment.body}\n\n`
          }
        }

        return content
      })

      const ensureDirectory = Effect.fn("MirrorFs.ensureDirectory")(function* () {
        yield* ensureDir(baseDir)
        yield* ensureDir(path.join(baseDir, "issues"))
        yield* ensureDir(path.join(baseDir, "issues", "closed"))
        yield* ensureDir(path.join(baseDir, "pulls"))
        yield* ensureDir(path.join(baseDir, "pulls", "closed"))
        yield* ensureDir(path.join(baseDir, "schema"))
      })

      const writeIssue = Effect.fn("MirrorFs.writeIssue")(
        function* (issue: Issue, state: "open" | "closed"): Effect.fn.Return<string> {
          const slug = yield* formatSlug(issue.title)
          const num = yield* formatNumber(issue.number)
          const filename = `${num}-${slug}.md`

          const subdir = state === "closed" ? "closed" : ""
          const filePath = path.join(baseDir, "issues", subdir, filename)

          const content = yield* renderMarkdown(issue, "issue")
          yield* fs.writeFileString(filePath, content)

          return filePath
        }
      )

      const writePullRequest = Effect.fn("MirrorFs.writePullRequest")(
        function* (pr: PullRequest, state: "open" | "closed"): Effect.fn.Return<string> {
          const slug = yield* formatSlug(pr.title)
          const num = yield* formatNumber(pr.number)
          const filename = `${num}-${slug}.md`

          const subdir = state === "closed" ? "closed" : ""
          const filePath = path.join(baseDir, "pulls", subdir, filename)

          const content = yield* renderMarkdown(pr, "pull")
          yield* fs.writeFileString(filePath, content)

          return filePath
        }
      )

      const writePatch = Effect.fn("MirrorFs.writePatch")(
        function* (number: number, patch: string): Effect.fn.Return<string> {
          const num = yield* formatNumber(number)
          const filename = `${num}.patch`
          const filePath = path.join(baseDir, "pulls", filename)

          yield* fs.writeFileString(filePath, patch)

          return filePath
        }
      )

      const writeRepo = Effect.fn("MirrorFs.writeRepo")(function* (repo: Repo) {
        const filePath = path.join(baseDir, "repo.json")
        const content = JSON.stringify(repo, null, 2)
        yield* fs.writeFileString(filePath, content)
      })

      const writeSyncState = Effect.fn("MirrorFs.writeSyncState")(function* (state: SyncState) {
        const filePath = path.join(baseDir, ".sync.json")
        const content = JSON.stringify(state, null, 2)
        yield* fs.writeFileString(filePath, content)
      })

      const readSyncState = Effect.fn("MirrorFs.readSyncState")(function* (): Effect.fn.Return<
        SyncState | null
      > {
        const filePath = path.join(baseDir, ".sync.json")
        const exists = yield* fs.exists(filePath)

        if (!exists) {
          return null
        }

        const content = yield* fs.readFileString(filePath)
        const json = JSON.parse(content)
        return json as SyncState
      })

      const writeIssuesIndex = Effect.fn("MirrorFs.writeIssuesIndex")(
        function* (issues: Array<Issue>) {
          const filePath = path.join(baseDir, "issues.md")
          let content = "# Issues\n\n"
          content += `| Number | Title | State | Labels | Updated |\n`
          content += `|--------|-------|-------|--------|----------|\n`

          for (const issue of issues) {
            const labels = issue.labels.join(", ")
            const updated = issue.updatedAt.toISOString().split("T")[0]
            content += `| #${issue.number} | ${issue.title} | ${issue.state} | ${labels} | ${updated} |\n`
          }

          yield* fs.writeFileString(filePath, content)
        }
      )

      const writePullsIndex = Effect.fn("MirrorFs.writePullsIndex")(
        function* (pulls: Array<PullRequest>) {
          const filePath = path.join(baseDir, "pulls.md")
          let content = "# Pull Requests\n\n"
          content += `| Number | Title | State | Labels | Updated |\n`
          content += `|--------|-------|-------|--------|----------|\n`

          for (const pr of pulls) {
            const labels = pr.labels.join(", ")
            const updated = pr.updatedAt.toISOString().split("T")[0]
            content += `| #${pr.number} | ${pr.title} | ${pr.state} | ${labels} | ${updated} |\n`
          }

          yield* fs.writeFileString(filePath, content)
        }
      )

      const deletePath = Effect.fn("MirrorFs.deletePath")(function* (filePath: string) {
        const exists = yield* fs.exists(filePath)
        if (exists) {
          yield* fs.remove(filePath)
        }
      })

      const movePath = Effect.fn("MirrorFs.movePath")(
        function* (oldPath: string, newPath: string) {
          const exists = yield* fs.exists(oldPath)
          if (exists) {
            const newDir = path.dirname(newPath)
            yield* ensureDir(newDir)
            yield* fs.rename(oldPath, newPath)
          }
        }
      )

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
