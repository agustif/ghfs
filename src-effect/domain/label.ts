/**
 * Repo-level GitHub label (Schema-first).
 *
 * Copy to: src-effect/domain/label.ts
 * Then export from domain/index.ts: `export * from "./label"`
 *
 * Distinct from Issue.labels (string names) and from Repo.labels inline Struct —
 * this Class mirrors ProviderLabel / labels.json snapshot shape.
 */
import { Schema } from 'effect'

export class Label extends Schema.Class<Label>('Label')({
  name: Schema.String,
  color: Schema.String,
  description: Schema.NullOr(Schema.String),
  /** GitHub "default" label flag (e.g. bug / documentation). */
  default: Schema.Boolean,
}) {}
