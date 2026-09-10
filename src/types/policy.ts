export type GatePredicate
  = | { op: 'requires_review_count', min: number }
    | { op: 'blocks_paths', patterns: string[] }
    | { op: 'requires_label', labels: string[] }
    | { op: 'requires_check', check: string, state: 'success' | 'failure' }
    | { op: 'author_in', logins: string[] }
    | { op: 'and', predicates: GatePredicate[] }
    | { op: 'or', predicates: GatePredicate[] }

export interface PolicyRule {
  id: string
  title: string
  description?: string
  severity: 'error' | 'warning' | 'info'
  eval: GatePredicate
}

export interface Gate {
  id: string
  title: string
  applies_to: 'issue' | 'pull' | 'all'
  conditions: GatePredicate[]
}

export interface Policy {
  version: 1
  repo: string
  source: string[]
  rules: PolicyRule[]
  gates: Gate[]
  danger_paths: string[]
}

export interface GateResult {
  passed: boolean
  failures: string[]
}
