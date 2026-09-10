# GitHub Social & Organizational Surfaces — Gap Observation B

**Task**: ULTRAMEGA observe gap filler B for agustif/ghfs
**Date**: 2026-09-10
**Status**: Observation only (no implementation)

---

## Overview

This document identifies remaining GitHub social and organizational API surfaces not yet fully merged into ghfs. These surfaces cover:

1. **Organization Members** (if org repo)
2. **Outside Collaborators** (deep permissions & access patterns)
3. **Invitation Events** (pending invites, history)
4. **Community Metrics** (health score, profile completeness)
5. **Sponsorships Metadata** (GraphQL only, if enabled)
6. **Funding Configuration** (`.github/FUNDING.yml` mirror)

**Scope**: Observation only — documenting gaps, not implementing.

---

## 1. Organization Members

### API Endpoints

#### REST
- `GET /orgs/{org}/members` — List all organization members
- `GET /orgs/{org}/members/{username}` — Check organization membership
- `GET /orgs/{org}/public_members` — List public members
- `GET /orgs/{org}/memberships/{username}` — Get organization membership (role: admin/member)

#### GraphQL
```graphql
query OrgMembers($org: String!) {
  organization(login: $org) {
    membersWithRole(first: 100) {
      edges {
        node {
          login
          name
          avatarUrl
          url
        }
        role # OWNER, MEMBER
      }
    }
  }
}
```

### Current Status
- ❌ **Not implemented** in ghfs
- No config toggle for `sync.orgMembers`
- No `.ghfs/org/` directory structure

### Proposed File Structure
```
.ghfs/org/
├── members.json              # All org members with roles
├── public-members.json       # Public members list
└── membership-summary.json   # Counts by role (owner/member)
```

### Notes
- Only applies to **organization-owned repositories**
- User-owned repos: skip this surface entirely
- Requires `read:org` scope on token
- May be restricted by enterprise policies

---

## 2. Outside Collaborators

### API Endpoints

#### REST
- `GET /orgs/{org}/outside_collaborators` — List outside collaborators for org
  - Query params: `filter=2fa_disabled|2fa_insecure|all`, `per_page`, `page`
- `PUT /orgs/{org}/outside_collaborators/{username}` — Convert member to outside collaborator
- `DELETE /orgs/{org}/outside_collaborators/{username}` — Remove outside collaborator

#### Per-Repository Collaborators (works for both org and user repos)
- `GET /repos/{owner}/{repo}/collaborators` — List repository collaborators
  - Query params: `affiliation=outside|direct|all`, `permission=pull|triage|push|maintain|admin`
- `GET /repos/{owner}/{repo}/collaborators/{username}` — Check if user is a collaborator
- `GET /repos/{owner}/{repo}/collaborators/{username}/permission` — Get user's permission level

### Current Status
- ❌ **Not implemented** in ghfs
- No config toggle for `sync.collaborators` or `sync.outsideCollaborators`
- Repository-level collaborators not captured

### Proposed File Structure
```
.ghfs/org/
├── outside-collaborators.json   # Org-wide outside collaborators (org repos only)
└── outside-collaborators-summary.json  # Counts + 2FA status

.ghfs/collaborators.json          # Repository-level collaborators (all repo types)
├── Direct collaborators
├── Outside collaborators (if org repo)
└── Permission levels per user
```

### Data Shape
```typescript
interface CollaboratorEntry {
  login: string
  name: string | null
  avatarUrl: string
  url: string
  permission: 'pull' | 'triage' | 'push' | 'maintain' | 'admin'
  affiliation: 'direct' | 'outside' | 'organization_member'
  twoFactorEnabled?: boolean  // Only for org outside collaborators
}
```

### Notes
- **Organization repos**: Distinguishes org members, outside collaborators, and direct repo collaborators
- **User repos**: Only direct collaborators (no org context)
- **Access control**: Outside collaborators are scoped to specific repos, not org-wide
- **2FA enforcement**: `filter=2fa_disabled` helps identify security gaps
- **Permissions hierarchy**: admin > maintain > push > triage > pull

---

## 3. Invitation Events

### API Endpoints

#### REST
- `GET /orgs/{org}/invitations` — List pending org invitations
  - Returns: `id`, `email`, `login`, `role`, `created_at`, `inviter`, `team_count`, `invitation_teams_url`
