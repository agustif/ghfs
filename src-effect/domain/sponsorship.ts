/**
 * Sponsorship list row (Schema-first) — lean GitHub Sponsors as-maintainer node.
 *
 * Copy to: src-effect/domain/sponsorship.ts
 * Then export from domain/index.ts: `export * from "./sponsorship"`
 *
 * Fields cover legacy ProviderSponsorship cues used by sync-sponsorships.ts
 * (tier{id,name,monthlyPriceInDollars,description}|null, sponsor{login,avatarUrl,url},
 * createdAt, isActive, isOneTime). GraphQL maps `sponsorEntity` → `sponsor`,
 * `isOneTimePayment` → `isOneTime`.
 *
 * Funding links (`funding.json` / `funding.md` from `.github/FUNDING.yml`) and
 * MirrorFs markdown (`sponsors.md`) are OUT OF SCOPE this slice — snapshot JSON
 * under `sponsorships/sponsorships.json` only.
 *
 * Wire via additive `GitHubClient.fetchSponsorships` —
 * GraphQL `user|organization.sponsorshipsAsMaintainer(first, after)` — see snippet.
 */
import { Schema } from 'effect'

/** Nested SponsorsTier (wire `tier`; null when custom / no tier). */
export const SponsorshipTier = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  monthlyPriceInDollars: Schema.Int,
  description: Schema.String,
})
export type SponsorshipTier = typeof SponsorshipTier.Type

/** Nested sponsor entity (wire `sponsorEntity` → User | Organization). */
export const SponsorshipSponsor = Schema.Struct({
  login: Schema.String,
  avatarUrl: Schema.String,
  url: Schema.String,
})
export type SponsorshipSponsor = typeof SponsorshipSponsor.Type

/**
 * Lean as-maintainer sponsorship list row (NOT funding.yml / markdown).
 * Wire via additive `GitHubClient.fetchSponsorships` — see snippet.
 */
export class Sponsorship extends Schema.Class<Sponsorship>('Sponsorship')({
  tier: Schema.NullOr(SponsorshipTier),
  sponsor: SponsorshipSponsor,
  createdAt: Schema.DateTimeUtc,
  isActive: Schema.Boolean,
  /** Wire `isOneTimePayment`. */
  isOneTime: Schema.Boolean,
}) {}
