/**
 * CODEOWNERS rules + file (Schema-first) — lean parse of GitHub CODEOWNERS.
 *
 * Copy to: src-effect/domain/codeowners.ts
 * Then export from domain/index.ts: `export * from "./codeowners"`
 *
 * Fields cover legacy ProviderCodeOwner (pattern + owners[]) and
 * ProviderCodeowners (path + content). lineNumber from graphql-provider is
 * OUT OF SCOPE this slice (lean Schema).
 *
 * Snapshot path this slice: `codeowners/codeowners.json` (CodeownersFile JSON).
 * MirrorFs markdown/layout (`meta/codeowners.md`) OUT OF SCOPE.
 *
 * Wire via additive `GitHubClient.fetchCodeowners` — Contents API probing
 * CODEOWNERS / .github/CODEOWNERS / docs/CODEOWNERS — see snippet.
 */
import { Schema } from 'effect'

/**
 * Single CODEOWNERS rule line: glob/path pattern → owning @users / @org/teams.
 */
export class CodeownersRule extends Schema.Class<CodeownersRule>('CodeownersRule')({
  /** Path / glob pattern (first whitespace-separated token on the line). */
  pattern: Schema.String,
  /** Owners that start with `@` (users or `org/team` slugs). */
  owners: Schema.Array(Schema.String),
}) {}

/**
 * Parsed CODEOWNERS file snapshot.
 * Wire via additive `GitHubClient.fetchCodeowners` — see snippet.
 */
export class CodeownersFile extends Schema.Class<CodeownersFile>('CodeownersFile')({
  /** Repo-relative path where the file was found (e.g. `.github/CODEOWNERS`). */
  path: Schema.optional(Schema.String),
  /** Ordered rules (comment / blank lines skipped). */
  rules: Schema.Array(CodeownersRule),
  /** Original file body when retained; null when omitted / unavailable. */
  raw: Schema.optional(Schema.NullOr(Schema.String)),
}) {}
