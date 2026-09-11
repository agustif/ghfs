/**
 * Repo-level GitHub milestone (Schema-first).
 *
 * Copy to: src-effect/domain/milestone.ts
 * Then export from domain/index.ts: `export * from "./milestone"`
 *
 * Slightly richer than Repo.milestones inline Struct (adds dueOn + issue counts)
 * to match legacy labels.json / milestones.json snapshot writes.
 */
import { Schema } from 'effect'

export class Milestone extends Schema.Class<Milestone>('Milestone')({
  number: Schema.Int,
  title: Schema.String,
  state: Schema.Literals(['open', 'closed']),
  description: Schema.NullOr(Schema.String),
  /** GitHub `due_on` (date or datetime string); null when unset. */
  dueOn: Schema.NullOr(Schema.String),
  openIssues: Schema.Int,
  closedIssues: Schema.Int,
}) {}
