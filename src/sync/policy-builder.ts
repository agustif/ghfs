import type { SyncContext } from './sync-repository-types'
import { Buffer } from 'node:buffer'

export interface PolicyInput {
  version: string
  repo: string
  synced_at: string
  codeowners: CodeownersPolicy | null
  rulesets: RulesetsPolicy | null
  contributing: ContributingPolicy | null
}

export interface CodeownersPolicy {
  patterns: Array<{
    pattern: string
    owners: string[]
  }>
  default_owners: string[]
}

export interface RulesetsPolicy {
  default_branch: string
  protection: {
    required_reviews: number | null
    required_status_checks: string[]
    enforce_admins: boolean
    linear_history: boolean
    allow_force_pushes: boolean
  }
}

export interface ContributingPolicy {
  has_file: boolean
  pr_template_exists: boolean
  issue_template_exists: boolean
  security_policy_exists: boolean
  hints: string[]
}

export async function buildPolicyInputs(context: SyncContext): Promise<PolicyInput> {
  const repository = await context.provider.fetchRepository()
  const [codeowners, protection, contributing] = await Promise.all([
    extractCodeownersPolicy(context),
    extractRulesetsPolicy(context, repository.default_branch),
    extractContributingPolicy(context),
  ])

  return {
    version: '1.0',
    repo: context.repoSlug,
    synced_at: context.syncedAt,
    codeowners,
    rulesets: protection,
    contributing,
  }
}

async function extractCodeownersPolicy(context: SyncContext): Promise<CodeownersPolicy | null> {
  const paths = ['CODEOWNERS', '.github/CODEOWNERS', 'docs/CODEOWNERS']

  for (const path of paths) {
    const content = await context.provider.fetchRepositoryContent?.(path)
    if (content?.content && content.encoding === 'base64') {
      const decoded = Buffer.from(content.content, 'base64').toString('utf8')
      return parseCodeowners(decoded)
    }
  }

  return null
}

function parseCodeowners(content: string): CodeownersPolicy {
  const patterns: Array<{ pattern: string, owners: string[] }> = []
  const lines = content.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#'))
      continue

    const parts = trimmed.split(/\s+/)
    if (parts.length < 2)
      continue

    const pattern = parts[0]
    const owners = parts.slice(1).filter(o => o.startsWith('@'))

    patterns.push({ pattern, owners })
  }

  const defaultOwners = patterns.find(p => p.pattern === '*')?.owners ?? []

  return {
    patterns,
    default_owners: defaultOwners,
  }
}

async function extractRulesetsPolicy(
  context: SyncContext,
  defaultBranch: string,
): Promise<RulesetsPolicy | null> {
  const protection = await context.provider.fetchBranchProtection?.(defaultBranch)
  if (!protection)
    return null

  return {
    default_branch: defaultBranch,
    protection: {
      required_reviews: protection.required_pull_request_reviews?.required_approving_review_count ?? null,
      required_status_checks: protection.required_status_checks?.contexts ?? [],
      enforce_admins: protection.enforce_admins,
      linear_history: protection.required_linear_history,
      allow_force_pushes: protection.allow_force_pushes,
    },
  }
}

async function extractContributingPolicy(context: SyncContext): Promise<ContributingPolicy> {
  const [contributing, prTemplate, issueTemplate, security] = await Promise.all([
    checkFileExists(context, 'CONTRIBUTING.md'),
    checkFileExists(context, '.github/pull_request_template.md'),
    checkFileExists(context, '.github/ISSUE_TEMPLATE'),
    checkFileExists(context, 'SECURITY.md'),
  ])

  const hints: string[] = []
  if (contributing)
    hints.push('Project has CONTRIBUTING guidelines')
  if (prTemplate)
    hints.push('PR template required')
  if (security)
    hints.push('Security policy defined')

  return {
    has_file: contributing,
    pr_template_exists: prTemplate,
    issue_template_exists: issueTemplate,
    security_policy_exists: security,
    hints,
  }
}

async function checkFileExists(context: SyncContext, path: string): Promise<boolean> {
  const content = await context.provider.fetchRepositoryContent?.(path)
  return content !== null
}
