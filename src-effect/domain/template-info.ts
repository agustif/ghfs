/**
 * Repo template flags (Schema-first) — tiny observe snapshot.
 *
 * Copy to: src-effect/domain/template-info.ts
 * Then export from domain/index.ts: `export * from "./template-info"`
 *
 * Fields cover legacy ProviderTemplateInfo / writeTemplateInfo in
 * src/sync/extended-metadata.ts: isTemplate, templateRepository.
 *
 * Snapshot path this slice: `template.json` (mirror root; matches
 * REPO_TEMPLATE_FILE_NAME). Kitchen-sink wrappers OOS.
 *
 * Wire via additive `GitHubClient.fetchTemplateInfo` — see snippet
 * (GET /repos/{owner}/{repo} → is_template + template_repository.full_name).
 */
import { Schema } from "effect"

/**
 * Lean template-info snapshot (single resource, not a list).
 */
export class TemplateInfo extends Schema.Class<TemplateInfo>("TemplateInfo")({
  /** Whether this repo is itself a GitHub template repository. */
  isTemplate: Schema.Boolean,
  /** Source template full_name when this repo was generated from one; else null. */
  templateRepository: Schema.NullOr(Schema.String)
}) {}
