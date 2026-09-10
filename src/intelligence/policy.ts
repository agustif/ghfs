import type { Gate, GateResult, Policy } from '../types/policy'

// TODO: Implement policy parser - https://github.com/agustif/ghfs/issues/20
// Parse/derive .ghfs/policy.json from constitution files + GitHub rulesets

export async function parsePolicy(_storageDir: string): Promise<Policy> {
  // Stub: return empty policy
  return {
    version: 1,
    repo: '',
    source: [],
    rules: [],
    gates: [],
    danger_paths: [],
  }
}

export async function writePolicy(_storageDir: string, _policy: Policy): Promise<void> {
  // TODO: Write policy to .ghfs/policy.json
}

export function evaluateGate(_gate: Gate, _context: unknown): GateResult {
  // TODO: Implement gate evaluation DSL
  return { passed: true, failures: [] }
}

export async function loadPolicy(_storageDir: string): Promise<Policy | null> {
  // TODO: Load .ghfs/policy.json
  return null
}
