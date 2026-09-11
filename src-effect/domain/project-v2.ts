/**
 * Repo ProjectV2 (Schema-first) — lean project list row.
 *
 * Copy to: src-effect/domain/project-v2.ts
 * Then export from domain/index.ts: `export * from "./project-v2"`
 *
 * Fields cover legacy ProviderProjectV2 cues used by sync-projects-v2.ts
 * (id, number, title, url, closed, public, shortDescription, createdAt,
 * updatedAt, closedAt, owner.login). GraphQL node `id` is a String.
 *
 * Project *items* / *fields* / readme / MirrorFs markdown layout
 * (`projects/<nnnnn-slug>/project.md`, index.md, items.md) are OUT OF SCOPE
 * this slice — snapshot JSON under `projects-v2/projects-v2.json` only.
 *
 * Wire via additive `GitHubClient.fetchProjectsV2` —
 * GraphQL `repository.projectsV2(first, after)` — see snippet.
 */
import { Schema } from 'effect'

/**
 * Lean repo-linked GitHub Projects V2 list row (NOT items/fields).
 * Wire via additive `GitHubClient.fetchProjectsV2` — see snippet.
 */
export class ProjectV2 extends Schema.Class<ProjectV2>('ProjectV2')({
  /** GraphQL global node id (e.g. "PVT_kwDO…"). */
  id: Schema.String,
  number: Schema.Int,
  title: Schema.String,
  url: Schema.String,
  closed: Schema.Boolean,
  /** Visibility flag from ProjectV2.public. */
  public: Schema.Boolean,
  shortDescription: Schema.NullOr(Schema.String),
  createdAt: Schema.DateTimeUtc,
  updatedAt: Schema.DateTimeUtc,
  closedAt: Schema.NullOr(Schema.DateTimeUtc),
  /** Project owner login (wire `owner.login` — Org or User). */
  ownerLogin: Schema.String,
}) {}