- `GET /orgs/{org}/failed_invitations` — List failed org invitations
- `GET /repos/{owner}/{repo}/invitations` — List repository invitations (for direct repo collaborator invites)

#### GraphQL
```graphql
query OrgInvitations($org: String!) {
  organization(login: $org) {
    pendingMembers(first: 100) {
      edges {
        node {
          login
          email
          createdAt
          invitationType # ORGANIZATION, REPOSITORY
        }
      }
    }
  }
}
```

### Current Status
- ❌ **Not implemented** in ghfs
- No config toggle for `sync.invitations`
- No tracking of pending/failed invites

### Proposed File Structure
```
.ghfs/org/
├── pending-invitations.json     # Active pending invites
├── failed-invitations.json      # Failed invite history
└── invitation-summary.json      # Counts by status

.ghfs/invitations.json            # Repository-level invitations
```

### Data Shape
```typescript
interface OrgInvitation {
  id: number
  email: string | null
  login: string | null
  role: 'direct_member' | 'admin' | 'billing_manager'
  createdAt: string
  inviter: {
    login: string
    url: string
  }
  teamCount: number
}

interface FailedInvitation {
  id: number
  email: string
  failedAt: string
  failedReason: string
}
```

### Notes
- **Pending invitations**: Users invited but not yet accepted
- **Failed invitations**: Invites that could not be delivered (bad email, etc.)
- **Repository invitations**: Separate from org invitations (direct repo collaborator invites)
- **Privacy**: Email addresses only visible to org admins
- **Expiration**: Invitations expire after 7 days (GitHub default)

---

## 4. Community Metrics

### API Endpoints

#### REST
- `GET /repos/{owner}/{repo}/community/profile` — Get community profile metrics
  - Returns: `health_percentage`, `description`, `documentation`, `files` object with presence of:
    - `code_of_conduct` + `code_of_conduct_file`
    - `license`
    - `contributing`
    - `readme`
    - `issue_template`
    - `pull_request_template`
  - Also: `updated_at`, `content_reports_enabled` (org repos only)

