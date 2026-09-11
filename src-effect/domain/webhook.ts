/**
 * Repo webhook / hook (Schema-first) — lean REST hooks list row.
 *
 * Copy to: src-effect/domain/webhook.ts
 * Then export from domain/index.ts: `export * from "./webhook"`
 *
 * Fields cover legacy ProviderWebhook / sync-actions-webhooks.ts sanitized
 * snapshot cues: id, type, name, active, events, config{
 *   url?, contentType?, insecureSsl?, secret?
 * }, createdAt, updatedAt.
 *
 * Deliveries (`fetchWebhookDeliveries` / `{hookId}-deliveries.json`) and
 * MirrorFs markdown are OUT OF SCOPE (hooks *list* only this slice).
 *
 * Snapshot path this slice: `webhooks/webhooks.json` (JSON array).
 * Legacy wrote `webhooks/config.json` with `{ webhooks: […] }` wrapper —
 * lean array under webhooks/ matches sibling collaborators/packages style.
 *
 * Wire via additive `GitHubClient.fetchActionsWebhooks` —
 * `GET /repos/{owner}/{repo}/hooks?page=&per_page=` — see snippet.
 * Client redacts config.url host + always sets config.secret to `[redacted]`.
 */
import { Schema } from 'effect'

/**
 * Nested webhook delivery config (GitHub wire `config`).
 * `secret` is always redacted at the client boundary — never persist cleartext.
 */
export const WebhookConfig = Schema.Struct({
  /** Payload URL with hostname redacted (stars for host). */
  url: Schema.optional(Schema.String),
  /** Wire content_type (e.g. json / form). */
  contentType: Schema.optional(Schema.String),
  /** Wire insecure_ssl ("0" / "1"). */
  insecureSsl: Schema.optional(Schema.String),
  /** Always [redacted] when present — never the real hook secret. */
  secret: Schema.optional(Schema.String),
})
export type WebhookConfig = typeof WebhookConfig.Type

/**
 * Lean repo webhook (hook) list row.
 * Wire via additive `GitHubClient.fetchActionsWebhooks` — see snippet.
 */
export class Webhook extends Schema.Class<Webhook>('Webhook')({
  id: Schema.Int,
  type: Schema.String,
  name: Schema.String,
  active: Schema.Boolean,
  events: Schema.Array(Schema.String),
  config: WebhookConfig,
  createdAt: Schema.DateTimeUtc,
  updatedAt: Schema.DateTimeUtc,
}) {}
