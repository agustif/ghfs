export interface PolicyRules {
  requires_review_count?: number
  blocks_paths?: string[]
  danger_files?: string[]
  required_checks?: string[]
  required_labels?: string[]
}

export interface Policy {
  version: 1
  rules: PolicyRules
  constitution?: string
  sources: {
    constitution_file?: string
    branch_protection?: boolean
    rulesets?: boolean
  }
}

export interface GateEvaluation {
  passed: boolean
  warnings: string[]
  errors: string[]
  risk_level: 'low' | 'medium' | 'high'
}

export interface GateContext {
  files?: string[]
  review_count?: number
  checks_status?: Record<string, 'success' | 'failure' | 'pending'>
  labels?: string[]
}

export function evaluateGate(policy: Policy, context: GateContext): GateEvaluation {
  const warnings: string[] = []
  const errors: string[] = []
  let risk_level: 'low' | 'medium' | 'high' = 'low'

  const { rules } = policy

  if (rules.requires_review_count && context.review_count !== undefined) {
    if (context.review_count < rules.requires_review_count) {
      errors.push(`Requires ${rules.requires_review_count} reviews, but only ${context.review_count} found`)
      risk_level = 'high'
    }
  }

  if (rules.blocks_paths && context.files) {
    const blockedFiles = context.files.filter((file) => {
      return rules.blocks_paths!.some((pattern) => {
        return matchGlob(file, pattern)
      })
    })
    if (blockedFiles.length > 0) {
      errors.push(`Blocked paths modified: ${blockedFiles.join(', ')}`)
      risk_level = 'high'
    }
  }

  if (rules.danger_files && context.files) {
    const dangerFiles = context.files.filter((file) => {
      return rules.danger_files!.includes(file)
    })
    if (dangerFiles.length > 0) {
      warnings.push(`Danger files modified: ${dangerFiles.join(', ')}`)
      if (risk_level === 'low') risk_level = 'medium'
    }
  }

  if (rules.required_checks && context.checks_status) {
    const failedChecks = rules.required_checks.filter((check) => {
      return context.checks_status![check] !== 'success'
    })
    if (failedChecks.length > 0) {
      errors.push(`Required checks not passing: ${failedChecks.join(', ')}`)
      risk_level = 'high'
    }
  }

  if (rules.required_labels && context.labels) {
    const missingLabels = rules.required_labels.filter((label) => {
      return !context.labels!.includes(label)
    })
    if (missingLabels.length > 0) {
      warnings.push(`Missing required labels: ${missingLabels.join(', ')}`)
      if (risk_level === 'low') risk_level = 'medium'
    }
  }

  return {
    passed: errors.length === 0,
    warnings,
    errors,
    risk_level,
  }
}

function matchGlob(path: string, pattern: string): boolean {
  const regexPattern = pattern
    .replace(/\./g, '\\.')
    .replace(/\*\*/g, '.*')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '.')
  const regex = new RegExp(`^${regexPattern}$`)
  return regex.test(path)
}