### Current Status
- ⚠️ **Partially implemented** via governance file detection (PR #48 - CODEOWNERS.errors.json)
- ❌ **Health percentage not captured** as a metric
- ❌ No centralized `.ghfs/community/` structure
- ❌ No config toggle for `sync.communityMetrics`

### Proposed File Structure
```
.ghfs/community/
├── profile.json              # Full community profile response
├── health-score.json         # Simplified health percentage + breakdown
└── metrics-summary.md        # Human-readable summary
```

### Data Shape
```typescript
interface CommunityProfile {
  health_percentage: number  // 0-100
  description: string | null
  documentation: string | null
  files: {
    code_of_conduct: {
      name: string
      key: string
      url: string
      html_url: string
    } | null
    code_of_conduct_file: {
      url: string
      html_url: string
    } | null
    license: {
      key: string
      name: string
      spdx_id: string
      url: string
      html_url: string
    } | null
    contributing: { url: string, html_url: string } | null
    readme: { url: string, html_url: string } | null
    issue_template: { url: string, html_url: string } | null
    pull_request_template: { url: string, html_url: string } | null
  }
  updated_at: string | null
  content_reports_enabled?: boolean  // Org repos only
}
```

### Health Percentage Calculation
GitHub defines `health_percentage` as:
```
(present_count / 4) * 100
```

Where the 4 required files are:
1. **README** (any variant: README.md, README.txt, etc.)
2. **CONTRIBUTING** (CONTRIBUTING.md, .github/CONTRIBUTING.md)
3. **LICENSE** (LICENSE, LICENSE.md, LICENSE.txt)
4. **CODE_OF_CONDUCT** (CODE_OF_CONDUCT.md, .github/CODE_OF_CONDUCT.md)

Additional files checked (but don't affect score):
- ISSUE_TEMPLATE
- PULL_REQUEST_TEMPLATE

### Notes
- **Cannot be called on forks** (GitHub restriction)
- **Org-only field**: `content_reports_enabled` only returned for org-owned repos
- **Overlap with constitution sync**: Files like CODE_OF_CONDUCT, CONTRIBUTING already synced in PR #48
- **Value**: Provides GitHub's canonical "health score" — useful for README badges, project dashboards

---

## 5. Sponsorships Metadata

### API Endpoints

#### GraphQL ONLY
**No REST API for sponsorships — GraphQL required**

```graphql
query SponsorInfo($login: String!) {
  user(login: $login) {
    sponsorsListing {
      id
      name
      fullDescription
      shortDescription
      isPublic
      tiers(first: 100) {
        nodes {
          id
          name
          description
          monthlyPriceInDollars
          monthlyPriceInCents
          isOneTime
          isCustomAmount
        }
      }
    }
    sponsorshipsAsSponsor(first: 100) {
      totalCount
      nodes {
        sponsorable {
          ... on User {
            login
            name
            avatarUrl
          }
        }
        tier {
          name
          monthlyPriceInDollars
        }
        createdAt
      }
    }
    sponsorshipsAsMaintainer(first: 100) {
      totalCount
      totalRecurringMonthlyPriceInDollars
      nodes {
        sponsorEntity {
          ... on User {
            login
            name
            avatarUrl
          }
          ... on Organization {
            login
            name
            avatarUrl
          }
        }
        tier {
          name
          monthlyPriceInDollars
        }
        createdAt
        tierSelectedAt
        isActive
      }
    }
  }
}
```

### Current Status
- ❌ **Not implemented** in ghfs
- ❌ No GraphQL client infrastructure in provider layer yet
- ❌ No config toggle for `sync.sponsorships` or `extended.sponsorships`

### Proposed File Structure
```
.ghfs/sponsors/
├── listing.json              # Sponsorship tiers + listing metadata
├── sponsors.json             # Current sponsors (sponsorshipsAsMaintainer)
├── sponsoring.json           # Who this user/org sponsors (sponsorshipsAsSponsor)
└── summary.json              # Counts + total monthly income
```

### Data Shape
```typescript
interface SponsorListing {
  id: string
  name: string | null
  fullDescription: string | null
  shortDescription: string | null
  isPublic: boolean
  tiers: Array<{
    id: string
    name: string
    description: string | null
    monthlyPriceInDollars: number
    monthlyPriceInCents: number
    isOneTime: boolean
    isCustomAmount: boolean
  }>
}

interface Sponsor {
  login: string
  name: string | null
  avatarUrl: string
  url: string
  tier: {
    name: string
    monthlyPriceInDollars: number
  } | null
  createdAt: string
  tierSelectedAt: string | null
  isActive: boolean
}

interface SponsorSummary {
  totalSponsors: number
  totalRecurringMonthlyIncome: number  // USD
  activeSponsors: number
  oneTimeSponsors: number
  updatedAt: string
}
```

### Notes
- **GraphQL only**: No REST endpoint for sponsorships
- **Privacy**: Sponsor data may be private (depends on sponsor/maintainer settings)
- **Not all repos have sponsors**: Only applicable if GitHub Sponsors enabled
- **Token scope**: Requires `read:user` or `user:email` for private sponsor data
- **Org sponsorships**: Organizations can also sponsor (not just users)
- **Revenue data**: `totalRecurringMonthlyPriceInDollars` only includes amounts you can view
- **Implementation complexity**: Requires adding GraphQL client to `src/providers/github/client.ts`

---

## 6. Funding Configuration

### API Endpoints

#### REST
- `GET /repos/{owner}/{repo}/contents/.github/FUNDING.yml` — Get raw FUNDING.yml content
- `GET /repos/{owner}/{repo}/community/profile` — Includes funding links in `files` object (indirectly)

### Current Status
- ⚠️ **Partially planned** in governance/constitution sync (issue #13)
- ❌ Not yet implemented
- ❌ No config toggle for `sync.funding` or `extended.funding`

### Proposed File Structure
```
.ghfs/constitution/
├── FUNDING.yml               # Mirrored from .github/FUNDING.yml
└── funding-parsed.json       # Parsed funding links by platform
```

### Data Shape
```yaml
# Example FUNDING.yml
github: [user1, user2]
patreon: username
open_collective: projectname
ko_fi: username
tidelift: npm/package-name
community_bridge: project-name
liberapay: username
issuehunt: username
otechie: username
lfx_crowdfunding: project-name
custom: ["https://example.com/donate", "https://example.com/sponsor"]
```

Parsed JSON:
```typescript
interface FundingConfig {
  github?: string[]
  patreon?: string
  open_collective?: string
  ko_fi?: string
  tidelift?: string
  community_bridge?: string
  liberapay?: string
  issuehunt?: string
  otechie?: string
  lfx_crowdfunding?: string
  custom?: string[]
}

interface FundingParsed {
  raw: string  // Original YAML
  parsed: FundingConfig
  platforms: string[]  // ['github', 'patreon', 'custom']
  totalLinks: number
  updatedAt: string
}
```

### Notes
- **Standard GitHub feature**: FUNDING.yml controls "Sponsor" button in UI
- **Multiple platforms**: Supports 11 platform types + custom URLs
- **Multiple GitHub users**: Can list multiple GitHub Sponsors profiles
- **Validation**: GitHub validates FUNDING.yml format (invalid files are ignored)
- **Overlap with sponsorships**: FUNDING.yml is config; sponsorships API is live data
- **Simple implementation**: Just fetch `.github/FUNDING.yml` via REST contents API

---

## Cross-References to Existing Work

### Related Open PRs
- **PR #48**: Activity, CODEOWNERS errors, languages, contributors (overlaps with community metrics)
- **PR #51**: Security surfaces (complements community health)
- **PR #19**: Agent Intelligence Context Layer (would benefit from social graph data)

### Related Issues
- **Issue #13**: Governance files sync (includes FUNDING.yml)
- **Issue #29**: me.md personal summary (could aggregate sponsorship/contributor data)
- **Issue #31**: refs.json cross-reference graph (could include collaborator mentions)
- **Issue #36**: Graph nodes + edges (social graph: members, collaborators, sponsors)
- **Issue #40**: Deployments & environment status (relates to collaborator permissions)

---

## Implementation Recommendations

### Priority Tiers

#### Tier 1: Low-Hanging Fruit (REST API, simple)
1. **FUNDING.yml mirror** — Simple REST contents fetch
   - Config: `sync.funding` (default: true)
   - Files: `.ghfs/constitution/FUNDING.yml`, `.ghfs/constitution/funding-parsed.json`
   - Effort: 1-2 hours

2. **Community metrics** — Single REST endpoint
   - Config: `sync.communityMetrics` (default: true)
   - Files: `.ghfs/community/profile.json`, `.ghfs/community/health-score.json`
   - Effort: 2-3 hours
   - Overlap: Reuses some constitution file detection

3. **Repository collaborators** — REST API, works for all repo types
   - Config: `sync.collaborators` (default: true)
   - Files: `.ghfs/collaborators.json`
   - Effort: 3-4 hours

#### Tier 2: Organization-Specific (REST API, conditional)
4. **Organization members** — Org repos only, requires `read:org` scope
   - Config: `sync.orgMembers` (default: false) — Only enable for org repos
   - Files: `.ghfs/org/members.json`, `.ghfs/org/membership-summary.json`
   - Effort: 3-4 hours
   - Conditional: Skip entirely for user-owned repos

5. **Outside collaborators (org-level)** — Org repos only
   - Config: `sync.outsideCollaborators` (default: false)
   - Files: `.ghfs/org/outside-collaborators.json`
   - Effort: 2-3 hours
   - Conditional: Skip entirely for user-owned repos

6. **Invitation events** — Org repos only
   - Config: `sync.invitations` (default: false)
   - Files: `.ghfs/org/pending-invitations.json`, `.ghfs/org/failed-invitations.json`
   - Effort: 2-3 hours
   - Conditional: Skip entirely for user-owned repos

#### Tier 3: Complex (GraphQL, infrastructure)
7. **Sponsorships metadata** — GraphQL only, requires new client infrastructure
   - Config: `extended.sponsorships` (default: false)
   - Files: `.ghfs/sponsors/listing.json`, `.ghfs/sponsors/sponsors.json`, `.ghfs/sponsors/sponsoring.json`
   - Effort: 6-8 hours (includes GraphQL client refactor)
   - Blocker: No GraphQL client abstraction yet (currently inline queries only)

### Sequencing
1. **Phase 1**: FUNDING.yml + Community metrics (Tier 1, low effort)
2. **Phase 2**: Repository collaborators (Tier 1, universal)
3. **Phase 3**: Org surfaces (Tier 2, conditional on repo ownership type)
4. **Phase 4**: Sponsorships (Tier 3, after GraphQL client refactor)

### Architecture Notes
- **Org detection**: Use `repo.owner.type === 'Organization'` to gate org-only surfaces
- **Token scope**: Document required scopes (`read:org` for org surfaces)
- **GraphQL client**: Abstract inline GraphQL queries into `src/providers/github/graphql.ts`
- **Error handling**: Graceful degradation if org endpoints return 403 (insufficient permissions)

---

## Config Schema Extensions

### Proposed Additions to `GhfsUserConfig`

```typescript
interface GhfsUserConfig {
  sync?: {
    // ... existing fields ...
    
    // Tier 1: Universal
    funding?: boolean              // default: true
    communityMetrics?: boolean     // default: true
    collaborators?: boolean        // default: true
    
    // Tier 2: Org-specific (auto-skip for user repos)
    orgMembers?: boolean           // default: false
    outsideCollaborators?: boolean // default: false
    invitations?: boolean          // default: false
  }
  
  extended?: {
    // ... existing fields ...
    
    // Tier 3: GraphQL + complex
    sponsorships?: boolean         // default: false
  }
}
```

---

## File Structure Summary

### New Directories
```
.ghfs/
├── org/                              # Org-specific surfaces (Tier 2)
│   ├── members.json
│   ├── public-members.json
│   ├── membership-summary.json
│   ├── outside-collaborators.json
│   ├── outside-collaborators-summary.json
│   ├── pending-invitations.json
│   ├── failed-invitations.json
│   └── invitation-summary.json
├── community/                        # Community metrics (Tier 1)
│   ├── profile.json
│   ├── health-score.json
│   └── metrics-summary.md
├── sponsors/                         # Sponsorships (Tier 3)
│   ├── listing.json
│   ├── sponsors.json
│   ├── sponsoring.json
│   └── summary.json
└── constitution/                     # Extended governance files
    ├── FUNDING.yml                   # New (Tier 1)
    └── funding-parsed.json           # New (Tier 1)
```

### New Root Files
```
.ghfs/
└── collaborators.json                # Repository collaborators (Tier 1)
```

---

## API Surface Coverage Impact

### Before (from `github-api-surface.md`)
- **Done**: 50+ endpoints
- **In PR**: 15+ endpoints
- **Missing**: 35+ endpoints

### After (if all gaps filled)
- **Added**: 10+ new endpoints
  - 3 Tier 1 (funding, community metrics, collaborators)
  - 6 Tier 2 (org members, outside collaborators, invitations)
  - 1 Tier 3 (sponsorships GraphQL)
- **New total**: ~75+ endpoints covered
- **Coverage**: ~75% of GitHub's repository/org social surfaces

---

## References

### GitHub API Documentation (2026-03-10)
- [REST API: Organization Members](https://docs.github.com/en/rest/orgs/members?apiVersion=2026-03-10)
- [REST API: Outside Collaborators](https://docs.github.com/en/rest/orgs/outside-collaborators?apiVersion=2026-03-10)
- [REST API: Organization Invitations](https://docs.github.com/en/rest/orgs/members?apiVersion=2026-03-10#list-pending-organization-invitations)
- [REST API: Community Metrics](https://docs.github.com/en/rest/metrics/community?apiVersion=2026-03-10)
- [GraphQL API: Sponsorships](https://docs.github.com/en/graphql/reference/objects#sponsorslisting)
- [Repository Contents: FUNDING.yml](https://docs.github.com/en/rest/repos/contents?apiVersion=2026-03-10)

### Related ghfs Documents
- `docs/research/github-api-surface.md` — Current API coverage map
- `docs/research/config-schema.md` — Config schema reference
- `docs/research/file-structure-diagrams.md` — File structure conventions

---

## Next Actions

**This is an observation document only. No implementation has been performed.**

To proceed with implementation:
1. **Choose a tier** (recommend Tier 1 first)
2. **Create feature branch** per surface (e.g., `feat/community-metrics`, `feat/funding-yml`)
3. **Update config types** in `src/types/config.ts`
4. **Implement provider methods** in `src/providers/github/provider.ts` + `enhanced.ts`
5. **Add sync logic** in `src/sync/sync-repository-snapshot.ts`
6. **Write tests** in `src/providers/github/provider.test.ts`
7. **Update documentation** in `README.md`, `docs/research/config-schema.md`
8. **Ship PR** with observation doc reference

---

**Document Status**: ✅ Complete observation
**Implementation Status**: ❌ Not started
**Blocking Issues**: None (Tier 1 ready to implement)
**Estimated Total Effort**: 25-35 hours for all tiers
